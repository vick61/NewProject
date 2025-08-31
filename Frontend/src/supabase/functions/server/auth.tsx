import { Hono } from 'https://esm.sh/hono'
import { cors } from 'https://esm.sh/hono/cors'
import { logger } from 'https://esm.sh/hono/logger'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'





const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

export interface AuthenticatedUser {
  id: string
  email?: string
  phone?: string
  user_metadata?: {
    name?: string
    [key: string]: any
  }
}

export interface AuthContext extends Context {
  user: AuthenticatedUser
}

/**
 * Authentication middleware that validates user tokens and extracts user information
 */
export const requireAuth = async (c: Context, next: () => Promise<void>) => {
  try {
    console.log('=== AUTHENTICATION MIDDLEWARE ===')
    const authHeader = c.req.header('Authorization')
    
    console.log('Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header')
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Extracted token length:', token.length)
    console.log('Token prefix:', token.substring(0, 20))
    
    // Check if this is a public anon key instead of a user token
    if (token === Deno.env.get('SUPABASE_ANON_KEY')) {
      console.error('Received anon key instead of user token')
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Public anon key provided instead of user access token'
      }, 401)
    }
    
    // Use service role key to validate user token
    console.log('Validating user token with service role...')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      console.error('Token validation error details:', {
        message: error.message,
        name: error.name,
        status: error.status
      })
      
      let errorMessage = 'Invalid or expired token'
      if (error.message.includes('missing sub claim')) {
        errorMessage = 'Invalid token format - missing user identifier'
      } else if (error.message.includes('expired')) {
        errorMessage = 'Token has expired - please sign in again'
      } else if (error.message.includes('malformed')) {
        errorMessage = 'Malformed token - please sign in again'
      }
      
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: errorMessage,
        debug: error.message
      }, 401)
    }
    
    if (!user) {
      console.error('Token validation returned no user')
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Token validation returned no user'
      }, 401)
    }

    // Attach user to context for use in route handlers
    c.set('user', {
      id: user.id,
      email: user.email,
      phone: user.phone,
      user_metadata: user.user_metadata
    })

    console.log(`✓ Authenticated user: ${user.id} (${user.email || user.phone})`)
    
    await next()
  } catch (error) {
    console.error('Authentication middleware error:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return c.json({
      success: false,
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown authentication error'
    }, 500)
  }
}

/**
 * Get authenticated user from context
 */
export const getAuthenticatedUser = (c: Context): AuthenticatedUser => {
  const user = c.get('user')
  if (!user) {
    throw new Error('User not authenticated - ensure requireAuth middleware is used')
  }
  return user
}

/**
 * Create user-specific key for data isolation
 */
export const createUserKey = (userId: string, key: string): string => {
  return `user:${userId}:${key}`
}

/**
 * Extract user ID from user-specific key
 */
export const extractUserIdFromKey = (userKey: string): string | null => {
  const match = userKey.match(/^user:([^:]+):/)
  return match ? match[1] : null
}

/**
 * Check if a key belongs to a specific user
 */
export const isUserKey = (key: string, userId: string): boolean => {
  return key.startsWith(`user:${userId}:`)
}

/**
 * Create scheme key for user
 */
export const createSchemeKey = (userId: string, schemeId: string): string => {
  return createUserKey(userId, `scheme:${schemeId}`)
}

/**
 * Create calculation key for user
 */
export const createCalculationKey = (userId: string, calculationId: string): string => {
  return createUserKey(userId, `calculation:${calculationId}`)
}

/**
 * Create sales data key for user
 */
export const createSalesDataKey = (userId: string, filename: string): string => {
  return createUserKey(userId, `sales-data:${filename}`)
}

/**
 * Create distributor key for user
 */
export const createDistributorKey = (userId: string): string => {
  return createUserKey(userId, 'distributors')
}

/**
 * Create category data key for user
 */
export const createCategoryDataKey = (userId: string): string => {
  return createUserKey(userId, 'category-data')
}

/**
 * Optional authentication middleware that allows both authenticated and public access
 * Sets user if authenticated, but doesn't block if not authenticated
 */
export const optionalAuth = async (c: Context, next: () => Promise<void>) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      // Try to validate token, but don't fail if invalid
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (!error && user) {
        c.set('user', {
          id: user.id,
          email: user.email,
          phone: user.phone,
          user_metadata: user.user_metadata
        })
        console.log(`Optional auth - authenticated user: ${user.id}`)
      } else {
        console.log('Optional auth - no valid authentication')
      }
    }
    
    await next()
  } catch (error) {
    console.error('Optional authentication error:', error)
    // Continue without authentication
    await next()
  }
}

/**
 * Sign up new user (for server-side registration)
 */
export const signUpUser = async (email: string, password: string, metadata?: any) => {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata || {},
      email_confirm: true // Auto-confirm since we don't have email server configured
    })
    
    if (error) {
      throw new Error(error.message)
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Sign up error:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Sign up failed' 
    }
  }
}
