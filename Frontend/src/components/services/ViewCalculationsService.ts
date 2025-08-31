import { toast } from 'sonner@2.0.3'
import { projectId } from '../../utils/supabase/info'
import { authService } from '../AuthService'
import type { Scheme, Upload, Calculation, DistributorArticleSummary, DistributorSchemeSummary } from '../types/ViewCalculationsTypes'

// Create cache-busting parameters for URLs
const createCacheBustingParams = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `v=${timestamp}&r=${random}`
}

// Fetch all available schemes
export const fetchSchemes = async (): Promise<Scheme[]> => {
  try {
    const cacheBusting = createCacheBustingParams()
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/schemes?${cacheBusting}`
    
    console.log('=== FETCHING SCHEMES ===')
    console.log('URL:', url)
    
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    console.log('Schemes response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Schemes fetch failed:', response.status, errorText)
      
      // Return empty array for common error cases instead of throwing
      if (response.status === 404 || response.status === 500) {
        console.warn(`Schemes endpoint returned ${response.status} - returning empty array`)
        return []
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('Schemes result:', { 
      success: result.success, 
      schemesLength: result.schemes?.length || 0 
    })
    
    if (result.success && Array.isArray(result.schemes)) {
      // Transform schemes to ensure proper structure
      const schemes = result.schemes.map((schemeItem: any) => {
        const scheme = schemeItem.value || schemeItem
        return {
          id: scheme.id,
          name: scheme.name,
          type: scheme.type,
          startDate: scheme.startDate,
          endDate: scheme.endDate,
          status: scheme.status || 'active',
          slabType: scheme.slabType,
          commissionType: scheme.commissionType,
          distributorData: scheme.distributorData,
          catalogType: scheme.catalogType
        }
      }).filter(scheme => scheme && scheme.id && scheme.name)
      
      console.log('Successfully processed schemes:', schemes.length)
      return schemes
    }
    
    console.log('No schemes found or invalid response structure')
    return []
  } catch (error) {
    console.error('Error fetching schemes:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Don't show toast for expected conditions
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('500'))) {
      console.log('Backend error when fetching schemes - may be expected if backend is not deployed')
      return []
    }
    
    toast.error(`Failed to fetch schemes: ${errorMessage}`)
    return []
  }
}

// Fetch sales data and transform to Upload format  
export const fetchUploads = async (): Promise<Upload[]> => {
  try {
    const cacheBusting = createCacheBustingParams()
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/sales-data?${cacheBusting}`
    
    console.log('=== FETCHING SALES DATA (UPLOADS) ===')
    console.log('URL:', url)
    
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    console.log('Sales data response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sales data fetch failed:', response.status, errorText)
      
      // Handle specific cases gracefully
      if (response.status === 404) {
        console.log('Sales data endpoint returned 404 - this is expected when no sales data has been uploaded')
        return []
      }
      
      if (response.status === 500) {
        console.warn('Server error when fetching sales data - backend may be experiencing issues')
        return []
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('Sales data result:', { 
      success: result.success, 
      salesDataExists: !!result.salesData,
      salesDataLength: result.salesData?.length || 0
    })
    
    if (result.success) {
      // Handle case where salesData is empty or undefined
      if (!result.salesData || !Array.isArray(result.salesData) || result.salesData.length === 0) {
        console.log('No sales data found - returning empty uploads array')
        return []
      }
      
      // Transform sales data to Upload format by grouping by upload session
      const uploads: Upload[] = []
      const uploadGroups = new Map<string, any[]>()
      
      // Group sales records by upload metadata
      result.salesData.forEach((record: any) => {
        const month = record.uploadMonth || 'Unknown'
        const year = record.uploadYear || new Date().getFullYear()
        const fileName = record.fileName || 'sales_data.csv'
        const uploadDate = record.uploadedAt ? record.uploadedAt.split('T')[0] : new Date().toISOString().split('T')[0]
        
        // Create unique key for each upload session
        const groupKey = `${month}_${year}_${fileName}_${uploadDate}`
        
        if (!uploadGroups.has(groupKey)) {
          uploadGroups.set(groupKey, [])
        }
        uploadGroups.get(groupKey)!.push(record)
      })
      
      // Convert groups to Upload objects
      let index = 0
      uploadGroups.forEach((records, groupKey) => {
        const firstRecord = records[0]
        
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
      
      console.log('Successfully transformed sales data to uploads:', {
        uploadsCount: uploads.length,
        totalSalesRecords: result.salesData.length,
        uploadDetails: uploads.map(u => `${u.month} ${u.year} (${u.data?.length || 0} records)`)
      })
      
      return uploads
    }
    
    console.log('Sales data response did not contain expected structure or was not successful')
    return []
  } catch (error) {
    console.error('Error fetching sales data for uploads:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Don't show error toast for expected conditions
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        console.log('No sales data available - this is expected when no data has been uploaded')
        return []
      }
      
      if (error.message.includes('500')) {
        console.warn('Server error when fetching sales data')
        return []
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error('Network error - backend may not be accessible')
        return []
      }
    }
    
    // Only show toast for unexpected errors
    console.warn('Showing error toast for unexpected error:', errorMessage)
    toast.error(`Failed to fetch sales data: ${errorMessage}`)
    return []
  }
}

// Fetch all calculation results using new chunked API
export const fetchCalculations = async (limit: number = 50, offset: number = 0): Promise<Calculation[]> => {
  try {
    const cacheBusting = createCacheBustingParams()
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/calculations/latest?${cacheBusting}`
    
    console.log('=== FETCHING LATEST CALCULATION ===')
    console.log('URL:', url)
    
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    console.log('Calculations response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Calculations fetch failed:', response.status, errorText)
      
      // Handle timeout errors gracefully
      if (response.status === 408) {
        throw new Error('Server timeout - too much calculation data. Please try again or contact support.')
      }
      
      // Handle 404 gracefully (no calculations yet)
      if (response.status === 404) {
        console.log('No calculations found - this is expected when no calculations have been run')
        return []
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('Calculations result:', { 
      success: result.success, 
      calculationsLength: result.calculations?.length || 0,
      calculationId: result.calculationId,
      totalRecords: result.totalRecords
    })
    
    if (result.success && Array.isArray(result.calculations)) {
      // Create a single calculation object from the latest calculation
      const calculation: Calculation = {
        id: result.calculationId || `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        schemeId: '', // Will be determined from calculation data
        uploadId: 'all-sales-data',
        calculations: result.calculations,
        distributorArticleSummary: [], // Generate from detailed calculations if needed
        totalCommission: result.calculations.reduce((sum: number, calc: any) => sum + (calc.commission || 0), 0),
        totalDistributorArticleCombinations: new Set(result.calculations.map((calc: any) => `${calc.distributorId}:${calc.articleId}`)).size,
        calculatedAt: result.createdAt || new Date().toISOString(),
        calculationType: 'optimized-chunked'
      }
      
      console.log('Successfully processed latest calculation:', {
        id: calculation.id,
        totalCommission: calculation.totalCommission,
        totalRecords: calculation.calculations.length
      })
      
      return [calculation]
    }
    
    console.log('Calculations response did not contain expected structure')
    return []
  } catch (error) {
    console.error('Error fetching calculations:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle timeout errors specially
    if (errorMessage.includes('timeout')) {
      throw error // Re-throw timeout errors so UI can handle them specifically
    }
    
    // Don't show toast for expected conditions
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('500'))) {
      console.log('Backend error when fetching calculations - may be expected')
      return []
    }
    
    toast.error(`Failed to fetch calculations: ${errorMessage}`)
    throw error // Re-throw so calling code can handle appropriately
  }
}

