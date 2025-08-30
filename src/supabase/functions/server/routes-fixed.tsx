import { Hono } from 'npm:hono'
import * as kv from './kv_store.tsx'
import { performSchemeCalculation, cleanupLegacyGlobalDistributors } from './helpers.tsx'
import { 
  requireAuth, 
  optionalAuth, 
  getAuthenticatedUser, 
  createUserKey,
  createSchemeKey,
  createCalculationKey,
  createSalesDataKey,
  createDistributorKey,
  createCategoryDataKey
} from './auth.tsx'

// Helper calculation functions
async function calculateBoosterScheme(scheme: any, salesData: any[], distributors: any[], userId: string) {
  console.log('Calculating booster scheme with scheme:', scheme.basicInfo?.schemeName)
  
  // Get user-specific category data for filtering
  const categoryData = await kv.get(createCategoryDataKey(userId))
  
  // Use the optimized calculation function
  const result = await performSchemeCalculation(scheme, salesData, categoryData, distributors)
  return result.detailedCalculations
}

async function calculateArticleScheme(scheme: any, salesData: any[], distributors: any[], userId: string) {
  console.log('Calculating article scheme with scheme:', scheme.basicInfo?.schemeName)
  
  // Get user-specific category data for filtering (not used for article schemes but kept for consistency)
  const categoryData = await kv.get(createCategoryDataKey(userId))
  
  // Use the optimized calculation function
  const result = await performSchemeCalculation(scheme, salesData, categoryData, distributors)
  return result.detailedCalculations
}

