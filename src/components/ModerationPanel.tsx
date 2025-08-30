import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { 
  Settings2, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  FileType, 
  Database,
  AlertCircle,
  CheckCircle2,
  Copy
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

// Types for configuration
interface SchemeField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'textarea' | 'file'
  required: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    minLength?: number
    maxLength?: number
  }
  defaultValue?: any
  description?: string
  group?: string
}

interface SchemeType {
  id: string
  name: string
  label: string
  description: string
  enabled: boolean
  fields: SchemeField[]
  workflow: string[]
  commissionTypes: string[]
  slabSupported: boolean
  excelRequired: boolean
}

const DEFAULT_SCHEME_TYPES: SchemeType[] = [
  {
    id: 'article-scheme',
    name: 'article-scheme',
    label: 'Article Scheme',
    description: 'Schemes focused on specific article management through Excel upload',
    enabled: true,
    fields: [
      {
        id: 'scheme-name',
        name: 'schemeName',
        label: 'Scheme Name',
        type: 'text',
        required: true,
        validation: { minLength: 3, maxLength: 100 },
        description: 'Unique name for the scheme',
        group: 'basic'
      },
      {
        id: 'description',
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        validation: { maxLength: 500 },
        description: 'Optional description for the scheme',
        group: 'basic'
      },
      {
        id: 'commission-type',
        name: 'commissionType',
        label: 'Commission Type',
        type: 'select',
        required: true,
        options: ['Fixed', 'Absolute (per unit)', 'Percentage'],
        description: 'Type of commission calculation',
        group: 'commission'
      }
    ],
    workflow: ['Basic Info', 'Distributor Criteria', 'Article Scheme Definition'],
    commissionTypes: ['Fixed', 'Absolute (per unit)', 'Percentage'],
    slabSupported: false,
    excelRequired: true
  },
  {
    id: 'booster-scheme',
    name: 'booster-scheme',
    label: 'Booster Scheme',
    description: 'Schemes using hierarchical dropdown filtering with slab-based calculations',
    enabled: true,
    fields: [
      {
        id: 'scheme-name',
        name: 'schemeName',
        label: 'Scheme Name',
        type: 'text',
        required: true,
        validation: { minLength: 3, maxLength: 100 },
        description: 'Unique name for the scheme',
        group: 'basic'
      },
      {
        id: 'description',
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        validation: { maxLength: 500 },
        description: 'Optional description for the scheme',
        group: 'basic'
      },
      {
        id: 'commission-type',
        name: 'commissionType',
        label: 'Commission Type',
        type: 'select',
        required: true,
        options: ['Fixed', 'Percentage', 'Absolute Per Unit'],
        description: 'Type of commission calculation',
        group: 'commission'
      },
      {
        id: 'slab-type',
        name: 'slabType',
        label: 'Slab Type',
        type: 'select',
        required: true,
        options: ['Quantity', 'Value'],
        description: 'Type of slab calculation',
        group: 'slab'
      }
    ],
    workflow: ['Basic Info', 'Distributor Criteria', 'Catalog Criteria', 'Slab Configuration'],
    commissionTypes: ['Fixed', 'Percentage', 'Absolute Per Unit'],
    slabSupported: true,
    excelRequired: false
  }
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'boolean', label: 'Boolean (Switch)' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'file', label: 'File Upload' }
]

