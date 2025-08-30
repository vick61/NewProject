/**
 * Cloudflare Worker for Schemes Management Platform
 * Adapts the existing Supabase Edge Functions to work with Cloudflare Workers
 */



import { Hono } from 'https://esm.sh/hono'
import { cors } from 'https://esm.sh/hono/cors'
import { logger } from 'https://esm.sh/hono/logger'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'


// Types for Cloudflare Worker environment
interface Env {
  KV_STORE: KVNamespace
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_ANON_KEY: string
  ALLOWED_ORIGINS?: string
  NODE_ENV?: string
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>()

// CORS middleware - allow requests from your frontend
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'https://schemes-management.pages.dev'
  ]
  
  const origin = c.req.header('Origin')
  const corsOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0]
  
  const corsHandler = cors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  
  return corsHandler(c, next)
})

// Logger middleware
app.use('*', logger(console.log))

// KV Store utility functions (equivalent to your Supabase KV)
const kvStore = {
  get: async (kv: KVNamespace, key: string) => {
    const value = await kv.get(key)
    return value ? JSON.parse(value) : null
  },

  set: async (kv: KVNamespace, key: string, value: any) => {
    await kv.put(key, JSON.stringify(value))
  },

  del: async (kv: KVNamespace, key: string) => {
    await kv.delete(key)
  },

  mget: async (kv: KVNamespace, keys: string[]) => {
    const promises = keys.map(key => kvStore.get(kv, key))
    return Promise.all(promises)
  },

  mset: async (kv: KVNamespace, pairs: { key: string; value: any }[]) => {
    const promises = pairs.map(({ key, value }) => kvStore.set(kv, key, value))
    await Promise.all(promises)
  },

  mdel: async (kv: KVNamespace, keys: string[]) => {
    const promises = keys.map(key => kvStore.del(kv, key))
    await Promise.all(promises)
  },

  getByPrefix: async (kv: KVNamespace, prefix: string) => {
    const list = await kv.list({ prefix })
    const keys = list.keys.map(k => k.name)
    return kvStore.mget(kv, keys)
  }
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'Cloudflare Workers'
  })
})

// Test endpoint - simplified for Cloudflare Worker
app.get('/test', async (c) => {
  try {
    return c.json({
      status: 'success',
      message: 'Cloudflare Worker test successful',
      timestamp: new Date().toISOString(),
      platform: 'Cloudflare Workers',
      environment: c.env.NODE_ENV || 'production',
      kv_available: !!c.env.KV_STORE,
      supabase_url_configured: !!c.env.SUPABASE_URL,
      supabase_keys_configured: !!(c.env.SUPABASE_SERVICE_ROLE_KEY && c.env.SUPABASE_ANON_KEY)
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

// Import Supabase dynamically for auth endpoints
const createSupabaseClient = async (url: string, key: string) => {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key)
}

// Auth middleware for protected routes
const requireAuth = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const supabase = await createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('Auth error:', error)
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    c.set('user', user)
    c.set('userId', user.id)
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

// User management routes
app.post('/auth/signup', async (c) => {
  try {
    const { email, password, name, phone } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const supabase = await createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, phone },
      email_confirm: true // Auto-confirm since no email server configured
    })

    if (error) {
      console.error('Signup error:', error)
      return c.json({ error: error.message }, 400)
    }

    return c.json({
      success: true,
      user: data.user,
      message: 'User created successfully'
    })
  } catch (error) {
    console.error('Signup endpoint error:', error)
    return c.json({ error: 'Signup failed' }, 500)
  }
})

// KV Store operations (user-isolated)
app.get('/kv/:key', requireAuth, async (c) => {
  try {
    const key = c.req.param('key')
    const userId = c.get('userId')
    const userKey = `user_${userId}_${key}`
    
    const value = await kvStore.get(c.env.KV_STORE, userKey)
    
    return c.json({
      success: true,
      key: userKey,
      value
    })
  } catch (error) {
    console.error('KV get error:', error)
    return c.json({ error: 'Failed to get value' }, 500)
  }
})

app.post('/kv/:key', requireAuth, async (c) => {
  try {
    const key = c.req.param('key')
    const userId = c.get('userId')
    const userKey = `user_${userId}_${key}`
    const { value } = await c.req.json()
    
    await kvStore.set(c.env.KV_STORE, userKey, value)
    
    return c.json({
      success: true,
      key: userKey,
      message: 'Value stored successfully'
    })
  } catch (error) {
    console.error('KV set error:', error)
    return c.json({ error: 'Failed to store value' }, 500)
  }
})

app.delete('/kv/:key', requireAuth, async (c) => {
  try {
    const key = c.req.param('key')
    const userId = c.get('userId')
    const userKey = `user_${userId}_${key}`
    
    await kvStore.del(c.env.KV_STORE, userKey)
    
    return c.json({
      success: true,
      key: userKey,
      message: 'Value deleted successfully'
    })
  } catch (error) {
    console.error('KV delete error:', error)
    return c.json({ error: 'Failed to delete value' }, 500)
  }
})

// List user's keys by prefix
app.get('/kv-list/:prefix', requireAuth, async (c) => {
  try {
    const prefix = c.req.param('prefix')
    const userId = c.get('userId')
    const userPrefix = `user_${userId}_${prefix}`
    
    const values = await kvStore.getByPrefix(c.env.KV_STORE, userPrefix)
    
    return c.json({
      success: true,
      prefix: userPrefix,
      values: values.filter(v => v !== null)
    })
  } catch (error) {
    console.error('KV list error:', error)
    return c.json({ error: 'Failed to list values' }, 500)
  }
})

// Schemes management routes
app.post('/schemes', requireAuth, async (c) => {
  try {
    const scheme = await c.req.json()
    const userId = c.get('userId')
    const schemeId = crypto.randomUUID()
    
    const schemeData = {
      ...scheme,
      id: schemeId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await kvStore.set(c.env.KV_STORE, `user_${userId}_scheme_${schemeId}`, schemeData)
    
    // Also store in schemes list
    const schemes = await kvStore.get(c.env.KV_STORE, `user_${userId}_schemes`) || []
    schemes.push(schemeId)
    await kvStore.set(c.env.KV_STORE, `user_${userId}_schemes`, schemes)
    
    return c.json({
      success: true,
      scheme: schemeData,
      message: 'Scheme created successfully'
    })
  } catch (error) {
    console.error('Create scheme error:', error)
    return c.json({ error: 'Failed to create scheme' }, 500)
  }
})

app.get('/schemes', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const schemes = await kvStore.getByPrefix(c.env.KV_STORE, `user_${userId}_scheme_`)
    
    return c.json({
      success: true,
      schemes: schemes.filter(s => s !== null).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    })
  } catch (error) {
    console.error('Get schemes error:', error)
    return c.json({ error: 'Failed to get schemes' }, 500)
  }
})

// Default 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Endpoint not found',
    path: c.req.path,
    method: c.req.method
  }, 404)
})

// Error handler
app.onError((error, c) => {
  console.error('Worker error:', error)
  return c.json({
    error: 'Internal server error',
    message: error.message
  }, 500)
})

export default app
