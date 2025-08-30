import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { authService } from './AuthService'
import { projectId, publicAnonKey } from '../utils/supabase/info'

export default function AuthTest() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')

  const addResult = (test: string, success: boolean, data: any) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      data,
      timestamp: new Date().toISOString()
    }])
  }

  const testAuthHealth = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/auth/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      addResult('Auth Health Check', response.ok, { status: response.status, result })
    } catch (error) {
      addResult('Auth Health Check', false, { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const testServerSignup = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ce8ebc43/auth/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: `test_${Date.now()}@example.com`,
          password: 'testpassword123',
          name: 'Test User'
        })
      })
      
      const contentType = response.headers.get('content-type')
      let result
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        result = await response.text()
      }
      
      addResult('Server Signup Test', response.ok, { 
        status: response.status, 
        contentType,
        result: typeof result === 'string' ? result.substring(0, 500) : result
      })
    } catch (error) {
      addResult('Server Signup Test', false, { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const testAuthServiceSignup = async () => {
    try {
      const result = await authService.signUpWithServerAutoConfirm(
        `test_${Date.now()}@example.com`,
        'testpassword123',
        'Test User'
      )
      
      addResult('AuthService Signup Test', !result.error, result)
    } catch (error) {
      addResult('AuthService Signup Test', false, { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const runAllTests = async () => {
    setIsLoading(true)
    setTestResults([])
    
    await testAuthHealth()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testServerSignup()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await testAuthServiceSignup()
    
    setIsLoading(false)
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Test Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Test Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={runAllTests} disabled={isLoading}>
              {isLoading ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button variant="outline" onClick={testAuthHealth} disabled={isLoading}>
              Test Health
            </Button>
            <Button variant="outline" onClick={testServerSignup} disabled={isLoading}>
              Test Signup
            </Button>
          </div>
          
          <div className="text-sm space-y-2">
            <div><strong>Project ID:</strong> {projectId}</div>
            <div><strong>API Key:</strong> {publicAnonKey.substring(0, 20)}...</div>
            <div><strong>Signup URL:</strong> https://{projectId}.supabase.co/functions/v1/make-server-ce8ebc43/auth/signup</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {testResults.map((result, index) => (
          <Alert key={index} className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <strong>{result.test}</strong>
                  <span className={result.success ? "text-green-600" : "text-red-600"}>
                    {result.success ? '✅ SUCCESS' : '❌ FAILED'}
                  </span>
                </div>
                <pre className="text-xs overflow-auto bg-white p-2 rounded border">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
                <div className="text-xs text-gray-500">{result.timestamp}</div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  )
}