export default function ModerationPanel() {
  const [schemeTypes, setSchemeTypes] = useState<SchemeType[]>(DEFAULT_SCHEME_TYPES)
  const [selectedSchemeType, setSelectedSchemeType] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<SchemeField | null>(null)
  const [isAddingField, setIsAddingField] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load configuration from backend
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/moderation/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.schemeTypes && data.schemeTypes.length > 0) {
          setSchemeTypes(data.schemeTypes)
        }
        toast.success('Configuration loaded successfully')
      } else {
        console.log('No existing configuration found, using defaults')
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/moderation/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schemeTypes })
      })

      if (response.ok) {
        toast.success('Configuration saved successfully')
      } else {
        throw new Error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const addSchemeType = () => {
    const newSchemeType: SchemeType = {
      id: `custom-scheme-${Date.now()}`,
      name: `custom-scheme-${Date.now()}`,
      label: 'New Scheme Type',
      description: 'Custom scheme type',
      enabled: true,
      fields: [],
      workflow: ['Basic Info'],
      commissionTypes: ['Fixed'],
      slabSupported: false,
      excelRequired: false
    }
    setSchemeTypes([...schemeTypes, newSchemeType])
    setSelectedSchemeType(newSchemeType.id)
  }

  const updateSchemeType = (id: string, updates: Partial<SchemeType>) => {
    setSchemeTypes(prev => prev.map(type => 
      type.id === id ? { ...type, ...updates } : type
    ))
  }

  const deleteSchemeType = (id: string) => {
    setSchemeTypes(prev => prev.filter(type => type.id !== id))
    if (selectedSchemeType === id) {
      setSelectedSchemeType(null)
    }
  }

  const addField = (schemeTypeId: string, field: SchemeField) => {
    updateSchemeType(schemeTypeId, {
      fields: [...(schemeTypes.find(t => t.id === schemeTypeId)?.fields || []), field]
    })
    setIsAddingField(false)
    setEditingField(null)
  }

  const updateField = (schemeTypeId: string, fieldId: string, updates: Partial<SchemeField>) => {
    const schemeType = schemeTypes.find(t => t.id === schemeTypeId)
    if (schemeType) {
      const updatedFields = schemeType.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
      updateSchemeType(schemeTypeId, { fields: updatedFields })
    }
    setEditingField(null)
  }

  const deleteField = (schemeTypeId: string, fieldId: string) => {
    const schemeType = schemeTypes.find(t => t.id === schemeTypeId)
    if (schemeType) {
      const updatedFields = schemeType.fields.filter(field => field.id !== fieldId)
      updateSchemeType(schemeTypeId, { fields: updatedFields })
    }
  }

  const duplicateSchemeType = (id: string) => {
    const original = schemeTypes.find(t => t.id === id)
    if (original) {
      const duplicate: SchemeType = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        name: `${original.name}-copy`,
        label: `${original.label} (Copy)`
      }
      setSchemeTypes([...schemeTypes, duplicate])
    }
  }

  const selectedType = schemeTypes.find(t => t.id === selectedSchemeType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Moderation Panel</h2>
          <p className="text-gray-600">Configure scheme types and their associated fields</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={saveConfiguration} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button variant="outline" onClick={loadConfiguration} disabled={loading}>
            <Database className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Reload'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scheme-types" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scheme-types">Scheme Types</TabsTrigger>
          <TabsTrigger value="field-management">Field Management</TabsTrigger>
          <TabsTrigger value="export-import">Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="scheme-types" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scheme Types List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <FileType className="h-5 w-5" />
                      <span>Scheme Types</span>
                    </CardTitle>
                    <Button size="sm" onClick={addSchemeType}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {schemeTypes.map(type => (
                    <div
                      key={type.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSchemeType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSchemeType(type.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{type.label}</span>
                            {!type.enabled && (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateSchemeType(type.id)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSchemeType(type.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Scheme Type Details */}
            <div className="lg:col-span-2">
              {selectedType ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Configure: {selectedType.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Basic Settings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="type-name">Type Name</Label>
                          <Input
                            id="type-name"
                            value={selectedType.name}
                            onChange={(e) => updateSchemeType(selectedType.id, { name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="type-label">Display Label</Label>
                          <Input
                            id="type-label"
                            value={selectedType.label}
                            onChange={(e) => updateSchemeType(selectedType.id, { label: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="type-description">Description</Label>
                        <Textarea
                          id="type-description"
                          value={selectedType.description}
                          onChange={(e) => updateSchemeType(selectedType.id, { description: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={selectedType.enabled}
                          onCheckedChange={(enabled) => updateSchemeType(selectedType.id, { enabled })}
                        />
                        <Label>Enabled</Label>
                      </div>
                    </div>

                    <Separator />

                    {/* Advanced Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Advanced Settings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedType.slabSupported}
                            onCheckedChange={(slabSupported) => updateSchemeType(selectedType.id, { slabSupported })}
                          />
                          <Label>Slab Support</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedType.excelRequired}
                            onCheckedChange={(excelRequired) => updateSchemeType(selectedType.id, { excelRequired })}
                          />
                          <Label>Excel Required</Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Commission Types */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Commission Types</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedType.commissionTypes.map((type, index) => (
                          <Badge key={index} variant="outline">{type}</Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Workflow Steps */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Workflow Steps</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedType.workflow.map((step, index) => (
                          <Badge key={index}>{step}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Settings2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Select a scheme type to configure</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="field-management" className="space-y-6">
          {selectedType ? (
            <FieldManagement
              schemeType={selectedType}
              onAddField={(field) => addField(selectedType.id, field)}
              onUpdateField={(fieldId, updates) => updateField(selectedType.id, fieldId, updates)}
              onDeleteField={(fieldId) => deleteField(selectedType.id, fieldId)}
              editingField={editingField}
              setEditingField={setEditingField}
              isAddingField={isAddingField}
              setIsAddingField={setIsAddingField}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a scheme type from the Scheme Types tab to manage its fields.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="export-import" className="space-y-6">
          <ExportImport
            schemeTypes={schemeTypes}
            onImport={setSchemeTypes}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Field Management Component
function FieldManagement({ 
  schemeType, 
  onAddField, 
  onUpdateField, 
  onDeleteField,
  editingField,
  setEditingField,
  isAddingField,
  setIsAddingField
}: {
  schemeType: SchemeType
  onAddField: (field: SchemeField) => void
  onUpdateField: (fieldId: string, updates: Partial<SchemeField>) => void
  onDeleteField: (fieldId: string) => void
  editingField: SchemeField | null
  setEditingField: (field: SchemeField | null) => void
  isAddingField: boolean
  setIsAddingField: (adding: boolean) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Fields for {schemeType.label}</h3>
        <Button onClick={() => setIsAddingField(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Fields List */}
      <div className="space-y-4">
        {schemeType.fields.map(field => (
          <Card key={field.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{field.label}</span>
                    <Badge variant="outline">{field.type}</Badge>
                    {field.required && <Badge variant="destructive">Required</Badge>}
                    {field.group && <Badge variant="secondary">{field.group}</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Name: {field.name}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingField(field)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Field Editor */}
      {(isAddingField || editingField) && (
        <FieldEditor
          field={editingField}
          onSave={(field) => {
            if (editingField) {
              onUpdateField(editingField.id, field)
            } else {
              onAddField({
                ...field,
                id: `field-${Date.now()}`
              })
            }
          }}
          onCancel={() => {
            setIsAddingField(false)
            setEditingField(null)
          }}
        />
      )}
    </div>
  )
}

// Field Editor Component
function FieldEditor({
  field,
  onSave,
  onCancel
}: {
  field: SchemeField | null
  onSave: (field: SchemeField) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Partial<SchemeField>>(
    field || {
      name: '',
      label: '',
      type: 'text',
      required: false,
      description: '',
      group: 'basic'
    }
  )

  const handleSave = () => {
    if (!formData.name || !formData.label) {
      toast.error('Name and label are required')
      return
    }

    onSave(formData as SchemeField)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{field ? 'Edit Field' : 'Add New Field'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="field-name">Field Name</Label>
            <Input
              id="field-name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="fieldName"
            />
          </div>
          <div>
            <Label htmlFor="field-label">Display Label</Label>
            <Input
              id="field-label"
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Field Label"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="field-type">Field Type</Label>
            <Select 
              value={formData.type || 'text'} 
              onValueChange={(type) => setFormData({ ...formData, type: type as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="field-group">Group</Label>
            <Input
              id="field-group"
              value={formData.group || ''}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              placeholder="basic"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="field-description">Description</Label>
          <Textarea
            id="field-description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Field description"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.required || false}
            onCheckedChange={(required) => setFormData({ ...formData, required })}
          />
          <Label>Required Field</Label>
        </div>

        {(formData.type === 'select' || formData.type === 'multiselect') && (
          <div>
            <Label htmlFor="field-options">Options (one per line)</Label>
            <Textarea
              id="field-options"
              value={formData.options?.join('\n') || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                options: e.target.value.split('\n').filter(opt => opt.trim()) 
              })}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Field
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Export/Import Component
function ExportImport({
  schemeTypes,
  onImport
}: {
  schemeTypes: SchemeType[]
  onImport: (types: SchemeType[]) => void
}) {
  const handleExport = () => {
    const dataStr = JSON.stringify(schemeTypes, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'scheme-configuration.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Configuration exported successfully')
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        onImport(imported)
        toast.success('Configuration imported successfully')
      } catch (error) {
        toast.error('Invalid configuration file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Export your current scheme configuration as a JSON file for backup or sharing.
          </p>
          <Button onClick={handleExport}>
            <Database className="h-4 w-4 mr-2" />
            Export Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Import a previously exported configuration file. This will replace your current configuration.
          </p>
          <Input
            type="file"
            accept=".json"
            onChange={handleImport}
          />
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Remember to save your configuration after importing to persist the changes.
        </AlertDescription>
      </Alert>
    </div>
  )
}