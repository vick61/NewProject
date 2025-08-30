#!/bin/bash

# 🚀 Quick Cloudflare Deploy Script - Schemes Management Platform
# This is a simplified version for quick deployments

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

print_color() {
    echo -e "${1}${2}${NC}"
}

print_step() {
    print_color $YELLOW "📋 $1"
}

print_success() {
    print_color $GREEN "✅ $1"
}

print_error() {
    print_color $RED "❌ $1"
}

echo ""
print_color $BLUE "${BOLD}🚀 Quick Cloudflare Deployment"
echo ""

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_step "Installing Wrangler CLI..."
    npm install -g wrangler
    print_success "Wrangler CLI installed"
fi

# Check authentication
print_step "Checking authentication..."
if ! wrangler whoami &> /dev/null; then
    print_color $RED "❌ Not authenticated with Cloudflare."
    echo ""
    print_color $BLUE "Please run: ${BOLD}wrangler login${NC}"
    echo "Then run this script again."
    exit 1
fi
print_success "Authenticated with Cloudflare"

# Check for .env.cloudflare
if [ ! -f ".env.cloudflare" ]; then
    print_color $YELLOW "⚠️  Creating .env.cloudflare template..."
    cat > .env.cloudflare << EOF
# Supabase Configuration
VITE_SUPABASE_URL=https://baabzbunxucblvtojbfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MTU0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Cloudflare Configuration (will be updated after deployment)
VITE_CLOUDFLARE_WORKER_URL=https://schemes-management-worker.your-subdomain.workers.dev
EOF
    
    print_color $RED "❌ Please edit .env.cloudflare and add your SUPABASE_SERVICE_ROLE_KEY"
    echo "You can find it in your Supabase dashboard > Settings > API"
    echo ""
    read -p "Press Enter after updating .env.cloudflare..."
fi

# Load environment variables
if [ -f ".env.cloudflare" ]; then
    source .env.cloudflare
fi

if [ "$SUPABASE_SERVICE_ROLE_KEY" = "your_service_role_key_here" ]; then
    print_error "Please update SUPABASE_SERVICE_ROLE_KEY in .env.cloudflare"
    exit 1
fi

print_success "Environment variables loaded"

# Install dependencies and build
print_step "Installing dependencies and building..."
npm install
npm run build
print_success "Build completed"

# Create or check KV namespace
print_step "Setting up KV namespace..."
KV_ID=$(wrangler kv:namespace list 2>/dev/null | grep "schemes-management-kv" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$KV_ID" ]; then
    print_color $YELLOW "Creating KV namespace..."
    wrangler kv:namespace create "schemes-management-kv"
    KV_ID=$(wrangler kv:namespace list | grep "schemes-management-kv" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    print_color $YELLOW "⚠️  Please update wrangler.toml"
    echo "Replace 'YOUR_KV_NAMESPACE_ID' with: $KV_ID"
    echo ""
    read -p "Press Enter after updating wrangler.toml..."
    
    print_success "KV namespace created: $KV_ID"
else
    print_success "KV namespace exists: $KV_ID"
fi

# Set Worker secrets
print_step "Configuring Worker secrets..."
echo "$VITE_SUPABASE_URL" | wrangler secret put SUPABASE_URL --env production
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production  
echo "$VITE_SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env production
print_success "Secrets configured"

# Build and deploy Worker
print_step "Deploying Cloudflare Worker..."
npm run build:worker
wrangler deploy --env production
print_success "Worker deployed"

# Deploy Pages
print_step "Deploying to Cloudflare Pages..."

# Create Pages project if it doesn't exist
if ! wrangler pages project list 2>/dev/null | grep -q "schemes-management"; then
    print_color $YELLOW "Creating Pages project..."
    wrangler pages project create schemes-management --production-branch main
fi

wrangler pages deploy dist --project-name schemes-management
print_success "Pages deployed"

# Get deployment URLs
WORKER_SUBDOMAIN=$(wrangler whoami 2>/dev/null | grep "subdomain" | awk '{print $2}' || echo "your-subdomain")
WORKER_URL="https://schemes-management-worker.$WORKER_SUBDOMAIN.workers.dev"
PAGES_URL="https://schemes-management.pages.dev"

echo ""
print_color $GREEN "${BOLD}🎉 Deployment Complete!"
echo ""
print_color $BLUE "🔗 Your URLs:"
echo "   Frontend: $PAGES_URL"  
echo "   Backend:  $WORKER_URL"
echo ""
print_color $BLUE "📋 Next steps:"
echo "1. Test your application at $PAGES_URL"
echo "2. Update .env.cloudflare with the Worker URL: $WORKER_URL"
echo "3. Check the Debug tab for connection status"
echo ""
print_color $BLUE "🛠️  Useful commands:"
echo "   View logs: wrangler tail schemes-management-worker"
echo "   Redeploy:  npm run deploy-now"
echo ""
print_success "Your Schemes Management Platform is now live! 🚀"