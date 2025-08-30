import { authService } from '../AuthService'
import { workerUrl } from '../../utils/supabase/info'

/**
 * API Client utility for making authenticated requests to the Cloudflare Worker backend
 */
export class ApiClient {
  private baseUrl = workerUrl || import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://schemes-management-worker.your-subdomain.workers.dev'

  /**
   * Make an authenticated request (requires user to be logged in)
   */
  async authenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    return authService.makeAuthenticatedRequest(url, options)
  }

  /**
   * Make a public request (uses anon key)
   */
  async publicRequest(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    return authService.makePublicRequest(url, options)
  }

  /**
   * GET request with authentication
   */
  async get(endpoint: string) {
    return this.authenticatedRequest(endpoint, { method: 'GET' })
  }

  /**
   * POST request with authentication
   */
  async post(endpoint: string, data?: any) {
    return this.authenticatedRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * PUT request with authentication
   */
  async put(endpoint: string, data?: any) {
    return this.authenticatedRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * DELETE request with authentication
   */
  async delete(endpoint: string) {
    return this.authenticatedRequest(endpoint, { method: 'DELETE' })
  }

  /**
   * Public GET request (no authentication)
   */
  async publicGet(endpoint: string) {
    return this.publicRequest(endpoint, { method: 'GET' })
  }

  /**
   * Public POST request (no authentication)
   */
  async publicPost(endpoint: string, data?: any) {
    return this.publicRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }
}

export const apiClient = new ApiClient()