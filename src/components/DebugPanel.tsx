import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Database, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  Info,
  Terminal,
  Globe,
  Key,
  Clock,
  Bug
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import AuthTest from './AuthTest'
import ConnectionTestDebug from './ConnectionTestDebug'

interface ConnectionTest {
  endpoint: string
  status: 'pending' | 'success' | 'error'
  response?: any
  error?: string
  duration?: number
}

export default function DebugPanel() {
  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([])
  const [systemInfo, setSystemInfo] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const endpoints = [
    '/make-server-ce8ebc43/health',
    '/make-server-ce8ebc43/test',
    '/make-server-ce8ebc43/auth/health',
    '/make-server-ce8ebc43/distributors',
    '/make-server-ce8ebc43/schemes',
    '/make-server-ce8ebc43/category-data',
    '/make-server-ce8ebc43/moderation/config'
  ]

  useEffect(() => {
    gatherSystemInfo()
    initializeConnectionTests()
  }, [])

  const gatherSystemInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      url: window.location.href,
      origin: window.location.origin,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      projectId: projectId,
      hasApiKey: !!publicAnonKey,
      apiKeyPrefix: publicAnonKey ? `${publicAnonKey.substring(0, 20)}...` : 'Not found'
    }
    setSystemInfo(info)
  }

  const initializeConnectionTests = () => {
    const tests = endpoints.map(endpoint => ({
      endpoint,
      status: 'pending' as const
    }))
    setConnectionTests(tests)
  }

  const testSingleEndpoint = async (endpoint: string): Promise<ConnectionTest> => {
    const startTime = Date.now()
    const fullUrl = `https://${projectId}.supabase.co/functions/v1${endpoint}`
    
    try {
      console.log(`Testing endpoint: ${fullUrl}`)
      
      // Health endpoint doesn't need authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Only add authorization for non-health endpoints
      if (!endpoint.includes('/health')) {
        headers['Authorization'] = `Bearer ${publicAnonKey}`
      }
      
      const fetchPromise = fetch(fullUrl, {
        method: 'GET',
        headers
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      })

      const response = await Promise.race([fetchPromise, timeoutPromise])
      const duration = Date.now() - startTime

      if (response.ok) {
        let responseData
        try {
          responseData = await response.json()
        } catch (e) {
          responseData = await response.text()
        }

        return {
          endpoint,
          status: 'success',
          response: responseData,
          duration
        }
      } else {
        let errorText = response.statusText
        try {
          errorText = await response.text()
        } catch (e) {
          // Keep statusText
        }

        return {
          endpoint,
          status: 'error',
          error: `HTTP ${response.status}: ${errorText}`,
          duration
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        endpoint,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }
    }
  }

  const runAllTests = async () => {
    setTesting(true)
    
    const results: ConnectionTest[] = []
    
    for (const endpoint of endpoints) {
      const result = await testSingleEndpoint(endpoint)
      results.push(result)
      
      // Update state incrementally
      setConnectionTests(prevTests => 
        prevTests.map(test => 
          test.endpoint === endpoint ? result : test
        )
      )
    }
    
    setTesting(false)
    
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    
    if (successCount === results.length) {
      toast.success(`All ${successCount} endpoints are working correctly!`)
    } else if (successCount > 0) {
      toast.warning(`${successCount} endpoints working, ${errorCount} failing`)
    } else {
      toast.error(`All ${errorCount} endpoints are failing - backend may not be deployed`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const copySystemInfo = () => {
    const info = JSON.stringify(systemInfo, null, 2)
    copyToClipboard(info)
  }

  const copyTestResults = () => {
    const results = JSON.stringify(connectionTests, null, 2)
    copyToClipboard(results)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Debug Panel</h2>
          <p className="text-gray-600">Troubleshoot backend connectivity and system information</p>
        </div>
        <Button onClick={runAllTests} disabled={testing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Testing...' : 'Test All Endpoints'}
        </Button>
      </div>

      <Tabs defaultValue="connection-tests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connection-tests">Connection Tests</TabsTrigger>
          <TabsTrigger value="auth-tests">Auth Tests</TabsTrigger>
          <TabsTrigger value="system-info">System Info</TabsTrigger>
          <TabsTrigger value="deployment-guide">Deployment Guide</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="auth-tests" className="space-y-6">
          <AuthTest />
        </TabsContent>

        <TabsContent value="connection-tests" className="space-y-6">
          <ConnectionTestDebug />
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Endpoint Connection Tests</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={copyTestResults}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Results
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionTests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          test.status === 'success' ? 'default' : 
                          test.status === 'error' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {test.status === 'success' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {test.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {test.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {test.status.toUpperCase()}
                      </Badge>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {test.endpoint}
                      </code>
                      {test.duration && (
                        <span className="text-xs text-gray-500">
                          ({test.duration}ms)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`https://${projectId}.supabase.co/functions/v1${test.endpoint}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {test.error && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Error:</strong> {test.error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {test.response && (
                    <div className="mt-2">
                      <details className="bg-gray-50 rounded p-2">
                        <summary className="cursor-pointer text-sm font-medium">Response Data</summary>
                        <pre className="mt-2 text-xs overflow-auto">
                          {JSON.stringify(test.response, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-info" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>System Information</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={copySystemInfo}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Info
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Application Info</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Project ID:</strong> {systemInfo.projectId}</div>
                    <div><strong>Has API Key:</strong> {systemInfo.hasApiKey ? 'Yes' : 'No'}</div>
                    <div><strong>API Key:</strong> {systemInfo.apiKeyPrefix}</div>
                    <div><strong>Current URL:</strong> {systemInfo.url}</div>
                    <div><strong>Origin:</strong> {systemInfo.origin}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Browser Info</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Platform:</strong> {systemInfo.platform}</div>
                    <div><strong>Language:</strong> {systemInfo.language}</div>
                    <div><strong>Timezone:</strong> {systemInfo.timezone}</div>
                    <div><strong>Online:</strong> {systemInfo.onLine ? 'Yes' : 'No'}</div>
                    <div><strong>Cookies:</strong> {systemInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">User Agent</h4>
                <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                  {systemInfo.userAgent}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment-guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Supabase Edge Function Deployment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  If you're seeing connection errors, the Supabase Edge Function may not be deployed.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Install Supabase CLI</h4>
                  <code className="bg-gray-100 p-2 rounded block">
                    npm install -g supabase
                  </code>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">2. Login to Supabase</h4>
                  <code className="bg-gray-100 p-2 rounded block">
                    supabase login
                  </code>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">3. Link to your project</h4>
                  <code className="bg-gray-100 p-2 rounded block">
                    supabase link --project-ref {projectId}
                  </code>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">4. Deploy the Edge Function</h4>
                  <code className="bg-gray-100 p-2 rounded block">
                    supabase functions deploy server
                  </code>
                </div>
              </div>
              
              <div className="mt-4">
                <Button variant="outline" asChild>
                  <a 
                    href="https://supabase.com/docs/guides/functions/quickstart" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Official Documentation</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bug className="h-5 w-5" />
                <span>Common Issues & Solutions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-red-700">404 Not Found</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    The Edge Function is not deployed or the function name is incorrect.
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Deploy the Edge Function using the deployment guide above</li>
                    <li>Verify the function name matches "server"</li>
                    <li>Check the Supabase Dashboard Functions section</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold text-yellow-700">Connection Timeout</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    The function is deployed but taking too long to respond.
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>The function might be cold starting (first request)</li>
                    <li>Check the function logs in Supabase Dashboard</li>
                    <li>Verify environment variables are set correctly</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-700">403 Forbidden</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Authentication or permission issues.
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Check if the API key is valid and not expired</li>
                    <li>Verify RLS policies allow function access</li>
                    <li>Ensure the function has proper CORS configuration</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-700">Network Error</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Unable to reach the Supabase servers.
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Check your internet connection</li>
                    <li>Verify the project ID is correct</li>
                    <li>Try accessing the Supabase Dashboard directly</li>
                    <li>Check if your network blocks Supabase domains</li>
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Environment Variables Required</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Make sure these environment variables are set in your Supabase project:
                </p>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono space-y-1">
                  <div>SUPABASE_URL</div>
                  <div>SUPABASE_ANON_KEY</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY</div>
                  <div>SUPABASE_DB_URL</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2 text-green-700">Email Authentication Configuration</h4>
                <p className="text-sm text-gray-600 mb-2">
                  This application uses server-side signup with automatic email confirmation:
                </p>
                <ul className="text-sm text-gray-600 mb-3 list-disc list-inside space-y-1">
                  <li><strong>No email verification required:</strong> New user accounts are automatically confirmed</li>
                  <li><strong>Server-side signup:</strong> Uses admin API to create accounts with email_confirm: true</li>
                  <li><strong>Immediate access:</strong> Users can sign in immediately after account creation</li>
                  <li><strong>Secure:</strong> Uses service role key on backend, public key on frontend</li>
                </ul>
                <Alert className="mt-3 mb-6">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Email confirmation is disabled by design.</strong> This simplifies the user onboarding process by eliminating the need for email server setup and verification steps.
                  </AlertDescription>
                </Alert>
                
                <h4 className="font-semibold mb-2 text-purple-700">SMS Authentication Setup</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Phone authentication requires SMS provider configuration in Supabase:
                </p>
                <ul className="text-sm text-gray-600 mb-3 list-disc list-inside space-y-1">
                  <li>Go to your Supabase Dashboard → Authentication → Settings</li>
                  <li>Navigate to the &quot;Phone Auth&quot; section</li>
                  <li>Configure an SMS provider (Twilio, MessageBird, Textlocal, Vonage)</li>
                  <li>Add your provider credentials and enable phone authentication</li>
                  <li>Enable phone authentication in the &quot;Providers&quot; section</li>
                </ul>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://supabase.com/docs/guides/auth/phone-login" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Phone Auth Setup Guide</span>
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://supabase.com/docs/guides/auth/phone-login/twilio" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Twilio Setup</span>
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}