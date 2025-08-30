import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { 
  FileText, 
  Calculator, 
  Download, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Target,
  TrendingUp,
  AlertCircle,
  Play,
  Bug,
  Network,
  Database,
  Upload,
  BarChart3,
  Users,
  Package
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../utils/supabase/info'
import { authService } from './AuthService'

interface Scheme {
  id: string
  name: string
  type: string
  distributorData: any
  catalogType: any
  distIds: any
  articles: any
  slabType: string
  commissionType: string
  startDate: string
  endDate: string
  slabs: any[]
  basicInfo?: {
    slabs?: any[]
    schemeName?: string
    schemeType?: string
    slabType?: string
    commissionType?: string
    // Distributor criteria might also be stored in basicInfo
    zone?: string
    state?: string
    stateData?: string
    stateName?: string
    distributorType?: string
    partnerType?: string
    type?: string
    distributorTypeData?: string
    partnerTypeData?: string
  }
  createdAt: string
  status: string
}

interface Upload {
  id: string
  fileName: string
  month: string
  year: number
  uploadedAt: string
  data: any[]
}

interface Calculation {
  id: string
  schemeId: string
  uploadId: string
  calculations: any[]
  totalCommission: number
  calculatedAt: string
}

interface SchemeWithCalculations extends Scheme {
  calculations: Calculation[]
  totalCommission: number
  lastCalculated?: string
}

export interface ManageSchemesRef {
  refresh: () => void
}

interface ManageSchemesProps {
  shouldRefresh?: boolean
}

const ManageSchemes = forwardRef<ManageSchemesRef, ManageSchemesProps>(({ shouldRefresh }, ref) => {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [uploads, setUploads] = useState<Upload[]>([])
  const [calculations, setCalculations] = useState<Calculation[]>([])
  const [schemesWithCalcs, setSchemesWithCalcs] = useState<SchemeWithCalculations[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set())
  const [selectedUpload, setSelectedUpload] = useState<Record<string, string>>({})
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [lastFetchTime, setLastFetchTime] = useState<string>('')
  const [fetchErrors, setFetchErrors] = useState<string[]>([])
  const [calculatingScheme, setCalculatingScheme] = useState<string | null>(null)

  const fetchAllData = async () => {
    console.log('=== ManageSchemes: Starting fetchAllData ===')
    setLoading(true)
    setFetchErrors([])
    const startTime = new Date().toISOString()
    setLastFetchTime(startTime)
    
    const debugData: any = {
      fetchStartTime: startTime,
      projectId,
      baseUrl: `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43`,
      authToken: await authService.getAccessToken() ? 'Present' : 'Missing'
    }
    
    try {
      // Use allSettled to continue even if some fetches fail
      const results = await Promise.allSettled([
        fetchSchemes(),
        fetchUploads(),  
        fetchCalculations()
      ])
      
      debugData.fetchResults = results.map((result, index) => ({
        endpoint: ['schemes', 'uploads', 'calculations'][index],
        status: result.status,
        ...(result.status === 'rejected' ? { error: result.reason } : {})
      }))
      
      // Track successful vs failed requests
      let successCount = 0
      let failureCount = 0
      
      results.forEach((result, index) => {
        const endpoint = ['schemes', 'uploads', 'calculations'][index]
        
        if (result.status === 'rejected') {
          failureCount++
          const error = `Failed to fetch ${endpoint}: ${result.reason}`
          console.error(error)
          setFetchErrors(prev => [...prev, error])
        } else {
          successCount++
          console.log(`✓ Successfully fetched ${endpoint}`)
        }
      })
      
      console.log(`Fetch summary: ${successCount} successful, ${failureCount} failed`)
      
      // Show success toast if we got at least schemes data
      if (results[0].status === 'fulfilled') {
        console.log('Core scheme data loaded successfully')
      } else {
        console.error('Failed to load core scheme data')
      }
      
    } catch (error) {
      console.error('Error in fetchAllData:', error)
      debugData.fetchError = error?.toString() || 'Unknown error'
      setFetchErrors(prev => [...prev, `General fetch error: ${error}`])
    } finally {
      debugData.fetchEndTime = new Date().toISOString()
      debugData.processingTimeMs = new Date().getTime() - new Date(startTime).getTime()
      setDebugInfo(debugData)
      setLoading(false)
      console.log(`=== ManageSchemes: Completed fetchAllData in ${debugData.processingTimeMs}ms ===`, debugData)
    }
  }

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchAllData
  }))

  useEffect(() => {
    console.log('ManageSchemes mounted, fetching data...')
    fetchAllData()
  }, [])

  useEffect(() => {
    if (shouldRefresh) {
      console.log('shouldRefresh prop changed, fetching data...')
      fetchAllData()
    }
  }, [shouldRefresh])

  useEffect(() => {
    console.log('Dependencies changed, organizing scheme data...')
    organizeSchemeData()
  }, [schemes, calculations])

  const fetchSchemes = async () => {
    try {
      console.log('Fetching schemes with authentication...')
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/schemes`
      const response = await authService.makeAuthenticatedRequest(url, {
        method: 'GET'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.schemes) {
        const schemeList = result.schemes.map((item: any) => item.value || item).filter(Boolean)
        setSchemes(schemeList)
        return schemeList
      } else {
        setSchemes([])
        return []
      }
    } catch (error) {
      console.error('Error fetching schemes:', error)
      setSchemes([])
      throw error
    }
  }

  const fetchUploads = async () => {
    try {
      console.log('Fetching sales data with authentication...')
      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/sales-data`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        if (!result.salesData || !Array.isArray(result.salesData) || result.salesData.length === 0) {
          setUploads([])
          return []
        }
        
        const uploads: Upload[] = []
        const uploadGroups = new Map<string, any[]>()
        
        result.salesData.forEach((record: any) => {
          const month = record.uploadMonth || 'Unknown'
          const year = record.uploadYear || new Date().getFullYear()
          const fileName = record.fileName || 'sales_data.csv'
          const uploadDate = record.uploadedAt ? record.uploadedAt.split('T')[0] : new Date().toISOString().split('T')[0]
          
          const groupKey = `${month}_${year}_${fileName}_${uploadDate}`
          
          if (!uploadGroups.has(groupKey)) {
            uploadGroups.set(groupKey, [])
          }
          uploadGroups.get(groupKey)!.push(record)
        })
        
        let index = 0
        uploadGroups.forEach((records, groupKey) => {
          const firstRecord = records[0] || {}
          
          const upload: Upload = {
            id: `upload_${index}_${firstRecord.uploadMonth || 'unknown'}_${firstRecord.uploadYear || 'unknown'}`,
            fileName: firstRecord.fileName || 'sales_data.csv',
            month: firstRecord.uploadMonth || 'Unknown',
            year: Number(firstRecord.uploadYear) || new Date().getFullYear(),
            uploadedAt: firstRecord.uploadedAt || new Date().toISOString(),
            data: records
          }
          
          uploads.push(upload)
          index++
        })
        
        setUploads(uploads)
        return uploads
      } else {
        setUploads([])
        return []
      }
    } catch (error) {
      console.error('Error fetching sales data:', error)
      setUploads([])
      throw error
    }
  }

  const fetchCalculations = async (retryCount = 0) => {
    const MAX_RETRIES = 3
    const TIMEOUT_MS = 30000 // Increased to 30 seconds
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
      
      console.log(`Fetching calculations (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`)
      
      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/calculations`, {
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('Raw calculations response:', result) // Debug log
      
      if (result.success && Array.isArray(result.calculations)) {
        const calculationList = result.calculations
          .filter((item: any) => item && typeof item === 'object') // Filter out null/undefined items
          .map((item: any) => {
            const calc = item.value || item
            
            // Safe property access to prevent undefined errors
            if (!calc || typeof calc !== 'object') {
              console.warn('Invalid calculation item:', calc)
              return null
            }
            
            // Try to extract total commission from different possible locations
            let totalCommission = 0
            if (typeof calc.totalCommission === 'number') {
              totalCommission = calc.totalCommission
            } else if (calc.summary?.totalCommission && typeof calc.summary.totalCommission === 'number') {
              totalCommission = calc.summary.totalCommission
            } else if (calc.calculations && Array.isArray(calc.calculations)) {
              // Calculate from individual calculation records
              totalCommission = calc.calculations.reduce((sum: number, record: any) => {
                return sum + (Number(record?.commission) || 0)
              }, 0)
            }
            
            console.log(`Calculation ${calc.id || 'unknown'}: totalCommission = ${totalCommission}`) // Debug log
            
            return {
              ...calc,
              id: calc.id || `calc_${Date.now()}_${Math.random()}`,
              schemeId: calc.schemeId || 'unknown',
              uploadId: calc.uploadId || 'all-sales-data',
              calculations: Array.isArray(calc.calculations) ? calc.calculations : [],
              totalCommission: totalCommission || 0,
              calculatedAt: calc.calculatedAt || calc.createdAt || new Date().toISOString()
            }
          })
          .filter(Boolean) // Remove null entries
        
        console.log('Processed calculations:', calculationList) // Debug log
        setCalculations(calculationList)
        return calculationList
      } else {
        console.log('No calculations found or invalid response format')
        setCalculations([])
        return []
      }
    } catch (error) {
      console.error('Error fetching calculations:', error)
      
      if (error.name === 'AbortError') {
        console.log(`Fetch calculations was aborted due to timeout (attempt ${retryCount + 1})`)
      }
      
      // Retry logic for timeouts and 500 errors
      if (retryCount < MAX_RETRIES && 
          (error.name === 'AbortError' || 
           error.message.includes('500') || 
           error.message.includes('timeout'))) {
        console.log(`Retrying calculations fetch in ${(retryCount + 1) * 2} seconds...`)
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000))
        return fetchCalculations(retryCount + 1)
      }
      
      // If all retries failed, set empty array but don't throw to prevent UI crash
      console.error('All calculation fetch attempts failed, continuing with empty calculations')
      setCalculations([])
      return []
    }
  }

  const organizeSchemeData = () => {
    console.log('Organizing scheme data...')
    console.log('Schemes:', schemes.length)
    console.log('Calculations:', calculations.length)
    
    const organized = schemes.map(scheme => {
      // Debug the first few schemes to understand data structure
      if (schemes.indexOf(scheme) < 2) {
        debugSchemeData(scheme)
      }
      
      const schemeCalculations = calculations.filter(calc => calc.schemeId === scheme.id)
      console.log(`Scheme ${scheme.name} (${scheme.id}): Found ${schemeCalculations.length} calculations`)
      
      const totalCommission = schemeCalculations.reduce((sum, calc) => {
        const commissionValue = calc.totalCommission || 0
        console.log(`  Calculation ${calc.id}: adding ${commissionValue} to total`)
        return sum + commissionValue
      }, 0)
      
      console.log(`Scheme ${scheme.name}: Total commission = ${totalCommission}`)
      
      const lastCalculated = schemeCalculations.length > 0 
        ? schemeCalculations.sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0]?.calculatedAt
        : undefined

      return {
        ...scheme,
        calculations: schemeCalculations,
        totalCommission: totalCommission || 0,
        lastCalculated
      }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log('Final organized schemes:', organized.map(s => ({ name: s.name, totalCommission: s.totalCommission })))
    setSchemesWithCalcs(organized)
  }

  const toggleSchemeExpansion = (schemeId: string) => {
    setExpandedSchemes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(schemeId)) {
        newSet.delete(schemeId)
      } else {
        newSet.add(schemeId)
      }
      return newSet
    })
  }

  const calculateScheme = async (schemeId: string, uploadId?: string) => {
    if (uploads.length === 0) {
      toast.error('No sales data available. Please upload sales data first.')
      return
    }

    setCalculatingScheme(schemeId)
    const startTime = Date.now()
    
    try {
      const requestBody: any = {
        schemeId: schemeId
      }
      
      // If a specific upload is selected, include it in the request
      if (uploadId && uploadId !== 'all-sales-data') {
        requestBody.uploadId = uploadId
      }
      
      console.log('Starting scheme calculation with increased timeout...')
      
      // Create abort controller with longer timeout for calculations
      const controller = new AbortController()
      const CALCULATION_TIMEOUT = 60000 // 60 seconds for calculations
      const timeoutId = setTimeout(() => {
        console.log('Calculation timeout reached, aborting request...')
        controller.abort()
      }, CALCULATION_TIMEOUT)
      
      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/calculate`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        const processingTime = Date.now() - startTime
        const scheme = schemes.find(s => s.id === schemeId)
        const totalCommission = result.summary?.totalCommission || 0
        
        toast.success(
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Calculation Completed!</p>
              <p className="text-sm text-gray-600">
                {scheme?.name} • Commission: ₹{totalCommission.toLocaleString()} • 
                {result.calculations?.length || 0} records • {(processingTime / 1000).toFixed(1)}s
              </p>
            </div>
          </div>,
          { duration: 6000 }
        )
        
        await fetchCalculations()
      } else {
        toast.error(`Calculation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error calculating scheme:', error)
      let errorMessage = 'Failed to calculate scheme'
      let isTimeout = false
      
      if (error instanceof Error) {
        errorMessage = error.message
        isTimeout = error.name === 'AbortError' || error.message.includes('timeout')
      } else if (typeof error === 'string') {
        errorMessage = error
        isTimeout = error.includes('timeout')
      }
      
      if (isTimeout) {
        toast.error(
          <div>
            <p className="font-medium">Calculation Timeout</p>
            <p className="text-sm text-gray-600">
              The calculation is taking longer than expected. This may be due to large datasets.
              Try reducing the dataset size or try again later.
            </p>
          </div>,
          { duration: 10000 }
        )
      } else {
        toast.error(
          <div>
            <p className="font-medium">Calculation Error</p>
            <p className="text-sm text-gray-600">{errorMessage}</p>
          </div>,
          { duration: 8000 }
        )
      }
    } finally {
      setCalculatingScheme(null)
    }
  }

  const exportSchemeCalculations = (scheme: SchemeWithCalculations) => {
    if (scheme.calculations.length === 0) {
      toast.error('No calculations found for this scheme')
      return
    }

    const allCalculations = scheme.calculations.flatMap(calc => calc.calculations || [])
    const csvContent = [
      'Scheme Name,Calculation Date,Distributor ID,Distributor Name,Product,Article ID,Quantity,Value,Commission,Scheme Type',
      ...allCalculations.map(calc => 
        `${scheme.name},${scheme.lastCalculated || ''},${calc.distributorId || ''},${calc.distributorName || ''},${calc.product || ''},${calc.articleId || ''},${calc.quantity || 0},${calc.value || 0},${calc.commission || 0},${calc.schemeType || ''}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scheme_${scheme.name.replace(/\s+/g, '_')}_calculations.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getSchemeStatus = (scheme: SchemeWithCalculations) => {
    const now = new Date()
    const startDate = new Date(scheme.startDate)
    const endDate = new Date(scheme.endDate)

    if (now < startDate) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' }
    } else if (now > endDate) {
      return { status: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800' }
    } else {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' }
    }
  }

  const formatCriteria = (scheme: Scheme) => {
    const criteria = []
    
    if (scheme.distIds?.type === 'other' && scheme.distIds?.specificIds?.length > 0) {
      criteria.push(`Specific Distributors: ${scheme.distIds.specificIds.length} IDs`)
    } else {
      // Check multiple locations and property names for distributor data
      const distributorData = scheme.distributorData || scheme.basicInfo || {}
      
      // Helper function to check if a value is meaningful (not empty string, null, or undefined)
      const hasMeaningfulValue = (value: any) => {
        return value !== null && value !== undefined && value !== '' && value.toString().trim() !== ''
      }
      
      // Zone
      if (hasMeaningfulValue(distributorData.zone)) {
        criteria.push(`Zone: ${distributorData.zone}`)
      }
      
      // State - check multiple possible property names
      const state = distributorData.state || distributorData.stateData || distributorData.stateName
      if (hasMeaningfulValue(state)) {
        criteria.push(`State: ${state}`)
      }
      
      // Distributor/Partner Type - check multiple possible property names
      const type = distributorData.distributorType || 
                  distributorData.partnerType || 
                  distributorData.type || 
                  distributorData.distributorTypeData ||
                  distributorData.partnerTypeData
      if (hasMeaningfulValue(type)) {
        criteria.push(`Type: ${type}`)
      }
      
      // Check for "allDistributors" flag
      if (distributorData.allDistributors === true) {
        criteria.push(`Selection: All Distributors`)
      }
    }

    // Article criteria
    if (scheme.articles?.type === 'other' && scheme.articles?.specificIds?.length > 0) {
      criteria.push(`Specific Articles: ${scheme.articles.specificIds.length} IDs`)
    } else {
      if (scheme.catalogType?.family) criteria.push(`Family: ${scheme.catalogType.family}`)
      if (scheme.catalogType?.class) criteria.push(`Class: ${scheme.catalogType.class}`)
      if (scheme.catalogType?.brand) criteria.push(`Brand: ${scheme.catalogType.brand}`)
    }

    return criteria.length > 0 ? criteria.join(' • ') : 'All criteria'
  }

  const formatSlabRange = (slab: any, index: number, totalSlabs: number) => {
    // Handle different slab range formats
    if (slab.from !== undefined && slab.to !== undefined) {
      const from = Number(slab.from) || 0
      const to = Number(slab.to) || 0
      return `${from} to ${to}`
    }
    
    if (slab.minQuantity !== undefined && slab.maxQuantity !== undefined) {
      const min = Number(slab.minQuantity) || 0
      const max = Number(slab.maxQuantity) || 0
      return `${min} to ${max}`
    }
    
    if (slab.min !== undefined && slab.max !== undefined) {
      const min = Number(slab.min) || 0
      const max = slab.max === null ? '∞' : Number(slab.max) || 0
      return max === '∞' ? `${min}+` : `${min} to ${max}`
    }
    
    // For constructed slabs, try to determine from position and value
    if (slab.quantity !== undefined) {
      const quantity = Number(slab.quantity) || 0
      if (index === 0) {
        return `0 to ${quantity}`
      } else if (index === totalSlabs - 1) {
        return `${quantity}+`
      } else {
        // For middle slabs, we'd need previous slab data
        return `${quantity}+`
      }
    }
    
    // Fallback
    return 'Range not specified'
  }

  const formatSlabCommission = (slab: any, commissionType: string) => {
    if (slab.rate !== undefined) {
      if (commissionType === 'percentage') {
        return `${slab.rate}%`
      } else if (commissionType === 'fixed') {
        return `₹${slab.rate.toLocaleString()}`
      } else if (commissionType === 'absolute_per_unit' || commissionType === 'absolute(per unit)') {
        return `₹${slab.rate}/unit`
      }
      return `${slab.rate}`
    }
    
    if (slab.commission !== undefined) {
      if (commissionType === 'percentage') {
        return `${slab.commission}%`
      } else if (commissionType === 'fixed') {
        return `₹${slab.commission.toLocaleString()}`
      } else if (commissionType === 'absolute_per_unit' || commissionType === 'absolute(per unit)') {
        return `₹${slab.commission}/unit`
      }
      return `${slab.commission}`
    }
    
    return 'Not specified'
  }

  const formatDistributorData = (scheme: Scheme) => {
    const distributors = []
    
    // Handle specific distributor IDs
    if (scheme.distIds?.type === 'other' && scheme.distIds?.specificIds?.length > 0) {
      distributors.push({
        title: 'Specific Distributors',
        ids: scheme.distIds.specificIds,
        count: scheme.distIds.specificIds.length
      })
    }
    
    // Handle distributor filtering criteria - check multiple possible locations and property names
    const criteria = []
    const distributorData = scheme.distributorData || scheme.basicInfo || {}
    
    // Debug logging to see what distributor data is available
    console.log('Distributor data debug:', {
      schemeName: scheme.name,
      distributorData: distributorData,
      basicInfo: scheme.basicInfo,
      rawScheme: scheme
    })
    
    // Helper function to check if a value is meaningful (not empty string, null, or undefined)
    const hasMeaningfulValue = (value: any) => {
      return value !== null && value !== undefined && value !== '' && value.toString().trim() !== ''
    }
    
    // Zone
    if (hasMeaningfulValue(distributorData.zone)) {
      criteria.push(`Zone: ${distributorData.zone}`)
    }
    
    // State - check multiple possible property names
    const state = distributorData.state || distributorData.stateData || distributorData.stateName
    if (hasMeaningfulValue(state)) {
      criteria.push(`State: ${state}`)
    }
    
    // Distributor/Partner Type - check multiple possible property names
    const type = distributorData.distributorType || 
                distributorData.partnerType || 
                distributorData.type || 
                distributorData.distributorTypeData ||
                distributorData.partnerTypeData
    if (hasMeaningfulValue(type)) {
      criteria.push(`Type: ${type}`)
    }
    
    // Check for "allDistributors" flag
    if (distributorData.allDistributors === true) {
      criteria.push('Selection: All Distributors')
    }
    
    if (criteria.length > 0) {
      distributors.push({
        title: 'Distributor Criteria',
        criteria: criteria.join(' • '),
        count: 'All matching'
      })
    } else {
      // If no criteria found, show what data is available for debugging
      console.warn('No distributor criteria found for scheme:', scheme.name, {
        distributorData: distributorData,
        availableKeys: Object.keys(distributorData)
      })
    }
    
    return distributors.length > 0 ? distributors : [{ title: 'All Distributors', count: 'No restrictions' }]
  }

  const formatArticleData = (scheme: Scheme) => {
    const articles = []
    
    // Handle specific article IDs (for article schemes from Excel)
    if (scheme.articles?.type === 'other' && scheme.articles?.specificIds?.length > 0) {
      articles.push({
        title: 'Specific Articles (Excel Upload)',
        ids: scheme.articles.specificIds,
        count: scheme.articles.specificIds.length
      })
    }
    
    // Handle article commission data (for article schemes)
    if (scheme.articles?.articleCommissions && Array.isArray(scheme.articles.articleCommissions) && scheme.articles.articleCommissions.length > 0) {
      const articleIds = scheme.articles.articleCommissions.map(ac => ac.articleId || ac.Article_ID).filter(Boolean)
      articles.push({
        title: 'Article Commission Data',
        ids: articleIds,
        count: articleIds.length
      })
    }
    
    // Handle hierarchical catalog criteria (for booster schemes)
    const catalogCriteria = []
    if (scheme.catalogType?.family) catalogCriteria.push(`Family: ${scheme.catalogType.family}`)
    if (scheme.catalogType?.class) catalogCriteria.push(`Class: ${scheme.catalogType.class}`)
    if (scheme.catalogType?.brand) catalogCriteria.push(`Brand: ${scheme.catalogType.brand}`)
    
    if (catalogCriteria.length > 0) {
      articles.push({
        title: 'Catalog Criteria',
        criteria: catalogCriteria.join(' • '),
        count: 'All matching'
      })
    }
    
    return articles.length > 0 ? articles : [{ title: 'All Articles', count: 'No restrictions' }]
  }

  // Helper function to get slabs from either location
  const getSchemeSlabs = (scheme: Scheme) => {
    // Try to get slabs from basicInfo first, then fall back to top-level slabs
    const slabs = scheme.basicInfo?.slabs || scheme.slabs || []
    const validSlabs = Array.isArray(slabs) ? slabs : []
    
    // Add debugging to identify slab data issues
    if (validSlabs.length > 0) {
      console.log('Scheme slabs debug:', {
        schemeName: scheme.name,
        slabCount: validSlabs.length,
        slabs: validSlabs.map(slab => ({ 
          min: slab.min, 
          max: slab.max, 
          rate: slab.rate,
          minType: typeof slab.min,
          maxType: typeof slab.max,
          rateType: typeof slab.rate
        }))
      })
    }
    
    return validSlabs
  }

  // Helper function to debug distributor data structure
  const debugSchemeData = (scheme: Scheme) => {
    console.log('=== Scheme Data Debug ===', {
      schemeName: scheme.name,
      schemeId: scheme.id,
      topLevelKeys: Object.keys(scheme),
      distributorData: {
        exists: !!scheme.distributorData,
        keys: scheme.distributorData ? Object.keys(scheme.distributorData) : [],
        values: scheme.distributorData
      },
      basicInfo: {
        exists: !!scheme.basicInfo,
        keys: scheme.basicInfo ? Object.keys(scheme.basicInfo) : [],
        values: scheme.basicInfo
      },
      distIds: scheme.distIds,
      catalogType: scheme.catalogType
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scheme Management</h2>
          <p className="text-gray-600">Manage your schemes and view calculation outputs</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAllData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Timeout Error Alert */}
      {fetchErrors.some(error => error.includes('timeout') || error.includes('AbortError')) && (
        <Alert className="border-amber-200 bg-amber-50 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <div className="font-medium">Performance Notice: Database Timeout Detected</div>
              <div className="text-sm">
                The system is experiencing longer response times due to large datasets. This may affect:
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Loading calculation results</li>
                  <li>• Running new calculations</li>
                  <li>• Fetching scheme data</li>
                </ul>
              </div>
              <div className="text-sm">
                <strong>Recommendations:</strong>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Try refreshing the page after a few moments</li>
                  <li>• For new calculations, consider using smaller datasets</li>
                  <li>• The system will automatically retry failed operations</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Information */}
      {(fetchErrors.length > 0 || Object.keys(debugInfo).length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <Bug className="h-5 w-5" />
              <span>System Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fetchErrors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <strong>Connection Issues:</strong>
                  <ul className="mt-1 space-y-1">
                    {fetchErrors.map((error, index) => (
                      <li key={index} className="text-sm">
                        • {error.includes('timeout') ? 
                            'Database timeout - operations taking longer than expected' : 
                            error
                          }
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <strong>Last Fetch:</strong><br />
                {lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'Never'}
              </div>
              <div>
                <strong>Schemes Found:</strong><br />
                {schemes.length}
              </div>
              <div>
                <strong>Sales Data Uploads:</strong><br />
                {uploads.length}
              </div>
              <div>
                <strong>Auth Token:</strong><br />
                {debugInfo.authToken || 'Missing'}
              </div>
            </div>
            
            {/* Additional debug info for commission calculation */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <div className="text-xs space-y-1">
                <div><strong>Commission Debug:</strong></div>
                <div>Total schemes with calculations: {schemesWithCalcs.filter(s => s.calculations.length > 0).length}</div>
                <div>Individual scheme commissions: {schemesWithCalcs.map(s => `${s.name}: ₹${s.totalCommission?.toLocaleString() || 0}`).join(', ')}</div>
                <div>Overall total: ₹{schemesWithCalcs.reduce((sum, s) => sum + (s.totalCommission || 0), 0).toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Schemes</p>
                <p className="text-2xl font-bold">{schemes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Schemes</p>
                <p className="text-2xl font-bold">
                  {schemesWithCalcs.filter(s => getSchemeStatus(s).status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-purple-600" />
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
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Total Commission</p>
                <p className="text-2xl font-bold">
                  ₹{schemesWithCalcs.reduce((sum, s) => sum + (s.totalCommission || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Sales Data Summary */}
      {uploads.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <BarChart3 className="h-5 w-5" />
              <span>Available Sales Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-700">
              <p className="mb-2"><strong>Ready for calculation:</strong> {uploads.length} sales data upload(s) available</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {uploads.map(upload => (
                  <div key={upload.id} className="bg-white rounded-md p-3 border border-green-200">
                    <div className="font-medium">{upload.month} {upload.year}</div>
                    <div className="text-xs text-gray-600">{upload.data?.length || 0} records</div>
                    <div className="text-xs text-gray-500">Uploaded: {new Date(upload.uploadedAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schemes List */}
      {loading && schemes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading schemes...</p>
          </CardContent>
        </Card>
      ) : schemes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No schemes found. Create your first scheme to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schemesWithCalcs.map(scheme => {
            const status = getSchemeStatus(scheme)
            const isExpanded = expandedSchemes.has(scheme.id)
            const distributorData = formatDistributorData(scheme)
            const articleData = formatArticleData(scheme)

            return (
              <Card key={scheme.id} className={`${isExpanded ? 'ring-2 ring-blue-200' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold">{scheme.name}</h3>
                          <Badge className={status.color}>{status.label}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {scheme.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span>ID: {scheme.id}</span>
                          <span>•</span>
                          <span>{formatCriteria(scheme)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {scheme.totalCommission > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            ₹{scheme.totalCommission.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Total Commission</div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSchemeExpansion(scheme.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <Collapsible open={isExpanded} onOpenChange={() => toggleSchemeExpansion(scheme.id)}>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="details">Details</TabsTrigger>
                          <TabsTrigger value="distributors">Distributors</TabsTrigger>
                          <TabsTrigger value="articles">Articles</TabsTrigger>
                          <TabsTrigger value="calculations">Calculations</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Start Date</label>
                              <p>{new Date(scheme.startDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">End Date</label>
                              <p>{new Date(scheme.endDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Slab Type</label>
                              <p className="capitalize">{scheme.slabType}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Commission Type</label>
                              <p className="capitalize">{scheme.commissionType}</p>
                            </div>
                          </div>

                          {/* Slabs */}
                          {scheme.slabs && scheme.slabs.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3">Commission Slabs</h4>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Range</TableHead>
                                      <TableHead>Commission</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {scheme.slabs.map((slab, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{formatSlabRange(slab, index, scheme.slabs.length)}</TableCell>
                                        <TableCell>{formatSlabCommission(slab, scheme.commissionType)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 pt-4">
                            <Select
                              value={selectedUpload[scheme.id] || 'all-sales-data'}
                              onValueChange={(value) => setSelectedUpload(prev => ({ ...prev, [scheme.id]: value }))}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select sales data" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all-sales-data">All Sales Data</SelectItem>
                                {uploads.map(upload => (
                                  <SelectItem key={upload.id} value={upload.id}>
                                    {upload.month} {upload.year} ({upload.data?.length || 0} records)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => calculateScheme(scheme.id, selectedUpload[scheme.id])}
                              disabled={calculatingScheme === scheme.id || uploads.length === 0}
                            >
                              {calculatingScheme === scheme.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              Calculate
                            </Button>
                            {scheme.calculations.length > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => exportSchemeCalculations(scheme)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Results
                              </Button>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="distributors" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                              <Users className="h-5 w-5 text-blue-600" />
                              <h4 className="font-medium">Distributor Configuration</h4>
                            </div>
                            
                            {distributorData.map((dist, index) => (
                              <Card key={index} className="bg-gray-50">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-medium text-gray-800">{dist.title}</h5>
                                    <Badge variant="secondary">
                                      {typeof dist.count === 'string' ? dist.count : `${dist.count} IDs`}
                                    </Badge>
                                  </div>
                                  
                                  {dist.criteria && (
                                    <p className="text-sm text-gray-600 mb-3">{dist.criteria}</p>
                                  )}
                                  
                                  {dist.ids && dist.ids.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Distributor IDs:</p>
                                      <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                          {dist.ids.slice(0, 24).map((id, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                              {id}
                                            </Badge>
                                          ))}
                                          {dist.ids.length > 24 && (
                                            <Badge variant="secondary" className="text-xs">
                                              +{dist.ids.length - 24} more
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="articles" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                              <Package className="h-5 w-5 text-green-600" />
                              <h4 className="font-medium">Article Configuration</h4>
                            </div>
                            
                            {articleData.map((article, index) => (
                              <Card key={index} className="bg-gray-50">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-medium text-gray-800">{article.title}</h5>
                                    <Badge variant="secondary">
                                      {typeof article.count === 'string' ? article.count : `${article.count} Articles`}
                                    </Badge>
                                  </div>
                                  
                                  {article.criteria && (
                                    <p className="text-sm text-gray-600 mb-3">{article.criteria}</p>
                                  )}
                                  
                                  {article.ids && article.ids.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Article IDs:</p>
                                      <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                          {article.ids.slice(0, 20).map((id, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                              {id}
                                            </Badge>
                                          ))}
                                          {article.ids.length > 20 && (
                                            <Badge variant="secondary" className="text-xs">
                                              +{article.ids.length - 20} more
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="calculations" className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Calculation Results</h4>
                            {scheme.calculations.length > 0 && (
                              <Badge variant="secondary">
                                {scheme.calculations.length} calculation(s)
                              </Badge>
                            )}
                          </div>

                          {scheme.calculations.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No calculations performed yet</p>
                              <p className="text-sm">Run a calculation to see results here</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {scheme.calculations.map(calc => (
                                <Card key={calc.id} className="bg-gray-50">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">Calculation ID:</span>
                                        <code className="text-xs bg-white px-2 py-1 rounded">{calc.id}</code>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-medium text-green-600">
                                          ₹{calc.totalCommission.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {calc.calculations?.length || 0} records
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Calculated: {new Date(calc.calculatedAt).toLocaleString()}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
})

ManageSchemes.displayName = 'ManageSchemes'

export default ManageSchemes