import { projectId, publicAnonKey } from '../../utils/supabase/info'
import { CategoryData, RawCategoryData, ApiResponse, UploadData } from './types'
import { CSV_HEADERS } from './constants'
import { authService } from '../AuthService'

// Create fetch headers with cache busting (for authenticated requests)
export const createAuthenticatedFetchHeaders = async () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const accessToken = await authService.getAccessToken()
  
  if (!accessToken) {
    throw new Error('No access token available - user not authenticated')
  }
  
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'If-None-Match': '*',
    'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Cache-Bust': `${timestamp}-${random}`
  }
}

// Create fetch headers with cache busting (for fallback - backwards compatibility)
export const createAggressiveFetchHeaders = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  
  return {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'If-None-Match': '*',
    'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Cache-Bust': `${timestamp}-${random}`
  }
}

// Fetch current category data
export const fetchCurrentCategoryData = async (): Promise<CategoryData | null> => {
  try {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/category-data?t=${timestamp}&r=${random}`
    
    console.log('Fetching category data with authentication...')
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    if (response.ok) {
      const result: ApiResponse<{ categoryData: CategoryData }> = await response.json()
      if (result.success && result.categoryData) {
        console.log('Successfully fetched category data for authenticated user')
        return result.categoryData
      }
    } else if (response.status !== 404) {
      console.error('Failed to fetch category data:', response.status, response.statusText)
    }
    
    return null
  } catch (error) {
    console.error('Error fetching current category data:', error)
    return null
  }
}

// Fetch raw category data
export const fetchRawCategoryData = async (): Promise<RawCategoryData | null> => {
  try {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/category-data-raw?t=${timestamp}&r=${random}`
    
    console.log('Fetching raw category data with authentication...')
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    if (response.ok) {
      const result: ApiResponse & { rawData: any[], fileName: string, uploadedAt: string } = await response.json()
      if (result.success && result.rawData) {
        return {
          rawData: result.rawData,
          fileName: result.fileName || 'Unknown',
          uploadedAt: result.uploadedAt || new Date().toISOString()
        }
      }
    } else if (response.status !== 404) {
      console.error('Failed to fetch raw category data:', response.status, response.statusText)
    }
    
    return null
  } catch (error) {
    console.error('Error fetching raw category data:', error)
    return null
  }
}

// Upload category data
export const uploadCategoryData = async (uploadData: UploadData): Promise<ApiResponse & { uploadId?: string }> => {
  try {
    console.log('Uploading category data with authentication...')
    const response = await authService.makeAuthenticatedRequest(
      `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/upload-category-data`,
      {
        method: 'POST',
        body: JSON.stringify(uploadData)
      }
    )

    const result = await response.json()
    console.log('Category data upload response:', result)
    return result
  } catch (error) {
    console.error('Error uploading category data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

// Delete category data
export const deleteCategoryData = async (): Promise<ApiResponse & { deletedUploadsCount?: number, deletedAt?: string }> => {
  try {
    console.log('Deleting category data with authentication...')
    const response = await authService.makeAuthenticatedRequest(
      `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/category-data`,
      {
        method: 'DELETE'
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error deleting category data:', error)
    throw error
  }
}

// Download current data
export const downloadCurrentData = async (): Promise<{ rawData: any[], fileName: string }> => {
  try {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/category-data-raw?t=${timestamp}&r=${random}`
    
    console.log('Downloading category data with authentication...')
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No category data available to download. Please upload category data first.')
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result: ApiResponse & { rawData: any[], fileName: string } = await response.json()
    
    if (!result.success || !result.rawData || result.rawData.length === 0) {
      throw new Error('No category data available to download')
    }
    
    return { rawData: result.rawData, fileName: result.fileName }
  } catch (error) {
    console.error('Error downloading category data:', error)
    throw error
  }
}

// Debug category state
export const debugCategoryState = async (): Promise<ApiResponse & { debugInfo: any }> => {
  try {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/debug/category-state?t=${timestamp}&r=${random}`
    
    console.log('Debugging category state with authentication...')
    const response = await authService.makeAuthenticatedRequest(url, {
      method: 'GET'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch debug info')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error debugging category state:', error)
    throw error
  }
}

// Create and download CSV file
export const downloadCsvFile = (rawData: any[], fileName: string) => {
  // Convert raw data back to CSV format
  const csvRows = rawData.map((record: any) => [
    record.familyCode || '',
    record.familyName || '',
    record.classCode || '',
    record.className || '',
    record.brandCode || '',
    record.brandName || '',
    record.articleCode || '',
    record.articleDescription || ''
  ].join(','))
  
  const csvContent = [CSV_HEADERS, ...csvRows].join('\n')
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  
  const originalName = fileName?.replace(/\.[^/.]+$/, '') || 'category_data'
  const dateStr = new Date().toISOString().split('T')[0]
  a.download = `${originalName}_downloaded_${dateStr}.csv`
  
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}