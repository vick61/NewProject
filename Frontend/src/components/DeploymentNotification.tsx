import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { AlertCircle, ExternalLink, Rocket, CheckCircle2 } from 'lucide-react'
import { workerUrl } from '../utils/supabase/info'

export default function DeploymentNotification() {
  const backendUrl = workerUrl
  const isUsingCloudflare = backendUrl.includes('workers.dev') || backendUrl.includes('pages.dev')
  const isUsingSupabase = backendUrl.includes('supabase.co')
  const isPlaceholder = backendUrl.includes('your-subdomain') || backendUrl.includes('your_')

  // Show different notifications based on configuration
  if (isUsingSupabase && !isPlaceholder) {
    // Currently using Supabase - show Cloudflare upgrade option
    return (
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="container mx-auto px-4 py-2">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <strong>“Want to test speed? Try creating a scheme today—it’ll take seconds, not minutes!”!
                  <div className="text-xs opacity-75 mt-1">
                    Current: {backendUrl}
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText('npm run deploy-now')
                    alert('Deployment command copied! Run "npm run deploy-now" in your terminal to upgrade to Cloudflare.')
                  }}
                  variant="outline"
                  size="sm"
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Rocket className="h-4 w-4 mr-1" />
                  Upgrade to Cloudflare
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isUsingCloudflare && !isPlaceholder) {
    // Already using Cloudflare - show success
    return (
      <div className="bg-green-50 border-b border-green-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            <span>🚀 Powered by Cloudflare Workers</span>
            <div className="ml-4 text-xs opacity-75">
              Edge computing for optimal performance
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show setup notification for placeholder URLs
  if (isPlaceholder) {
    return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="container mx-auto px-4 py-3">
        <Alert className="border-blue-200 bg-blue-50">
          <Rocket className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <strong>🚀 Ready to Deploy to Cloudflare!</strong>
                <div className="text-sm mt-2 space-y-1">
                  <div>Your app is configured to use Cloudflare Workers + Pages for better performance.</div>
                  <div className="text-xs opacity-75">
                    Current backend: {backendUrl}
                  </div>
                  <div className="text-xs opacity-75">
                    Run the deployment command to get your app live on Cloudflare's edge network!
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={async () => {
                    try {
                      // Automatically apply the configuration fix
                      const response = await fetch('/setup-for-figma.sh')
                      if (response.ok) {
                        // If we can access the script, show copy command
                        navigator.clipboard.writeText('npm run setup-local')
                        alert('Setup command copied! Run "npm run setup-local" in your terminal to configure for current environment.')
                      } else {
                        // Fallback - just copy the command
                        navigator.clipboard.writeText('npm run setup-local')
                        alert('Setup command copied! Run "npm run setup-local" to configure for current environment.')
                      }
                    } catch (error) {
                      // Fallback - just copy the command
                      navigator.clipboard.writeText('npm run setup-local')
                      alert('Setup command copied! Run "npm run setup-local" to configure for current environment.')
                    }
                  }}
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Quick Fix
                </Button>
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText('npm run deploy-now')
                    alert('Deployment command copied! Run "npm run deploy-now" for full Cloudflare deployment.')
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy to Cloudflare
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
    )
  }

  // Don't show notification for properly configured environments
  return null
}