// Calculate commission for a scheme
export const calculateScheme = async (selectedScheme: string, _selectedUpload: string): Promise<any> => {
  try {
    console.log('=== CALCULATING SCHEME ===')
    console.log('Scheme ID:', selectedScheme)
    
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/calculate`
    console.log('Calculate URL:', url)
    
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        schemeId: selectedScheme
      })
    })
    
    console.log('Calculate response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Calculate request failed:', response.status, errorText)
      
      if (response.status === 408) {
        throw new Error('Calculation timeout - Dataset too large. Please reduce your data size or contact support.')
      }
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('Calculate result:', {
      success: result.success,
      calculationId: result.calculationId,
      totalCommission: result.summary?.totalCommission,
      recordsProcessed: result.calculations?.length
    })
    
    return result
  } catch (error) {
    console.error('Error in calculateScheme:', error)
    throw error
  }
}

// Create distributor scheme summary from distributor article summary
export const createDistributorSchemeSummary = (distributorArticleSummary: DistributorArticleSummary[]): DistributorSchemeSummary[] => {
  const distributorMap = new Map<string, DistributorSchemeSummary>()
  
  for (const summary of distributorArticleSummary) {
    const key = summary.distributorId
    
    if (!distributorMap.has(key)) {
      distributorMap.set(key, {
        distributorId: summary.distributorId,
        distributorName: summary.distributorName,
        uniqueArticles: [],
        totalQuantity: 0,
        totalValue: 0,
        totalCommission: 0,
        totalSalesCount: 0
      })
    }
    
    const distributorSummary = distributorMap.get(key)!
    
    // Add article to unique articles list if not already present
    if (!distributorSummary.uniqueArticles.includes(summary.articleId)) {
      distributorSummary.uniqueArticles.push(summary.articleId)
    }
    
    // Aggregate totals
    distributorSummary.totalQuantity += summary.totalQuantity
    distributorSummary.totalValue += summary.totalValue
    distributorSummary.totalCommission += summary.commission
    distributorSummary.totalSalesCount += summary.salesCount
  }
  
  // Sort articles within each distributor for consistency
  for (const summary of distributorMap.values()) {
    summary.uniqueArticles.sort()
  }
  
  return Array.from(distributorMap.values())
}