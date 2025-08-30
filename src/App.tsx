import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Alert, AlertDescription } from './components/ui/alert'
import { Toaster } from './components/ui/sonner'
import CreateScheme, { CreateSchemeRef } from './components/CreateScheme'
import UploadData from './components/UploadData'
import ViewCalculations from './components/ViewCalculations'
import CategoryDataUpload from './components/CategoryDataUpload'
import DistributorManager from './components/DistributorManager'
import ManageSchemes, { ManageSchemesRef } from './components/ManageSchemes'
import ModerationPanel from './components/ModerationPanel'
import DebugPanel from './components/DebugPanel'
import DeploymentNotification from './components/DeploymentNotification'
import Login from './components/Login'
import { authService, AuthState, User } from './components/AuthService'
import { FileText, Upload, Calculator, Settings, Database, Users, FolderOpen, Bug, AlertTriangle, RefreshCw, Shield, CheckCircle, LogOut, UserCircle } from 'lucide-react'
import { projectId, publicAnonKey, workerUrl } from './utils/supabase/info'
import { toast } from 'sonner@2.0.3'

export default function App() {
  const [activeTab, setActiveTab] = useState('create-scheme')
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | 'unknown'>('unknown')
  const [connectionError, setConnectionError] = useState<string>('')
  const [retryAttempt, setRetryAttempt] = useState(0)
  const manageSchemesRef = useRef<ManageSchemesRef>(null)
  const createSchemeRef = useRef<CreateSchemeRef>(null)
  
  // Authentication state
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  })
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const handleSchemeCreated = () => {
    console.log('Scheme created, switching to manage-schemes and refreshing data')
    setActiveTab('manage-schemes')
    
    // Also refresh the ManageSchemes component to show the new scheme
    if (manageSchemesRef.current) {
      console.log('Refreshing ManageSchemes to show newly created scheme...')
      // Small delay to ensure tab switch happens first
      setTimeout(() => {
        if (manageSchemesRef.current) {
          manageSchemesRef.current.refresh()
        }
      }, 100)
    }
  }

  const handleCategoryDataUploaded = () => {
    console.log('=== CATEGORY DATA UPLOADED SUCCESSFULLY ===')
    if (createSchemeRef.current) {
      console.log('Refreshing CreateScheme category data after upload...')
      createSchemeRef.current.refresh()
    }
  }

  const handleCategoryDataDeleted = () => {
    console.log('=== CATEGORY DATA DELETED SUCCESSFULLY ===')
    if (createSchemeRef.current) {
      console.log('Clearing CreateScheme category data after deletion...')
      createSchemeRef.current.clearCategoryData()
    }
  }

  const checkConnection = async (isRetry: boolean = false) => {
    setConnectionStatus('checking')
    if (!isRetry) {
      setConnectionError('')
      setRetryAttempt(0)
    }
    
    // Determine the correct backend URL
    const backendUrl = workerUrl
    const healthUrl = `${backendUrl}/health`
    const testUrl = `${backendUrl}/test`
    
    // Check if we're using Cloudflare or Supabase backend
    const isUsingCloudflare = backendUrl.includes('workers.dev') || backendUrl.includes('pages.dev')
    const isUsingSupabase = backendUrl.includes('supabase.co')
    
    console.log('=== CONNECTION CHECK DEBUG INFO ===')
    console.log('Backend URL:', backendUrl)
    console.log('Health URL:', healthUrl)
    console.log('Test URL:', testUrl)
    console.log('Using Cloudflare:', isUsingCloudflare)
    console.log('Using Supabase:', isUsingSupabase)
    console.log('User ID:', authState.user?.id)
    console.log('Access Token Length:', accessToken?.length || 0)
    console.log('Public Anon Key Length:', publicAnonKey?.length || 0)
    
    try {
      console.log(`Checking backend connection... ${isRetry ? `(Retry attempt ${retryAttempt + 1})` : ''}`)
      console.log('Connecting to health check:', healthUrl)
      console.log('Fallback test URL:', testUrl)
      console.log('Project ID:', projectId)
      console.log('Access Token Available:', !!accessToken)
      console.log('User Authenticated:', !!authState.user)

      let response: Response | undefined = undefined;
      const startTime = Date.now()

      // Step 1: Try simple health check first (no auth required)
      try {
        console.log('Trying simple health check...')
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (healthResponse && healthResponse.ok) {
          console.log('Health check successful!')
          const healthData = await healthResponse.json()
          console.log('Health check response:', healthData)
          setConnectionStatus('connected')
          setRetryAttempt(0)
          setConnectionError('')
          return // Success - don't need to test other endpoints
        } else if (healthResponse && healthResponse.status === 401) {
          console.log('Health check requires authentication, skipping to authenticated test...')
          // Don't throw error for 401, just continue to authenticated test
        } else if (healthResponse && healthResponse.status === 404) {
          console.log('Health endpoint not found, trying test endpoint...')
          // Don't throw error for 404, just continue to test endpoint
        } else if (healthResponse) {
          console.log('Health check failed with status:', healthResponse.status)
          // Don't throw here, just continue to test endpoints
        } else {
          console.log('Health check returned no response')
          // Continue to test endpoints
        }
      } catch (healthError) {
        if (healthError instanceof Error && healthError.message.includes('Failed to fetch')) {
          console.warn('Health check network error, trying authenticated test endpoint...', healthError)
        } else {
          console.warn('Health check failed, trying authenticated test endpoint...', healthError)
        }
      }

      // If we reach here, health check failed, so try test endpoints
      if (!response || !response.ok) {
        // Step 2: Try authenticated test endpoint
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log('Test endpoint timeout reached, aborting...')
          controller.abort()
        }, 6000) // 6 seconds timeout

        try {
          if (authState.user && accessToken) {
            console.log('Making authenticated test request with user token...')
            response = await authService.makeAuthenticatedRequest(testUrl, {
              method: 'GET',
              signal: controller.signal
            })
          } else {
            console.log('Making public test request with anon key...')
            response = await authService.makePublicRequest(testUrl, {
              method: 'GET',
              signal: controller.signal
            })
          }
          clearTimeout(timeoutId)
        } catch (testError) {
          clearTimeout(timeoutId)
          console.warn('Auth service test failed, trying direct fetch...', testError)
          
          // Step 3: Direct fetch fallback
          const directController = new AbortController()
          const directTimeoutId = setTimeout(() => {
            console.log('Direct fetch timeout reached, aborting...')
            directController.abort()
          }, 6000)

          try {
            const authToken = accessToken || publicAnonKey
            console.log('Making direct fetch with auth token:', authToken ? 'present' : 'missing')
            
            response = await fetch(testUrl, {
              method: 'GET',
              signal: directController.signal,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
              }
            })
            clearTimeout(directTimeoutId)
          } catch (directError) {
            clearTimeout(directTimeoutId)
            console.warn('Direct fetch also failed, trying without authorization...', directError)
            
            // Step 4: Final fallback - try without any authorization
            try {
              response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              })
            } catch (noAuthError) {
              console.error('Even request without auth failed:', noAuthError)
              // Don't throw here - let the outer catch handle it
              response = undefined
            }
          }
        }
      }

      const requestTime = Date.now() - startTime
      console.log(`Connection test completed in ${requestTime}ms`)
      
      // Check if response is defined before accessing its properties
      if (!response) {
        console.error('Response is undefined - all connection attempts failed')
        setConnectionStatus('error')
        setConnectionError('All connection attempts failed. The backend may not be accessible.')
        return
      }
      
      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (response.ok) {
        try {
          const result = await response.json()
          console.log('Connection test successful:', result)
          setConnectionStatus('connected')
          setRetryAttempt(0)
          setConnectionError('') // Clear any previous errors
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError)
          setConnectionError('Server returned invalid JSON response. The Edge Function may be misconfigured.')
          setConnectionStatus('error')
        }
      } else {
        let errorText = 'Unknown error'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorText = errorData.message || errorData.error || JSON.stringify(errorData)
          } else {
            errorText = await response.text()
          }
        } catch (e) {
          console.error('Failed to read error response:', e)
          errorText = `Failed to read error response: ${e}`
        }
        
        console.error('Connection test failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        setConnectionStatus('error')
        
        if (response.status === 500) {
          setConnectionError(`Server error (${response.status}). The backend may be experiencing issues. Details: ${errorText}`)
        } else if (response.status === 404) {
          if (isUsingCloudflare) {
            setConnectionError(`Endpoint not found (${response.status}). The Cloudflare Worker may not be deployed yet. Run 'npm run deploy-now' to deploy.`)
          } else {
            setConnectionError(`Endpoint not found (${response.status}). The Supabase Edge Function 'make-server-ce8ebc43' may not be deployed or the '/test' route is missing.`)
          }
        } else if (response.status === 403) {
          setConnectionError(`Access forbidden (${response.status}). Check your API keys and configuration.`)
        } else if (response.status === 401) {
          if (isUsingCloudflare) {
            setConnectionError(`Unauthorized (${response.status}). The Cloudflare Worker may not be properly configured with Supabase credentials or the endpoint requires authentication.`)
          } else {
            setConnectionError(`Unauthorized (${response.status}). The Supabase API key may be invalid, expired, or the endpoint requires user authentication. Try logging in again.`)
          }
        } else if (response.status === 429) {
          setConnectionError(`Rate limited (${response.status}). Too many requests. Please wait before retrying.`)
        } else {
          setConnectionError(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
        }
      }
    } catch (error) {
      console.error('Connection test error:', error)
      setConnectionStatus('error')
      
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        
        if (error.message.includes('timeout') || error.name === 'AbortError') {
          console.log('Timeout detected, trying one more simple fetch without auth...')
          // Try a very simple fetch as last resort
          try {
            const simpleResponse = await fetch(testUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (simpleResponse && simpleResponse.ok) {
              console.log('Simple fetch succeeded, the issue was with timeout handling')
              setConnectionStatus('connected')
              setConnectionError('')
              return
            } else if (simpleResponse) {
              console.log('Simple fetch failed with status:', simpleResponse.status)
            } else {
              console.log('Simple fetch returned no response')
            }
          } catch (simpleError) {
            console.log('Simple fetch also failed:', simpleError)
          }
          
          if (isUsingCloudflare) {
            setConnectionError('Connection timeout - the Cloudflare Worker took too long to respond. This usually means the worker is not deployed or there are network issues. Run \'npm run deploy-now\' to deploy.')
          } else {
            setConnectionError('Connection timeout - the server took more than 8 seconds to respond. This usually means the Supabase Edge Function is not deployed, not running, or there are network issues. Please check the Debug tab for deployment instructions.')
          }
        } else if (error.message.includes('Failed to fetch')) {
          let deploymentMessage = ''
          if (isUsingCloudflare) {
            deploymentMessage = `Cloudflare Worker connection failed. This could mean:
1. The Cloudflare Worker is not deployed yet
2. Run 'npm run deploy-now' to deploy to Cloudflare
3. The worker URL is incorrect: ${backendUrl}
4. Environment variables not configured
Please check the Debug tab or run the Cloudflare deployment.`
          } else {
            deploymentMessage = `Supabase connection failed. This could mean:
1. The Supabase Edge Function is not deployed
2. The project URL is incorrect: ${backendUrl}
3. Network connectivity issues
4. CORS configuration problems
Please check the Debug tab for deployment instructions.`
          }
          setConnectionError(deploymentMessage)
        } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
          setConnectionError(`Network error: ${error.message}. Please check if the Supabase Edge Function is deployed and accessible.`)
        } else if (error.message.includes('CORS')) {
          setConnectionError(`CORS error: ${error.message}. The backend may not be properly configured for cross-origin requests.`)
        } else {
          setConnectionError(`Connection error: ${error.message}`)
        }
      } else {
        setConnectionError('Unknown connection error occurred. Please check your network and try again.')
      }
      
      // Additional safety check - if we still don't have a response, set a clear error
      if (!response) {
        console.error('No response received from any connection attempt')
        setConnectionError('Unable to establish connection to backend. All connection attempts failed. Please check if the backend is deployed and accessible.')
      }
    }
  }

  const handleRetryConnection = async () => {
    if (retryAttempt < 5) { // Increased retry attempts
      setRetryAttempt(prev => prev + 1)
      // Add a small delay before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
      await checkConnection(true)
    } else {
      setConnectionError(prev => `${prev} (Maximum retry attempts reached - 5/5)`)
    }
  }
  
  // Authentication effect - check for existing session
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing authentication...')
      
      try {
        // Check for existing session
        const { session, error } = await authService.getSession()
        
        if (error) {
          console.error('Failed to get session:', error)
          setAuthState(prev => ({ ...prev, loading: false }))
          return
        }

        if (session) {
          console.log('Found existing session:', {
            userId: session.user.id,
            email: session.user.email,
            hasAccessToken: !!session.access_token,
            accessTokenLength: session.access_token?.length || 0,
            tokenPrefix: session.access_token?.substring(0, 20) || 'none'
          })
          setAuthState({
            user: session.user,
            session: session,
            loading: false
          })
          setAccessToken(session.access_token)
        } else {
          console.log('No existing session found')
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (session) {
        console.log('Setting new session in auth state change:', {
          event,
          userId: session.user.id,
          hasAccessToken: !!session.access_token,
          tokenLength: session.access_token?.length || 0
        })
        setAuthState({
          user: session.user,
          session: session,
          loading: false
        })
        setAccessToken(session.access_token)
      } else {
        console.log('Clearing auth state:', event)
        setAuthState({
          user: null,
          session: null,
          loading: false
        })
        setAccessToken(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Check connection on app start with a small delay (only when authenticated)
  useEffect(() => {
    if (!authState.loading && authState.user) {
      const timer = setTimeout(() => {
        checkConnection()
      }, 500) // Small delay to allow component to mount properly
      
      return () => clearTimeout(timer)
    }
  }, [authState.loading, authState.user, accessToken])

  const handleTabChange = (newTab: string) => {
    console.log('Tab changed to:', newTab)
    setActiveTab(newTab)
  }

  // Force connection check when switching to debug tab (only if authenticated)
  useEffect(() => {
    if (activeTab === 'debug' && connectionStatus !== 'connected' && authState.user) {
      console.log('Checking connection when opening debug tab...')
      // Add a small delay to prevent immediate multiple calls
      const timer = setTimeout(() => {
        checkConnection()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [activeTab, authState.user])

  // Simple connection health check every 5 minutes when connected and authenticated
  useEffect(() => {
    if (connectionStatus === 'connected' && authState.user) {
      const healthCheck = setInterval(() => {
        console.log('Performing periodic health check...')
        checkConnection()
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(healthCheck)
    }
  }, [connectionStatus, authState.user])

  // Authentication handlers
  const handleLoginSuccess = () => {
    console.log('Login successful, user authenticated')
    toast.success('Welcome to Schemes Management Platform!')
  }

  const handleLogout = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { error } = await authService.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        toast.error('Failed to logout: ' + error)
        setAuthState(prev => ({ ...prev, loading: false }))
        return
      }

      // Clear local state
      setAuthState({
        user: null,
        session: null,
        loading: false
      })
      setAccessToken(null)
      setConnectionStatus('unknown')
      setActiveTab('create-scheme')
      
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  // Show loading screen during auth initialization
  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    )
  }

  // Show login screen if user is not authenticated
  if (!authState.user) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Schemes Management Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <UserCircle className="h-4 w-4" />
                <span>
                  {authState.user.user_metadata?.name || 
                   authState.user.email || 
                   authState.user.phone || 
                   'User'}
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-800 text-white border-blue-800 hover:border-blue-900 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Deployment Notification */}
      <DeploymentNotification />

      {/* Connection Status Alert */}
      {connectionStatus === 'error' && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4 py-3">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <strong>Backend Connection Failed:</strong> {connectionError}
                    <div className="text-sm mt-2 space-y-1">
                      <div>Check the Debug tab for deployment instructions and troubleshooting.</div>
                      <div className="text-xs opacity-75">
                        Backend: {(() => {
                          const backendUrl = workerUrl
                          const isUsingCloudflare = backendUrl.includes('workers.dev') || backendUrl.includes('pages.dev')
                          const isUsingSupabase = backendUrl.includes('supabase.co')
                          return isUsingCloudflare ? 'Cloudflare Worker' : isUsingSupabase ? 'Supabase Edge Function' : 'Unknown'
                        })()} | Project: {projectId}
                      </div>
                      <div className="text-xs opacity-75">
                        Backend URL: {workerUrl}
                      </div>
                      {workerUrl.includes('workers.dev') && (
                        <div className="text-xs opacity-75 text-blue-600">
                          💡 Deploy with: npm run deploy-now
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button 
                      onClick={() => checkConnection(false)} 
                      variant="outline" 
                      size="sm"
                      disabled={connectionStatus === 'checking'}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
                      Test Connection
                    </Button>
                    {retryAttempt > 0 && retryAttempt < 5 && (
                      <Button 
                        onClick={handleRetryConnection} 
                        variant="secondary" 
                        size="sm"
                        disabled={connectionStatus === 'checking'}
                      >
                        Auto Retry ({retryAttempt}/5)
                      </Button>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Success Connection Status */}
      {connectionStatus === 'connected' && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center text-green-800 text-sm">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              <span>Backend connected successfully</span>
              <div className="ml-4 text-xs opacity-75">
                Project: {projectId} | Health check every 5 minutes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checking Connection Status */}
      {connectionStatus === 'checking' && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center text-blue-800 text-sm">
              <RefreshCw className="h-4 w-4 mr-2 text-blue-600 animate-spin" />
              <span>Checking backend connection...</span>
              {retryAttempt > 0 && (
                <div className="ml-4 text-xs opacity-75">
                  Retry attempt {retryAttempt}/5
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Manage Your Distribution Schemes
              </h2>
              <p className="text-gray-600">
                Create schemes, upload sales data, and verify calculations all in one place
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' && (
                <div className="flex items-center text-green-600 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Backend Connected
                </div>
              )}
              {connectionStatus === 'checking' && (
                <div className="flex items-center text-blue-600 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Checking Connection
                </div>
              )}
              {connectionStatus === 'error' && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Connection Failed
                </div>
              )}
              {connectionStatus === 'unknown' && (
                <div className="flex items-center text-gray-600 text-sm">
                  <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                  Connection Unknown
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:grid-cols-8">
            <TabsTrigger 
              value="category-data-upload" 
              className="flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>Category Data</span>
            </TabsTrigger>
            <TabsTrigger 
              value="distributor-manager" 
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Distributors</span>
            </TabsTrigger>
            <TabsTrigger 
              value="create-scheme" 
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Create Scheme</span>
            </TabsTrigger>
            <TabsTrigger 
              value="manage-schemes" 
              className="flex items-center space-x-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Manage Schemes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="upload-data" 
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Data</span>
            </TabsTrigger>
            <TabsTrigger 
              value="view-calculations" 
              className="flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>View Calculations</span>
            </TabsTrigger>
            <TabsTrigger 
              value="moderation" 
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Moderation</span>
            </TabsTrigger>
            <TabsTrigger 
              value="debug" 
              className="flex items-center space-x-2"
            >
              <Bug className="h-4 w-4" />
              <span>Debug</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="category-data-upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Category Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDataUpload 
                  onCategoryDataUploaded={handleCategoryDataUploaded}
                  onCategoryDataDeleted={handleCategoryDataDeleted}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distributor-manager" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Distributor Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DistributorManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-scheme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Create New Scheme</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreateScheme 
                  ref={createSchemeRef}
                  onSchemeCreated={handleSchemeCreated}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage-schemes" className="space-y-6">
            <ManageSchemes 
              ref={manageSchemesRef}
            />
          </TabsContent>

          <TabsContent value="upload-data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Sales Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UploadData />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view-calculations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Scheme Calculations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ViewCalculations />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-6">
            <ModerationPanel />
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <DebugPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        richColors
        expand
        duration={4000}
      />
    </div>
  )
}