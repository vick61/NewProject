import * as kv from './kv_store.tsx'

// Function to check if a sale record matches scheme criteria
export function matchesCriteriaSync(sale: any, scheme: any, categoryData: any, distributorInfo: any) {
  // Debug flag - set to true for debugging specific schemes
  const debug = false
  
  if (debug) {
    console.log('Checking criteria for sale:', {
      distributorId: sale.distributorId,
      articleId: sale.articleId,
      scheme: {
        id: scheme.id,
        name: scheme.name,
        type: scheme.type,
        distIds: scheme.distIds,
        catalogType: scheme.catalogType,
        distributorData: scheme.distributorData
      }
    })
  }
  
  // Check distributor criteria - only if distIds type is 'all'
  if (scheme.distIds?.type === 'all') {
    if (scheme.distributorData?.zone && scheme.distributorData.zone !== '' && scheme.distributorData.zone !== 'all-zones') {
      if (!distributorInfo || distributorInfo.zone !== scheme.distributorData.zone) {
        return false
      }
    }
    if (scheme.distributorData?.state && scheme.distributorData.state !== '' && scheme.distributorData.state !== 'all-states') {
      if (!distributorInfo || distributorInfo.state !== scheme.distributorData.state) {
        return false
      }
    }
    if (scheme.distributorData?.distributorType && scheme.distributorData.distributorType !== '' && scheme.distributorData.distributorType !== 'all-types') {
      if (!distributorInfo || distributorInfo.type !== scheme.distributorData.distributorType) {
        return false
      }
    }
  }

  // Check specific distributor IDs
  if (scheme.distIds?.type === 'specific' && scheme.distIds?.specificIds?.length > 0) {
    if (!scheme.distIds.specificIds.includes(sale.distributorId)) {
      return false
    }
  } else if (scheme.distIds?.type === 'other' && scheme.distIds?.specificIds?.length > 0) {
    if (!scheme.distIds.specificIds.includes(sale.distributorId)) {
      return false
    }
  }

  // Check article criteria
  if (scheme.articles?.type === 'specific' && scheme.articles?.specificIds?.length > 0) {
    if (!scheme.articles.specificIds.includes(sale.articleId)) {
      return false
    }
  } else if (scheme.articles?.type === 'other' && scheme.articles?.specificIds?.length > 0) {
    if (!scheme.articles.specificIds.includes(sale.articleId)) {
      return false
    }
  }

  // Check catalog type criteria for booster schemes
  const schemeType = scheme.schemeType || scheme.type || scheme.basicInfo?.schemeType || scheme.basicInfo?.type
  if ((schemeType === 'per_unit' || schemeType === 'booster-scheme') && categoryData?.articleMappings) {
    // Check if we need to filter by specific article IDs from catalog criteria
    if (scheme.catalogType?.article === 'others' && scheme.catalogType?.specificArticleIds) {
      const specificArticleIds = scheme.catalogType.specificArticleIds.split(',').map((id: string) => id.trim()).filter((id: string) => id)
      if (specificArticleIds.length > 0 && !specificArticleIds.includes(sale.articleId)) {
        return false
      }
    } else {
      // Apply family/class/brand filtering for 'all' articles or when specific criteria are set
      const articleMapping = categoryData.articleMappings[sale.articleId]
      
      // If article mapping doesn't exist and we have catalog filtering criteria, reject the sale
      if (!articleMapping && (scheme.catalogType?.family || scheme.catalogType?.class || scheme.catalogType?.brand)) {
        if (debug) console.log(`Article ${sale.articleId} not found in category mappings`)
        return false
      }
      
      // If we have article mapping, apply the filters
      if (articleMapping) {
        if (scheme.catalogType?.family && scheme.catalogType.family !== '' && scheme.catalogType.family !== 'all-families') {
          if (articleMapping.familyName !== scheme.catalogType.family) {
            if (debug) console.log(`Family mismatch: ${articleMapping.familyName} !== ${scheme.catalogType.family}`)
            return false
          }
        }
        if (scheme.catalogType?.class && scheme.catalogType.class !== '' && scheme.catalogType.class !== 'all-classes') {
          if (articleMapping.className !== scheme.catalogType.class) {
            if (debug) console.log(`Class mismatch: ${articleMapping.className} !== ${scheme.catalogType.class}`)
            return false
          }
        }
        if (scheme.catalogType?.brand && scheme.catalogType.brand !== '' && scheme.catalogType.brand !== 'all-brands') {
          if (articleMapping.brandName !== scheme.catalogType.brand) {
            if (debug) console.log(`Brand mismatch: ${articleMapping.brandName} !== ${scheme.catalogType.brand}`)
            return false
          }
        }
      }
    }
  }

  if (debug) console.log('Sale matches all criteria')
  return true
}

