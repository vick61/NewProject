import * as XLSX from 'xlsx'
import { CategoryRecord, HeaderMapping } from './types'
import { EXPECTED_HEADERS, REQUIRED_FIELDS, FIELD_LABELS } from './constants'

// Normalize header names for flexible matching
export const normalizeHeader = (header: string): string => {
  return header.toLowerCase()
    .replace(/[^a-z]/g, '') // Remove all non-letter characters
    .trim()
}

// Find header index by matching variations
export const findHeaderIndex = (headers: string[], targetHeader: string): number => {
  const normalizedTarget = normalizeHeader(targetHeader)
  return headers.findIndex(header => normalizeHeader(header) === normalizedTarget)
}

// Create header mapping from file headers
export const createHeaderMapping = (headers: string[]): { mapping: HeaderMapping, missingHeaders: string[] } => {
  const headerMapping: HeaderMapping = {}
  const missingHeaders: string[] = []
  
  for (const expectedHeader of EXPECTED_HEADERS) {
    let foundIndex = -1
    
    // Try to find a matching header
    for (const variation of expectedHeader.variations) {
      foundIndex = findHeaderIndex(headers, variation)
      if (foundIndex !== -1) break
    }
    
    if (foundIndex !== -1) {
      headerMapping[expectedHeader.field] = foundIndex
    } else {
      missingHeaders.push(expectedHeader.variations[0]) // Use the first variation as display name
    }
  }
  
  return { mapping: headerMapping, missingHeaders }
}

// Validate a single record
export const validateRecord = (record: Omit<CategoryRecord, 'errors'>): string[] => {
  const errors: string[] = []
  
  for (const field of REQUIRED_FIELDS) {
    if (!record[field]) {
      errors.push(`${FIELD_LABELS[field]} is required`)
    }
  }
  
  return errors
}

// Create category record from values
export const createCategoryRecord = (values: string[], headerMapping: HeaderMapping): CategoryRecord => {
  const record = {
    familyCode: String(values[headerMapping.familyCode] || '').trim(),
    familyName: String(values[headerMapping.familyName] || '').trim(),
    classCode: String(values[headerMapping.classCode] || '').trim(),
    className: String(values[headerMapping.className] || '').trim(),
    brandCode: String(values[headerMapping.brandCode] || '').trim(),
    brandName: String(values[headerMapping.brandName] || '').trim(),
    articleCode: String(values[headerMapping.articleCode] || '').trim(),
    articleDescription: String(values[headerMapping.articleDescription] || '').trim(),
    errors: []
  }

  record.errors = validateRecord(record)
  return record
}

// Parse CSV file
export const parseCSVData = (text: string): { headers: string[], dataRows: string[][] } => {
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain header and at least one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  
  // Parse CSV data rows
  const dataRows: string[][] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    dataRows.push(lines[i].split(',').map(v => v.trim()))
  }
  
  return { headers, dataRows }
}

// Parse Excel file
export const parseExcelData = (data: Uint8Array): { headers: string[], dataRows: string[][] } => {
  const workbook = XLSX.read(data, { type: 'array' })
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Excel file contains no sheets')
  }
  
  const worksheet = workbook.Sheets[sheetName]
  
  // Convert to JSON array
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
  
  if (jsonData.length < 2) {
    throw new Error('Excel file must contain header and at least one data row')
  }
  
  const headers = jsonData[0].map(h => String(h || '').trim())
  
  // Parse Excel data rows
  const dataRows: string[][] = []
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (row && row.some(cell => String(cell || '').trim())) { // Skip empty rows
      dataRows.push(row.map(cell => String(cell || '').trim()))
    }
  }
  
  return { headers, dataRows }
}

// Process file data and create category records
export const processFileData = (headers: string[], dataRows: string[][]): { data: CategoryRecord[], errors: string[] } => {
  const { mapping: headerMapping, missingHeaders } = createHeaderMapping(headers)
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  const data: CategoryRecord[] = []
  const errors: string[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const values = dataRows[i]
    
    if (values.length < Math.max(...Object.values(headerMapping)) + 1) {
      errors.push(`Row ${i + 2}: Insufficient columns`)
      continue
    }

    const record = createCategoryRecord(values, headerMapping)
    data.push(record)
  }

  return { data, errors }
}

// Create mappings from processed records
export const createCategoryMappings = (validRecords: CategoryRecord[]) => {
  const families = [...new Set(validRecords.map(r => r.familyName))].sort()
  const classes = [...new Set(validRecords.map(r => r.className))].sort()
  const brands = [...new Set(validRecords.map(r => r.brandName))].sort()

  // Create family-class mapping
  const familyClassMapping: Record<string, string[]> = {}
  validRecords.forEach(record => {
    if (!familyClassMapping[record.familyName]) {
      familyClassMapping[record.familyName] = []
    }
    if (!familyClassMapping[record.familyName].includes(record.className)) {
      familyClassMapping[record.familyName].push(record.className)
    }
  })

  // Create family-brand mapping
  const familyBrandMapping: Record<string, string[]> = {}
  validRecords.forEach(record => {
    if (!familyBrandMapping[record.familyName]) {
      familyBrandMapping[record.familyName] = []
    }
    if (!familyBrandMapping[record.familyName].includes(record.brandName)) {
      familyBrandMapping[record.familyName].push(record.brandName)
    }
  })

  // Create class-brand mapping
  const classBrandMapping: Record<string, string[]> = {}
  validRecords.forEach(record => {
    if (!classBrandMapping[record.className]) {
      classBrandMapping[record.className] = []
    }
    if (!classBrandMapping[record.className].includes(record.brandName)) {
      classBrandMapping[record.className].push(record.brandName)
    }
  })

  // Create article mappings for calculations
  const articleMappings: Record<string, {
    familyName: string
    className: string
    brandName: string
    familyCode: string
    classCode: string
    brandCode: string
    articleDescription: string
  }> = {}
  
  validRecords.forEach(record => {
    articleMappings[record.articleCode] = {
      familyName: record.familyName,
      className: record.className,
      brandName: record.brandName,
      familyCode: record.familyCode,
      classCode: record.classCode,
      brandCode: record.brandCode,
      articleDescription: record.articleDescription
    }
  })

  return {
    families,
    classes,
    brands,
    familyClassMapping,
    familyBrandMapping,
    classBrandMapping,
    articleMappings
  }
}

// Helper function to format upload date
export const formatUploadDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    }
  } catch {
    return { date: 'Unknown', time: 'Unknown', relative: 'Unknown' }
  }
}

export const getRelativeTime = (date: Date) => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return `${diffDays} days ago`
}