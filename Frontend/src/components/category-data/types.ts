export interface CategoryRecord {
  familyCode: string
  familyName: string
  classCode: string
  className: string
  brandCode: string
  brandName: string
  articleCode: string
  articleDescription: string
  errors: string[]
}

export interface CategoryData {
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

export interface RawCategoryData {
  rawData: CategoryRecord[]
  fileName: string
  uploadedAt: string
}

export interface CategoryDataUploadProps {
  onCategoryDataUploaded?: () => void
  onCategoryDataDeleted?: () => void
}

export interface HeaderMapping {
  [key: string]: number
}

export interface UploadData {
  fileName: string
  families: string[]
  classes: string[]
  brands: string[]
  familyClassMapping: Record<string, string[]>
  familyBrandMapping: Record<string, string[]>
  classBrandMapping: Record<string, string[]>
  articleMappings: Record<string, {
    familyName: string
    className: string
    brandName: string
    familyCode: string
    classCode: string
    brandCode: string
    articleDescription: string
  }>
  rawData: CategoryRecord[]
  totalRecords: number
  validRecords: number
  errorCount: number
}

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  [key: string]: any
}