// Optimized calculation function with enhanced timeout protection and better performance
export async function performSchemeCalculation(scheme: any, salesData: any[], categoryData: any, userDistributors: any[] = []) {
  const calculations = []
  const BATCH_SIZE = 1000  // Increased batch size for better performance
  const MAX_RECORDS = 10000  // Reduced max records to prevent timeouts
  
  // Limit dataset size for performance and timeout prevention
  const limitedSalesData = salesData.slice(0, MAX_RECORDS)
  
  console.log(`Processing ${limitedSalesData.length} sales records (limited from ${salesData.length} total for performance)`)
  
  // Handle scheme data structure variations with comprehensive type detection
  const schemeInfo = scheme.basicInfo || scheme
  
  // Determine scheme type from multiple possible locations
  let schemeType = scheme.schemeType || scheme.type || schemeInfo.schemeType || schemeInfo.type
  
  // Convert frontend types to backend types for consistency
  if (schemeType === 'per_unit') {
    schemeType = 'booster-scheme'
  } else if (schemeType === 'article') {
    schemeType = 'article-scheme'
  }
  
  // Default to article-scheme if still not determined
  if (!schemeType) {
    schemeType = 'article-scheme'
    console.warn('Could not determine scheme type, defaulting to article-scheme')
  }
  
  const slabType = schemeInfo.slabType || scheme.slabType || 'quantity'
  const commissionType = schemeInfo.commissionType || scheme.commissionType || 'percentage'
  const slabs = schemeInfo.slabs || scheme.slabs || []
  
  console.log('Starting scheme calculation:', {
    schemeId: scheme.id,
    schemeName: schemeInfo.schemeName || scheme.name,
    schemeType: schemeType,
    slabType: slabType,
    commissionType: commissionType,
    slabCount: slabs.length,
    originalDataCount: salesData.length,
    processedDataCount: limitedSalesData.length
  })
  
  // Use provided user-specific distributors for lookup
  console.log('Using provided distributor data...')
  const allDistributors = userDistributors || []
  const distributorMap = new Map()
  
  for (const distributor of allDistributors) {
    if (distributor.id) {
      distributorMap.set(distributor.id, distributor)
    }
    if (distributor.code && distributor.code !== distributor.id) {
      distributorMap.set(distributor.code, distributor)
    }
  }
  
  console.log(`Created distributor map with ${distributorMap.size} entries from user-specific distributors`)
  
  // Group sales by distributor-article combination
  const distributorArticleGroups = new Map()
  
  // Process sales data in batches with timeout protection
  const startTime = Date.now()
  const PROCESSING_TIMEOUT = 40000 // Increased to 40 seconds limit for processing
  
  for (let batchStart = 0; batchStart < limitedSalesData.length; batchStart += BATCH_SIZE) {
    // Check for timeout with more frequent checks
    const elapsedTime = Date.now() - startTime
    if (elapsedTime > PROCESSING_TIMEOUT) {
      console.warn(`Processing timeout reached at batch ${batchStart}/${limitedSalesData.length} after ${elapsedTime}ms. Stopping processing.`)
      console.warn(`Processed ${distributorArticleGroups.size} groups so far.`)
      break
    }
    
    const batchEnd = Math.min(batchStart + BATCH_SIZE, limitedSalesData.length)
    const batch = limitedSalesData.slice(batchStart, batchEnd)
    
    const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(limitedSalesData.length / BATCH_SIZE)
    
    if (batchNumber % 5 === 0 || batchNumber === totalBatches) {
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${elapsedTime}ms elapsed)`)
    }
    
    for (const sale of batch) {
      try {
        const distributorInfo = distributorMap.get(sale.distributorId)
        const matches = matchesCriteriaSync(sale, scheme, categoryData, distributorInfo)
        
        if (!matches) continue
        
        const key = `${sale.distributorId}:${sale.articleId}`
        
        if (!distributorArticleGroups.has(key)) {
          distributorArticleGroups.set(key, {
            distributorId: sale.distributorId,
            distributorName: distributorInfo?.name || `Distributor ${sale.distributorId}`,
            articleId: sale.articleId,
            totalQuantity: 0,
            totalValue: 0,
            salesRecords: []
          })
        }
        
        const group = distributorArticleGroups.get(key)
        group.totalQuantity += Number(sale.billingQuantity) || 0
        group.totalValue += Number(sale.netSales) || 0
        group.salesRecords.push(sale)
        
      } catch (error) {
        console.error(`Error processing sale record:`, error)
        continue
      }
    }
    
    // Allow event loop to process other tasks less frequently
    if (batchNumber % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1))
    }
  }
  
  console.log(`Grouped into ${distributorArticleGroups.size} distributor-article combinations`)
  
  // Calculate commissions for each group
  for (const [key, group] of distributorArticleGroups) {
    try {
      let slabRate = 0
      let commission = 0
      
      // Skip negative quantities
      if (group.totalQuantity < 0) {
        commission = 0
        slabRate = 0
      } else {
        // For Article schemes, use direct commission lookup from uploaded Excel data
        if (schemeType === 'article-scheme' && scheme.articleCommissions) {
          const articleCommission = scheme.articleCommissions[group.articleId]
          if (articleCommission !== undefined) {
            slabRate = Number(articleCommission)
            
            // Apply commission based on type
            if (commissionType === 'fixed') {
              // Fixed commission - always the exact amount regardless of quantity
              commission = slabRate
              console.log(`Article scheme fixed commission: Article ${group.articleId}, Commission: ${commission}`)
            } else if (commissionType === 'absolute_per_unit' || commissionType === 'absolute') {
              // Per unit commission
              commission = slabRate * group.totalQuantity
              console.log(`Article scheme per-unit commission: Article ${group.articleId}, Rate: ${slabRate}, Quantity: ${group.totalQuantity}, Commission: ${commission}`)
            } else if (commissionType === 'percentage') {
              // Percentage of sales value
              commission = (group.totalValue * slabRate) / 100
              console.log(`Article scheme percentage commission: Article ${group.articleId}, Rate: ${slabRate}%, Value: ${group.totalValue}, Commission: ${commission}`)
            }
          } else {
            console.log(`No commission data found for article ${group.articleId} in article scheme`)
          }
        } else {
          // For Booster schemes, use slab-based calculation
          // Determine comparison value
          let comparisonValue
          if (slabType === 'quantity') {
            comparisonValue = Math.abs(group.totalQuantity)
          } else if (slabType === 'value') {
            comparisonValue = Math.abs(group.totalValue)
          } else {
            comparisonValue = Math.abs(group.totalQuantity)
          }
          
          // Find applicable slab based on min/max range
          let applicableSlabRate = 0
          let slabFound = false
          
          const sortedSlabs = [...slabs].sort((a, b) => Number(a.min) - Number(b.min))
          
          // Debug logging for value slab scenarios
          if (slabType === 'value' && commissionType === 'percentage') {
            console.log(`Finding slab for value ${comparisonValue} in scheme with ${slabs.length} slabs:`, 
              slabs.map(s => ({ min: s.min, max: s.max, rate: s.rate })))
          }
          
          for (const slab of sortedSlabs) {
            const slabMin = Number(slab.min) || 0
            const slabMax = Number(slab.max) || Infinity
            const currentSlabRate = Number(slab.rate) || 0
            
            // Check if value falls within this slab's range
            if (comparisonValue >= slabMin && comparisonValue <= slabMax) {
              applicableSlabRate = currentSlabRate
              slabFound = true
              
              if (slabType === 'value' && commissionType === 'percentage') {
                console.log(`Found matching slab: min=${slabMin}, max=${slabMax}, rate=${currentSlabRate}% for value=${comparisonValue}`)
              }
              break // Use the first matching slab
            }
          }
          
          // If no exact range match found, use the highest reached slab (legacy behavior)
          if (!slabFound) {
            for (const slab of sortedSlabs) {
              const slabMin = Number(slab.min) || 0
              const currentSlabRate = Number(slab.rate) || 0
              
              if (comparisonValue >= slabMin) {
                applicableSlabRate = currentSlabRate
                slabFound = true
              }
            }
          }
          
          slabRate = slabFound ? applicableSlabRate : 0
          
          if (slabFound) {
            if (commissionType === 'percentage') {
              // For percentage commission, always calculate as percentage of total sales value
              commission = (group.totalValue * slabRate) / 100
            } else if (commissionType === 'absolute_per_unit') {
              commission = slabRate * group.totalQuantity
            } else if (commissionType === 'absolute') {
              commission = slabRate * group.totalQuantity
            } else if (commissionType === 'fixed') {
              commission = slabRate
            }
            
            // Debug logging for value slab + percentage commission combinations
            if (slabType === 'value' && commissionType === 'percentage') {
              console.log(`Value slab + percentage commission calculation:`, {
                groupTotalValue: group.totalValue,
                slabRate: slabRate,
                commission: commission,
                comparisonValue: comparisonValue,
                distributorId: group.distributorId,
                articleId: group.articleId
              })
            }
          }
        }
      }
      
      // Create calculation records for each sale
      for (let saleIndex = 0; saleIndex < group.salesRecords.length; saleIndex++) {
        const sale = group.salesRecords[saleIndex]
        let saleCommission = 0
        let saleContribution = 0
        
        // For Fixed commission in Article schemes, assign the full commission to the first sale record
        // and zero to subsequent records to avoid double counting within the same distributor-article group
        if (schemeType === 'article-scheme' && commissionType === 'fixed') {
          if (saleIndex === 0) {
            // Only the first sale record in the group gets the full commission
            saleCommission = commission
            saleContribution = 1
            console.log(`Fixed commission assignment: Article ${group.articleId}, Distributor ${group.distributorId}, First Sale: ${sale.billingDocument}, Commission: ${saleCommission}`)
          } else {
            // Subsequent sales records get zero commission to avoid double counting
            saleCommission = 0
            saleContribution = 0
            console.log(`Fixed commission assignment: Article ${group.articleId}, Distributor ${group.distributorId}, Additional Sale: ${sale.billingDocument}, Commission: ${saleCommission} (avoiding double count)`)
          }
        } else {
          // For other commission types, distribute proportionally
          saleContribution = group.totalQuantity !== 0 ? (sale.billingQuantity / group.totalQuantity) : 0
          saleCommission = commission * saleContribution
        }
        
        calculations.push({
          monthOfBillingDate: sale.monthOfBillingDate,
          dayOfBillingDate: sale.dayOfBillingDate,
          distributorId: sale.distributorId,
          distributorName: group.distributorName,
          articleId: sale.articleId,
          billingQuantity: sale.billingQuantity,
          netSales: sale.netSales,
          billingDocument: sale.billingDocument,
          commission: saleCommission,
          schemeType: schemeType,
          totalGroupQuantity: group.totalQuantity,
          totalGroupValue: group.totalValue,
          slabRate: slabRate,
          totalGroupCommission: commission,
          saleContribution: saleContribution,
          commissionType: commissionType, // Add commission type for debugging
          saleIndex: saleIndex // Add index for debugging
        })
      }
      
    } catch (error) {
      console.log(`Error calculating commission for group ${key}:`, error)
      continue
    }
  }
  
  console.log('Scheme calculation completed:', {
    totalCalculations: calculations.length,
    totalCommission: calculations.reduce((sum, calc) => sum + calc.commission, 0)
  })
  
  return {
    detailedCalculations: calculations,
    distributorArticleSummary: []
  }
}

// Helper function to find column index with flexible matching
export function findColumnIndex(headers: string[], searchTerms: string[]) {
  return headers.findIndex(header => 
    searchTerms.some(term => header.includes(term.replace(/\s+/g, '').toLowerCase()))
  )
}

// Initialize default data functions with consistent key naming
export async function initializeZoneStateMapping() {
  console.log('Initializing zone-state mapping...')
  try {
    const existing = await kv.get('zone-state-mapping')
    if (!existing) {
      const { DEFAULT_ZONE_STATE_MAPPING } = await import('./constants.tsx')
      await kv.set('zone-state-mapping', DEFAULT_ZONE_STATE_MAPPING)
      console.log('Zone-state mapping initialized with default data')
    } else {
      console.log('Zone-state mapping already exists')
    }
  } catch (error) {
    console.error('Error in initializeZoneStateMapping:', error)
    throw error
  }
}

export async function initializeCategoryData() {
  console.log('Initializing category data...')
  try {
    const existing = await kv.get('category_data')
    if (!existing) {
      const { DEFAULT_CATEGORY_DATA } = await import('./constants.tsx')
      await kv.set('category_data', DEFAULT_CATEGORY_DATA)
      console.log('Category data initialized with default data')
    } else {
      console.log('Category data already exists')
    }
  } catch (error) {
    console.error('Error in initializeCategoryData:', error)
    throw error
  }
}

export async function initializeSampleDistributors() {
  console.log('Skipping global sample distributors initialization - using user-specific distributor storage')
  // Sample distributors are no longer created globally to maintain user isolation
  // Each user will have their own distributor data managed through the user-specific endpoints
  try {
    // Check if the legacy global distributors key exists and log a warning
    const legacyDistributors = await kv.get('distributors')
    if (legacyDistributors && legacyDistributors.length > 0) {
      console.warn(`Found ${legacyDistributors.length} distributors in legacy global storage - this data should be migrated to user-specific storage`)
      console.warn('Consider running a migration script to move global distributors to user-specific keys')
    }
    console.log('✓ Sample distributors initialization completed (user-isolated approach)')
  } catch (error) {
    console.error('Error in initializeSampleDistributors:', error)
    // Don't throw error for this non-critical operation
  }
}

// Helper function to clean up legacy global distributor data
export async function cleanupLegacyGlobalDistributors() {
  console.log('Cleaning up legacy global distributor data...')
  try {
    const legacyDistributors = await kv.get('distributors')
    if (legacyDistributors && legacyDistributors.length > 0) {
      console.log(`Removing ${legacyDistributors.length} distributors from legacy global storage`)
      await kv.del('distributors')
      console.log('✓ Legacy global distributors cleaned up successfully')
      return { cleaned: true, count: legacyDistributors.length }
    } else {
      console.log('No legacy global distributors found to clean up')
      return { cleaned: false, count: 0 }
    }
  } catch (error) {
    console.error('Error cleaning up legacy global distributors:', error)
    throw error
  }
}