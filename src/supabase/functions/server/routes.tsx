import { Hono } from 'https://esm.sh/hono'
import * as kv from './kv_store.tsx'
import { performSchemeCalculation } from './helpers.tsx'

// Helper calculation functions
async function calculateBoosterScheme(scheme: any, salesData: any[], distributors: any[]) {
  console.log('Calculating booster scheme with scheme:', scheme.basicInfo?.schemeName)
  
  // Get category data for filtering
  const categoryData = await kv.get('category_data')
  
  // Use the optimized calculation function
  const result = await performSchemeCalculation(scheme, salesData, categoryData)
  return result.detailedCalculations
}

async function calculateArticleScheme(scheme: any, salesData: any[], distributors: any[]) {
  console.log('Calculating article scheme with scheme:', scheme.basicInfo?.schemeName)
  
  // Get category data for filtering (not used for article schemes but kept for consistency)
  const categoryData = await kv.get('category_data')
  
  // Use the optimized calculation function
  const result = await performSchemeCalculation(scheme, salesData, categoryData)
  return result.detailedCalculations
}

// Helper function to store large calculation results in chunks
async function storeCalculationResultsChunked(schemeId: string, calculations: any[], chunkSize: number = 1000) {
  // Ensure calculations is an array
  if (!Array.isArray(calculations)) {
    console.error('storeCalculationResultsChunked: calculations is not an array:', typeof calculations)
    throw new Error('Calculations must be an array')
  }
  
  const calculationId = `calc_${schemeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const totalChunks = Math.ceil(calculations.length / chunkSize)
  
  console.log(`Storing ${calculations.length} calculations in ${totalChunks} chunks of ${chunkSize} each`)
  
  const metadata = {
    calculationId,
    schemeId,
    totalRecords: calculations.length,
    totalChunks,
    chunkSize,
    createdAt: new Date().toISOString(),
    status: 'complete'
  }
  
  // Store metadata first
  await kv.set(`calc_meta_${calculationId}`, metadata)
  
  // Store calculations in chunks
  for (let i = 0; i < totalChunks; i++) {
    const startIndex = i * chunkSize
    const endIndex = Math.min(startIndex + chunkSize, calculations.length)
    const chunk = calculations.slice(startIndex, endIndex)
    
    const chunkKey = `calc_chunk_${calculationId}_${i}`
    await kv.set(chunkKey, {
      chunkIndex: i,
      calculationId,
      records: chunk,
      recordCount: chunk.length,
      startIndex,
      endIndex: endIndex - 1
    })
    
    console.log(`Stored chunk ${i + 1}/${totalChunks} with ${chunk.length} records`)
  }
  
  // Store latest calculation reference for quick access
  await kv.set('latest-calculation', {
    calculationId,
    schemeId,
    totalRecords: calculations.length,
    totalChunks,
    createdAt: metadata.createdAt,
    schemeName: calculations.length > 0 ? (calculations[0]?.schemeName || 'Unknown Scheme') : 'Unknown Scheme'
  })
  
  console.log(`Calculation ${calculationId} stored successfully with ${totalChunks} chunks`)
  return { calculationId, totalRecords: calculations.length, totalChunks }
}

export function setupRoutes(app: Hono) {
  
  // Debug endpoint to test route registration
  app.get('/make-server-ce8ebc43/debug/route-test', async (c) => {
    console.log('🔧 Route test endpoint called successfully')
    return c.json({ 
      success: true, 
      message: 'Route registration is working',
      timestamp: new Date().toISOString(),
      testEndpoint: true
    })
  })
  
  // Calculation endpoints
  
  // Get latest calculation results
  app.get('/make-server-ce8ebc43/calculations/latest', async (c) => {
    try {
      console.log('=== FETCHING LATEST CALCULATION ===')
      console.log('📍 calculations/latest endpoint called at', new Date().toISOString())
      console.log('Request headers received')
      
      // Get the latest calculation metadata
      const latestCalc = await kv.get('latest-calculation')
      
      if (!latestCalc) {
        console.log('No calculations found')
        return c.json({ 
          success: false, 
          message: 'No calculations found' 
        }, 404)
      }
      
      console.log('Found latest calculation:', {
        calculationId: latestCalc.calculationId,
        totalRecords: latestCalc.totalRecords,
        totalChunks: latestCalc.totalChunks
      })
      
      // Reconstruct the full calculation by fetching all chunks
      const calculations: any[] = []
      
      for (let i = 0; i < latestCalc.totalChunks; i++) {
        const chunkKey = `calc_chunk_${latestCalc.calculationId}_${i}`
        const chunk = await kv.get(chunkKey)
        
        if (chunk && chunk.records) {
          calculations.push(...chunk.records)
          console.log(`Loaded chunk ${i + 1}/${latestCalc.totalChunks} with ${chunk.records.length} records`)
        } else {
          console.warn(`Missing chunk ${i} for calculation ${latestCalc.calculationId}`)
        }
      }
      
      console.log(`Successfully reconstructed calculation with ${calculations.length} total records`)
      
      return c.json({ 
        success: true, 
        calculationId: latestCalc.calculationId,
        calculations: calculations,
        totalRecords: calculations.length,
        createdAt: latestCalc.createdAt,
        schemeName: latestCalc.schemeName
      })
    } catch (error) {
      console.error('Error fetching latest calculation:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Calculate commission for a scheme
  app.post('/make-server-ce8ebc43/calculate', async (c) => {
    try {
      console.log('=== CALCULATING SCHEME COMMISSION ===')
      console.log('📍 calculate endpoint called at', new Date().toISOString())
      console.log('Request headers received')
      const { schemeId } = await c.req.json()
      console.log('Calculating commission for scheme:', schemeId)
      
      if (!schemeId) {
        return c.json({ 
          success: false, 
          error: 'Scheme ID is required' 
        }, 400)
      }
      
      // Fetch the scheme
      const schemes = await kv.get('schemes') || []
      const scheme = schemes.find((s: any) => s.id === schemeId)
      
      if (!scheme) {
        return c.json({ 
          success: false, 
          error: 'Scheme not found' 
        }, 404)
      }
      
      // Fetch sales data
      const salesData = await kv.get('sales-data') || []
      if (salesData.length === 0) {
        return c.json({ 
          success: false, 
          error: 'No sales data available. Please upload sales data first.' 
        }, 400)
      }
      
      console.log(`Starting calculation for scheme "${scheme.basicInfo?.schemeName || scheme.name}" with ${salesData.length} sales records`)
      
      // Get category data for filtering
      const categoryData = await kv.get('category_data')
      
      // Use the appropriate calculation function based on scheme type
      let calculations: any[] = []
      const schemeType = scheme.schemeType || scheme.type || scheme.basicInfo?.schemeType || scheme.basicInfo?.type
      
      console.log('Scheme type determined as:', schemeType)
      
      try {
        if (schemeType === 'booster-scheme' || schemeType === 'per_unit') {
          calculations = await calculateBoosterScheme(scheme, salesData, [])
        } else if (schemeType === 'article-scheme' || schemeType === 'article') {
          calculations = await calculateArticleScheme(scheme, salesData, [])
        } else {
          // Default to article scheme calculation
          calculations = await calculateArticleScheme(scheme, salesData, [])
        }
        
        // Ensure we have an array
        if (!Array.isArray(calculations)) {
          console.error('Calculation function returned non-array:', typeof calculations)
          throw new Error('Calculation function must return an array')
        }
        
        console.log(`Calculation completed with ${calculations.length} detailed records`)
      } catch (calcError) {
        console.error('Error during scheme calculation:', calcError)
        throw new Error(`Calculation failed: ${calcError instanceof Error ? calcError.message : 'Unknown error'}`)
      }
      
      // Add scheme metadata to each calculation record
      const enhancedCalculations = calculations.map((calc: any) => ({
        ...calc,
        schemeId: scheme.id,
        schemeName: scheme.basicInfo?.schemeName || scheme.name,
        schemeType: schemeType
      }))
      
      console.log(`Enhanced calculations prepared: ${enhancedCalculations.length} records`)
      
      // Store results using chunked storage
      const storageResult = await storeCalculationResultsChunked(schemeId, enhancedCalculations)
      
      // Calculate summary statistics
      const totalCommission = enhancedCalculations.reduce((sum: number, calc: any) => sum + (calc.commission || 0), 0)
      const uniqueDistributors = new Set(enhancedCalculations.map((calc: any) => calc.distributorId)).size
      const uniqueArticles = new Set(enhancedCalculations.map((calc: any) => calc.articleId)).size
      
      console.log('Calculation summary:', {
        totalCommission,
        uniqueDistributors,
        uniqueArticles,
        totalRecords: enhancedCalculations.length
      })
      
      // Also store calculation result in the traditional format for backward compatibility
      const calculationRecord = {
        id: storageResult.calculationId,
        schemeId: scheme.id,
        uploadId: 'all-sales-data',
        calculations: enhancedCalculations,
        totalCommission: totalCommission,
        calculatedAt: new Date().toISOString(),
        summary: {
          totalCommission,
          uniqueDistributors,
          uniqueArticles,
          totalRecords: enhancedCalculations.length
        }
      }
      
      // Store this calculation in the calculations list for easy retrieval
      const existingCalculations = await kv.get('calculations') || []
      existingCalculations.push(calculationRecord)
      await kv.set('calculations', existingCalculations)
      
      return c.json({ 
        success: true, 
        calculationId: storageResult.calculationId,
        totalRecords: storageResult.totalRecords,
        totalChunks: storageResult.totalChunks,
        summary: {
          totalCommission,
          uniqueDistributors,
          uniqueArticles,
          totalRecords: enhancedCalculations.length
        },
        message: `Calculation completed successfully. ${enhancedCalculations.length} records processed.`
      })
    } catch (error) {
      console.error('Error calculating scheme commission:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })
  
  // Test endpoint
  app.get('/make-server-ce8ebc43/test', async (c) => {
    try {
      return c.json({ 
        status: 'success', 
        message: 'Backend is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    } catch (error) {
      console.error('Test endpoint error:', error)
      return c.json({ 
        status: 'error', 
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Zone-state mapping endpoints
  app.get('/make-server-ce8ebc43/zone-state-mapping', async (c) => {
    try {
      console.log('=== FETCHING ZONE-STATE MAPPING ===')
      let mapping = await kv.get('zone-state-mapping')
      
      // If no mapping exists, create a default one
      if (!mapping) {
        console.log('No zone-state mapping found, creating default mapping')
        mapping = {
          'East': ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'],
          'West': ['Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Chhattisgarh', 'Goa', 'Daman and Diu', 'Dadra and Nagar Haveli'],
          'North1': ['Delhi', 'Punjab', 'Haryana', 'Himachal Pradesh', 'Uttarakhand', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh'],
          'North2': ['Uttar Pradesh'],
          'South': ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Puducherry', 'Lakshadweep', 'Andaman and Nicobar Islands']
        }
        
        await kv.set('zone-state-mapping', mapping)
        console.log('Default zone-state mapping created and stored')
      }
      
      console.log('Retrieved zone-state mapping:', mapping ? 'Found' : 'Not found')
      return c.json({ success: true, mapping: mapping || null })
    } catch (error) {
      console.error('Error fetching zone-state mapping:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/zone-state-mapping', async (c) => {
    try {
      console.log('=== UPDATING ZONE-STATE MAPPING ===')
      const { data, mapping } = await c.req.json()
      const mappingData = data || mapping
      console.log('Updating zone-state mapping:', Object.keys(mappingData || {}))
      
      await kv.set('zone-state-mapping', mappingData)
      console.log('Zone-state mapping updated successfully')
      
      return c.json({ success: true, message: 'Zone-state mapping updated successfully', mapping: mappingData })
    } catch (error) {
      console.error('Error updating zone-state mapping:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Category data endpoints
  app.get('/make-server-ce8ebc43/category-data', async (c) => {
    try {
      console.log('=== FETCHING CATEGORY DATA ===')
      const categoryData = await kv.get('category_data')
      console.log('Retrieved category data:', categoryData ? 'Found' : 'Not found')
      
      if (categoryData) {
        return c.json({ 
          success: true, 
          categoryData: categoryData
        })
      } else {
        return c.json({ 
          success: false, 
          message: 'No category data found' 
        }, 404)
      }
    } catch (error) {
      console.error('Error fetching category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.get('/make-server-ce8ebc43/category-data-raw', async (c) => {
    try {
      console.log('=== FETCHING RAW CATEGORY DATA ===')
      const rawData = await kv.get('category_data_raw')
      console.log('Retrieved raw category data:', rawData ? 'Found' : 'Not found')
      
      if (rawData) {
        return c.json({ 
          success: true, 
          rawData: rawData.data || rawData.rawData,
          fileName: rawData.fileName,
          uploadedAt: rawData.uploadedAt
        })
      } else {
        return c.json({ 
          success: false, 
          message: 'No raw category data found' 
        }, 404)
      }
    } catch (error) {
      console.error('Error fetching raw category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // This is the main upload endpoint that CategoryDataUpload calls
  app.post('/make-server-ce8ebc43/upload-category-data', async (c) => {
    try {
      console.log('=== UPLOADING CATEGORY DATA ===')
      const requestBody = await c.req.json()
      const { 
        fileName, 
        families, 
        classes, 
        brands, 
        familyClassMapping, 
        familyBrandMapping, 
        classBrandMapping, 
        articleMappings, 
        rawData,
        totalRecords,
        validRecords,
        errorCount 
      } = requestBody
      
      console.log('Processing category data upload:', {
        fileName,
        families: families?.length || 0,
        classes: classes?.length || 0,
        brands: brands?.length || 0,
        rawRecords: rawData?.length || 0,
        totalRecords,
        validRecords,
        errorCount
      })
      
      // Generate upload ID
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const uploadedAt = new Date().toISOString()
      
      // Prepare processed category data for use by CreateScheme component
      const categoryData = {
        families: families || [],
        classes: classes || [],
        brands: brands || [],
        familyClassMapping: familyClassMapping || {},
        familyBrandMapping: familyBrandMapping || {},
        classBrandMapping: classBrandMapping || {},
        articleMappings: articleMappings || {},
        uploadId,
        uploadedAt
      }
      
      // Store processed category data
      await kv.set('category_data', categoryData)
      console.log('Processed category data stored with uploadId:', uploadId)
      
      // Store raw data separately for downloads and debugging
      const rawDataRecord = {
        rawData: rawData || [],
        fileName: fileName || 'unknown.csv',
        uploadedAt,
        uploadId,
        metadata: {
          totalRecords,
          validRecords,
          errorCount
        }
      }
      
      await kv.set('category_data_raw', rawDataRecord)
      console.log('Raw category data stored')
      
      return c.json({ 
        success: true, 
        message: 'Category data uploaded successfully',
        uploadId,
        summary: {
          families: families?.length || 0,
          classes: classes?.length || 0,
          brands: brands?.length || 0,
          articles: Object.keys(articleMappings || {}).length,
          validRecords,
          totalRecords,
          errorCount
        }
      })
    } catch (error) {
      console.error('Error uploading category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/category-data', async (c) => {
    try {
      console.log('=== STORING CATEGORY DATA (legacy endpoint) ===')
      const { data } = await c.req.json()
      console.log('Storing category data with keys:', Object.keys(data || {}))
      
      await kv.set('category_data', data)
      console.log('Category data stored successfully')
      
      return c.json({ success: true, message: 'Category data uploaded successfully' })
    } catch (error) {
      console.error('Error storing category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.delete('/make-server-ce8ebc43/category-data', async (c) => {
    try {
      console.log('=== DELETING ALL CATEGORY DATA ===')
      
      // Get current data to report what was deleted
      const categoryData = await kv.get('category_data')
      const rawData = await kv.get('category_data_raw')
      
      // Delete both processed and raw category data
      await Promise.all([
        kv.del('category_data'),
        kv.del('category_data_raw')
      ])
      
      console.log('All category data deleted successfully')
      
      return c.json({ 
        success: true, 
        message: 'All category data deleted successfully',
        deletedUploadsCount: (categoryData ? 1 : 0) + (rawData ? 1 : 0),
        deletedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error deleting category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Distributor endpoints
  app.get('/make-server-ce8ebc43/distributors', async (c) => {
    try {
      console.log('=== FETCHING DISTRIBUTORS ===')
      const distributors = await kv.get('distributors') || []
      console.log('Retrieved distributors:', distributors.length)
      
      // Transform to the expected format that the frontend is expecting
      const transformedDistributors = distributors.map((distributor: any) => ({
        value: distributor
      }))
      
      return c.json({ 
        success: true, 
        distributors: transformedDistributors
      })
    } catch (error) {
      console.error('Error fetching distributors:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/distributors', async (c) => {
    try {
      console.log('=== ADDING DISTRIBUTOR ===')
      const distributor = await c.req.json()
      console.log('Adding distributor:', distributor.name)
      
      const distributors = await kv.get('distributors') || []
      const newDistributor = {
        ...distributor,
        id: distributor.id || `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        onboardedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      distributors.push(newDistributor)
      
      await kv.set('distributors', distributors)
      console.log('Distributor added successfully')
      
      return c.json({ 
        success: true, 
        message: 'Distributor added successfully',
        distributor: newDistributor,
        distributors 
      })
    } catch (error) {
      console.error('Error adding distributor:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.put('/make-server-ce8ebc43/distributors/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const updates = await c.req.json()
      console.log('=== UPDATING DISTRIBUTOR ===', id)
      
      const distributors = await kv.get('distributors') || []
      const index = distributors.findIndex((d: any) => d.id === id || d.code === id)
      
      if (index === -1) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      distributors[index] = { 
        ...distributors[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      }
      await kv.set('distributors', distributors)
      
      console.log('Distributor updated successfully')
      return c.json({ 
        success: true, 
        message: 'Distributor updated successfully',
        distributor: distributors[index]
      })
    } catch (error) {
      console.error('Error updating distributor:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.delete('/make-server-ce8ebc43/distributors/:id', async (c) => {
    try {
      const id = c.req.param('id')
      console.log('=== DELETING DISTRIBUTOR ===', id)
      
      const distributors = await kv.get('distributors') || []
      const filteredDistributors = distributors.filter((d: any) => d.id !== id && d.code !== id)
      
      if (distributors.length === filteredDistributors.length) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      await kv.set('distributors', filteredDistributors)
      console.log('Distributor deleted successfully')
      
      return c.json({ 
        success: true, 
        message: 'Distributor deleted successfully',
        distributors: filteredDistributors 
      })
    } catch (error) {
      console.error('Error deleting distributor:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Individual distributor lookup endpoint
  app.get('/make-server-ce8ebc43/distributors/:id', async (c) => {
    try {
      const id = c.req.param('id')
      console.log('=== FETCHING SINGLE DISTRIBUTOR ===', id)
      
      const distributors = await kv.get('distributors') || []
      const distributor = distributors.find((d: any) => d.id === id || d.code === id)
      
      if (!distributor) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      return c.json({ success: true, distributor })
    } catch (error) {
      console.error('Error fetching distributor:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Bulk distributor upload endpoint
  app.post('/make-server-ce8ebc43/distributors/bulk', async (c) => {
    try {
      console.log('=== BULK UPLOADING DISTRIBUTORS ===')
      const { distributors: newDistributors } = await c.req.json()
      console.log('Bulk uploading distributors:', newDistributors?.length || 0)
      
      if (!newDistributors || !Array.isArray(newDistributors)) {
        return c.json({ 
          success: false, 
          error: 'Invalid distributors data provided'
        }, 400)
      }
      
      const existingDistributors = await kv.get('distributors') || []
      const timestamp = new Date().toISOString()
      
      // Process new distributors with metadata
      const processedDistributors = newDistributors.map((distributor: any, index: number) => ({
        ...distributor,
        id: distributor.id || `dist_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        onboardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: distributor.status || 'active'
      }))
      
      // Combine with existing distributors
      const allDistributors = [...existingDistributors, ...processedDistributors]
      
      await kv.set('distributors', allDistributors)
      console.log('Bulk distributor upload completed successfully')
      
      return c.json({ 
        success: true, 
        message: `${processedDistributors.length} distributors uploaded successfully`,
        uploadedCount: processedDistributors.length,
        totalCount: allDistributors.length,
        distributors: allDistributors
      })
    } catch (error) {
      console.error('Error bulk uploading distributors:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Distributor status update endpoint
  app.patch('/make-server-ce8ebc43/distributors/:id/status', async (c) => {
    try {
      const id = c.req.param('id')
      const { status } = await c.req.json()
      console.log('=== UPDATING DISTRIBUTOR STATUS ===', id, 'to', status)
      
      const distributors = await kv.get('distributors') || []
      const index = distributors.findIndex((d: any) => d.id === id || d.code === id)
      
      if (index === -1) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      distributors[index] = { 
        ...distributors[index], 
        status, 
        updatedAt: new Date().toISOString() 
      }
      
      await kv.set('distributors', distributors)
      console.log('Distributor status updated successfully')
      
      return c.json({ 
        success: true, 
        message: 'Distributor status updated successfully',
        distributor: distributors[index]
      })
    } catch (error) {
      console.error('Error updating distributor status:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Sales data endpoints
  app.get('/make-server-ce8ebc43/sales-data', async (c) => {
    try {
      console.log('=== FETCHING SALES DATA ===')
      const salesData = await kv.get('sales-data') || []
      console.log('Retrieved sales data records:', salesData.length)
      
      return c.json({ 
        success: true, 
        salesData: salesData
      })
    } catch (error) {
      console.error('Error fetching sales data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/upload-sales-data', async (c) => {
    try {
      console.log('=== UPLOADING SALES DATA ===')
      const requestBody = await c.req.json()
      const { fileName, data: salesRecords, month, year } = requestBody
      
      console.log('Processing sales data upload:', {
        fileName,
        month,
        year,
        recordCount: salesRecords?.length || 0
      })
      
      if (!salesRecords || !Array.isArray(salesRecords)) {
        return c.json({ 
          success: false, 
          error: 'Invalid sales data provided' 
        }, 400)
      }
      
      // Get existing sales data
      const existingSalesData = await kv.get('sales-data') || []
      const uploadedAt = new Date().toISOString()
      
      // Add metadata to each sales record
      const enhancedSalesRecords = salesRecords.map((record: any) => ({
        ...record,
        fileName: fileName || 'sales_data.csv',
        uploadMonth: month,
        uploadYear: year,
        uploadedAt
      }))
      
      // Append new records to existing data
      const allSalesData = [...existingSalesData, ...enhancedSalesRecords]
      
      // Store updated sales data
      await kv.set('sales-data', allSalesData)
      console.log(`Sales data uploaded successfully: ${enhancedSalesRecords.length} new records, ${allSalesData.length} total records`)
      
      return c.json({ 
        success: true, 
        message: 'Sales data uploaded successfully',
        uploadedRecords: enhancedSalesRecords.length,
        totalRecords: allSalesData.length,
        fileName,
        month,
        year
      })
    } catch (error) {
      console.error('Error uploading sales data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Schemes endpoints
  app.get('/make-server-ce8ebc43/schemes', async (c) => {
    try {
      console.log('=== FETCHING SCHEMES ===')
      const schemes = await kv.get('schemes') || []
      console.log('Retrieved schemes:', schemes.length)
      
      // Transform to the expected format that the frontend is expecting
      const transformedSchemes = schemes.map((scheme: any) => ({
        value: scheme
      }))
      
      return c.json({ 
        success: true, 
        schemes: transformedSchemes
      })
    } catch (error) {
      console.error('Error fetching schemes:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/schemes', async (c) => {
    try {
      console.log('=== STORING SCHEME ===')
      const scheme = await c.req.json()
      console.log('Storing scheme:', scheme.basicInfo?.schemeName || scheme.name)
      
      const schemes = await kv.get('schemes') || []
      const newScheme = {
        ...scheme,
        id: scheme.id || `scheme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: scheme.status || 'active'
      }
      
      schemes.push(newScheme)
      await kv.set('schemes', schemes)
      console.log('Scheme stored successfully')
      
      return c.json({ 
        success: true, 
        message: 'Scheme created successfully',
        scheme: newScheme
      })
    } catch (error) {
      console.error('Error storing scheme:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Calculations endpoints
  app.get('/make-server-ce8ebc43/calculations', async (c) => {
    try {
      console.log('=== FETCHING CALCULATIONS ===')
      
      // First try the traditional calculations list
      const traditionalCalculations = await kv.get('calculations') || []
      console.log(`Found ${traditionalCalculations.length} traditional calculation records`)
      
      // Also get chunked calculations metadata
      const allKeys = await kv.getByPrefix('calc_meta_')
      console.log(`Found ${allKeys.length} chunked calculation metadata records`)
      
      const calculations = [...traditionalCalculations]
      
      // Add chunked calculations that aren't already in traditional format
      for (const metaRecord of allKeys) {
        const metadata = metaRecord.value
        
        // Check if this calculation is already in traditional format
        const existsInTraditional = traditionalCalculations.some((calc: any) => calc.id === metadata.calculationId)
        
        if (!existsInTraditional) {
          // Calculate total commission from chunks
          try {
            let totalCommission = 0
            
            for (let i = 0; i < metadata.totalChunks; i++) {
              const chunk = await kv.get(`calc_chunk_${metadata.calculationId}_${i}`)
              if (chunk && chunk.records) {
                totalCommission += chunk.records.reduce((sum: number, record: any) => sum + (record.commission || 0), 0)
              }
            }
            
            calculations.push({
              id: metadata.calculationId,
              schemeId: metadata.schemeId,
              uploadId: 'all-sales-data',
              calculations: [], // We don't load the full calculations here for performance
              totalCommission: totalCommission,
              calculatedAt: metadata.createdAt,
              totalRecords: metadata.totalRecords,
              totalChunks: metadata.totalChunks
            })
          } catch (chunkError) {
            console.error(`Error loading calculation ${metadata.calculationId}:`, chunkError)
            // Still add the calculation but with zero commission
            calculations.push({
              id: metadata.calculationId,
              schemeId: metadata.schemeId,
              uploadId: 'all-sales-data',
              calculations: [],
              totalCommission: 0,
              calculatedAt: metadata.createdAt,
              totalRecords: metadata.totalRecords || 0,
              totalChunks: metadata.totalChunks || 0
            })
          }
        }
      }
      
      console.log(`Processed ${calculations.length} total calculations`)
      
      // Transform to the expected format
      const transformedCalculations = calculations.map((calc: any) => ({
        value: calc
      }))
      
      return c.json({ 
        success: true, 
        calculations: transformedCalculations
      })
    } catch (error) {
      console.error('Error fetching calculations:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Moderation panel endpoints
  app.get('/make-server-ce8ebc43/moderation/config', async (c) => {
    try {
      console.log('=== FETCHING MODERATION CONFIG ===')
      const config = await kv.get('moderation-config')
      
      if (config) {
        return c.json({ 
          success: true, 
          config: config
        })
      } else {
        // Return default config if none exists
        const defaultConfig = {
          schemeTypes: [
            {
              id: 'article-scheme',
              name: 'Article Scheme',
              description: 'Commission schemes for specific articles with Excel upload',
              enabled: true,
              fields: ['schemeName', 'schemeType', 'distributorCriteria', 'commissionType', 'commissionSlabs', 'validityPeriod']
            },
            {
              id: 'booster-scheme', 
              name: 'Booster Scheme',
              description: 'Volume-based commission schemes with hierarchical filtering',
              enabled: true,
              fields: ['schemeName', 'schemeType', 'distributorCriteria', 'catalogCriteria', 'commissionType', 'commissionSlabs', 'validityPeriod']
            }
          ],
          availableFields: [
            { id: 'schemeName', name: 'Scheme Name', required: true },
            { id: 'schemeType', name: 'Scheme Type', required: true },
            { id: 'distributorCriteria', name: 'Distributor Criteria', required: true },
            { id: 'catalogCriteria', name: 'Catalog Criteria', required: false },
            { id: 'commissionType', name: 'Commission Type', required: true },
            { id: 'commissionSlabs', name: 'Commission Slabs', required: true },
            { id: 'validityPeriod', name: 'Validity Period', required: true }
          ]
        }
        
        await kv.set('moderation-config', defaultConfig)
        return c.json({ 
          success: true, 
          config: defaultConfig
        })
      }
    } catch (error) {
      console.error('Error fetching moderation config:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/moderation/config', async (c) => {
    try {
      console.log('=== UPDATING MODERATION CONFIG ===')
      const config = await c.req.json()
      console.log('Updating moderation config')
      
      await kv.set('moderation-config', config)
      console.log('Moderation config updated successfully')
      
      return c.json({ 
        success: true, 
        message: 'Moderation configuration updated successfully',
        config: config
      })
    } catch (error) {
      console.error('Error updating moderation config:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

}
