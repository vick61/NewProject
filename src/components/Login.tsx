import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Separator } from './ui/separator'
import { Mail, Phone, Eye, EyeOff, LogIn, Shield, Loader2 } from 'lucide-react'
import { authService } from './AuthService'
import { toast } from 'sonner@2.0.3'

interface LoginProps {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [activeTab, setActiveTab] = useState('email')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [emailConfirmationError, setEmailConfirmationError] = useState(false)
  
  // Email/Password form state
  const [isSignUp, setIsSignUp] = useState(false)
  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  
  // Phone OTP form state
  const [phoneForm, setPhoneForm] = useState({
    phone: '',
    otp: '',
    otpSent: false
  })

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isSignUp) {
        // Validate form
        if (emailForm.password !== emailForm.confirmPassword) {
          setError('Passwords do not match')
          return
        }
        
        if (emailForm.password.length < 6) {
          setError('Password must be at least 6 characters long')
          return
        }

        // Try server-side signup first
        const result = await authService.signUpWithServerAutoConfirm(
          emailForm.email,
          emailForm.password,
          emailForm.name
        )

        if (result.error) {
          console.log('Server signup failed, trying client-side fallback:', result.error)
          
          // If server signup fails, fall back to client-side signup
          // This will require email confirmation but at least allows account creation
          try {
            const { data, error } = await authService.signUpWithEmail(
              emailForm.email,
              emailForm.password,
              emailForm.name
            )

            if (error) {
              setError(`Account creation failed: ${result.error}. Fallback method also failed: ${error}`)
              return
            }

            // Client-side signup successful, but requires email confirmation
            toast.success('Account created! Please check your email to confirm your account before signing in.')
            setIsSignUp(false)
            setEmailForm({ email: '', password: '', confirmPassword: '', name: '' })
            return
          } catch (fallbackError) {
            console.error('Client-side signup fallback failed:', fallbackError)
            setError(`Account creation failed: ${result.error}`)
            return
          }
        }

        // Success - user account created and automatically signed in
        toast.success(result.message || 'Account created successfully! You are now signed in.')
        
        // Clear the form
        setEmailForm({ email: '', password: '', confirmPassword: '', name: '' })
        
        // User is automatically signed in, so trigger login success
        onLoginSuccess()
      } else {
        const { data, error } = await authService.signInWithEmail(
          emailForm.email,
          emailForm.password
        )

        if (error) {
          // Handle specific email confirmation error
          if (error.toLowerCase().includes('email not confirmed')) {
            setError('This account requires email confirmation. You can resend the confirmation email or create a new account with the improved signup system.')
            setEmailConfirmationError(true)
          } else if (error.toLowerCase().includes('invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials and try again. If you just created an account, try using the new signup system above.')
          } else {
            setError(error)
            setEmailConfirmationError(false)
          }
          return
        }

        setEmailConfirmationError(false)

        toast.success('Login successful!')
        onLoginSuccess()
      }
    } catch (error) {
      console.error('Email auth error:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOTP = async () => {
    setError('')
    setIsLoading(true)

    try {
      // Format phone number (add + if not present)
      let formattedPhone = phoneForm.phone.trim()
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+${formattedPhone}`
      }

      const { data, error } = await authService.sendPhoneOTP(formattedPhone)

      if (error) {
        // Handle specific SMS provider errors
        if (error.toLowerCase().includes('unsupported phone provider') || 
            error.toLowerCase().includes('sms provider') ||
            error.toLowerCase().includes('phone provider not configured') ||
            error.toLowerCase().includes('sms authentication is not set up')) {
          setError(`SMS authentication is not configured for this application. Please use email authentication instead or contact your administrator to set up an SMS provider.`)
          // Automatically switch to email tab after a short delay
          setTimeout(() => {
            setActiveTab('email')
            setError('')
          }, 3000)
        } else if (error.toLowerCase().includes('invalid phone number') ||
                   error.toLowerCase().includes('phone number')) {
          setError('Please enter a valid phone number with country code (e.g., +1234567890, +91987654321)')
        } else if (error.toLowerCase().includes('rate limit') ||
                   error.toLowerCase().includes('too many')) {
          setError('Too many attempts. Please wait a few minutes before trying again.')
        } else {
          setError(error)
        }
        return
      }

      setPhoneForm(prev => ({ ...prev, otpSent: true, phone: formattedPhone }))
      toast.success('OTP sent to your phone number!')
    } catch (error) {
      console.error('Send OTP error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP'
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('unsupported phone provider') || 
          errorMessage.toLowerCase().includes('sms provider') ||
          errorMessage.toLowerCase().includes('sms authentication is not set up')) {
        setError('SMS authentication is not configured for this application. Please use email authentication instead.')
        // Automatically switch to email tab after a short delay
        setTimeout(() => {
          setActiveTab('email')
          setError('')
        }, 3000)
      } else if (errorMessage.toLowerCase().includes('network')) {
        setError('Network error occurred. Please check your connection and try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error } = await authService.verifyPhoneOTP(
        phoneForm.phone,
        phoneForm.otp
      )

      if (error) {
        setError(error)
        return
      }

      toast.success('Phone verification successful!')
      onLoginSuccess()
    } catch (error) {
      console.error('Verify OTP error:', error)
      setError(error instanceof Error ? error.message : 'OTP verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPhoneForm = () => {
    setPhoneForm({ phone: '', otp: '', otpSent: false })
    setError('')
  }

  const handleResendConfirmation = async () => {
    if (!emailForm.email) {
      setError('Please enter your email address first')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error } = await authService.resendConfirmationEmail(emailForm.email)
      
      if (error) {
        setError(error)
        return
      }

      toast.success('Confirmation email sent! Please check your inbox.')
      setEmailConfirmationError(false)
    } catch (error) {
      console.error('Resend confirmation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to resend confirmation email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Schemes Management Platform</CardTitle>
          <p className="text-muted-foreground">
            Sign in to access your distribution schemes
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
                {emailConfirmationError && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={isLoading || !emailForm.email}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Confirmation Email
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Phone</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-6">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={emailForm.name}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, name: e.target.value }))}
                      required={isSignUp}
                      disabled={isLoading}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={emailForm.confirmPassword}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required={isSignUp}
                      disabled={isLoading}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>

              <Separator />

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError('')
                    setEmailConfirmationError(false)
                    setEmailForm({ email: '', password: '', confirmPassword: '', name: '' })
                  }}
                  disabled={isLoading}
                  className="text-sm"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="phone" className="space-y-4 mt-6">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Notice:</strong> Phone authentication requires SMS provider setup in Supabase Dashboard.
                  <br />If you see errors, please use email authentication or contact your administrator.
                </AlertDescription>
              </Alert>
              
              {!phoneForm.otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number (e.g., +1234567890)"
                      value={phoneForm.phone}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code. Examples: +1234567890 (US), +919876543210 (India), +447890123456 (UK)
                    </p>
                  </div>
                  
                  <Button onClick={handleSendOTP} className="w-full" disabled={isLoading || !phoneForm.phone.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Phone className="h-4 w-4 mr-2" />
                    )}
                    Send OTP
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={() => setActiveTab('email')}
                      disabled={isLoading}
                      className="text-sm text-blue-600"
                    >
                      Use Email Authentication Instead
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={phoneForm.otp}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, otp: e.target.value }))}
                      required
                      disabled={isLoading}
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      OTP sent to {phoneForm.phone}
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading || phoneForm.otp.length !== 6}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Verify & Sign In
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPhoneForm}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Use Different Number
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}