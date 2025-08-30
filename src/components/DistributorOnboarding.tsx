import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Users, Plus, Edit, Trash2, Check, X, Building2 } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

type DistributorStatus = 'active' | 'inactive' | 'pending'

interface Distributor {
  id: string
  name: string
  code: string
  type: string
  zone: string
  state: string
  city: string
  address: string
  contactPerson: string
  phone: string
  email: string
  panNumber: string
  gstNumber: string
  status: DistributorStatus
  onboardedAt: string
}

const distributorTypeOptions = [
  { code: 'P1', name: 'National Distributor' },
  { code: 'P2', name: 'Regional Distributor' },
  { code: 'P3', name: 'Large Format Retailer' },
  { code: 'P4', name: 'Regional Retailer' },
  { code: 'P5', name: 'Direct Dealer' },
  { code: 'P6', name: 'PBG_Liquidation' },
  { code: 'P7', name: 'Advance Dealer-PBG' },
  { code: 'P8', name: 'Advance Dist-PBG' },
  { code: 'P9', name: 'Advance FOMT-PBG' },
  { code: 'PD', name: 'PBG DD Prime Partner' },
  { code: 'PC', name: 'PBG CDG Group' }
]

const zoneOptions = ['East', 'West', 'North1', 'North2', 'South']

const DistributorOnboarding: React.FC = () => {
  const [activeTab, setActiveTab] = useState('onboard')
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(false)
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null)
  const [zoneStateMapping, setZoneStateMapping] = useState<Record<string, string[]>>({})

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    zone: '',
    state: '',
    city: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    panNumber: '',
    gstNumber: ''
  })

  useEffect(() => {
    loadDistributors()
    loadZoneStateMapping()
  }, [])

  const loadZoneStateMapping = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/zone-state-mapping`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })
      const result = await response.json()
      if (result.success) {
        setZoneStateMapping(result.mapping)
      }
    } catch (error) {
      console.error('Error fetching zone-state mapping:', error)
    }
  }

  const loadDistributors = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })
      const result = await response.json()
      if (result.success) {
        setDistributors(result.distributors.map((item: any) => item.value))
      }
    } catch (error) {
      console.error('Error fetching distributors:', error)
    }
  }

  const getStatesForZone = () => {
    if (!formData.zone || formData.zone === 'all-zones') {
      return Object.values(zoneStateMapping).flat()
    }
    return zoneStateMapping[formData.zone] || []
  }

  const updateFormField = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      if (field === 'zone') {
        updated.state = ''
      }
      
      return updated
    })
  }

  const createDistributorCode = (name: string, type: string) => {
    const prefix = type || 'DIST'
    const namePart = name.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-4)
    return `${prefix}_${namePart}_${timestamp}`
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const distributorData = {
        ...formData,
        code: formData.code || createDistributorCode(formData.name, formData.type),
        status: 'active'
      }

      const url = editingDistributor 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/${editingDistributor.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors`

      const response = await fetch(url, {
        method: editingDistributor ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(distributorData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingDistributor ? 'Distributor updated successfully!' : 'Distributor onboarded successfully!')
        clearForm()
        loadDistributors()
        setActiveTab('manage')
      } else {
        toast.error(`Failed to ${editingDistributor ? 'update' : 'onboard'} distributor: ${result.error}`)
      }
    } catch (error) {
      console.error('Error submitting distributor:', error)
      toast.error('Failed to process distributor data')
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setFormData({
      name: '',
      code: '',
      type: '',
      zone: '',
      state: '',
      city: '',
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
      panNumber: '',
      gstNumber: ''
    })
    setEditingDistributor(null)
  }

  const editDistributor = (distributor: Distributor) => {
    setFormData({
      name: distributor.name,
      code: distributor.code,
      type: distributor.type,
      zone: distributor.zone,
      state: distributor.state,
      city: distributor.city,
      address: distributor.address,
      contactPerson: distributor.contactPerson,
      phone: distributor.phone,
      email: distributor.email,
      panNumber: distributor.panNumber,
      gstNumber: distributor.gstNumber
    })
    setEditingDistributor(distributor)
    setActiveTab('onboard')
  }

  const deleteDistributor = async (distributorId: string) => {
    if (!confirm('Are you sure you want to delete this distributor?')) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/${distributorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Distributor deleted successfully!')
        loadDistributors()
      } else {
        toast.error(`Failed to delete distributor: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting distributor:', error)
      toast.error('Failed to delete distributor')
    }
  }

  const changeDistributorStatus = async (distributorId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/${distributorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Distributor ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
        loadDistributors()
      } else {
        toast.error(`Failed to update distributor status: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating distributor status:', error)
      toast.error('Failed to update distributor status')
    }
  }

  const renderStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }
    return (
      <Badge className={statusStyles[status as keyof typeof statusStyles]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="onboard" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>{editingDistributor ? 'Edit Distributor' : 'Onboard Distributor'}</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Manage Distributors</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>{editingDistributor ? 'Edit Distributor' : 'Onboard New Distributor'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitForm} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Distributor Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="Enter distributor name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Distributor Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => updateFormField('code', e.target.value)}
                      placeholder="Auto-generated if left empty"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Distributor Type</Label>
                    <Select value={formData.type} onValueChange={(value) => updateFormField('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {distributorTypeOptions.map(type => (
                          <SelectItem key={type.code} value={type.code}>
                            {type.code}: {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="zone">Zone</Label>
                    <Select value={formData.zone} onValueChange={(value) => updateFormField('zone', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneOptions.map(zone => (
                          <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select 
                      value={formData.state} 
                      onValueChange={(value) => updateFormField('state', value)}
                      disabled={!formData.zone}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatesForZone().map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateFormField('city', e.target.value)}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormField('address', e.target.value)}
                      placeholder="Enter full address"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => updateFormField('contactPerson', e.target.value)}
                      placeholder="Enter contact person name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateFormField('phone', e.target.value)}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      value={formData.panNumber}
                      onChange={(e) => updateFormField('panNumber', e.target.value.toUpperCase())}
                      placeholder="Enter PAN number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={formData.gstNumber}
                      onChange={(e) => updateFormField('gstNumber', e.target.value.toUpperCase())}
                      placeholder="Enter GST number"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  {editingDistributor && (
                    <Button type="button" onClick={clearForm} variant="outline">
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : editingDistributor ? 'Update Distributor' : 'Onboard Distributor'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Distributor Management</span>
                </div>
                <Badge variant="outline">{distributors.length} distributors</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {distributors.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No distributors found</p>
                  <Button onClick={() => setActiveTab('onboard')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Onboard First Distributor
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributors.map(distributor => {
                        const distributorType = distributorTypeOptions.find(t => t.code === distributor.type)
                        return (
                          <TableRow key={distributor.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{distributor.name}</p>
                                <p className="text-sm text-gray-500">{distributor.city}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">{distributor.code}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">{distributor.type}</p>
                                <p className="text-gray-500">{distributorType?.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>{distributor.zone}</TableCell>
                            <TableCell>{distributor.state}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{distributor.contactPerson}</p>
                                <p className="text-gray-500">{distributor.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>{renderStatusBadge(distributor.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  onClick={() => editDistributor(distributor)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => changeDistributorStatus(distributor.id, distributor.status)}
                                  size="sm"
                                  variant="outline"
                                >
                                  {distributor.status === 'active' ? (
                                    <X className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => deleteDistributor(distributor.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DistributorOnboarding