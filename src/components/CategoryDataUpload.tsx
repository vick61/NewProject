import React, { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Alert, AlertDescription } from './ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Upload, File, Download, CheckCircle, AlertCircle, Database, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'

// Import our extracted utilities and services
import { CategoryRecord, CategoryData, RawCategoryData, CategoryDataUploadProps } from './category-data/types'
import { parseCSVData, parseExcelData, processFileData, createCategoryMappings, formatUploadDate } from './category-data/utils'
import { 
  fetchCurrentCategoryData, 
  fetchRawCategoryData, 
  uploadCategoryData, 
  deleteCategoryData, 
  downloadCurrentData, 
  debugCategoryState, 
  downloadCsvFile 
} from './category-data/services'

export default function CategoryDataUpload({ onCategoryDataUploaded, onCategoryDataDeleted }: CategoryDataUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [parsedData, setParsedData] = useState<CategoryRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [currentCategoryData, setCurrentCategoryData] = useState<CategoryData | null>(null)
  const [rawCategoryData, setRawCategoryData] = useState<RawCategoryData | null>(null)
  const [lastDataFetch, setLastDataFetch] = useState<number>(0)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current category data on component mount
  useEffect(() => {
    loadCurrentCategoryData()
    loadRawCategoryData()
  }, [])

  const loadCurrentCategoryData = async (force = false) => {
    try {
      const now = Date.now()
      if (!force && (now - lastDataFetch) < 1000) {
        console.log('Skipping fetch - too recent')
        return
      }

      if (isManualRefreshing && !force) {
        console.log('Manual refresh in progress - skipping automatic fetch')
        return
      }

      console.log('Fetching current category data with cache busting...')
      setCurrentCategoryData(null)
      
      const categoryData = await fetchCurrentCategoryData()
      
      if (categoryData) {
        console.log('Setting current category data:', {
          families: categoryData.families?.length || 0,
          classes: categoryData.classes?.length || 0,
          brands: categoryData.brands?.length || 0,
          articles: Object.keys(categoryData.articleMappings || {}).length,
          uploadId: categoryData.uploadId
        })
        
        setCurrentCategoryData(categoryData)
        setLastDataFetch(now)
      } else {
        console.log('No category data available')
        setCurrentCategoryData(null)
      }
    } catch (error) {
      console.error('Error fetching current category data:', error)
      setCurrentCategoryData(null)
    }
  }

  const loadRawCategoryData = async (force = false) => {
    try {
      if (isManualRefreshing && !force) {
        console.log('Manual refresh in progress - skipping automatic raw data fetch')
        return
      }

      console.log('Fetching raw category data with cache busting...')
      setRawCategoryData(null)
      
      const rawData = await fetchRawCategoryData()
      
      if (rawData) {
        console.log('Setting raw category data:', {
          fileName: rawData.fileName,
          recordCount: rawData.rawData.length,
          uploadedAt: rawData.uploadedAt
        })
        
        setRawCategoryData(rawData)
      } else {
        console.log('No raw category data available')
        setRawCategoryData(null)
      }
    } catch (error) {
      console.error('Error fetching raw category data:', error)
      setRawCategoryData(null)
    }
  }

  const handleDownloadCurrentData = async () => {
    setDownloadLoading(true)
    
    try {
      console.log('Downloading current category data...')
      const { rawData, fileName } = await downloadCurrentData()
      
      downloadCsvFile(rawData, fileName)
      toast.success(`Category data downloaded! (${rawData.length} records from ${fileName})`)
      
    } catch (error) {
      console.error('Error downloading category data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to download category data. Please try again.')
    } finally {
      setDownloadLoading(false)
    }
  }

  const refreshAllData = async () => {
    console.log('Force refreshing all category data...')
    
    setIsManualRefreshing(true)
    
    try {
      // Clear existing state
      setCurrentCategoryData(null)
      setRawCategoryData(null)
      setLastDataFetch(0)
      
      // Add a small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await Promise.all([
        loadCurrentCategoryData(true),
        loadRawCategoryData(true)
      ])
      
      toast.success('Category data refreshed')
    } finally {
      setIsManualRefreshing(false)
    }
  }

  const handleDebugCategoryState = async () => {
    try {
      console.log('Debugging backend category state...')
      const result = await debugCategoryState()
      
      console.log('=== BACKEND DEBUG RESPONSE ===')
      console.log(JSON.stringify(result.debugInfo, null, 2))
      
      toast.success(
        <div className="max-w-md">
          <p className="font-medium">Backend State Debug</p>
          <div className="text-xs mt-1 space-y-1">
            <div>Main Data Families: {result.debugInfo.mainCategoryData.families.join(', ') || 'None'}</div>
            <div>Upload ID: {result.debugInfo.mainCategoryData.uploadId || 'None'}</div>
            <div>Total Uploads: {result.debugInfo.totalUploads}</div>
          </div>
        </div>,
        { duration: 8000 }
      )
    } catch (error) {
      console.error('Debug error:', error)
      toast.error('Debug request failed')
    }
  }

  const handleDeleteCategoryData = async () => {
    setIsDeleting(true)
    
    try {
      console.log('=== STARTING CATEGORY DATA DELETION ===')
      
      const result = await deleteCategoryData()
      
      console.log('Delete category data response:', result)
      
      if (result.success) {
        // Clear local state immediately
        setCurrentCategoryData(null)
        setRawCategoryData(null)
        setLastDataFetch(0)
        
        toast.success(
          <div>
            <p className="font-medium">All Category Data Deleted Successfully!</p>
            <div className="text-sm mt-1">
              {result.deletedUploadsCount} category uploads removed from database
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Deleted at: {new Date(result.deletedAt!).toLocaleString()}
            </div>
          </div>,
          { duration: 5000 }
        )
        
        // Notify parent component about the deletion
        if (onCategoryDataDeleted) {
          console.log('Notifying parent component about category data deletion...')
          onCategoryDataDeleted()
        }
        
        console.log('=== CATEGORY DATA DELETION COMPLETED ===')
      } else {
        throw new Error(result.error || 'Unknown deletion error')
      }
    } catch (error) {
      console.error('Error deleting category data:', error)
      toast.error(
        <div>
          <p className="font-medium">Failed to Delete Category Data</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        </div>
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus('idle')
      setParsedData([])
      setValidationErrors([])
      
      // Parse file based on extension
      if (file.name.endsWith('.csv')) {
        parseCSVFile(file)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseExcelFile(file)
      } else {
        toast.error('Please upload a CSV or Excel file')
      }
    }
  }

  const parseCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const { headers, dataRows } = parseCSVData(text)
        
        console.log('CSV headers found:', headers)
        processData(headers, dataRows)
        
      } catch (error) {
        console.error('Error parsing CSV file:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to parse CSV file. Please check the file format.')
      }
    }
    
    reader.onerror = () => {
      toast.error('Error reading CSV file')
    }
    
    reader.readAsText(file)
  }

  const parseExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const { headers, dataRows } = parseExcelData(data)
        
        console.log('Excel headers found:', headers)
        processData(headers, dataRows)
        
      } catch (error) {
        console.error('Error parsing Excel file:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to parse Excel file. Please check the file format.')
      }
    }
    
    reader.onerror = () => {
      toast.error('Error reading Excel file')
    }
    
    reader.readAsArrayBuffer(file)
  }

  const processData = (headers: string[], dataRows: string[][]) => {
    try {
      const { data, errors } = processFileData(headers, dataRows)
      
      // Collect all validation errors
      const allErrors = [
        ...errors,
        ...data
          .filter(record => record.errors.length > 0)
          .map((record, index) => `Row ${index + 2}: ${record.errors.join(', ')}`)
      ]

      setParsedData(data)
      setValidationErrors(allErrors)
      
      if (allErrors.length === 0) {
        toast.success(`Successfully parsed ${data.length} category records from ${selectedFile?.name}`)
      } else {
        toast.warning(`Parsed ${data.length} records with ${allErrors.length} validation errors from ${selectedFile?.name}`)
      }
    } catch (error) {
      console.error('Error processing file data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process file data')
      setValidationErrors([error instanceof Error ? error.message : 'Unknown processing error'])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || parsedData.length === 0) {
      toast.error('Please select a valid file with category data')
      return
    }

    const validRecords = parsedData.filter(record => record.errors.length === 0)
    if (validRecords.length === 0) {
      toast.error('No valid records found. Please fix the errors and try again.')
      return
    }

    setLoading(true)
    
    try {
      console.log('Starting category data upload...')
      
      // Process the data to create the required mappings
      const mappings = createCategoryMappings(validRecords)

      console.log('Processed upload data:', {
        totalRecords: validRecords.length,
        families: mappings.families.length,
        classes: mappings.classes.length,
        brands: mappings.brands.length,
        familiesList: mappings.families,
        classesList: mappings.classes,
        brandsList: mappings.brands
      })

      const uploadData = {
        fileName: selectedFile.name,
        ...mappings,
        rawData: validRecords,
        totalRecords: parsedData.length,
        validRecords: validRecords.length,
        errorCount: validationErrors.length
      }

      console.log('Sending upload request to backend...')

      const result = await uploadCategoryData(uploadData)
      console.log('Upload response from backend:', result)

      if (result.success) {
        setUploadStatus('success')
        
        console.log('Upload successful, uploadId:', result.uploadId)
        
        // Show success toast with upload ID
        toast.success(
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Category Data Uploaded Successfully!</p>
              <p className="text-sm text-gray-600">
                {validRecords.length} records processed • {mappings.families.length} families • {mappings.classes.length} classes • {mappings.brands.length} brands
              </p>
              <p className="text-xs text-blue-600 font-mono mt-1">
                Upload ID: {result.uploadId}
              </p>
            </div>
          </div>,
          { duration: 6000 }
        )
        
        // Simple refresh approach: Just wait for backend to process and refresh once
        setTimeout(async () => {
          console.log('Refreshing data after upload...')
          await Promise.all([
            loadCurrentCategoryData(true),
            loadRawCategoryData(true)
          ])
        }, 2000)
        
        // Reset form
        setSelectedFile(null)
        setParsedData([])
        setValidationErrors([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Notify parent component that category data was uploaded
        if (onCategoryDataUploaded) {
          console.log('Notifying parent about category data upload...')
          setTimeout(() => {
            onCategoryDataUploaded()
          }, 2500) // Wait for our own refresh to complete first
        }
      } else {
        setUploadStatus('error')
        toast.error(`Upload failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      toast.error('Upload failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload Category Data</h3>
          <p className="text-gray-600 text-sm mb-4">
            Upload a CSV or Excel file containing family, class, brand, and article information.
            This data will be used for creating booster schemes with hierarchical filtering.
          </p>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-4" />
            <div className="space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="category-file-upload"
              />
              <label
                htmlFor="category-file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <File className="h-4 w-4 mr-2" />
                Choose File
              </label>
              <p className="text-xs text-gray-500">CSV or Excel files only</p>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                {uploadStatus === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {uploadStatus === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          )}
        </div>

        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium text-red-800">Validation Errors Found:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <li key={index} className="list-disc list-inside">{error}</li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className="text-xs text-red-600">... and {validationErrors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Parsed Data Preview</h4>
                <p className="text-sm text-gray-600">
                  {parsedData.length} total records • {parsedData.filter(r => r.errors.length === 0).length} valid • {parsedData.filter(r => r.errors.length > 0).length} with errors
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={loading || parsedData.filter(r => r.errors.length === 0).length === 0}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{loading ? 'Uploading...' : 'Upload Data'}</span>
              </Button>
            </div>

            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Family Code</TableHead>
                    <TableHead>Family Name</TableHead>
                    <TableHead>Class Code</TableHead>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Brand Code</TableHead>
                    <TableHead>Brand Name</TableHead>
                    <TableHead>Article Code</TableHead>
                    <TableHead>Article Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((record, index) => (
                    <TableRow key={index} className={record.errors.length > 0 ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono text-xs">{record.familyCode}</TableCell>
                      <TableCell>{record.familyName}</TableCell>
                      <TableCell className="font-mono text-xs">{record.classCode}</TableCell>
                      <TableCell>{record.className}</TableCell>
                      <TableCell className="font-mono text-xs">{record.brandCode}</TableCell>
                      <TableCell>{record.brandName}</TableCell>
                      <TableCell className="font-mono text-xs">{record.articleCode}</TableCell>
                      <TableCell className="truncate max-w-32">{record.articleDescription}</TableCell>
                      <TableCell>
                        {record.errors.length === 0 ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Valid</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            {record.errors.length} error{record.errors.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 text-sm">
                        ... and {parsedData.length - 10} more records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Current Data Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Current Category Data</h3>
          <div className="flex items-center space-x-2">
            <Button
              onClick={refreshAllData}
              variant="outline"
              size="sm"
              disabled={isManualRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </Button>
            <Button
              onClick={handleDebugCategoryState}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Debug State</span>
            </Button>
          </div>
        </div>

        {currentCategoryData ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <span>Active Category Data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleDownloadCurrentData}
                    variant="outline"
                    size="sm"
                    disabled={downloadLoading}
                    className="flex items-center space-x-2"
                  >
                    {downloadLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>Download</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                        className="flex items-center space-x-2"
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span>Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete All Category Data</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all category data from the database. 
                          This action cannot be undone and will affect all schemes that depend on this data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteCategoryData}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete All Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{currentCategoryData.families.length}</div>
                  <div className="text-sm text-blue-700">Families</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{currentCategoryData.classes.length}</div>
                  <div className="text-sm text-green-700">Classes</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{currentCategoryData.brands.length}</div>
                  <div className="text-sm text-purple-700">Brands</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {Object.keys(currentCategoryData.articleMappings || {}).length}
                  </div>
                  <div className="text-sm text-orange-700">Articles</div>
                </div>
              </div>

              {rawCategoryData && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        Last Upload: {rawCategoryData.fileName}
                      </div>
                      <div className="text-gray-600">
                        {rawCategoryData.rawData.length} records • {formatUploadDate(rawCategoryData.uploadedAt).relative}
                      </div>
                    </div>
                    {currentCategoryData.uploadId && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {currentCategoryData.uploadId}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Category Data</h4>
              <p className="text-gray-600 mb-4">
                Upload a CSV or Excel file to get started with category data management.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}