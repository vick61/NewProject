#!/bin/bash

# 🔧 Quick Setup for Figma Make Environment
# This configures the app to work in the current environment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_color() {
    echo -e "${1}${2}${NC}"
}

print_color $BLUE "🔧 Configuring app for current environment..."

# Create basic environment file for Figma Make
cat > ".env.local" << EOF
# Local Environment for Figma Make
VITE_SUPABASE_URL=https://baabzbunxucblvtojbfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MTU0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4

# Backend configuration - defaults to Supabase Edge Functions
VITE_CLOUDFLARE_WORKER_URL=https://baabzbunxucblvtojbfj.supabase.co/functions/v1/make-server-ce8ebc43
EOF

# Update the info file to work properly
cat > "utils/supabase/info.tsx" << EOF
/* CONFIGURED FOR CURRENT ENVIRONMENT */

export const projectId = "baabzbunxucblvtojbfj"
export const projectUrl = "https://baabzbunxucblvtojbfj.supabase.co"
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MTU0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4"

// Get the worker URL from environment variables with fallbacks
const getWorkerUrl = () => {
  // Check if we're in development mode and use Supabase Edge Functions
  if (typeof import.meta !== 'undefined') {
    // Try environment variable first
    if (import.meta.env?.VITE_CLOUDFLARE_WORKER_URL && 
        !import.meta.env.VITE_CLOUDFLARE_WORKER_URL.includes('your-subdomain')) {
      return import.meta.env.VITE_CLOUDFLARE_WORKER_URL
    }
  }
  
  // Default to Supabase Edge Functions for development
  return \`https://\${projectId}.supabase.co/functions/v1/make-server-ce8ebc43\`
}

// Backend URL - dynamically determined
export const workerUrl = getWorkerUrl()
export const apiBaseUrl = workerUrl

// Legacy Supabase Edge Function URL (for reference)
export const supabaseEdgeUrl = \`https://\${projectId}.supabase.co/functions/v1/make-server-ce8ebc43\`
EOF

print_color $GREEN "✅ Environment configured successfully!"
print_color $YELLOW "📋 Configuration details:"
echo "• Backend: Supabase Edge Functions (development mode)"
echo "• Database: Supabase PostgreSQL"
echo "• Auth: Supabase Auth"
echo "• Frontend: React with Vite"

print_color $BLUE "🚀 The app is now configured to work in the current environment."
print_color $BLUE "For production deployment to Cloudflare, run: npm run deploy-now"

echo ""
print_color $GREEN "🎉 Setup complete! The app should now connect properly."