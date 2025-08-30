import { Hono } from 'npm:hono'
import { signUpUser } from './auth.tsx'

export function setupAuthRoutes(app: Hono) {
  
  // User registration endpoint (server-side signup)
  app.post('/make-server-ce8ebc43/auth/signup', async (c) => {
    try {
      console.log('=== USER SIGNUP REQUEST ===')
      
      // Safe header logging
      try {
        const headers = c.req.header()
        if (headers && typeof headers === 'object') {
          // Convert headers to a plain object for logging
          const headerEntries = Object.entries(headers)
          console.log('Headers:', Object.fromEntries(headerEntries))
        } else {
          console.log('Headers: (not iterable)', headers)
        }
      } catch (headerError) {
        console.log('Failed to log headers:', headerError)
      }
      
      console.log('Method:', c.req.method)
      console.log('URL:', c.req.url)
      
      // Parse request body with error handling
      let requestBody
      try {
        requestBody = await c.req.json()
        console.log('Request body parsed successfully:', { email: requestBody.email, hasPassword: !!requestBody.password, name: requestBody.name })
      } catch (parseError) {
        console.error('Failed to parse request JSON:', parseError)
        return c.json({
          success: false,
          error: 'Invalid JSON in request body'
        }, 400)
      }
      
      const { email, password, name } = requestBody
      
      if (!email || !password) {
        console.log('Missing required fields:', { hasEmail: !!email, hasPassword: !!password })
        return c.json({
          success: false,
          error: 'Email and password are required'
        }, 400)
      }
      
      if (password.length < 6) {
        console.log('Password too short:', password.length, 'characters')
        return c.json({
          success: false,
          error: 'Password must be at least 6 characters long'
        }, 400)
      }
      
      console.log('Creating user account for:', email)
      
      const { data, error } = await signUpUser(email, password, { name })
      
      if (error) {
        console.error('Signup error from signUpUser function:', error)
        return c.json({
          success: false,
          error: error
        }, 400)
      }
      
      console.log('User created successfully:', data.user?.id)
      
      const response = {
        success: true,
        message: 'User account created successfully',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          user_metadata: data.user?.user_metadata
        }
      }
      
      console.log('Sending response:', response)
      return c.json(response)
    } catch (error) {
      console.error('Server signup error (outer catch):', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Signup failed'
      }, 500)
    }
  })
  
  // Health check for auth service
  app.get('/make-server-ce8ebc43/auth/health', async (c) => {
    try {
      return c.json({
        status: 'healthy',
        message: 'Authentication service is running',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Auth health check error:', error)
      return c.json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })
}