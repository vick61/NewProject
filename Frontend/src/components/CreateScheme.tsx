import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { Trash2, Plus, CheckCircle, Upload, FileSpreadsheet, AlertCircle, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { authService } from './AuthService'

interface Slab {
  min: number
  max: number | null
  rate: number
}

interface CategoryData {
  families: string[]
  brands: string[]
  classes: string[]
  familyBrandMapping: Record<string, string[]>
  familyClassMapping: Record<string, string[]>
  classBrandMapping: Record<string, string[]>
  articleMappings?: Record<string, {
    familyName: string
    className: string
    brandName: string
    familyCode: string
    classCode: string
    brandCode: string
    articleDescription: string
  }>
  uploadId?: string
  uploadedAt?: string
}

interface CreateSchemeProps {
  onSchemeCreated?: () => void
}

export interface CreateSchemeRef {
  refresh: () => void
  clearCategoryData: () => void
}

const CreateScheme = forwardRef<CreateSchemeRef, CreateSchemeProps>(({ onSchemeCreated }, ref) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    distributorData: {
      zone: '',
      state: '',
      distributorType: '',
      allDistributors: true,
      specificDistributors: []
    },
    catalogType: {
      family: '',
      class: '',
      brand: '',
      article: '',
      specificArticleIds: ''
    },
    distIds: {
      type: 'all',
      specificIds: [] as string[]
    },
    articles: {
      type: 'all',
      specificIds: [] as string[]
    },
    slabType: '',
    commissionType: '',
    startDate: '',
    endDate: ''
  })

  const [slabs, setSlabs] = useState<Slab[]>([{ min: 0, max: null, rate: 0 }])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [zoneStateMapping, setZoneStateMapping] = useState<Record<string, string[]>>({})
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null)
  const [lastCategoryFetch, setLastCategoryFetch] = useState<number>(0)
  const [specificDistIds, setSpecificDistIds] = useState('')
  const [specificArticleIds, setSpecificArticleIds] = useState('')
  const [articleCommissions, setArticleCommissions] = useState<Record<string, number>>({})
  const [uploadedFileName, setUploadedFileName] = useState('')

  const zones = ['East', 'West', 'North1', 'North2', 'South']
  
  const distributorTypes = [
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



  const fetchZoneStateMapping = async () => {
    try {
      console.log('CreateScheme: Fetching zone-state mapping...')
      const timestamp = Date.now()
      const random = Math.random().toString(36).substr(2, 9)
      
      const response = await authService.makePublicRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/zone-state-mapping?t=${timestamp}&r=${random}`, {
        method: 'GET'
      })
      const result = await response.json()
      if (result.success && result.mapping) {
        console.log('CreateScheme: Zone-state mapping loaded successfully')
        setZoneStateMapping(result.mapping || {})
      } else {
        console.warn('CreateScheme: Zone-state mapping not available:', result)
        setZoneStateMapping({})
      }
    } catch (error) {
      console.error('CreateScheme: Error fetching zone-state mapping:', error)
      setZoneStateMapping({})
    }
  }

  const fetchCategoryData = async (force = false) => {
    try {
      const now = Date.now()
      // Reduce the time window for force=true calls to allow more frequent refreshes
      if (!force && (now - lastCategoryFetch) < 1000) {
        console.log('CreateScheme: Skipping category data fetch - too recent')
        return
      }

      console.log('CreateScheme: Fetching category data...', { 
        force, 
        timeSinceLastFetch: now - lastCategoryFetch,
        currentTime: new Date(now).toISOString()
      })
      
      const timestamp = Date.now()
      const random = Math.random().toString(36).substr(2, 9)
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/category-data?t=${timestamp}&r=${random}`
      
      // Always clear existing data for force calls to ensure we see any changes
      if (force) {
        console.log('CreateScheme: Force refresh - clearing existing category data')
        setCategoryData(null)
      }
      
      const response = await authService.makeAuthenticatedRequest(url, {
        method: 'GET'
      })
      
      let result
      if (response.status === 404) {
        // Handle 404 as "no data found" rather than an error
        result = { success: false, message: 'No category data found' }
        console.log('CreateScheme: No category data found (404) - user needs to upload category data first')
      } else if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      } else {
        result = await response.json()
        console.log('CreateScheme: Category data API response:', {
          success: result.success,
          families: result.categoryData?.families?.length || 0,
          uploadId: result.categoryData?.uploadId,
          uploadedAt: result.categoryData?.uploadedAt,
          responseTimestamp: new Date().toISOString()
        })
      }
      
      setLastCategoryFetch(now)
      
      if (result.success && result.categoryData && result.categoryData.families && result.categoryData.families.length > 0) {
        const newCategoryData = result.categoryData
        
        console.log('CreateScheme: Category data loaded successfully:', {
          families: newCategoryData.families?.length || 0,
          familiesList: newCategoryData.families,
          classes: newCategoryData.classes?.length || 0,
          brands: newCategoryData.brands?.length || 0,
          articles: Object.keys(newCategoryData.articleMappings || {}).length,
          uploadId: newCategoryData.uploadId,
          uploadedAt: newCategoryData.uploadedAt
        })
        
        // Check if this is actually new data compared to what we have
        const isDataChanged = !categoryData || 
          JSON.stringify(categoryData.families) !== JSON.stringify(newCategoryData.families) ||
          categoryData.uploadId !== newCategoryData.uploadId
        
        if (isDataChanged) {
          console.log('CreateScheme: New category data detected, updating state')
          
          // Clear any existing form selections if the data has changed (only for Booster schemes)
          if (formData.type === 'per_unit' && categoryData) {
            console.log('CreateScheme: Category data changed for Booster scheme, clearing form selections')
            setFormData(prev => ({
              ...prev,
              catalogType: {
                family: '',
                class: '',
                brand: '',
                article: '',
                specificArticleIds: ''
              }
            }))
          }
        } else {
          console.log('CreateScheme: Category data unchanged')
        }
        
        setCategoryData(newCategoryData)
        
        // Show success toast for forced refreshes
        if (force) {
          toast.success(
            `Category data refreshed - ${newCategoryData.families?.length || 0} families available (Upload ID: ${newCategoryData.uploadId?.slice(-8) || 'Unknown'})`,
            { duration: 3000 }
          )
        }
      } else {
        console.warn('CreateScheme: No category data available or empty data:', result)
        setCategoryData(null)
        if (force) {
          toast.info('No category data found. Please upload category data first to enable family, class, and brand selections for Booster schemes.')
        }
      }
    } catch (error) {
      console.error('CreateScheme: Error fetching category data:', error)
      setCategoryData(null)
      
      if (force) {
        // Provide more specific error messages based on the error type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        if (errorMessage.includes('No access token') || errorMessage.includes('user not authenticated')) {
          toast.error('Authentication failed. Please logout and login again.')
        } else if (errorMessage.includes('Invalid token') || errorMessage.includes('anon key')) {
          toast.error('Authentication token is invalid. Please logout and login again.')
        } else if (errorMessage.includes('404')) {
          toast.info('No category data found. Please upload category data first in the Category Data tab.')
        } else if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
          toast.error('Network error. Please check your connection and try again.')
        } else {
          toast.error(`Failed to load category data: ${errorMessage}`)
        }
      }
    }
  }

  const refreshData = async (force = false) => {
    console.log('CreateScheme: Refreshing data...', force ? '(forced)' : '', 'at', new Date().toISOString())
    setDataLoading(true)
    try {
      await Promise.all([
        fetchZoneStateMapping(),
        fetchCategoryData(force)
      ])
      console.log('CreateScheme: Data refresh completed at', new Date().toISOString())
    } finally {
      setDataLoading(false)
    }
  }

  // Clear category data method
  const clearCategoryData = () => {
    console.log('CreateScheme: Clearing category data state')
    setCategoryData(null)
    setLastCategoryFetch(0)
    // Also clear any form selections that depend on category data
    if (formData.type === 'per_unit') {
      setFormData(prev => ({
        ...prev,
        catalogType: {
          family: '',
          class: '',
          brand: '',
          article: '',
          specificArticleIds: ''
        }
      }))
    }
  }

  // Expose refresh and clearCategoryData methods to parent component
  useImperativeHandle(ref, () => ({
    refresh: () => {
      console.log('CreateScheme: External refresh called at', new Date().toISOString())
      refreshData(true)
    },
    clearCategoryData: () => {
      console.log('CreateScheme: External clearCategoryData called at', new Date().toISOString())
      clearCategoryData()
    }
  }))

  // Load data on component mount
  useEffect(() => {
    console.log('CreateScheme: Initial data load')
    refreshData(true)
  }, [])

  const getAvailableStates = () => {
    if (!zoneStateMapping || typeof zoneStateMapping !== 'object') {
      return []
    }
    
    if (!formData.distributorData.zone || formData.distributorData.zone === 'all-zones') {
      return Object.values(zoneStateMapping).flat()
    }
    return zoneStateMapping[formData.distributorData.zone] || []
  }

  const getAvailableClasses = () => {
    if (!categoryData || !categoryData.classes) {
      return []
    }
    
    if (!formData.catalogType.family || formData.catalogType.family === 'all-families') {
      return categoryData.classes || []
    }
    
    if (!categoryData.familyClassMapping) {
      return []
    }
    
    return categoryData.familyClassMapping[formData.catalogType.family] || []
  }

  const getAvailableBrands = () => {
    if (!categoryData || !categoryData.brands) {
      return []
    }
    
    if (formData.catalogType.class && formData.catalogType.class !== 'all-classes') {
      if (!categoryData.classBrandMapping) return []
      return categoryData.classBrandMapping[formData.catalogType.class] || []
    }
    
    if (formData.catalogType.family && formData.catalogType.family !== 'all-families') {
      if (!categoryData.familyBrandMapping) return []
      return categoryData.familyBrandMapping[formData.catalogType.family] || []
    }
    
    return categoryData.brands || []
  }

  const getAvailableArticles = () => {
    if (!categoryData || !categoryData.articleMappings || typeof categoryData.articleMappings !== 'object') {
      return []
    }
    
    const articles = Object.keys(categoryData.articleMappings)
    
    if (formData.catalogType.family && formData.catalogType.family !== 'all-families') {
      const filteredByFamily = articles.filter(articleId => 
        categoryData.articleMappings![articleId]?.familyName === formData.catalogType.family
      )
      
      if (formData.catalogType.class && formData.catalogType.class !== 'all-classes') {
        const filteredByClass = filteredByFamily.filter(articleId =>
          categoryData.articleMappings![articleId]?.className === formData.catalogType.class
        )
        
        if (formData.catalogType.brand && formData.catalogType.brand !== 'all-brands') {
          return filteredByClass.filter(articleId =>
            categoryData.articleMappings![articleId]?.brandName === formData.catalogType.brand
          )
        }
        
        return filteredByClass
      }
      
      return filteredByFamily
    }
    
    return articles
  }

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => {
        const updated = {
          ...prev,
          [parent]: {
            ...prev[parent as keyof typeof prev],
            [child]: value
          }
        }
        
        if (field === 'distributorData.zone') {
          updated.distributorData.state = ''
        }
        if (field === 'catalogType.family') {
          updated.catalogType.class = ''
          updated.catalogType.brand = ''
          updated.catalogType.article = ''
        }
        if (field === 'catalogType.class') {
          updated.catalogType.brand = ''
          updated.catalogType.article = ''
        }
        if (field === 'catalogType.brand') {
          updated.catalogType.article = ''
          updated.catalogType.specificArticleIds = ''
        }
        if (field === 'catalogType.article') {
          updated.catalogType.specificArticleIds = ''
          // If "Others" is selected, clear family, class, and brand selections
          if (value === 'others-articles') {
            updated.catalogType.family = ''
            updated.catalogType.class = ''
            updated.catalogType.brand = ''
          }
        }
        // If family, class, or brand is changed and Articles is set to "Others", clear Articles
        if ((field === 'catalogType.family' || field === 'catalogType.class' || field === 'catalogType.brand') && 
            updated.catalogType.article === 'others-articles') {
          updated.catalogType.article = ''
        }
        
        return updated
      })
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleDistIdsTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      distIds: { type: value, specificIds: [] }
    }))
    setSpecificDistIds('')
    
    if (value === 'other') {
      setFormData(prev => ({
        ...prev,
        distributorData: {
          zone: '',
          state: '',
          distributorType: '',
          allDistributors: true,
          specificDistributors: []
        }
      }))
    }
  }

  const handleSpecificDistIdsChange = (value: string) => {
    setSpecificDistIds(value)
    const ids = value.split(',').map(id => id.trim()).filter(id => id)
    setFormData(prev => ({
      ...prev,
      distIds: { ...prev.distIds, specificIds: ids }
    }))
  }

  const handleSpecificArticleIdsChange = (value: string) => {
    setSpecificArticleIds(value)
    const ids = value.split(',').map(id => id.trim()).filter(id => id)
    setFormData(prev => ({
      ...prev,
      articles: { ...prev.articles, specificIds: ids }
    }))
  }

  const downloadSampleData = () => {
    const sampleData = `Article ID,Commission
ART001,10.5
ART002,25
ART003,15.75
ART004,50
ART005,8.25`
    
    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'article-scheme-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Article scheme template downloaded! Use this to define your articles and commissions.')
  }

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error('File must contain header and at least one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const articleIdIndex = headers.findIndex(h => 
        h.includes('article') && (h.includes('id') || h.includes('code'))
      )
      const commissionIndex = headers.findIndex(h => 
        h.includes('commission')
      )

      if (articleIdIndex === -1) {
        toast.error('Could not find Article ID column. Please ensure your file has an "Article ID" column.')
        return
      }

      if (commissionIndex === -1) {
        toast.error('Could not find Commission column. Please ensure your file has a "Commission" column.')
        return
      }

      const newArticleCommissions: Record<string, number> = {}
      const articleIds: string[] = []
      let validRows = 0
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        
        if (values.length <= Math.max(articleIdIndex, commissionIndex)) {
          errors.push(`Row ${i + 1}: Insufficient columns`)
          continue
        }

        const articleId = values[articleIdIndex]
        const commissionStr = values[commissionIndex]

        if (!articleId) {
          errors.push(`Row ${i + 1}: Missing Article ID`)
          continue
        }

        const commission = parseFloat(commissionStr)
        if (isNaN(commission)) {
          errors.push(`Row ${i + 1}: Invalid commission value "${commissionStr}"`)
          continue
        }

        newArticleCommissions[articleId] = commission
        articleIds.push(articleId)
        validRows++
      }

      if (errors.length > 0 && validRows === 0) {
        toast.error(
          <div>
            <p className="font-medium">Upload failed</p>
            <p className="text-sm">{errors.slice(0, 3).join(', ')}</p>
            {errors.length > 3 && <p className="text-sm">...and {errors.length - 3} more errors</p>}
          </div>
        )
        return
      }

      setArticleCommissions(newArticleCommissions)
      setUploadedFileName(file.name)
      
      // For article schemes, automatically set the articles data
      setFormData(prev => ({
        ...prev,
        articles: { 
          type: 'other', 
          specificIds: articleIds 
        }
      }))
      setSpecificArticleIds(articleIds.join(', '))

      toast.success(
        <div>
          <p className="font-medium">Excel Upload Successful!</p>
          <p className="text-sm">{validRows} articles loaded with commission data</p>
          {errors.length > 0 && <p className="text-sm text-orange-600">{errors.length} rows had errors</p>}
        </div>
      )

    } catch (error) {
      console.error('Error processing Excel file:', error)
      toast.error('Failed to process Excel file. Please check the format.')
    }

    event.target.value = ''
  }

  const clearExcelData = () => {
    setArticleCommissions({})
    setUploadedFileName('')
    setFormData(prev => ({
      ...prev,
      articles: { type: 'all', specificIds: [] }
    }))
    setSpecificArticleIds('')
    toast.success('Article scheme data cleared successfully.')
  }

  const addSlab = () => {
    setSlabs(prev => [...prev, { min: 0, max: null, rate: 0 }])
  }

  const removeSlab = (index: number) => {
    setSlabs(prev => prev.filter((_, i) => i !== index))
  }

  const parseNumber = (value: string): number => {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  const updateSlab = (index: number, field: keyof Slab, value: string | null) => {
    setSlabs(prev => prev.map((slab, i) => {
      if (i !== index) return slab
      
      if (field === 'max' && value === null) {
        return { ...slab, max: null }
      }
      
      if (field === 'max' && value === '') {
        return { ...slab, max: null }
      }
      
      if (typeof value === 'string') {
        const numValue = parseNumber(value)
        return { ...slab, [field]: numValue }
      }
      
      return { ...slab, [field]: value }
    }))
  }

  const processFormData = (data: any) => {
    const processedData = { ...data }
    
    if (processedData.distributorData.zone === 'all-zones') {
      processedData.distributorData.zone = ''
    }
    if (processedData.distributorData.state === 'all-states') {
      processedData.distributorData.state = ''
    }
    if (processedData.distributorData.distributorType === 'all-types') {
      processedData.distributorData.distributorType = ''
    }
    if (processedData.catalogType.family === 'all-families') {
      processedData.catalogType.family = ''
    }
    if (processedData.catalogType.brand === 'all-brands') {
      processedData.catalogType.brand = ''
    }
    if (processedData.catalogType.class === 'all-classes') {
      processedData.catalogType.class = ''
    }
    if (processedData.catalogType.article === 'all-articles') {
      processedData.catalogType.article = ''
    }
    if (processedData.catalogType.article === 'others-articles') {
      processedData.catalogType.article = 'others'
    }
    
    return processedData
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: For article schemes, require Excel upload
    if (formData.type === 'article' && Object.keys(articleCommissions).length === 0) {
      toast.error('Please upload an Excel file with Article ID and Commission data for Article schemes.')
      return
    }
    
    setLoading(true)

    try {
      const processedFormData = processFormData(formData)
      
      // Determine and set the correct scheme type
      let schemeType = processedFormData.type
      if (processedFormData.type === 'per_unit') {
        schemeType = 'booster-scheme'
      } else if (processedFormData.type === 'article') {
        schemeType = 'article-scheme'
      }
      
      const schemeData = {
        ...processedFormData,
        schemeType: schemeType, // Add explicit schemeType field
        basicInfo: {
          schemeName: processedFormData.name,
          schemeType: schemeType,
          type: processedFormData.type, // Keep original type
          slabType: processedFormData.slabType || 'quantity',
          commissionType: processedFormData.commissionType || 'percentage',
          slabs: formData.type === 'article' ? [] : slabs,
          startDate: processedFormData.startDate,
          endDate: processedFormData.endDate
        },
        // Only include slabs for non-article schemes
        slabs: formData.type === 'article' ? [] : slabs,
        articleCommissions: Object.keys(articleCommissions).length > 0 ? articleCommissions : undefined
      }

      console.log('Creating scheme with data:', {
        name: schemeData.basicInfo?.schemeName,
        type: schemeData.type,
        schemeType: schemeData.schemeType,
        slabType: schemeData.basicInfo?.slabType,
        commissionType: schemeData.basicInfo?.commissionType,
        slabCount: schemeData.slabs?.length || 0,
        hasArticleCommissions: !!schemeData.articleCommissions
      })

      const response = await authService.makeAuthenticatedRequest(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/schemes`, {
        method: 'POST',
        body: JSON.stringify(schemeData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Scheme Created Successfully!</p>
              <p className="text-sm text-gray-600">"{formData.name}" is now ready for calculations</p>
            </div>
          </div>,
          {
            duration: 4000,
          }
        )
        
        setFormData({
          name: '',
          type: '',
          distributorData: {
            zone: '',
            state: '',
            distributorType: '',
            allDistributors: true,
            specificDistributors: []
          },
          catalogType: {
            family: '',
            class: '',
            brand: '',
            article: '',
            specificArticleIds: ''
          },
          distIds: {
            type: 'all',
            specificIds: []
          },
          articles: {
            type: 'all',
            specificIds: []
          },
          slabType: '',
          commissionType: '',
          startDate: '',
          endDate: ''
        })
        setSlabs([{ min: 0, max: null, rate: 0 }])
        setSpecificDistIds('')
        setSpecificArticleIds('')
        setArticleCommissions({})
        setUploadedFileName('')

        if (onSchemeCreated) {
          onSchemeCreated()
        }
      } else {
        toast.error(`Failed to create scheme: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating scheme:', error)
      toast.error('Failed to create scheme. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isDistributorFieldsDisabled = formData.distIds.type === 'other'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Data Status Panel */}
      {categoryData ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>Category Data Status</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refreshData(true)}
                disabled={dataLoading}
                className="h-8"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Families:</span>
                <div className="text-blue-700">{categoryData.families?.length || 0}</div>
              </div>
              <div>
                <span className="font-medium">Classes:</span>
                <div className="text-blue-700">{categoryData.classes?.length || 0}</div>
              </div>
              <div>
                <span className="font-medium">Brands:</span>
                <div className="text-blue-700">{categoryData.brands?.length || 0}</div>
              </div>
              <div>
                <span className="font-medium">Upload ID:</span>
                <div className="text-blue-700 font-mono text-xs">{categoryData.uploadId?.slice(-12) || 'None'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span>Category Data Required</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refreshData(true)}
                disabled={dataLoading}
                className="h-8"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${dataLoading ? 'animate-spin' : ''}`} />
                Load Data
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-yellow-700">
              No category data loaded. Please load category data to enable family, class, and brand selections for Booster schemes.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Scheme Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter scheme name"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Scheme Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article Scheme</SelectItem>
                  <SelectItem value="per_unit">Booster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distributor Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="distIds">DIST ID's</Label>
            <Select value={formData.distIds.type} onValueChange={handleDistIdsTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select distributor ID option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.distIds.type === 'other' && (
            <div>
              <Label htmlFor="specificDistIds">Specific Distributor IDs</Label>
              <Textarea
                id="specificDistIds"
                value={specificDistIds}
                onChange={(e) => handleSpecificDistIdsChange(e.target.value)}
                placeholder="Enter distributor IDs separated by commas (e.g., DIST001, DIST002, DIST003)"
                rows={3}
              />
              {formData.distIds.specificIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.distIds.specificIds.map(id => (
                    <Badge key={id} variant="outline">{id}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="zone">Zone</Label>
              <Select 
                value={formData.distributorData.zone} 
                onValueChange={(value) => handleInputChange('distributorData.zone', value)}
                disabled={isDistributorFieldsDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-zones">ALL Zones</SelectItem>
                  {zones.map(zone => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Select 
                value={formData.distributorData.state} 
                onValueChange={(value) => handleInputChange('distributorData.state', value)}
                disabled={isDistributorFieldsDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-states">ALL States</SelectItem>
                  {getAvailableStates().map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="distributorType">Distributor Type</Label>
              <Select 
                value={formData.distributorData.distributorType} 
                onValueChange={(value) => handleInputChange('distributorData.distributorType', value)}
                disabled={isDistributorFieldsDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">ALL Types</SelectItem>
                  {distributorTypes.map(type => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.code} - {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Criteria Section (Only for Booster Schemes) */}
      {formData.type === 'per_unit' && (
        <Card>
          <CardHeader>
            <CardTitle>Catalog Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="family">Family</Label>
                <Select 
                  value={formData.catalogType.family} 
                  onValueChange={(value) => handleInputChange('catalogType.family', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select family" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-families">ALL Families</SelectItem>
                    {categoryData?.families?.map(family => (
                      <SelectItem key={family} value={family}>{family}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class">Class</Label>
                <Select 
                  value={formData.catalogType.class} 
                  onValueChange={(value) => handleInputChange('catalogType.class', value)}
                  disabled={formData.catalogType.article === 'others-articles'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-classes">ALL Classes</SelectItem>
                    {getAvailableClasses().map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="brand">Brand</Label>
                <Select 
                  value={formData.catalogType.brand} 
                  onValueChange={(value) => handleInputChange('catalogType.brand', value)}
                  disabled={formData.catalogType.article === 'others-articles'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-brands">ALL Brands</SelectItem>
                    {getAvailableBrands().map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="article">Articles</Label>
                <Select 
                  value={formData.catalogType.article} 
                  onValueChange={(value) => handleInputChange('catalogType.article', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select articles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-articles">ALL Articles</SelectItem>
                    <SelectItem value="others-articles">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.catalogType.article === 'others-articles' && (
              <div className="mt-4">
                <Label htmlFor="specificArticleIds">Specific Article IDs</Label>
                <Textarea
                  id="specificArticleIds"
                  value={specificArticleIds}
                  onChange={(e) => handleSpecificArticleIdsChange(e.target.value)}
                  placeholder="Enter article IDs separated by commas (e.g., ART001, ART002, ART003)"
                  rows={3}
                />
                {formData.articles.specificIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.articles.specificIds.map(id => (
                      <Badge key={id} variant="outline">{id}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Article Scheme Section (Only for Article Schemes) */}
      {formData.type === 'article' && (
        <Card>
          <CardHeader>
            <CardTitle>Article Scheme Definition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="commissionType">Commission Type</Label>
              <Select 
                value={formData.commissionType} 
                onValueChange={(value) => handleInputChange('commissionType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select commission type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="absolute">Absolute (per unit)</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Upload Article Commissions</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadSampleData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="cursor-pointer"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload a CSV or Excel file with Article ID and Commission columns
                </p>
              </div>

              {uploadedFileName && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{uploadedFileName}</span>
                    <Badge variant="outline" className="text-green-700">
                      {Object.keys(articleCommissions).length} articles
                    </Badge>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={clearExcelData}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slab Configuration (Only for Booster Schemes) */}
      {formData.type === 'per_unit' && (
        <Card>
          <CardHeader>
            <CardTitle>Slab Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slabType">Slab Type</Label>
                <Select 
                  value={formData.slabType} 
                  onValueChange={(value) => handleInputChange('slabType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select slab type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="value">Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="commissionType">Commission Type</Label>
                <Select 
                  value={formData.commissionType} 
                  onValueChange={(value) => handleInputChange('commissionType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select commission type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="absolute_per_unit">Absolute Per Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Slabs</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSlab}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slab
                </Button>
              </div>

              {slabs.map((slab, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-md">
                  <div className="flex-1">
                    <Label className="text-sm">Min</Label>
                    <Input
                      type="number"
                      value={slab.min}
                      onChange={(e) => updateSlab(index, 'min', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Max (Optional)</Label>
                    <Input
                      type="number"
                      value={slab.max === null ? '' : slab.max}
                      onChange={(e) => updateSlab(index, 'max', e.target.value || null)}
                      min="0"
                      step="0.01"
                      placeholder="No limit"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Rate</Label>
                    <Input
                      type="number"
                      value={slab.rate}
                      onChange={(e) => updateSlab(index, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {slabs.length > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeSlab(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => refreshData(true)}
          disabled={dataLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating Scheme...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Scheme
            </>
          )}
        </Button>
      </div>
    </form>
  )
})

CreateScheme.displayName = 'CreateScheme'

export default CreateScheme