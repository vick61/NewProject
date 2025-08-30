import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Calculator, Download, RefreshCw, Search, TrendingUp, Users, FileText, Play, CheckCircle, BarChart3, Upload, Database } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'

// Import types and services
import type { Scheme, Upload as UploadType, Calculation } from './types/ViewCalculationsTypes'
import { fetchSchemes, fetchUploads, fetchCalculations, calculateScheme } from './services/ViewCalculationsService'
import { exportCalculation, exportDistributorArticleSummary, exportAllCalculations, exportAllDistributorArticleSummaries, exportDistributorArticleLevel, exportSchemeDistributorLevel } from './utils/ViewCalculationsExports'

// Import tab components
import LatestCalculationTab from './tabs/LatestCalculationTab'

export default function ViewCalculations() {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [uploads, setUploads] = useState<UploadType[]>([])
  const [calculations, setCalculations] = useState<Calculation[]>([])
  const [selectedScheme, setSelectedScheme] = useState('')
  const [selectedUpload, setSelectedUpload] = useState('all-sales-data')

  const [currentCalculation, setCurrentCalculation] = useState<Calculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScheme, setFilterScheme] = useState('all')
  const [calculationsError, setCalculationsError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  // Initialize selectedUpload when uploads are loaded
  useEffect(() => {
    if (uploads.length > 0 && !selectedUpload) {
      setSelectedUpload('all-sales-data')
    }
  }, [uploads])

  const fetchAllData = async () => {
    setLoading(true)
    setCalculationsError(null)
    
    try {
      // Fetch schemes and uploads first (these are smaller datasets)
      const [schemesData, uploadsData] = await Promise.all([
        fetchSchemes(),
        fetchUploads()
      ])
      setSchemes(schemesData)
      setUploads(uploadsData)
      
      // Try to fetch calculations with timeout handling
      try {
        const calculationsData = await fetchCalculations(50, 0) // Limit to 50 most recent
        setCalculations(calculationsData)
      } catch (calculationsError) {
        console.error('Error fetching calculations:', calculationsError)
        const errorMessage = calculationsError instanceof Error ? calculationsError.message : 'Unknown error'
        
        // Handle timeout errors more gracefully
        if (errorMessage.includes('timeout')) {
          setCalculationsError('Calculations data is taking too long to load. The system may have too much historical data. Recent calculations functionality is temporarily unavailable.')
          setCalculations([])
        } else {
          setCalculationsError(`Failed to load calculations: ${errorMessage}`)
          setCalculations([])
        }
      }
    } catch (error) {
      console.error('Error fetching main data:', error)
      toast.error('Failed to fetch schemes and uploads data')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateScheme = async () => {
    if (!selectedScheme) {
      toast.error('Please select a scheme to calculate')
      return
    }

    if (uploads.length === 0) {
      toast.error('No sales data available. Please upload sales data first.')
      return
    }

    setLoading(true)
    const startTime = Date.now()
    
    try {
      const result = await calculateScheme(selectedScheme, selectedUpload === 'all-sales-data' ? '' : selectedUpload)
      
      if (result.success) {
        // The new chunked API returns calculationId and metadata
        const processingTime = Date.now() - startTime
        
        toast.success(
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Calculation Completed Successfully!</p>
              <p className="text-sm text-gray-600">
                {result.totalRecords?.toLocaleString() || 0} detailed records generated • 
                Stored in {result.totalChunks || 1} chunks • 
                {(processingTime / 1000).toFixed(1)}s
              </p>
            </div>
          </div>,
          { duration: 6000 }
        )
        
        // Refresh data to show latest calculation
        await fetchAllData()
        
        setSelectedScheme('')
        setSelectedUpload('all-sales-data')
      } else {
        toast.error(`Calculation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error calculating scheme:', error)
      let errorMessage = 'Failed to calculate scheme'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Handle specific timeout errors
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Calculation timed out. This may be due to a large dataset. Please try with smaller data sets or contact support.'
        } else if (errorMessage.includes('statement timeout')) {
          errorMessage = 'Database operation timed out. The system may be processing too much data. Please try again or contact support.'
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast.error(
        <div>
          <p className="font-medium">Calculation Error</p>
          <p className="text-sm text-gray-600">{errorMessage}</p>
        </div>,
        { duration: 8000 }
      )
    } finally {
      setLoading(false)
    }
  }

  // Filter calculations based on filter criteria only
  const filteredCalculations = calculations.filter(calc => {
    const matchesFilter = filterScheme === 'all' || calc.schemeId === filterScheme
    return matchesFilter
  })

  // Calculate summary statistics
  const totalCommission = calculations.reduce((sum, calc) => sum + calc.totalCommission, 0)
  const totalEntries = calculations.reduce((sum, calc) => sum + calc.calculations.length, 0)
  const totalDistributorArticleCombinations = calculations.reduce((sum, calc) => sum + (calc.totalDistributorArticleCombinations || 0), 0)
  const uniqueDistributors = new Set(
    calculations.flatMap(calc => calc.calculations.map(detail => detail.distributorId))
  ).size

  // Safe lookups with null checks
  const selectedSchemeData = schemes.find(s => s && s.id === selectedScheme) || null
  const selectedUploadData = selectedUpload && selectedUpload !== 'all-sales-data' 
    ? uploads.find(u => u && u.id === selectedUpload) || null 
    : null

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Calculations</p>
                <p className="text-2xl font-bold">{calculations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Commission</p>
                <p className="text-2xl font-bold">₹{totalCommission.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Distributor-Article Combinations</p>
                <p className="text-2xl font-bold">{totalDistributorArticleCombinations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Unique Distributors</p>
                <p className="text-2xl font-bold">{uniqueDistributors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert for Calculations */}
      {calculationsError && (
        <Alert className="border-orange-200 bg-orange-50">
          <BarChart3 className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Calculations Loading Issue:</strong> {calculationsError}
            <div className="mt-2">
              <Button 
                onClick={fetchAllData} 
                variant="outline" 
                size="sm"
                disabled={loading}
                className="ml-0"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Sales Data Alert */}
      {uploads.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Upload className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>No Sales Data Available:</strong> You need to upload sales data before you can run calculations. 
            Please go to the "Upload Data" tab to upload your sales data first.
          </AlertDescription>
        </Alert>
      )}

      {/* Available Sales Data Summary */}
      {uploads.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Database className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Sales Data Available:</strong> {uploads.length} sales data upload(s) ready for calculation.
            <div className="mt-2 text-sm">
              Available periods: {uploads.map(u => `${u.month} ${u.year}`).join(', ')}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Calculation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Calculate New Commission</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <strong>Booster Schemes (per_unit):</strong> Use cumulative quantity-based calculation where commission is recalculated as sales accumulate chronologically. Each sale contributes to the cumulative total, and commission = slab_rate × cumulative_total_quantity.
              <br />
              <strong>Article Schemes:</strong> Use multi-slab logic where sales are grouped by distributor-article combination, and commission = slab_rate × total_quantity.
              <br />
              <strong>Negative Quantity Rule:</strong> If the total/cumulative quantity is negative, commission is automatically set to zero.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Scheme</label>
              <Select value={selectedScheme} onValueChange={setSelectedScheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scheme" />
                </SelectTrigger>
                <SelectContent>
                  {schemes.filter(scheme => scheme && scheme.id).map(scheme => (
                    <SelectItem key={scheme.id} value={scheme.id}>
                      {scheme.name} ({scheme.type === 'per_unit' ? 'Booster' : scheme.type === 'article' ? 'Article Scheme' : scheme.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSchemeData && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Type:</span> {selectedSchemeData.type === 'per_unit' ? 'Booster' : selectedSchemeData.type === 'article' ? 'Article Scheme' : selectedSchemeData.type}</p>
                    <p><span className="font-medium">Period:</span> {selectedSchemeData.startDate} to {selectedSchemeData.endDate}</p>
                    <p><span className="font-medium">Slab Type:</span> {selectedSchemeData.slabType}</p>
                    <p><span className="font-medium">Commission Type:</span> {
                      selectedSchemeData.commissionType === 'fixed' ? 'Fixed' :
                      selectedSchemeData.commissionType === 'absolute_per_unit' ? 'Absolute(per unit)' :
                      selectedSchemeData.commissionType === 'percentage' ? 'Percentage' :
                      selectedSchemeData.commissionType
                    }</p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Select Sales Data</label>
              {uploads.length > 0 ? (
                <Select value={selectedUpload || 'all-sales-data'} onValueChange={setSelectedUpload}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose sales data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sales-data">All Sales Data (Recommended)</SelectItem>
                    {uploads.map(upload => (
                      <SelectItem key={upload.id} value={upload.id}>
                        {upload.month} {upload.year} ({upload.data?.length || 0} records)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm">
                  No sales data available. Please upload sales data first.
                </div>
              )}
              {selectedUploadData && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <div className="text-sm space-y-1 text-blue-700">
                    <p><span className="font-medium">File:</span> {selectedUploadData.fileName}</p>
                    <p><span className="font-medium">Period:</span> {selectedUploadData.month} {selectedUploadData.year}</p>
                    <p><span className="font-medium">Records:</span> {selectedUploadData.data?.length || 0}</p>
                    <p><span className="font-medium">Uploaded:</span> {new Date(selectedUploadData.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              {(!selectedUpload || selectedUpload === 'all-sales-data') && uploads.length > 0 && (
                <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="text-sm space-y-1 text-green-700">
                    <p><span className="font-medium">✓ All Sales Data Selected:</span> The system will use all available sales data</p>
                    <p className="text-xs">
                      Available periods: {uploads.map(u => `${u.month} ${u.year}`).join(', ')} ({uploads.reduce((sum, u) => sum + (u.data?.length || 0), 0)} total records)
                    </p>
                  </div>
                </div>
              )}
              {selectedUpload && selectedUpload !== 'all-sales-data' && selectedUploadData && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="text-sm space-y-1 text-blue-700">
                    <p><span className="font-medium">✓ Specific Period Selected:</span> {selectedUploadData.month} {selectedUploadData.year}</p>
                    <p className="text-xs">
                      Records: {selectedUploadData.data?.length || 0} • Uploaded: {new Date(selectedUploadData.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {schemes.length === 0 && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No schemes found. Please create a scheme first before calculating commissions.
              </AlertDescription>
            </Alert>
          )}

          {uploads.length === 0 && (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                No sales data found. Please upload sales data first before calculating commissions.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <div className="flex space-x-2">
              <Button onClick={fetchAllData} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    console.log('Testing debug endpoint...')
                    const debugUrl = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/debug/route-test`
                    const response = await fetch(debugUrl, {
                      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                    })
                    console.log('Debug test result:', {
                      status: response.status,
                      ok: response.ok,
                      result: response.ok ? await response.json() : await response.text()
                    })
                    toast.success('Debug endpoint test completed - check console')
                  } catch (error) {
                    console.error('Debug test failed:', error)
                    toast.error('Debug endpoint test failed')
                  }
                }}
                variant="outline" 
                size="sm"
              >
                Test Debug
              </Button>
            </div>
            <Button 
              onClick={handleCalculateScheme} 
              disabled={!selectedScheme || uploads.length === 0 || loading}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Calculating...' : 'Calculate Commission'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="results">All Calculation Results</TabsTrigger>
          <TabsTrigger value="current">Latest Calculation</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {/* Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-64">
                  <Select value={filterScheme} onValueChange={setFilterScheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schemes</SelectItem>
                      {schemes.map(scheme => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          {scheme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Calculation History ({filteredCalculations.length})</span>
                <Button onClick={fetchAllData} variant="outline" size="sm" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCalculations.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {calculations.length === 0 ? 'No Calculations Yet' : 'No Results Found'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {calculations.length === 0  
                      ? 'Create schemes and upload sales data to start calculating commissions.' 
                      : 'Try adjusting your filter criteria.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCalculations
                    .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())
                    .map(calculation => {
                      const scheme = schemes.find(s => s.id === calculation.schemeId)
                      const upload = uploads.find(u => u.id === calculation.uploadId)
                      
                      return (
                        <div key={calculation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-lg">{scheme?.name || 'Unknown Scheme'}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span>Calculated: {new Date(calculation.calculatedAt).toLocaleDateString()}</span>
                                {upload && <span>Sales Period: {upload.month} {upload.year}</span>}
                                {!upload && <span>Used: All Sales Data</span>}
                                <span>Detailed Records: {calculation.calculations.length}</span>
                                {calculation.totalDistributorArticleCombinations && (
                                  <span>Distributor-Article Combinations: {calculation.totalDistributorArticleCombinations}</span>
                                )}
                                {calculation.calculationType && (
                                  <Badge variant="outline">{calculation.calculationType}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">
                                  ₹{calculation.totalCommission.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">Total Commission</div>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <Button 
                                  onClick={() => setCurrentCalculation(calculation)}
                                  variant="outline" 
                                  size="sm"
                                >
                                  View Detail
                                </Button>
                                <div className="flex flex-wrap gap-1">
                                  <Button 
                                    onClick={() => exportCalculation(calculation, schemes, uploads)}
                                    variant="outline" 
                                    size="sm"
                                    title="Export Detailed Records"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {calculation.distributorArticleSummary && calculation.distributorArticleSummary.length > 0 && (
                                    <Button
                                      onClick={() => exportDistributorArticleSummary(calculation, schemes, uploads)}
                                      variant="outline"
                                      size="sm"
                                      title="Export Distributor-Article Summary"
                                    >
                                      <BarChart3 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => exportDistributorArticleLevel([calculation], schemes, uploads)}
                                    variant="outline"
                                    size="sm"
                                    title="Export Distributor+Article Level"
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => exportSchemeDistributorLevel([calculation], schemes, uploads)}
                                    variant="outline"
                                    size="sm"
                                    title="Export Scheme+Distributor Level"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          <LatestCalculationTab
            currentCalculation={currentCalculation}
            schemes={schemes}
            uploads={uploads}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}