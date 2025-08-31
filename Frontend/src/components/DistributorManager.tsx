import React, { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Users, Plus, Edit, Trash2, Check, X, Building2, Upload, Info, Search, Download, File, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { authService } from './AuthService'

type DistributorStatus = 'active' | 'inactive' | 'pending'

interface Distributor {
  id: string
  name: string
  code: string
  type: string
  zone: string
  state: string
  status: DistributorStatus
  onboardedAt: string
}

interface DistributorRecord {
  id: string
  name: string
  type: string
  zone: string
  state: string
  errors: string[]
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

export default function DistributorManager() {
  const [activeTab, setActiveTab] = useState('onboard')
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null)
  const [zoneStateMapping, setZoneStateMapping] = useState<Record<string, string[]>>({})

  // Bulk upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [parsedData, setParsedData] = useState<DistributorRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: '',
    zone: '',
    state: ''
  })

  useEffect(() => {
    loadDistributors()
    loadZoneStateMapping()
  }, [])

  const loadZoneStateMapping = async () => {
    try {
      const response = await authService.makePublicRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/zone-state-mapping`, {
        method: 'GET'
      })
      
      const responseText = await response.text()
      console.log('Raw zone-state mapping response:', responseText)
      
      if (!response.ok) {
        console.error('Zone-state mapping response not ok:', response.status, responseText)
        return
      }
      
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Zone-state mapping JSON parse error:', parseError, 'Raw text:', responseText)
        return
      }
      
      if (result.success) {
        setZoneStateMapping(result.mapping || {})
      } else {
        console.error('Zone-state mapping API returned error:', result.error)
      }
    } catch (error) {
      console.error('Error fetching zone-state mapping:', error)
    }
  }

  const loadDistributors = async () => {
    try {
      console.log('Loading distributors...')
      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors`, {
        method: 'GET'
      })
      
      const responseText = await response.text()
      console.log('Raw distributor response:', responseText)
      
      if (!response.ok) {
        console.error('Distributor response not ok:', response.status, responseText)
        toast.error(`Failed to load distributors: ${response.status} ${response.statusText}`)
        return
      }
      
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Distributor JSON parse error:', parseError, 'Raw text:', responseText)
        toast.error('Failed to parse distributors response')
        return
      }
      
      if (result.success) {
        const distributorList = result.distributors?.map((item: any) => item.value) || []
        console.log('Loaded distributors:', distributorList.length)
        setDistributors(distributorList)
        setFilteredDistributors(distributorList)
      } else {
        console.error('API returned error:', result.error)
        toast.error(`Failed to load distributors: ${result.error}`)
      }
    } catch (error) {
      console.error('Error fetching distributors:', error)
      toast.error('Failed to load distributors')
    }
  }

  const getStatesForZone = () => {
    if (!formData.zone || formData.zone === 'all-zones') {
      return Object.values(zoneStateMapping).flat()
    }
    return zoneStateMapping[formData.zone] || []
  }

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setFilteredDistributors(distributors)
      return
    }
    
    const searchTerm = query.toLowerCase().trim()
    const filtered = distributors.filter((distributor) => 
      distributor.id?.toLowerCase().includes(searchTerm) ||
      distributor.code?.toLowerCase().includes(searchTerm) ||
      distributor.name?.toLowerCase().includes(searchTerm)
    )
    
    setFilteredDistributors(filtered)
  }

  // Update filtered distributors when distributors list changes
  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery)
    } else {
      setFilteredDistributors(distributors)
    }
  }, [distributors])

  const updateFormField = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      if (field === 'zone') {
        updated.state = ''
      }
      
      return updated
    })
  }

  const createDistributorCode = (name: string, type: string, id: string = '') => {
    const prefix = type || 'DIST'
    const namePart = name.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    const idPart = id || Date.now().toString().slice(-4)
    return `${prefix}_${namePart}_${idPart}`
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const distributorData = {
        id: formData.id || `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        code: createDistributorCode(formData.name, formData.type, formData.id),
        type: formData.type,
        zone: formData.zone,
        state: formData.state,
        status: 'active' as DistributorStatus
      }

      const url = editingDistributor 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/${editingDistributor.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors`

      const response = await authService.makeAuthenticatedRequest(url, {
        method: editingDistributor ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(distributorData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingDistributor ? 'Distributor updated successfully!' : 'Distributor added successfully!')
        clearForm()
        loadDistributors()
        setActiveTab('manage')
      } else {
        toast.error(`Failed to ${editingDistributor ? 'update' : 'add'} distributor: ${result.error}`)
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
      id: '',
      name: '',
      type: '',
      zone: '',
      state: ''
    })
    setEditingDistributor(null)
  }

  const editDistributor = (distributor: Distributor) => {
    setFormData({
      id: distributor.code || distributor.id,
      name: distributor.name,
      type: distributor.type,
      zone: distributor.zone,
      state: distributor.state
    })
    setEditingDistributor(distributor)
    setActiveTab('onboard')
  }

  const deleteDistributor = async (distributorId: string) => {
    if (!confirm('Are you sure you want to delete this distributor?')) return

    try {
      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/${distributorId}`, {
        method: 'DELETE'
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
      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/${distributorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
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

  // Bulk upload functionality
  const downloadTemplate = () => {
    const templateData = [
      'Distributor ID,Distributor Name,Type,Zone,State',
      'DIST001,ABC Electronics Pvt Ltd,P1,North1,Delhi',
      'DIST002,XYZ Distributors,P2,West,Maharashtra',
      'DIST003,Regional Sales Corp,P3,South,Karnataka',
      'DIST004,Metro Retail Chain,P4,East,West Bengal',
      'DIST005,Direct Dealer Hub,P5,North2,Punjab'
    ].join('\n')

    const blob = new Blob([templateData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'distributor_bulk_upload_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Template downloaded successfully!')
  }

  // Normalize header names for flexible matching
  const normalizeHeader = (header: string): string => {
    return header.toLowerCase()
      .replace(/[^a-z]/g, '') // Remove all non-letter characters
      .trim()
  }

  const findHeaderIndex = (headers: string[], targetHeader: string): number => {
    const normalizedTarget = normalizeHeader(targetHeader)
    return headers.findIndex(header => normalizeHeader(header) === normalizedTarget)
  }

  const parseCSVFile = (file: File) => {
    console.log('Parsing CSV file:', file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        console.log('CSV file content length:', text.length)
        
        // Handle different line endings and split into lines
        const lines = text
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split('\n')
          .filter(line => line.trim())
        
        console.log('Total lines found:', lines.length)
        
        if (lines.length < 2) {
          toast.error('CSV file must contain header row and at least one data row')
          return
        }

        // Parse CSV properly handling quoted values and commas within quotes
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''))
              current = ''
            } else {
              current += char
            }
          }
          
          // Add the last field
          result.push(current.trim().replace(/^"|"$/g, ''))
          return result
        }

        const headers = parseCSVLine(lines[0])
        console.log('CSV headers found:', headers)
        
        const rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => parseCSVLine(line))
          .filter(row => row.some(cell => cell.trim() !== ''))
        
        console.log('CSV rows parsed:', rows.length)
        console.log('Sample row:', rows[0])
        
        if (rows.length === 0) {
          toast.error('No valid data rows found in CSV file')
          return
        }
        
        processFileData(headers, rows)
      } catch (error) {
        console.error('CSV parsing error:', error)
        toast.error('Failed to parse CSV file. Please check the file format.')
      }
    }
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      toast.error('Error reading CSV file')
    }
    
    reader.readAsText(file, 'UTF-8')
  }

  const parseExcelFile = async (file: File) => {
    try {
      console.log('Attempting to parse Excel file:', file.name)
      
      // Try to import XLSX library with multiple fallback approaches
      let XLSX: any = null
      
      try {
        // Try dynamic import first
        XLSX = await import('xlsx')
        console.log('Successfully loaded XLSX via dynamic import')
        parseExcelWithXLSX(file, XLSX)
      } catch (dynamicImportError) {
        console.log('Dynamic import failed, trying alternative approaches')
        
        // Try loading from CDN as fallback
        try {
          // Load XLSX from CDN
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
          script.onload = () => {
            console.log('XLSX loaded from CDN')
            // @ts-ignore - XLSX is loaded globally
            XLSX = window.XLSX
            if (XLSX) {
              parseExcelWithXLSX(file, XLSX)
            } else {
              fallbackToCSV()
            }
          }
          script.onerror = () => {
            console.error('Failed to load XLSX from CDN')
            fallbackToCSV()
          }
          document.head.appendChild(script)
          return // Exit here and wait for script to load
        } catch (cdnError) {
          console.error('CDN loading failed:', cdnError)
          fallbackToCSV()
          return
        }
      }
      
    } catch (error) {
      console.error('Excel parsing setup error:', error)
      fallbackToCSV()
    }
  }

  const parseExcelWithXLSX = (file: File, XLSX: any) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        console.log('Reading Excel file data...')
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          toast.error('Excel file contains no worksheets')
          return
        }
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        console.log(`Processing worksheet: ${sheetName}`)
        
        // Convert to JSON with header row as array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        
        console.log('Raw Excel data:', jsonData)
        
        if (!jsonData || jsonData.length < 2) {
          toast.error('Excel file must contain header row and at least one data row')
          return
        }

        const headers = (jsonData[0] as any[]).map((h: any) => {
          const headerStr = String(h || '').trim()
          console.log('Header:', headerStr)
          return headerStr
        })
        
        const rows = jsonData.slice(1)
          .filter((row: any[]) => row && row.some((cell: any) => String(cell || '').trim() !== ''))
          .map((row: any[]) => 
            (row as any[]).map((cell: any) => String(cell || '').trim())
          )
        
        console.log('Parsed Excel headers:', headers)
        console.log('Parsed Excel rows:', rows.length)
        console.log('Sample row:', rows[0])
        
        if (rows.length === 0) {
          toast.error('No valid data rows found in Excel file')
          return
        }
        
        processFileData(headers, rows)
      } catch (parseError) {
        console.error('Excel parsing error:', parseError)
        toast.error('Failed to parse Excel file. Please check the file format and try again.')
      }
    }
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      toast.error('Error reading Excel file')
    }
    
    reader.readAsArrayBuffer(file)
  }

  const fallbackToCSV = () => {
    toast.error('Excel parsing is not available. Please convert your file to CSV format and upload again.')
  }

  const processFileData = (headers: string[], rows: string[][]) => {
    console.log('Processing file data with headers:', headers)
    console.log('Processing file data with rows:', rows.length)
    
    // Define expected headers and their variations
    const expectedHeaders = [
      { field: 'id', variations: ['distributor id', 'distributorid', 'distributor_id', 'id'] },
      { field: 'name', variations: ['distributor name', 'distributorname', 'distributor_name', 'name'] },
      { field: 'type', variations: ['type', 'distributor type', 'distributortype', 'distributor_type'] },
      { field: 'zone', variations: ['zone'] },
      { field: 'state', variations: ['state'] }
    ]
    
    // Find header indices
    const headerMapping: Record<string, number> = {}
    const missingHeaders: string[] = []
    
    for (const expectedHeader of expectedHeaders) {
      let foundIndex = -1
      
      // Try to find a matching header
      for (const variation of expectedHeader.variations) {
        foundIndex = findHeaderIndex(headers, variation)
        if (foundIndex !== -1) break
      }
      
      if (foundIndex !== -1) {
        headerMapping[expectedHeader.field] = foundIndex
        console.log(`Mapped ${expectedHeader.field} to column ${foundIndex} (${headers[foundIndex]})`)
      } else {
        missingHeaders.push(expectedHeader.variations[0]) // Use the first variation as display name
      }
    }
    
    console.log('Header mapping:', headerMapping)
    console.log('Missing headers:', missingHeaders)
    
    if (missingHeaders.length > 0) {
      toast.error(`Missing required columns: ${missingHeaders.join(', ')}`)
      setValidationErrors([`Missing columns: ${missingHeaders.join(', ')}`])
      return
    }

    const data: DistributorRecord[] = []
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i]
      
      if (!values || values.every(v => !v || v.trim() === '')) continue
      
      if (values.length < Math.max(...Object.values(headerMapping)) + 1) {
        errors.push(`Row ${i + 2}: Insufficient columns`)
        continue
      }

      const record: DistributorRecord = {
        id: values[headerMapping.id] || '',
        name: values[headerMapping.name] || '',
        type: values[headerMapping.type] || '',
        zone: values[headerMapping.zone] || '',
        state: values[headerMapping.state] || '',
        errors: []
      }

      console.log(`Processing record ${i + 1}:`, record)

      // Validate required fields
      if (!record.id) record.errors.push('Distributor ID is required')
      if (!record.name) record.errors.push('Distributor name is required')
      if (!record.type) record.errors.push('Type is required')
      if (!record.zone) record.errors.push('Zone is required')
      if (!record.state) record.errors.push('State is required')

      // Validate type exists
      if (record.type && !distributorTypeOptions.find(opt => opt.code === record.type)) {
        record.errors.push(`Invalid type: ${record.type}. Valid types: ${distributorTypeOptions.map(opt => opt.code).join(', ')}`)
      }

      // Validate zone exists
      if (record.zone && !zoneOptions.includes(record.zone)) {
        record.errors.push(`Invalid zone: ${record.zone}. Valid zones: ${zoneOptions.join(', ')}`)
      }

      // Validate state for zone
      if (record.zone && record.state && zoneStateMapping[record.zone]) {
        if (!zoneStateMapping[record.zone].includes(record.state)) {
          record.errors.push(`State ${record.state} is not valid for zone ${record.zone}. Valid states: ${zoneStateMapping[record.zone].join(', ')}`)
        }
      }

      data.push(record)
    }

    // Collect all validation errors
    const allErrors = [
      ...errors,
      ...data
        .filter(record => record.errors.length > 0)
        .map((record, index) => `Row ${index + 2}: ${record.errors.join(', ')}`)
    ]

    console.log('Processed records:', data.length)
    console.log('Validation errors:', allErrors.length)

    setParsedData(data)
    setValidationErrors(allErrors)
    
    if (allErrors.length === 0) {
      toast.success(`Successfully parsed ${data.length} distributor records`)
    } else {
      toast.warning(`Parsed ${data.length} records with ${allErrors.length} validation errors`)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
      setSelectedFile(file)
      setUploadStatus('idle')
      setParsedData([])
      setValidationErrors([])
      
      // Parse file based on extension
      if (file.name.endsWith('.csv')) {
        console.log('Processing as CSV file')
        parseCSVFile(file)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        console.log('Processing as Excel file')
        parseExcelFile(file)
      } else {
        toast.error('Please upload a CSV or Excel file')
      }
    }
  }

  const handleBulkUpload = async () => {
    console.log('=== STARTING BULK UPLOAD ===')
    console.log('Selected file:', selectedFile?.name)
    console.log('Parsed data length:', parsedData.length)
    console.log('Validation errors:', validationErrors.length)

    if (!selectedFile || parsedData.length === 0) {
      toast.error('Please select a valid file with distributor data')
      return
    }

    const validRecords = parsedData.filter(record => record.errors.length === 0)
    console.log('Valid records:', validRecords.length)
    console.log('Valid records sample:', validRecords.slice(0, 2))

    if (validRecords.length === 0) {
      toast.error('No valid records found. Please fix the errors and try again.')
      return
    }

    setBulkLoading(true)
    
    try {
      console.log('Preparing distributors for upload...')
      const distributorsToUpload = validRecords.map(record => ({
        id: record.id,
        name: record.name,
        code: createDistributorCode(record.name, record.type, record.id),
        type: record.type,
        zone: record.zone,
        state: record.state,
        status: 'active' as DistributorStatus
      }))

      console.log('Distributors to upload:', distributorsToUpload.length)
      console.log('Sample distributor to upload:', distributorsToUpload[0])

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/distributors/bulk`
      console.log('Uploading to URL:', url)

      const response = await authService.makeAuthenticatedRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ distributors: distributorsToUpload })
      })

      console.log('Upload response status:', response.status)
      console.log('Upload response ok:', response.ok)

      const responseText = await response.text()
      console.log('Raw response:', responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError)
        console.error('Raw response text:', responseText)
        throw new Error('Server returned invalid JSON response')
      }

      console.log('Parsed result:', result)

      if (result.success) {
        setUploadStatus('success')
        console.log('✅ Bulk upload successful!')
        toast.success(
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p>Distributors Uploaded Successfully!</p>
              <p className="text-sm text-gray-600">
                {validRecords.length} distributors processed and added to the system
              </p>
            </div>
          </div>,
          { duration: 6000 }
        )
        
        // Reset form and reload data
        setSelectedFile(null)
        setParsedData([])
        setValidationErrors([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        console.log('Reloading distributors after successful upload...')
        await loadDistributors()
        setActiveTab('manage')
      } else {
        setUploadStatus('error')
        console.error('❌ Bulk upload failed:', result.error || result.message)
        toast.error(`Failed to upload distributors: ${result.error || result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error during bulk upload:', error)
      setUploadStatus('error')
      
      if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`)
      } else {
        toast.error('Failed to upload distributors - unknown error occurred')
      }
    } finally {
      setBulkLoading(false)
      console.log('=== BULK UPLOAD COMPLETED ===')
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

  const validRecords = parsedData.filter(record => record.errors.length === 0)
  const invalidRecords = parsedData.filter(record => record.errors.length > 0)

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Distributor Management for Scheme Calculations:</strong> Upload distributors with essential information.
          Required fields: ID, Name, Type, Zone, and State. This data is used for scheme calculations and commission distribution.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="onboard" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>{editingDistributor ? 'Edit Distributor' : 'Add Distributor'}</span>
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Manage ({filteredDistributors.length}{searchQuery ? `/${distributors.length}` : ''})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>{editingDistributor ? 'Edit Distributor' : 'Add New Distributor'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitForm} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id">Distributor ID</Label>
                    <Input
                      id="id"
                      value={formData.id}
                      onChange={(e) => updateFormField('id', e.target.value)}
                      placeholder="Enter distributor ID (e.g., DIST001)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for scheme calculations and sales data mapping
                    </p>
                  </div>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Distributor Type</Label>
                    <Select value={formData.type} onValueChange={(value) => updateFormField('type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {distributorTypeOptions.map((type) => (
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
                        {zoneOptions.map((zone) => (
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
                        {getStatesForZone().map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  {editingDistributor && (
                    <Button type="button" onClick={clearForm} variant="outline">
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : editingDistributor ? 'Update Distributor' : 'Add Distributor'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Bulk Upload Distributors</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <File className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="bulk-file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload CSV or Excel file
                      </span>
                    </Label>
                    <Input
                      ref={fileInputRef}
                      id="bulk-file-upload"
                      type="file"
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      CSV, XLSX or XLS files up to 10MB
                    </p>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <Button 
                      type="button" 
                      onClick={downloadTemplate}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <File className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                    <Badge variant="secondary">
                      {(selectedFile.size / 1024).toFixed(1)}KB
                    </Badge>
                  </div>
                </div>
              )}

              {parsedData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Validation Results</span>
                      <div className="flex space-x-2">
                        <Badge className="bg-green-100 text-green-800">
                          Valid: {validRecords.length}
                        </Badge>
                        {invalidRecords.length > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            Invalid: {invalidRecords.length}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {validationErrors.length > 0 && (
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Validation Errors:</strong>
                          <ul className="mt-2 list-disc list-inside text-sm">
                            {validationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Zone</TableHead>
                            <TableHead>State</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {record.errors.length === 0 ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                              </TableCell>
                              <TableCell>{record.id}</TableCell>
                              <TableCell>{record.name}</TableCell>
                              <TableCell>{record.type}</TableCell>
                              <TableCell>{record.zone}</TableCell>
                              <TableCell>{record.state}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-600">
                        {validRecords.length} valid record(s) ready for upload
                      </div>
                      <div className="space-x-2">
                        <Button
                          onClick={() => {
                            setSelectedFile(null)
                            setParsedData([])
                            setValidationErrors([])
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          variant="outline"
                          disabled={bulkLoading}
                        >
                          Clear
                        </Button>
                        <Button 
                          onClick={handleBulkUpload} 
                          disabled={bulkLoading || validRecords.length === 0}
                        >
                          {bulkLoading ? 'Uploading...' : `Upload ${validRecords.length} Distributors`}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadStatus === 'success' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Distributors uploaded successfully! Check the 'Manage' tab to view them.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Manage Distributors ({filteredDistributors.length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search distributors..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDistributors.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No distributors found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? 'No distributors match your search criteria.' : 'Get started by adding your first distributor.'}
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setActiveTab('onboard')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Distributor
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Onboarded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDistributors.map((distributor) => (
                        <TableRow key={distributor.id}>
                          <TableCell className="font-mono text-sm">{distributor.id}</TableCell>
                          <TableCell className="font-mono text-sm">{distributor.code}</TableCell>
                          <TableCell>{distributor.name}</TableCell>
                          <TableCell>{distributor.type}</TableCell>
                          <TableCell>{distributor.zone}</TableCell>
                          <TableCell>{distributor.state}</TableCell>
                          <TableCell>{renderStatusBadge(distributor.status)}</TableCell>
                          <TableCell>
                            {new Date(distributor.onboardedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => editDistributor(distributor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={distributor.status === 'active' ? 'outline' : 'default'}
                                onClick={() => changeDistributorStatus(distributor.id, distributor.status)}
                              >
                                {distributor.status === 'active' ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteDistributor(distributor.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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