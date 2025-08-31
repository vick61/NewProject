import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'

export interface User {
  id: string
  email?: string
  phone?: string
  user_metadata?: {
    name?: string
    [key: string]: any
  }
}

export interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
}

class AuthService {
  private supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  )

  // Sign up with email and password (client-side - requires email confirmation)
  async signUpWithEmail(email: string, password: string, name?: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '',
          }
        }
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error: error instanceof Error ? error.message : 'Sign up failed' }
    }
  }

  // Server-side signup with auto-confirmation (no email verification required)
  async signUpWithServerAutoConfirm(email: string, password: string, name?: string) {
    const requestBody = {
      email,
      password,
      name: name || ''
    }
    
    const requestUrl = `https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/auth/signup`
    
    console.log('Making server signup request:', {
      url: requestUrl,
      method: 'POST',
      body: { email, hasPassword: !!password, name }
    })
    
    try {
      const response = await this.makePublicRequest(requestUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
      
      console.log('Server signup response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Check content type first
      const contentType = response.headers.get('content-type')
      
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('Server returned non-JSON response:', {
          status: response.status,
          contentType,
          responseText: responseText.substring(0, 500)
        })
        
        if (response.status === 404) {
          throw new Error('Signup endpoint not found. The authentication service may not be deployed properly.')
        }
        
        throw new Error(`Server returned ${contentType || 'unknown'} instead of JSON. This usually means the Supabase Edge Function is not deployed or has an error.`)
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse server JSON response:', jsonError)
        throw new Error('Server returned invalid JSON response.')
      }

      if (!response.ok) {
        throw new Error(result.error || `Server error: HTTP ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Signup failed')
      }

      // After successful server signup, sign in the user
      const { data: signInData, error: signInError } = await this.signInWithEmail(email, password)
      
      if (signInError) {
        throw new Error(`Account created but sign in failed: ${signInError}`)
      }

      return { 
        data: signInData, 
        error: null,
        message: 'Account created and signed in successfully'
      }
    } catch (error) {
      console.error('Server signup error:', error)
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Server signup failed' 
      }
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error: error instanceof Error ? error.message : 'Sign in failed' }
    }
  }

  // Send OTP to phone number
  async sendPhoneOTP(phone: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms'
        }
      })
      
      if (error) {
        // Provide more specific error messages for common issues
        let errorMessage = error.message
        
        if (error.message.toLowerCase().includes('unsupported phone provider') || 
            error.message.toLowerCase().includes('phone provider not configured') ||
            error.message.toLowerCase().includes('sms provider')) {
          errorMessage = 'SMS authentication is not set up for this application. Please use email authentication instead or contact your administrator to configure an SMS provider (Twilio, MessageBird, etc.) in the Supabase Dashboard.'
        } else if (error.message.toLowerCase().includes('invalid phone number') ||
                   error.message.toLowerCase().includes('phone number')) {
          errorMessage = 'Please enter a valid phone number with country code (e.g., +1234567890, +91987654321)'
        } else if (error.message.toLowerCase().includes('rate limit') ||
                   error.message.toLowerCase().includes('too many requests')) {
          errorMessage = 'Too many OTP requests. Please wait a few minutes before trying again.'
        } else if (error.message.toLowerCase().includes('timeout')) {
          errorMessage = 'SMS delivery timeout. Please try again or use email authentication.'
        }
        
        throw new Error(errorMessage)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Phone OTP error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP'
      
      // Handle network and other errors
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        return { data: null, error: 'Network error occurred while sending SMS. Please check your connection and try again.' }
      }
      
      return { data: null, error: errorMessage }
    }
  }

  // Verify phone OTP
  async verifyPhoneOTP(phone: string, token: string) {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('OTP verification error:', error)
      return { data: null, error: error instanceof Error ? error.message : 'OTP verification failed' }
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error instanceof Error ? error.message : 'Sign out failed' }
    }
  }

  // Get current session
  async getSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { session, error: null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, error: error instanceof Error ? error.message : 'Failed to get session' }
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { user, error: null }
    } catch (error) {
      console.error('Get user error:', error)
      return { user: null, error: error instanceof Error ? error.message : 'Failed to get user' }
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback)
  }

  // Get access token for API calls
  async getAccessToken() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session for access token:', error)
        return null
      }
      
      if (!session) {
        console.warn('No active session found when getting access token')
        return null
      }
      
      if (!session.access_token) {
        console.warn('Session found but no access token available')
        return null
      }
      
      // Verify the token is not the anon key
      if (session.access_token === publicAnonKey) {
        console.error('Session access_token is the anon key - this should not happen')
        return null
      }
      
      console.log('Access token retrieved successfully, length:', session.access_token.length)
      return session.access_token
    } catch (error) {
      console.error('Get access token error:', error)
      return null
    }
  }

  // Refresh session if needed
  async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        return { session: null, error: error.message }
      }
      
      console.log('Session refreshed successfully')
      return { session: data.session, error: null }
    } catch (error) {
      console.error('Session refresh error:', error)
      return { session: null, error: error instanceof Error ? error.message : 'Session refresh failed' }
    }
  }

  // Resend confirmation email (fallback for old accounts)
  async resendConfirmationEmail(email: string) {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      return { error: null }
    } catch (error) {
      console.error('Resend confirmation error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to resend confirmation email' }
    }
  }

  // Make authenticated API call with proper error handling
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}, retryCount = 0) {
    try {
      let accessToken = await this.getAccessToken()
      
      if (!accessToken) {
        console.error('No access token available - user not authenticated')
        throw new Error('No access token available - user not authenticated')
      }

      // Verify this is not the anon key
      if (accessToken === publicAnonKey) {
        console.error('Access token is the anon key instead of user token')
        throw new Error('Invalid token - received anon key instead of user access token')
      }

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }

      console.log('Making authenticated request to:', url)
      console.log('Using access token (first 20 chars):', accessToken.substring(0, 20) + '...')
      console.log('Token length:', accessToken.length)

      const response = await fetch(url, {
        ...options,
        headers
      })

      console.log('Response status:', response.status, response.statusText)

      // If we get 401 and haven't retried yet, try to refresh the session
      if (response.status === 401 && retryCount === 0) {
        console.log('Got 401, attempting to refresh session...')
        const { session, error } = await this.refreshSession()
        
        if (!error && session) {
          console.log('Session refreshed, retrying request...')
          return this.makeAuthenticatedRequest(url, options, retryCount + 1)
        }
      }

      if (!response.ok) {
        let errorText = ''
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorText = JSON.stringify(errorData)
          } else {
            errorText = await response.text()
          }
        } catch (e) {
          errorText = `Failed to read error response: ${e}`
        }
        
        console.error('Request failed with error:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return response
    } catch (error) {
      console.error('Authenticated request failed:', error)
      throw error
    }
  }

  // Make public API call (for signup, test endpoints etc.)
  async makePublicRequest(url: string, options: RequestInit = {}) {
    try {
      const headers = {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }

      console.log('Making public request to:', url)

      const response = await fetch(url, {
        ...options,
        headers
      })

      return response
    } catch (error) {
      console.error('Public request failed:', error)
      throw error
    }
  }
}

export const authService = new AuthService()