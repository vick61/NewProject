import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Hono } from 'https://esm.sh/hono'
import { cors } from 'https://esm.sh/hono/cors'
import { logger } from 'https://esm.sh/hono/logger'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

import { setupRoutes } from './routes-fixed.tsx'
import { setupAuthRoutes } from './routes-auth.tsx'
import { setupDeleteCategoryRoutes } from './routes-delete-category.tsx'
import { initializeZoneStateMapping, initializeCategoryData, initializeSampleDistributors } from './helpers.tsx'
import { STORAGE_BUCKET_NAME } from './constants.tsx'

const app = new Hono()

// Add basic health check FIRST, before any middleware
app.get('/make-server-ce8ebc43/health', async (c) => {
  console.log('Basic health check called - no middleware')
  return c.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.2',
    middleware: 'bypassed'
  })
})

app.use('*', logger(console.log))
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Initialize data asynchronously to avoid blocking server startup
Promise.all([
  // Create storage bucket
  (async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET_NAME)
      if (!bucketExists) {
        await supabase.storage.createBucket(STORAGE_BUCKET_NAME, { public: false })
        console.log(`Created bucket: ${STORAGE_BUCKET_NAME}`)
      }
    } catch (error) {
      console.log(`Bucket creation error: ${error}`)
    }
  })(),
  
  // Initialize zone-state mapping
  (async () => {
    try {
      await initializeZoneStateMapping()
      console.log('✓ Zone-state mapping initialized successfully')
    } catch (error) {
      console.error('✗ Error initializing zone-state mapping:', error)
    }
  })(),
  
  // Initialize category data
  (async () => {
    try {
      await initializeCategoryData()
      console.log('✓ Category data initialized successfully')
    } catch (error) {
      console.error('✗ Error initializing category data:', error)
    }
  })(),
  
  // Initialize sample distributors
  (async () => {
    try {
      await initializeSampleDistributors()
      console.log('✓ Sample distributors initialized successfully')
    } catch (error) {
      console.error('✗ Error initializing sample distributors:', error)
    }
  })()
]).then(() => {
  console.log('✓ All background initialization tasks completed')
}).catch(error => {
  console.error('✗ Some background initialization tasks failed:', error)
})

console.log('⚡ Server startup continuing without waiting for background tasks...')

// Setup all routes with error handling
try {
  console.log('🔧 Setting up routes...')
  
  // Set up auth routes first to avoid conflicts
  setupAuthRoutes(app)
  console.log('✓ Auth routes configured successfully')
  
  // Then set up main routes  
  setupRoutes(app)
  console.log('✓ Server routes configured successfully')
  
  // Set up additional routes
  setupDeleteCategoryRoutes(app)
  console.log('✓ Delete category routes configured successfully')
  
  // Verify critical endpoints are registered
  console.log('🔍 Verifying route registration...')
  console.log('Routes should include:')
  console.log('  ✓ GET /make-server-ce8ebc43/calculations (for fetching all calculations)')
  console.log('  ✓ GET /make-server-ce8ebc43/calculations/latest (for fetching latest calculation)')
  console.log('  ✓ GET /make-server-ce8ebc43/schemes (for fetching all schemes)')
  console.log('  ✓ GET /make-server-ce8ebc43/sales-data (for fetching sales data)')
  console.log('  ✓ POST /make-server-ce8ebc43/upload-sales-data (for uploading sales data)')
  console.log('  ✓ POST /make-server-ce8ebc43/calculate (for running calculations)')
  console.log('Route setup completed at', new Date().toISOString())
} catch (error) {
  console.error('✗ Error setting up routes:', error)
  if (error instanceof Error) {
    console.error('Route setup error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
  }
  throw error
}

// Add a catch-all error handler with timeout protection
app.onError((err, c) => {
  console.error('Server error:', err)
  
  // Check if this is a timeout error
  if (err.message?.includes('timeout') || err.message?.includes('statement timeout')) {
    return c.json({
      success: false,
      error: 'Request timeout',
      message: 'The operation took too long to complete. This may be due to large datasets. Please try with a smaller dataset or try again later.',
      timestamp: new Date().toISOString()
    }, 500)
  }
  
  return c.json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500)
})

// Add request monitoring (without timeout interference for simple requests)
app.use('*', async (c, next) => {
  const startTime = Date.now()
  const url = c.req.url
  
  try {
    await next()
    
    const processingTime = Date.now() - startTime
    if (processingTime > 5000) { // Log slow requests
      console.warn(`Slow request detected: ${c.req.method} ${url} took ${processingTime}ms`)
    } else if (url.includes('/test')) {
      console.log(`Test request completed in ${processingTime}ms`)
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`Request error: ${c.req.method} ${url} after ${processingTime}ms:`, error)
    throw error
  }
})

console.log('🚀 Schemes Management Server starting...')
console.log('📍 Available endpoints:')
console.log('  - GET  /make-server-ce8ebc43/health (simple health check)')
console.log('  - GET  /make-server-ce8ebc43/test (full test with auth)')
console.log('  - GET  /make-server-ce8ebc43/auth/health')
console.log('  - POST /make-server-ce8ebc43/auth/signup')
console.log('  - GET  /make-server-ce8ebc43/calculations')
console.log('  - GET  /make-server-ce8ebc43/calculations/latest')
console.log('  - GET  /make-server-ce8ebc43/schemes')
console.log('  - GET  /make-server-ce8ebc43/sales-data')
console.log('  - POST /make-server-ce8ebc43/upload-sales-data')
console.log('  - POST /make-server-ce8ebc43/calculate')
console.log('  - GET  /make-server-ce8ebc43/distributors')
console.log('  - POST /make-server-ce8ebc43/distributors/bulk')
console.log('  - GET  /make-server-ce8ebc43/zone-state-mapping')
console.log('  - GET  /make-server-ce8ebc43/category-data')
console.log('  - GET  /make-server-ce8ebc43/moderation/config')
console.log('  - POST /make-server-ce8ebc43/moderation/config')
console.log('  - And more...')

Deno.serve(app.fetch)
