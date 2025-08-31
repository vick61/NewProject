import { toast } from 'sonner@2.0.3'
import type { Scheme, Upload, Calculation, DistributorSchemeSummary } from '../types/ViewCalculationsTypes'

export const exportCalculation = (calculation: Calculation, schemes: Scheme[], uploads: Upload[]) => {
  const scheme = schemes.find(s => s.id === calculation.schemeId)
  const upload = uploads.find(u => u.id === calculation.uploadId)
  
  const csvContent = [
    'Scheme Name,Calculation Date,Sales Period,Month,Day,Distributor ID,Distributor Name,Article ID,Billing Quantity,Net Sales,Billing Document,Commission,Scheme Type,Total Group Quantity,Total Group Value,Slab Rate,Total Group Commission',
    ...calculation.calculations.map(calc => 
      `${scheme?.name || 'Unknown'},${new Date(calculation.calculatedAt).toLocaleDateString()},${upload ? `${upload.month} ${upload.year}` : 'Unknown'},${calc.monthOfBillingDate},${calc.dayOfBillingDate},${calc.distributorId},${calc.distributorName || ''},${calc.articleId || ''},${calc.billingQuantity},${calc.netSales},${calc.billingDocument || ''},${calc.commission},${calc.schemeType},${calc.totalGroupQuantity || ''},${calc.totalGroupValue || ''},${calc.slabRate || ''},${calc.totalGroupCommission || ''}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scheme_calculation_detailed_${scheme?.name?.replace(/\s+/g, '_') || calculation.id}_${new Date(calculation.calculatedAt).toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('Detailed calculation exported successfully!')
}

export const exportDistributorArticleSummary = (calculation: Calculation, schemes: Scheme[], uploads: Upload[]) => {
  if (!calculation.distributorArticleSummary || calculation.distributorArticleSummary.length === 0) {
    toast.error('No distributor-article summary data available for this calculation')
    return
  }

  const scheme = schemes.find(s => s.id === calculation.schemeId)
  const upload = uploads.find(u => u.id === calculation.uploadId)
  
  const csvContent = [
    'Scheme Name,Calculation Date,Sales Period,Distributor ID,Distributor Name,Article ID,Total Quantity,Total Value,Slab Rate,Commission,Sales Count,Comparison Value,Slab Type,Commission Type',
    ...calculation.distributorArticleSummary.map(summary => 
      `${scheme?.name || 'Unknown'},${new Date(calculation.calculatedAt).toLocaleDateString()},${upload ? `${upload.month} ${upload.year}` : 'Unknown'},${summary.distributorId},${summary.distributorName},${summary.articleId},${summary.totalQuantity},${summary.totalValue},${summary.slabRate},${summary.commission},${summary.salesCount},${summary.comparisonValue},${summary.slabType},${summary.commissionType}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scheme_distributor_article_summary_${scheme?.name?.replace(/\s+/g, '_') || calculation.id}_${new Date(calculation.calculatedAt).toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('Distributor-Article summary exported successfully!')
}

export const exportAllDistributorArticleSummaries = (calculations: Calculation[], schemes: Scheme[], uploads: Upload[]) => {
  const allSummaries = calculations.flatMap(calc => 
    (calc.distributorArticleSummary || []).map(summary => {
      const scheme = schemes.find(s => s.id === calc.schemeId)
      const upload = uploads.find(u => u.id === calc.uploadId)
      return {
        schemeName: scheme?.name || 'Unknown',
        calculationDate: new Date(calc.calculatedAt).toLocaleDateString(),
        salesPeriod: upload ? `${upload.month} ${upload.year}` : 'Unknown',
        ...summary
      }
    })
  )

  if (allSummaries.length === 0) {
    toast.error('No distributor-article summary data available')
    return
  }

  const csvContent = [
    'Scheme Name,Calculation Date,Sales Period,Distributor ID,Distributor Name,Article ID,Total Quantity,Total Value,Slab Rate,Commission,Sales Count,Comparison Value,Slab Type,Commission Type',
    ...allSummaries.map(summary => 
      `${summary.schemeName},${summary.calculationDate},${summary.salesPeriod},${summary.distributorId},${summary.distributorName},${summary.articleId},${summary.totalQuantity},${summary.totalValue},${summary.slabRate},${summary.commission},${summary.salesCount},${summary.comparisonValue},${summary.slabType},${summary.commissionType}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `all_distributor_article_summaries_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('All distributor-article summaries exported successfully!')
}

export const exportAllCalculations = (calculations: Calculation[], schemes: Scheme[], uploads: Upload[]) => {
  const allCalculations = calculations.flatMap(calc => 
    calc.calculations.map(detail => {
      const scheme = schemes.find(s => s.id === calc.schemeId)
      const upload = uploads.find(u => u.id === calc.uploadId)
      return {
        schemeName: scheme?.name || 'Unknown',
        calculationDate: new Date(calc.calculatedAt).toLocaleDateString(),
        salesPeriod: upload ? `${upload.month} ${upload.year}` : 'Unknown',
        ...detail
      }
    })
  )

  const csvContent = [
    'Scheme Name,Calculation Date,Sales Period,Month,Day,Distributor ID,Distributor Name,Article ID,Billing Quantity,Net Sales,Billing Document,Commission,Scheme Type,Total Group Quantity,Total Group Value,Slab Rate',
    ...allCalculations.map(calc => 
      `${calc.schemeName},${calc.calculationDate},${calc.salesPeriod},${calc.monthOfBillingDate},${calc.dayOfBillingDate},${calc.distributorId},${calc.distributorName || ''},${calc.articleId || ''},${calc.billingQuantity},${calc.netSales},${calc.billingDocument || ''},${calc.commission},${calc.schemeType},${calc.totalGroupQuantity || ''},${calc.totalGroupValue || ''},${calc.slabRate || ''}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `all_scheme_calculations_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('All calculations exported successfully!')
}

export const exportDistributorSchemeSummary = (distributorSchemeSummary: DistributorSchemeSummary[], schemeName: string, calculationDate: string, salesPeriod: string) => {
  if (distributorSchemeSummary.length === 0) {
    toast.error('No distributor-scheme summary data available')
    return
  }

  const csvContent = [
    'Scheme Name,Calculation Date,Sales Period,Distributor ID,Distributor Name,Article Count,Articles,Total Quantity,Total Value,Total Commission,Sales Count',
    ...distributorSchemeSummary.map(summary => 
      `${schemeName},${calculationDate},${salesPeriod},${summary.distributorId},${summary.distributorName},${summary.uniqueArticles.length},"${summary.uniqueArticles.join(', ')}",${summary.totalQuantity},${summary.totalValue},${summary.totalCommission},${summary.totalSalesCount}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `distributor_scheme_summary_${schemeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('Distributor-Scheme summary exported successfully!')
}

// NEW: Export all calculations at Distributor + Article ID level
export const exportDistributorArticleLevel = (calculations: Calculation[], schemes: Scheme[], uploads: Upload[]) => {
  const distributorArticleData = calculations.flatMap(calc => {
    const scheme = schemes.find(s => s.id === calc.schemeId)
    const upload = uploads.find(u => u.id === calc.uploadId)
    
    // Group by distributor + article combination
    const groupedData = new Map<string, {
      schemeName: string
      calculationDate: string
      salesPeriod: string
      distributorId: string
      distributorName: string
      articleId: string
      totalQuantity: number
      totalValue: number
      totalCommission: number
      recordCount: number
    }>()
    
    calc.calculations.forEach(detail => {
      const key = `${detail.distributorId}_${detail.articleId}`
      const existing = groupedData.get(key)
      
      if (existing) {
        existing.totalQuantity += detail.billingQuantity
        existing.totalValue += detail.netSales
        existing.totalCommission += detail.commission
        existing.recordCount += 1
      } else {
        groupedData.set(key, {
          schemeName: scheme?.name || 'Unknown',
          calculationDate: new Date(calc.calculatedAt).toLocaleDateString(),
          salesPeriod: upload ? `${upload.month} ${upload.year}` : 'Unknown',
          distributorId: detail.distributorId,
          distributorName: detail.distributorName || '',
          articleId: detail.articleId || '',
          totalQuantity: detail.billingQuantity,
          totalValue: detail.netSales,
          totalCommission: detail.commission,
          recordCount: 1
        })
      }
    })
    
    return Array.from(groupedData.values())
  })

  if (distributorArticleData.length === 0) {
    toast.error('No distributor-article level data available')
    return
  }

  const csvContent = [
    'Scheme Name,Calculation Date,Sales Period,Distributor ID,Distributor Name,Article ID,Total Quantity,Total Value,Total Commission,Record Count',
    ...distributorArticleData.map(data => 
      `${data.schemeName},${data.calculationDate},${data.salesPeriod},${data.distributorId},${data.distributorName},${data.articleId},${data.totalQuantity},${data.totalValue},${data.totalCommission},${data.recordCount}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `distributor_article_level_export_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('Distributor + Article level export completed successfully!')
}

// NEW: Export all calculations at Scheme + Distributor level  
export const exportSchemeDistributorLevel = (calculations: Calculation[], schemes: Scheme[], uploads: Upload[]) => {
  const schemeDistributorData = calculations.flatMap(calc => {
    const scheme = schemes.find(s => s.id === calc.schemeId)
    const upload = uploads.find(u => u.id === calc.uploadId)
    
    // Group by scheme + distributor combination
    const groupedData = new Map<string, {
      schemeName: string
      schemeType: string
      calculationDate: string
      salesPeriod: string
      distributorId: string
      distributorName: string
      uniqueArticles: Set<string>
      totalQuantity: number
      totalValue: number
      totalCommission: number
      recordCount: number
    }>()
    
    calc.calculations.forEach(detail => {
      const key = `${calc.schemeId}_${detail.distributorId}`
      const existing = groupedData.get(key)
      
      if (existing) {
        existing.uniqueArticles.add(detail.articleId || '')
        existing.totalQuantity += detail.billingQuantity
        existing.totalValue += detail.netSales
        existing.totalCommission += detail.commission
        existing.recordCount += 1
      } else {
        groupedData.set(key, {
          schemeName: scheme?.name || 'Unknown',
          schemeType: scheme?.type || 'Unknown',
          calculationDate: new Date(calc.calculatedAt).toLocaleDateString(),
          salesPeriod: upload ? `${upload.month} ${upload.year}` : 'Unknown',
          distributorId: detail.distributorId,
          distributorName: detail.distributorName || '',
          uniqueArticles: new Set([detail.articleId || '']),
          totalQuantity: detail.billingQuantity,
          totalValue: detail.netSales,
          totalCommission: detail.commission,
          recordCount: 1
        })
      }
    })
    
    return Array.from(groupedData.values()).map(data => ({
      ...data,
      articleCount: data.uniqueArticles.size,
      articleList: Array.from(data.uniqueArticles).join(', ')
    }))
  })

  if (schemeDistributorData.length === 0) {
    toast.error('No scheme-distributor level data available')
    return
  }

  const csvContent = [
    'Scheme Name,Scheme Type,Calculation Date,Sales Period,Distributor ID,Distributor Name,Article Count,Articles,Total Quantity,Total Value,Total Commission,Record Count',
    ...schemeDistributorData.map(data => 
      `${data.schemeName},${data.schemeType},${data.calculationDate},${data.salesPeriod},${data.distributorId},${data.distributorName},${data.articleCount},"${data.articleList}",${data.totalQuantity},${data.totalValue},${data.totalCommission},${data.recordCount}`
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scheme_distributor_level_export_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
  
  toast.success('Scheme + Distributor level export completed successfully!')
}