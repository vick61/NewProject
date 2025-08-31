#!/bin/bash

# 🚀 Cloudflare Pages + Workers Deploy Script for Schemes Management Platform

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

print_header() {
    echo ""
    print_color $BLUE "============================================="
    print_color $BLUE "${BOLD}$1"
    print_color $BLUE "============================================="
    echo ""
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

print_header "Cloudflare Deployment - Schemes Management Platform"

# Check if required tools are installed
print_step "Checking prerequisites..."

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed. Please install Node.js and npm."
    exit 1
fi

if ! command -v npx &> /dev/null; then
    print_error "npx is required but not installed. Please install Node.js."
    exit 1
fi

print_success "Prerequisites check passed"

# Install Wrangler if not available
if ! command -v wrangler &> /dev/null; then
    print_step "Installing Wrangler CLI..."
    npm install -g wrangler
    print_success "Wrangler CLI installed"
else
    print_success "Wrangler CLI already available"
fi

# Check authentication
print_step "Checking Cloudflare authentication..."

if ! wrangler whoami &> /dev/null; then
    print_color $YELLOW "⚠️  Not authenticated with Cloudflare"
    echo ""
    print_color $BLUE "Please login to Cloudflare:"
    echo "1. Run: wrangler login"
    echo "2. Follow the browser authentication flow"
    echo "3. Come back and run this script again"
    echo ""
    read -p "Do you want to login now? (y/N): " login_now
    
    if [[ $login_now == [Yy]* ]]; then
        wrangler login
        print_success "Cloudflare authentication completed"
    else
        print_error "Cloudflare authentication required. Please run 'wrangler login' first."
        exit 1
    fi
else
    CURRENT_USER=$(wrangler whoami 2>/dev/null | grep "You are logged in" || echo "Unknown user")
    print_success "Already authenticated with Cloudflare ($CURRENT_USER)"
fi

# Environment setup
print_step "Setting up environment variables..."

# Check if environment file exists
if [ ! -f ".env.cloudflare" ]; then
    print_color $YELLOW "⚠️  .env.cloudflare not found. Creating from template..."
    
    echo "# Cloudflare Environment Variables" > .env.cloudflare
    echo "VITE_SUPABASE_URL=your_supabase_url_here" >> .env.cloudflare
    echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here" >> .env.cloudflare
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" >> .env.cloudflare
    echo "CLOUDFLARE_WORKER_URL=https://schemes-management-worker.your-subdomain.workers.dev" >> .env.cloudflare
    
    print_color $RED "❌ Please edit .env.cloudflare with your actual values:"
    echo "1. VITE_SUPABASE_URL - Your Supabase project URL"
    echo "2. VITE_SUPABASE_ANON_KEY - Your Supabase anon key"
    echo "3. SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key"
    echo "4. CLOUDFLARE_WORKER_URL - Your worker URL (will be created)"
    echo ""
    echo "After editing .env.cloudflare, run this script again."
    exit 1
fi

# Load environment variables
source .env.cloudflare

if [ "$VITE_SUPABASE_URL" = "your_supabase_url_here" ]; then
    print_error "Please update .env.cloudflare with your actual Supabase credentials"
    exit 1
fi

print_success "Environment variables loaded"

# Install dependencies
print_step "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Build the frontend
print_step "Building React frontend..."
npm run build
print_success "Frontend build completed"

# Deploy strategy selection
echo ""
print_color $BLUE "🎯 Choose your deployment strategy:"
echo "1. Full deployment (Worker + Pages) - RECOMMENDED"
echo "2. Worker only (backend API)"
echo "3. Pages only (frontend)"
echo "4. Setup only (create KV namespace and configure)"
echo ""

read -p "Select option (1-4): " deploy_choice

case $deploy_choice in
    1)
        DEPLOY_WORKER=true
        DEPLOY_PAGES=true
        ;;
    2)
        DEPLOY_WORKER=true
        DEPLOY_PAGES=false
        ;;
    3)
        DEPLOY_WORKER=false
        DEPLOY_PAGES=true
        ;;
    4)
        DEPLOY_WORKER=false
        DEPLOY_PAGES=false
        ;;
    *)
        print_color $YELLOW "Invalid choice. Defaulting to full deployment."
        DEPLOY_WORKER=true
        DEPLOY_PAGES=true
        ;;
