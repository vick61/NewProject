import React, { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Upload, File, Check, X, Info, FolderOpen, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../utils/supabase/info'
import { authService } from './AuthService'

interface SalesRecord {
  monthOfBillingDate: string
  dayOfBillingDate: string
  distributorId: string
  articleId: string
  billingQuantity: number
  netSales: number
  billingDocument: string
}

interface UploadDataProps {
  onDataUploaded?: () => void
}

export default function UploadData({ onDataUploaded }: UploadDataProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [parsedData, setParsedData] = useState<SalesRecord[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus('idle')
      
      // Parse CSV file
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSVFile(file)
      } else {
        toast.error('Please upload a CSV file')
      }
    }
  }

  const parseCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      const data: SalesRecord[] = []
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue
        
        const values = lines[i].split(',').map(v => v.trim())
        const record: SalesRecord = {
          monthOfBillingDate: values[0] || '',
          dayOfBillingDate: values[1] || '',
          distributorId: values[2] || '',
          articleId: values[3] || '',
          billingQuantity: parseFloat(values[4]) || 0,
          netSales: parseFloat(values[5]) || 0,
          billingDocument: values[6] || ''
        }
        data.push(record)
      }
      
      // Check data size limits
      if (data.length > 100000) {
        toast.error(`File contains ${data.length} records. Maximum 100,000 records allowed for optimal performance. Please split your data into smaller files.`)
        setParsedData([])
        return
      }
      
      setParsedData(data)
      toast.success(`Parsed ${data.length} records from CSV`)
    }
    
    reader.onerror = () => {
      toast.error('Error reading file')
    }
    
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !month || !year || parsedData.length === 0) {
      toast.error('Please select a file, month, year and ensure data is parsed')
      return
    }

    setLoading(true)
    
    try {
      const uploadData = {
        fileName: selectedFile.name,
        data: parsedData,
        month,
        year: parseInt(year)
      }

      console.log('Uploading to:', `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/upload-sales-data`)
      console.log('Upload data summary:', {
        fileName: uploadData.fileName,
        recordCount: uploadData.data.length,
        month: uploadData.month,
        year: uploadData.year
      })

      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/upload-sales-data`, {
        method: 'POST',
        body: JSON.stringify(uploadData)
      })

      console.log('Response status:', response.status, response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      let result
      const responseText = await response.text()
      console.log('Raw response:', responseText)

      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text that failed to parse:', responseText)
        
        // Show more detailed error information
        toast.error(
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium">Server Response Error</span>
            </div>
            <div className="text-sm">
              <p>The server returned an invalid response:</p>
              <code className="bg-red-100 px-2 py-1 rounded text-xs block mt-1 max-w-md overflow-hidden">
                {responseText.substring(0, 200)}{responseText.length > 200 ? '...' : ''}
              </code>
              <p className="mt-2">
                Status: {response.status} {response.statusText}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Check the Debug tab for more information about the backend connection.
              </p>
            </div>
          </div>,
          { duration: 10000 }
        )
        
        setUploadStatus('error')
        return
      }

      if (response.ok && result.success) {
        setUploadStatus('success')
        
        // Enhanced success toast with guidance
        toast.success(
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Sales Data Uploaded Successfully!</p>
              <p className="text-sm text-gray-600">
                {parsedData.length} records uploaded for {month} {year}
              </p>
            </div>
          </div>,
          {
            duration: 5000,
          }
        )
        
        // Show info toast about calculation
        setTimeout(() => {
          toast.info(
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Ready for Calculations!</p>
                <p className="text-sm text-gray-600">
                  Go to 'Manage Schemes' or 'View Calculations' tab to run calculations with this data
                </p>
              </div>
            </div>,
            {
              duration: 6000,
            }
          )
        }, 1000)
        
        // Reset form
        setSelectedFile(null)
        setMonth('')
        setYear('')
        setParsedData([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Call callback if provided
        if (onDataUploaded) {
          onDataUploaded()
        }
      } else {
        setUploadStatus('error')
        
        const errorMessage = result?.error || `HTTP ${response.status}: ${response.statusText}`
        
        toast.error(
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium">Upload Failed</span>
            </div>
            <div className="text-sm">
              <p>{errorMessage}</p>
              {response.status === 404 && (
                <p className="text-xs text-gray-600 mt-1">
                  The upload endpoint may not be deployed. Check the Debug tab for backend status.
                </p>
              )}
            </div>
          </div>,
          { duration: 8000 }
        )
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      
      let errorMessage = 'Failed to upload sales data'
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the backend server. Please check if the Supabase Edge Function is deployed.'
        } else if (error.message.includes('NetworkError')) {
          errorMessage = 'Network error occurred. Please check your internet connection.'
        } else {
          errorMessage = `Upload error: ${error.message}`
        }
      }
      
      toast.error(
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="font-medium">Upload Error</span>
          </div>
          <div className="text-sm">
            <p>{errorMessage}</p>
            <p className="text-xs text-gray-600 mt-1">
              Check the Debug tab for more information about the backend connection.
            </p>
          </div>
        </div>,
        { duration: 8000 }
      )
    } finally {
      setLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      'Month of Billing Date,Day of Billing Date,Distributor ID,Article ID,Billing Quantity,Net Sales,Billing Document',
      '01,15,DIST001,ART123456,10,500000,INV001234',
      '01,20,DIST002,ART123457,15,450000,INV001235',
      '01,25,DIST003,ART123458,5,150000,INV001236',
      '02,05,DIST004,ART123459,8,240000,INV001237',
      '02,12,DIST005,ART123460,12,120000,INV001238',
      '02,18,DIST006,ART123461,6,180000,INV001239',
      '03,08,DIST007,ART123462,4,80000,INV001240',
      '03,14,DIST008,ART123459,5,150000,INV001241',
      '03,22,DIST009,ART123456,7,350000,INV001242'
    ].join('\n')

    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_sales_data.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Information Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Updated Format & Performance Limits:</strong> Sales data follows the new billing format with Month, Day, Distributor ID, Article ID, Billing Quantity, Net Sales, and Billing Document. 
          <strong>Maximum 100,000 records per upload</strong> for optimal performance. Make sure your Article IDs match those from your category upload for proper calculations.
        </AlertDescription>
      </Alert>

      {/* Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, index) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upload Sales Data</span>
            <Button onClick={downloadSampleCSV} variant="outline" size="sm">
              <File className="h-4 w-4 mr-2" />
              Download Sample CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg">Drop your CSV file here or click to browse</p>
              <p className="text-sm text-gray-500">
                CSV format: Month of Billing Date, Day of Billing Date, Distributor ID, Article ID, Billing Quantity, Net Sales, Billing Document
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline" 
              className="mt-4"
            >
              Select File
            </Button>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {uploadStatus === 'success' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                )}
                {uploadStatus === 'error' && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <X className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
                <Button
                  onClick={() => {
                    setSelectedFile(null)
                    setParsedData([])
                    setUploadStatus('idle')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Data Preview</h4>
                <Badge variant="outline">{parsedData.length} records</Badge>
              </div>
              
              <div className="max-h-64 overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Month</th>
                      <th className="p-2 text-left">Day</th>
                      <th className="p-2 text-left">Distributor ID</th>
                      <th className="p-2 text-left">Article ID</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Net Sales</th>
                      <th className="p-2 text-left">Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((record, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{record.monthOfBillingDate}</td>
                        <td className="p-2">{record.dayOfBillingDate}</td>
                        <td className="p-2">{record.distributorId}</td>
                        <td className="p-2 font-mono text-xs">{record.articleId}</td>
                        <td className="p-2 text-right">{record.billingQuantity}</td>
                        <td className="p-2 text-right">₹{record.netSales.toLocaleString()}</td>
                        <td className="p-2 text-xs">{record.billingDocument}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                    ... and {parsedData.length - 10} more records
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !month || !year || loading || parsedData.length === 0}
              size="lg"
            >
              {loading ? 'Uploading...' : 'Upload Sales Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success State with Next Steps */}
      {uploadStatus === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Sales Data Uploaded Successfully!</h4>
                <p className="text-sm text-green-700">
                  Your billing data is now ready for scheme calculations. The system will use the Article IDs to map 
                  to the corresponding family, class, and brand information from your category data, along with 
                  distributor information for comprehensive scheme calculations. Head to 'Manage Schemes' or 'View Calculations' 
                  to run calculations with this uploaded data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}