export interface Scheme {
  id: string
  name: string
  type: string
  startDate: string
  endDate: string
  status: string
  slabType: string
  commissionType: string
  distributorData?: any
  catalogType?: any
}

export interface Upload {
  id: string
  fileName: string
  month: string
  year: number
  uploadedAt: string
  data?: any[]
}

export interface CalculationDetail {
  monthOfBillingDate: string
  dayOfBillingDate: string
  distributorId: string
  distributorName?: string
  articleId: string
  billingQuantity: number
  netSales: number
  billingDocument: string
  commission: number
  schemeType: string
  unitNumber?: number
  originalQuantity?: number
  originalNetSales?: number
  // New multi-slab fields
  totalGroupQuantity?: number
  totalGroupValue?: number
  slabRate?: number
  totalGroupCommission?: number
  saleContribution?: number
}

export interface DistributorArticleSummary {
  distributorId: string
  distributorName: string
  articleId: string
  totalQuantity: number
  totalValue: number
  slabRate: number
  commission: number
  salesCount: number
  comparisonValue: number
  slabType: string
  commissionType: string
}

export interface DistributorSchemeSummary {
  distributorId: string
  distributorName: string
  uniqueArticles: string[]
  totalQuantity: number
  totalValue: number
  totalCommission: number
  totalSalesCount: number
}

export interface Calculation {
  id: string
  schemeId: string
  uploadId: string
  calculations: CalculationDetail[]
  distributorArticleSummary?: DistributorArticleSummary[]
  totalCommission: number
  totalDistributorArticleCombinations?: number
  calculatedAt: string
  calculationType?: string
}