esac

# Create KV namespace if needed
if [ "$DEPLOY_WORKER" = true ]; then
    print_step "Setting up KV namespace..."
    
    # Check if KV namespace exists
    KV_ID=$(wrangler kv:namespace list | grep "schemes-management-kv" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -z "$KV_ID" ]; then
        print_color $YELLOW "Creating KV namespace..."
        wrangler kv:namespace create "schemes-management-kv"
        KV_ID=$(wrangler kv:namespace list | grep "schemes-management-kv" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        
        print_color $YELLOW "⚠️  Please update wrangler.toml with KV namespace ID: $KV_ID"
        print_color $YELLOW "Replace 'YOUR_KV_NAMESPACE_ID' with: $KV_ID"
        echo ""
        read -p "Press Enter after updating wrangler.toml..."
        
        print_success "KV namespace created: $KV_ID"
    else
        print_success "KV namespace already exists: $KV_ID"
    fi
    
    # Set Worker secrets
    print_step "Setting Worker secrets..."
    
    echo "Setting Supabase URL..."
    echo "$VITE_SUPABASE_URL" | wrangler secret put SUPABASE_URL --env production
    
    echo "Setting Supabase Service Role Key..."
    echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
    
    echo "Setting Supabase Anon Key..."
    echo "$VITE_SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env production
    
    print_success "Worker secrets configured"
fi

# Build and deploy Worker
if [ "$DEPLOY_WORKER" = true ]; then
    print_step "Building and deploying Cloudflare Worker..."
    
    # Build the worker
    npm run build:worker
    
    # Deploy worker
    wrangler deploy --env production
    
    WORKER_URL=$(wrangler whoami 2>/dev/null | grep subdomain | cut -d' ' -f2 || echo "your-subdomain")
    print_success "Worker deployed to: https://schemes-management-worker.$WORKER_URL.workers.dev"
    
    # Update environment file with actual worker URL
    sed -i.bak "s|CLOUDFLARE_WORKER_URL=.*|CLOUDFLARE_WORKER_URL=https://schemes-management-worker.$WORKER_URL.workers.dev|" .env.cloudflare
fi

# Deploy Pages
if [ "$DEPLOY_PAGES" = true ]; then
    print_step "Deploying to Cloudflare Pages..."
    
    # Check if Pages project exists
    if ! wrangler pages project list | grep -q "schemes-management"; then
        print_color $YELLOW "Creating Cloudflare Pages project..."
        wrangler pages project create schemes-management --production-branch main
    fi
    
    # Deploy to Pages
    wrangler pages deploy dist --project-name schemes-management
    
    print_success "Pages deployed successfully"
fi

# Final status and instructions
print_header "Deployment Completed! 🎉"

if [ "$DEPLOY_WORKER" = true ]; then
    WORKER_URL=$(wrangler whoami 2>/dev/null | grep subdomain | cut -d' ' -f2 || echo "your-subdomain")
    print_color $GREEN "🔧 Worker API: https://schemes-management-worker.$WORKER_URL.workers.dev"
fi

if [ "$DEPLOY_PAGES" = true ]; then
    print_color $GREEN "🌐 Frontend: https://schemes-management.pages.dev"
fi

print_color $BLUE "📋 What to do next:"
echo "1. Test your deployed application"
echo "2. Update your frontend code to use the Worker URL"
echo "3. Set up custom domain (optional):"
echo "   - Add CNAME: api.yourdomain.com -> schemes-management-worker.your-subdomain.workers.dev"
echo "   - Add CNAME: app.yourdomain.com -> schemes-management.pages.dev"
echo "4. Configure environment variables in Cloudflare Pages dashboard"

print_color $BLUE "🔗 Useful commands:"
echo "• View Worker logs: wrangler tail schemes-management-worker"
echo "• Update Worker: npm run cf:worker:deploy"
echo "• Redeploy Pages: npm run cf:pages:deploy"
echo "• Local development: wrangler dev"

print_color $GREEN "✨ Your Schemes Management Platform is now live on Cloudflare!"