// Helper function to store large calculation results in chunks with optimized database operations
async function storeCalculationResultsChunked(userId: string, schemeId: string, calculations: any[], chunkSize: number = 500) {
  // Ensure calculations is an array
  if (!Array.isArray(calculations)) {
    console.error('storeCalculationResultsChunked: calculations is not an array:', typeof calculations)
    throw new Error('Calculations must be an array')
  }
  
  const calculationId = `calc_${schemeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const totalChunks = Math.ceil(calculations.length / chunkSize)
  
  console.log(`Storing ${calculations.length} calculations in ${totalChunks} chunks of ${chunkSize} each for user ${userId}`)
  
  // Calculate summary upfront to avoid doing it multiple times
  const totalCommission = calculations.reduce((sum: number, calc: any) => sum + (calc.commission || 0), 0)
  const uniqueDistributors = new Set(calculations.map((calc: any) => calc.distributorId)).size
  const uniqueArticles = new Set(calculations.map((calc: any) => calc.articleId)).size
  
  const metadata = {
    calculationId,
    schemeId,
    userId,
    totalRecords: calculations.length,
    totalChunks,
    chunkSize,
    createdAt: new Date().toISOString(),
    status: 'complete',
    summary: {
      totalCommission,
      uniqueDistributors,
      uniqueArticles,
      totalRecords: calculations.length
    }
  }
  
  try {
    // Store metadata with user-specific key
    await kv.set(createUserKey(userId, `calc_meta_${calculationId}`), metadata)
    console.log('Stored calculation metadata for user')
    
    // Store calculations in smaller chunks with delays to prevent database overload
    const DB_OPERATION_DELAY = 100 // 100ms delay between chunks
    
    for (let i = 0; i < totalChunks; i++) {
      const startIndex = i * chunkSize
      const endIndex = Math.min(startIndex + chunkSize, calculations.length)
      const chunk = calculations.slice(startIndex, endIndex)
      
      const chunkKey = createUserKey(userId, `calc_chunk_${calculationId}_${i}`)
      await kv.set(chunkKey, {
        chunkIndex: i,
        calculationId,
        userId,
        records: chunk,
        recordCount: chunk.length,
        startIndex,
        endIndex: endIndex - 1
      })
      
      console.log(`Stored chunk ${i + 1}/${totalChunks} with ${chunk.length} records`)
      
      // Add small delay between database operations to prevent timeout
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, DB_OPERATION_DELAY))
      }
    }
    
    // Store latest calculation reference for quick access (user-specific)
    await kv.set(createUserKey(userId, 'latest-calculation'), {
      calculationId,
      schemeId,
      userId,
      totalRecords: calculations.length,
      totalChunks,
      createdAt: metadata.createdAt,
      schemeName: calculations.length > 0 ? (calculations[0]?.schemeName || 'Unknown Scheme') : 'Unknown Scheme',
      summary: metadata.summary
    })
    
    console.log(`Calculation ${calculationId} stored successfully with ${totalChunks} chunks for user ${userId}`)
    return { 
      calculationId, 
      totalRecords: calculations.length, 
      totalChunks,
      summary: metadata.summary 
    }
  } catch (error) {
    console.error('Error storing calculation chunks:', error)
    // Clean up any partial data on error
    try {
      await kv.del(createUserKey(userId, `calc_meta_${calculationId}`))
      for (let i = 0; i < totalChunks; i++) {
        await kv.del(createUserKey(userId, `calc_chunk_${calculationId}_${i}`))
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError)
    }
    throw error
  }
}

export function setupRoutes(app: Hono) {
  
  // Simple health check endpoint (no auth, no database) - MUST be first to avoid any middleware interference
  app.get('/make-server-ce8ebc43/health', async (c) => {
    try {
      console.log('Health check endpoint called')
      return c.json({ 
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.1',
        endpoint: '/health'
      })
    } catch (error) {
      console.error('Health check error:', error)
      return c.json({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 500)
    }
  })
  
  // Test endpoint (public access)
  app.get('/make-server-ce8ebc43/test', optionalAuth, async (c) => {
    try {
      const user = c.get('user')
      return c.json({ 
        status: 'success', 
        message: 'Backend is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        authenticated: !!user,
        userId: user?.id || null
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

  // Distributor endpoints (authenticated)
  app.get('/make-server-ce8ebc43/distributors', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING DISTRIBUTORS FOR USER ===', user.id)
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      console.log('Retrieved distributors for user:', user.id, distributors.length)
      
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

  app.post('/make-server-ce8ebc43/distributors', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== ADDING DISTRIBUTOR FOR USER ===', user.id)
      const distributor = await c.req.json()
      console.log('Adding distributor:', distributor.name)
      
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      const newDistributor = {
        ...distributor,
        id: distributor.id || `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        onboardedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      distributors.push(newDistributor)
      
      await kv.set(createUserKey(user.id, 'distributors'), distributors)
      console.log('Distributor added successfully for user:', user.id)
      
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

  app.put('/make-server-ce8ebc43/distributors/:id', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      const id = c.req.param('id')
      const updates = await c.req.json()
      console.log('=== UPDATING DISTRIBUTOR FOR USER ===', user.id, 'ID:', id)
      
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      const index = distributors.findIndex((d: any) => d.id === id || d.code === id)
      
      if (index === -1) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      distributors[index] = { 
        ...distributors[index], 
        ...updates, 
        userId: user.id,
        updatedAt: new Date().toISOString() 
      }
      await kv.set(createUserKey(user.id, 'distributors'), distributors)
      
      console.log('Distributor updated successfully for user:', user.id)
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

  app.delete('/make-server-ce8ebc43/distributors/:id', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      const id = c.req.param('id')
      console.log('=== DELETING DISTRIBUTOR FOR USER ===', user.id, 'ID:', id)
      
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      const filteredDistributors = distributors.filter((d: any) => d.id !== id && d.code !== id)
      
      if (distributors.length === filteredDistributors.length) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      await kv.set(createUserKey(user.id, 'distributors'), filteredDistributors)
      console.log('Distributor deleted successfully for user:', user.id)
      
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
  app.get('/make-server-ce8ebc43/distributors/:id', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      const id = c.req.param('id')
      console.log('=== FETCHING SINGLE DISTRIBUTOR FOR USER ===', user.id, 'ID:', id)
      
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
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
  app.post('/make-server-ce8ebc43/distributors/bulk', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== BULK UPLOADING DISTRIBUTORS FOR USER ===', user.id)
      const { distributors: newDistributors } = await c.req.json()
      console.log('Bulk uploading distributors for user:', user.id, 'Count:', newDistributors?.length || 0)
      
      if (!newDistributors || !Array.isArray(newDistributors)) {
        return c.json({ 
          success: false, 
          error: 'Invalid distributors data provided'
        }, 400)
      }
      
      const existingDistributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      const timestamp = new Date().toISOString()
      
      // Process new distributors with metadata
      const processedDistributors = newDistributors.map((distributor: any, index: number) => ({
        ...distributor,
        id: distributor.id || `dist_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        onboardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: distributor.status || 'active'
      }))
      
      // Combine with existing distributors
      const allDistributors = [...existingDistributors, ...processedDistributors]
      
      await kv.set(createUserKey(user.id, 'distributors'), allDistributors)
      console.log('Bulk distributor upload completed successfully for user:', user.id)
      
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
  app.patch('/make-server-ce8ebc43/distributors/:id/status', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      const id = c.req.param('id')
      const { status } = await c.req.json()
      console.log('=== UPDATING DISTRIBUTOR STATUS FOR USER ===', user.id, 'ID:', id, 'to', status)
      
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      const index = distributors.findIndex((d: any) => d.id === id || d.code === id)
      
      if (index === -1) {
        return c.json({ success: false, error: 'Distributor not found' }, 404)
      }
      
      distributors[index] = { 
        ...distributors[index], 
        status, 
        updatedAt: new Date().toISOString() 
      }
      await kv.set(createUserKey(user.id, 'distributors'), distributors)
      
      console.log('Distributor status updated successfully for user:', user.id)
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

  // Zone-state mapping endpoints (public access for distributors)
  app.get('/make-server-ce8ebc43/zone-state-mapping', optionalAuth, async (c) => {
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

  app.post('/make-server-ce8ebc43/zone-state-mapping', requireAuth, async (c) => {
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

  // Get all calculations endpoint with timeout protection (authenticated)
  app.get('/make-server-ce8ebc43/calculations', requireAuth, async (c) => {
    const startTime = Date.now()
    
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING ALL CALCULATIONS ===')
      console.log('📍 calculations endpoint called at', new Date().toISOString(), 'for user:', user.id)
      
      // Add timeout protection for database operations
      const FETCH_TIMEOUT = 15000 // 15 seconds for database fetch
      
      const calculationsPromise = kv.get(createUserKey(user.id, 'calculations'))
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database fetch timeout')), FETCH_TIMEOUT)
      })
      
      // Race between the database call and timeout
      const calculations = await Promise.race([calculationsPromise, timeoutPromise]) || []
      console.log(`Retrieved ${calculations.length} calculations for user ${user.id}`)
      
      // Format the response to match what the frontend expects with safe property access
      const formattedCalculations = calculations
        .filter((calc: any) => calc && typeof calc === 'object') // Filter out null/undefined/invalid items
        .map((calc: any) => ({
          ...calc,
          // Ensure consistent property names with safe access
          id: calc.id || calc.calculationId || `calc_${Date.now()}_${Math.random()}`,
          schemeId: calc.schemeId || 'unknown',
          uploadId: calc.uploadId || 'all-sales-data',
          calculations: Array.isArray(calc.calculations) ? calc.calculations : [],
          totalCommission: calc.totalCommission || calc.summary?.totalCommission || 0,
          calculatedAt: calc.calculatedAt || calc.createdAt || new Date().toISOString(),
          summary: calc.summary || {
            totalCommission: calc.totalCommission || 0,
            uniqueDistributors: 0,
            uniqueArticles: 0,
            totalRecords: Array.isArray(calc.calculations) ? calc.calculations.length : 0
          }
        }))
      
      const processingTime = Date.now() - startTime
      console.log(`Formatted ${formattedCalculations.length} calculations for response in ${processingTime}ms`)
      
      return c.json({ 
        success: true, 
        calculations: formattedCalculations,
        processingTimeMs: processingTime
      })
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error('Error fetching calculations:', error)
      
      // If it's a timeout error, return a helpful message
      if (error.message?.includes('timeout')) {
        console.error(`Calculations fetch timed out after ${processingTime}ms`)
        return c.json({ 
          success: false, 
          error: 'Database operation timed out',
          message: 'The calculations fetch took too long. This may be due to a large number of calculations. Please try again later.',
          processingTimeMs: processingTime
        }, 500)
      }
      
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime
      }, 500)
    }
  })

  // Get latest calculation results (authenticated)
  app.get('/make-server-ce8ebc43/calculations/latest', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING LATEST CALCULATION ===')
      console.log('📍 calculations/latest endpoint called at', new Date().toISOString(), 'for user:', user.id)
      
      // Get the latest calculation metadata for the user
      const latestCalc = await kv.get(createUserKey(user.id, 'latest-calculation'))
      
      if (!latestCalc) {
        console.log(`No calculations found for user ${user.id}`)
        return c.json({ 
          success: false, 
          message: 'No calculations found' 
        }, 404)
      }
      
      console.log('Found latest calculation:', {
        calculationId: latestCalc.calculationId,
        totalRecords: latestCalc.totalRecords,
        totalChunks: latestCalc.totalChunks,
        userId: latestCalc.userId
      })
      
      // Reconstruct the full calculation by fetching all chunks
      const calculations: any[] = []
      
      for (let i = 0; i < latestCalc.totalChunks; i++) {
        const chunkKey = createUserKey(user.id, `calc_chunk_${latestCalc.calculationId}_${i}`)
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

  // Get all schemes endpoint (authenticated)
  app.get('/make-server-ce8ebc43/schemes', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING ALL SCHEMES ===')
      console.log('📍 schemes endpoint called at', new Date().toISOString(), 'for user:', user.id)
      
      // Get user-specific schemes from storage
      const schemes = await kv.get(createUserKey(user.id, 'schemes')) || []
      console.log(`Retrieved ${schemes.length} schemes for user ${user.id}`)
      
      // Transform to the expected format that the frontend is expecting
      const transformedSchemes = schemes
        .filter((scheme: any) => scheme && typeof scheme === 'object') // Filter out null/undefined items
        .map((scheme: any) => ({
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

  // Create new scheme endpoint (authenticated)
  app.post('/make-server-ce8ebc43/schemes', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== CREATING NEW SCHEME ===')
      console.log('📍 schemes POST endpoint called at', new Date().toISOString(), 'for user:', user.id)
      
      const schemeData = await c.req.json()
      console.log('Received scheme data:', {
        name: schemeData.basicInfo?.schemeName || schemeData.name,
        type: schemeData.type,
        schemeType: schemeData.schemeType,
        hasSlabs: Array.isArray(schemeData.slabs) && schemeData.slabs.length > 0,
        hasArticleCommissions: !!schemeData.articleCommissions
      })
      
      // Validate required fields
      if (!schemeData.name && !schemeData.basicInfo?.schemeName) {
        return c.json({ 
          success: false, 
          error: 'Scheme name is required' 
        }, 400)
      }
      
      if (!schemeData.type && !schemeData.basicInfo?.type) {
        return c.json({ 
          success: false, 
          error: 'Scheme type is required' 
        }, 400)
      }
      
      // Generate unique scheme ID
      const schemeId = `scheme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const createdAt = new Date().toISOString()
      
      // Create the scheme object with proper structure
      const newScheme = {
        ...schemeData,
        id: schemeId,
        userId: user.id,
        createdAt,
        updatedAt: createdAt,
        // Ensure basic info is properly structured
        basicInfo: {
          schemeName: schemeData.basicInfo?.schemeName || schemeData.name,
          schemeType: schemeData.schemeType || schemeData.basicInfo?.schemeType || schemeData.type,
          type: schemeData.type || schemeData.basicInfo?.type,
          slabType: schemeData.basicInfo?.slabType || schemeData.slabType || 'quantity',
          commissionType: schemeData.basicInfo?.commissionType || schemeData.commissionType || 'percentage',
          slabs: schemeData.basicInfo?.slabs || schemeData.slabs || [],
          startDate: schemeData.basicInfo?.startDate || schemeData.startDate,
          endDate: schemeData.basicInfo?.endDate || schemeData.endDate,
          ...schemeData.basicInfo
        }
      }
      
      console.log('Created scheme object:', {
        id: newScheme.id,
        name: newScheme.basicInfo.schemeName,
        type: newScheme.basicInfo.type,
        schemeType: newScheme.basicInfo.schemeType,
        userId: newScheme.userId
      })
      
      // Get existing schemes for the user
      const existingSchemes = await kv.get(createUserKey(user.id, 'schemes')) || []
      
      // Add the new scheme
      const updatedSchemes = [...existingSchemes, newScheme]
      
      // Store the updated schemes list with user isolation
      await kv.set(createUserKey(user.id, 'schemes'), updatedSchemes)
      console.log(`Scheme stored successfully. User now has ${updatedSchemes.length} schemes.`)
      
      return c.json({ 
        success: true, 
        message: 'Scheme created successfully',
        scheme: newScheme,
        schemeId: schemeId
      })
    } catch (error) {
      console.error('Error creating scheme:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error creating scheme'
      }, 500)
    }
  })

  // Calculate commission for a scheme (authenticated)
  app.post('/make-server-ce8ebc43/calculate', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== CALCULATING SCHEME COMMISSION ===')
      console.log('📍 calculate endpoint called at', new Date().toISOString(), 'for user:', user.id)
      const { schemeId } = await c.req.json()
      console.log('Calculating commission for scheme:', schemeId)
      
      if (!schemeId) {
        return c.json({ 
          success: false, 
          error: 'Scheme ID is required' 
        }, 400)
      }
      
      // Fetch the scheme (user-specific)
      const schemes = await kv.get(createUserKey(user.id, 'schemes')) || []
      const scheme = schemes.find((s: any) => s.id === schemeId)
      
      if (!scheme) {
        return c.json({ 
          success: false, 
          error: 'Scheme not found' 
        }, 404)
      }
      
      // Fetch sales data (user-specific)
      const salesData = await kv.get(createUserKey(user.id, 'sales-data')) || []
      if (salesData.length === 0) {
        return c.json({ 
          success: false, 
          error: 'No sales data available. Please upload sales data first.' 
        }, 400)
      }
      
      // Fetch distributors (user-specific)
      const distributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      
      console.log(`Starting calculation for scheme "${scheme.basicInfo?.schemeName || scheme.name}" with ${salesData.length} sales records and ${distributors.length} distributors`)
      
      // Use the appropriate calculation function based on scheme type
      let calculations: any[] = []
      const schemeType = scheme.schemeType || scheme.type || scheme.basicInfo?.schemeType || scheme.basicInfo?.type
      
      console.log('Scheme type determined as:', schemeType)
      
      try {
        if (schemeType === 'booster-scheme' || schemeType === 'per_unit') {
          calculations = await calculateBoosterScheme(scheme, salesData, distributors, user.id)
        } else if (schemeType === 'article-scheme' || schemeType === 'article') {
          calculations = await calculateArticleScheme(scheme, salesData, distributors, user.id)
        } else {
          // Default to article scheme calculation
          calculations = await calculateArticleScheme(scheme, salesData, distributors, user.id)
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
      const storageResult = await storeCalculationResultsChunked(user.id, schemeId, enhancedCalculations)
      
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
      
      // Also store calculation result in the traditional format for backward compatibility (user-specific)
      const calculationRecord = {
        id: storageResult.calculationId,
        schemeId: scheme.id,
        uploadId: 'all-sales-data',
        calculations: enhancedCalculations,
        totalCommission: totalCommission,
        calculatedAt: new Date().toISOString(),
        userId: user.id,
        summary: {
          totalCommission,
          uniqueDistributors,
          uniqueArticles,
          totalRecords: enhancedCalculations.length
        }
      }
      
      // Store this calculation in the calculations list for easy retrieval (user-specific)
      const existingCalculations = await kv.get(createUserKey(user.id, 'calculations')) || []
      existingCalculations.push(calculationRecord)
      await kv.set(createUserKey(user.id, 'calculations'), existingCalculations)
      
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

  // Get sales data endpoint (authenticated)
  app.get('/make-server-ce8ebc43/sales-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING SALES DATA ===')
      console.log('📍 sales-data endpoint called at', new Date().toISOString(), 'for user:', user.id)
      
      // Get user-specific sales data from storage
      const salesData = await kv.get(createUserKey(user.id, 'sales-data')) || []
      console.log(`Retrieved ${salesData.length} sales data records for user ${user.id}`)
      
      // Group by upload metadata if available
      const processedSalesData = salesData
        .filter((record: any) => record && typeof record === 'object') // Filter out null/undefined items
        .map((record: any) => ({
          ...record,
          uploadMonth: record.uploadMonth || 'Unknown',
          uploadYear: record.uploadYear || new Date().getFullYear(),
          fileName: record.fileName || 'sales_data.csv',
          uploadedAt: record.uploadedAt || new Date().toISOString()
        }))
      
      return c.json({ 
        success: true, 
        salesData: processedSalesData
      })
    } catch (error) {
      console.error('Error fetching sales data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Upload sales data endpoint (authenticated)
  app.post('/make-server-ce8ebc43/upload-sales-data', requireAuth, async (c) => {
    const startTime = Date.now()
    
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== UPLOADING SALES DATA ===')
      console.log('📍 upload-sales-data endpoint called at', new Date().toISOString(), 'for user:', user.id)
      
      const requestBody = await c.req.json()
      const { fileName, data, month, year } = requestBody
      
      console.log(`Processing sales data upload for user ${user.id}:`, {
        fileName: fileName || 'unknown.csv',
        records: data?.length || 0,
        month,
        year
      })
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return c.json({ 
          success: false, 
          error: 'No sales data provided or data is empty' 
        }, 400)
      }
      
      if (!month || !year) {
        return c.json({ 
          success: false, 
          error: 'Month and year are required' 
        }, 400)
      }
      
      // Check data size limits (100,000 records max for optimal performance)
      if (data.length > 100000) {
        return c.json({ 
          success: false, 
          error: `File contains ${data.length} records. Maximum 100,000 records allowed for optimal performance. Please split your data into smaller files.` 
        }, 400)
      }
      
      // Validate data structure
      const requiredFields = ['monthOfBillingDate', 'dayOfBillingDate', 'distributorId', 'articleId', 'billingQuantity', 'netSales', 'billingDocument']
      const invalidRecords = []
      
      for (let i = 0; i < Math.min(data.length, 10); i++) { // Validate first 10 records for structure
        const record = data[i]
        const missingFields = requiredFields.filter(field => !(field in record))
        if (missingFields.length > 0) {
          invalidRecords.push({ index: i, missingFields })
        }
      }
      
      if (invalidRecords.length > 0) {
        return c.json({ 
          success: false, 
          error: `Invalid data structure detected in first 10 records. Missing fields: ${invalidRecords.map(r => `Record ${r.index}: ${r.missingFields.join(', ')}`).join('; ')}` 
        }, 400)
      }
      
      // Generate upload ID and prepare metadata
      const uploadId = `sales_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const uploadedAt = new Date().toISOString()
      
      // Add upload metadata to each record
      const enhancedSalesData = data.map((record: any) => ({
        ...record,
        uploadId,
        uploadedAt,
        uploadMonth: month,
        uploadYear: parseInt(year),
        fileName: fileName || 'sales_data.csv',
        userId: user.id
      }))
      
      // Store sales data with user isolation
      await kv.set(createUserKey(user.id, 'sales-data'), enhancedSalesData)
      
      const processingTime = Date.now() - startTime
      console.log(`Sales data uploaded successfully for user ${user.id} in ${processingTime}ms:`, {
        records: enhancedSalesData.length,
        uploadId,
        month,
        year
      })
      
      return c.json({ 
        success: true, 
        message: 'Sales data uploaded successfully',
        uploadId,
        recordsProcessed: enhancedSalesData.length,
        processingTimeMs: processingTime,
        uploadDetails: {
          fileName: fileName || 'sales_data.csv',
          month,
          year,
          uploadedAt
        }
      })
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error('Error uploading sales data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime
      }, 500)
    }
  })

  // Category data endpoints
  app.get('/make-server-ce8ebc43/category-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING CATEGORY DATA ===')
      const categoryData = await kv.get(createCategoryDataKey(user.id))
      console.log('Retrieved category data for user:', user.id, categoryData ? 'Found' : 'Not found')
      
      if (categoryData) {
        return c.json({ 
          success: true, 
          categoryData: categoryData
        })
      } else {
        return c.json({ 
          success: true, 
          categoryData: null,
          message: 'No category data found - please upload category data first'
        })
      }
    } catch (error) {
      console.error('Error fetching category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.get('/make-server-ce8ebc43/category-data-raw', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING RAW CATEGORY DATA ===')
      const rawData = await kv.get(createUserKey(user.id, 'category_data_raw'))
      console.log('Retrieved raw category data for user:', user.id, rawData ? 'Found' : 'Not found')
      
      if (rawData) {
        return c.json({ 
          success: true, 
          rawData: rawData.data || rawData.rawData,
          fileName: rawData.fileName,
          uploadedAt: rawData.uploadedAt
        })
      } else {
        return c.json({ 
          success: true, 
          rawData: null,
          message: 'No raw category data found - please upload category data first'
        })
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
  app.post('/make-server-ce8ebc43/upload-category-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
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
      
      console.log('Processing category data upload for user:', user.id, {
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
        uploadedAt,
        userId: user.id
      }
      
      // Store processed category data with user isolation
      await kv.set(createCategoryDataKey(user.id), categoryData)
      console.log('Processed category data stored for user:', user.id, 'with uploadId:', uploadId)
      
      // Store raw data separately for downloads and debugging
      const rawDataRecord = {
        rawData: rawData || [],
        fileName: fileName || 'unknown.csv',
        uploadedAt,
        uploadId,
        userId: user.id,
        metadata: {
          totalRecords,
          validRecords,
          errorCount
        }
      }
      
      await kv.set(createUserKey(user.id, 'category_data_raw'), rawDataRecord)
      console.log('Raw category data stored for user:', user.id)
      
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

  app.post('/make-server-ce8ebc43/category-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== STORING CATEGORY DATA (legacy endpoint) ===')
      const { data } = await c.req.json()
      console.log('Storing category data for user:', user.id, 'with keys:', Object.keys(data || {}))
      
      const categoryData = {
        ...data,
        userId: user.id,
        uploadedAt: new Date().toISOString()
      }
      
      await kv.set(createCategoryDataKey(user.id), categoryData)
      console.log('Category data stored successfully for user:', user.id)
      
      return c.json({ success: true, message: 'Category data uploaded successfully' })
    } catch (error) {
      console.error('Error storing category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.delete('/make-server-ce8ebc43/category-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== DELETING ALL CATEGORY DATA FOR USER ===', user.id)
      
      // Get current data to report what was deleted
      const categoryData = await kv.get(createCategoryDataKey(user.id))
      const rawData = await kv.get(createUserKey(user.id, 'category_data_raw'))
      
      // Delete both processed and raw category data for this user
      await Promise.all([
        kv.del(createCategoryDataKey(user.id)),
        kv.del(createUserKey(user.id, 'category_data_raw'))
      ])
      
      console.log('All category data deleted successfully for user:', user.id)
      
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

  // Legacy cleanup endpoint (admin only for now)
  app.delete('/make-server-ce8ebc43/cleanup/legacy-distributors', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== CLEANING UP LEGACY GLOBAL DISTRIBUTORS ===', user.id)
      
      const result = await cleanupLegacyGlobalDistributors()
      
      return c.json({
        success: true,
        message: 'Legacy global distributors cleanup completed',
        cleaned: result.cleaned,
        removedCount: result.count,
        cleanedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error cleaning up legacy distributors:', error)
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Debug endpoint to check user data isolation
  app.get('/make-server-ce8ebc43/debug/user-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== DEBUGGING USER DATA ISOLATION ===', user.id)
      
      // Get user-specific data
      const userDistributors = await kv.get(createUserKey(user.id, 'distributors')) || []
      const userSchemes = await kv.get(createUserKey(user.id, 'schemes')) || []
      const userSalesData = await kv.get(createUserKey(user.id, 'sales-data')) || []
      const userCategoryData = await kv.get(createCategoryDataKey(user.id))
      
      // Check for legacy global data
      const legacyDistributors = await kv.get('distributors') || []
      
      return c.json({
        success: true,
        userId: user.id,
        userEmail: user.email,
        userSpecificData: {
          distributors: {
            count: userDistributors.length,
            sampleIds: userDistributors.slice(0, 3).map((d: any) => ({ id: d.id, name: d.name, userId: d.userId }))
          },
          schemes: {
            count: userSchemes.length,
            sampleIds: userSchemes.slice(0, 3).map((s: any) => ({ id: s.id, name: s.basicInfo?.schemeName || s.name, userId: s.userId }))
          },
          salesData: {
            count: userSalesData.length,
            sampleIds: userSalesData.slice(0, 3).map((s: any) => ({ uploadId: s.uploadId, userId: s.userId }))
          },
          categoryData: {
            exists: !!userCategoryData,
            userId: userCategoryData?.userId
          }
        },
        legacyGlobalData: {
          distributors: {
            count: legacyDistributors.length,
            warning: legacyDistributors.length > 0 ? 'Legacy global distributors found - should be cleaned up' : null
          }
        },
        checkTime: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error in debug endpoint:', error)
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  // Moderation configuration endpoints
  app.get('/make-server-ce8ebc43/moderation/config', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== FETCHING MODERATION CONFIG FOR USER ===', user.id)
      
      const config = await kv.get(createUserKey(user.id, 'moderation_config'))
      console.log('Retrieved moderation config for user:', user.id, config ? 'Found' : 'Not found')
      
      if (config) {
        return c.json({ 
          success: true, 
          ...config
        })
      } else {
        return c.json({ 
          success: true, 
          schemeTypes: [],
          message: 'No configuration found - using defaults'
        }, 200)
      }
    } catch (error) {
      console.error('Error fetching moderation config:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

  app.post('/make-server-ce8ebc43/moderation/config', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== SAVING MODERATION CONFIG FOR USER ===', user.id)
      
      const configData = await c.req.json()
      console.log('Saving moderation config for user:', user.id, 'Keys:', Object.keys(configData))
      
      const config = {
        ...configData,
        userId: user.id,
        updatedAt: new Date().toISOString()
      }
      
      await kv.set(createUserKey(user.id, 'moderation_config'), config)
      console.log('Moderation config saved successfully for user:', user.id)
      
      return c.json({ 
        success: true, 
        message: 'Configuration saved successfully'
      })
    } catch (error) {
      console.error('Error saving moderation config:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })

}