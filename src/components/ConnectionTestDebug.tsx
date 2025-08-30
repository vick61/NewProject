import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { workerUrl, projectId, publicAnonKey } from '../utils/supabase/info'

interface ConnectionResult {
  endpoint: string
  method: string
  status?: number
  success: boolean
  responseTime: number
  error?: string
  response?: any
}

export default function ConnectionTestDebug() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<ConnectionResult[]>([])

  const testEndpoint = async (url: string, options: RequestInit = {}): Promise<ConnectionResult> => {
    const startTime = Date.now()
    
    try {
      console.log(`Testing endpoint: ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        ...options
      })

      const responseTime = Date.now() - startTime
      
      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        responseData = await response.text()
      }

      return {
        endpoint: url,
        method: options.method as string || 'GET',
        status: response.status,
        success: response.ok,
        responseTime,
        response: responseData
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        endpoint: url,
        method: options.method as string || 'GET',
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runConnectionTest = async () => {
    setTesting(true)
    setResults([])

    const backendUrl = workerUrl
    const healthUrl = `${backendUrl}/health`
    const testUrl = `${backendUrl}/test`

    console.log('=== COMPREHENSIVE CONNECTION TEST ===')
    console.log('Backend URL:', backendUrl)
    console.log('Project ID:', projectId)

    const testResults: ConnectionResult[] = []

    // Test 1: Health endpoint without auth
    console.log('Test 1: Health endpoint (no auth)')
    const healthResult = await testEndpoint(healthUrl)
    testResults.push(healthResult)

    // Test 2: Test endpoint without auth
    console.log('Test 2: Test endpoint (no auth)')
    const testNoAuthResult = await testEndpoint(testUrl)
    testResults.push(testNoAuthResult)

    // Test 3: Test endpoint with anon key
    console.log('Test 3: Test endpoint (with anon key)')
    const testWithAnonResult = await testEndpoint(testUrl, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    })
    testResults.push(testWithAnonResult)

    // Test 4: Check if URL is reachable at all
    console.log('Test 4: Basic connectivity test')
    const connectivityResult = await testEndpoint(backendUrl.replace(/\/[^/]*$/, ''))
    testResults.push(connectivityResult)

    setResults(testResults)
    setTesting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Info className="h-5 w-5" />
          <span>Connection Test Debug</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This tool tests various connection scenarios to help diagnose backend connectivity issues.
          </p>
          <div className="text-xs space-y-1">
            <div><strong>Backend URL:</strong> {workerUrl}</div>
            <div><strong>Project ID:</strong> {projectId}</div>
            <div><strong>Anon Key Length:</strong> {publicAnonKey?.length || 0} characters</div>
          </div>
        </div>

        <Button 
          onClick={runConnectionTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Connection Test
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            
            {results.map((result, index) => (
              <Alert key={index} className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center space-x-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{result.method} {result.endpoint}</span>
                      {result.status && (
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {result.responseTime}ms
                      </Badge>
                    </div>
                    
                    {result.error && (
                      <AlertDescription className="text-red-700 mt-1">
                        Error: {result.error}
                      </AlertDescription>
                    )}
                    
                    {result.response && result.success && (
                      <div className="text-xs mt-1 text-gray-600">
                        Response: {typeof result.response === 'string' 
                          ? result.response.substring(0, 100) + (result.response.length > 100 ? '...' : '')
                          : JSON.stringify(result.response).substring(0, 100)
                        }
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-900">Diagnosis:</h5>
              <div className="text-sm text-blue-800 mt-1">
                {(() => {
                  const healthSuccess = results.find(r => r.endpoint.includes('/health'))?.success
                  const testSuccess = results.some(r => r.endpoint.includes('/test') && r.success)
                  const anySuccess = results.some(r => r.success)

                  if (healthSuccess) {
                    return '✅ Backend is healthy and accessible. Connection should work properly.'
                  } else if (testSuccess) {
                    return '⚠️ Health endpoint failed but test endpoint works. This is normal for some configurations.'
                  } else if (anySuccess) {
                    return '⚠️ Some connectivity detected but API endpoints may not be configured correctly.'
                  } else {
                    return '❌ No successful connections. Backend may not be deployed or URL is incorrect.'
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}