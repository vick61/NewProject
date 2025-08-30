#!/bin/bash

# 🔍 Cloudflare Deployment Status Check

set -e

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

print_header "Cloudflare Deployment Status Check"

# Check if authenticated
print_step "Checking Cloudflare authentication..."
if wrangler whoami &> /dev/null; then
    USER_INFO=$(wrangler whoami 2>/dev/null || echo "Unknown user")
    print_success "Authenticated: $USER_INFO"
else
    print_error "Not authenticated with Cloudflare"
    echo "Run: wrangler login"
    exit 1
fi

# Check Worker deployment
print_step "Checking Worker deployment..."
if wrangler deployments list schemes-management-worker &> /dev/null; then
    WORKER_STATUS=$(wrangler deployments list schemes-management-worker --format json | head -1 || echo "No deployments")
    print_success "Worker deployed"
    
    # Get Worker URL
    SUBDOMAIN=$(wrangler whoami 2>/dev/null | grep "subdomain" | awk '{print $2}' || echo "unknown")
    WORKER_URL="https://schemes-management-worker.$SUBDOMAIN.workers.dev"
    echo "   URL: $WORKER_URL"
    
    # Test Worker health
    print_step "Testing Worker health..."
    if curl -s "$WORKER_URL/health" > /dev/null 2>&1; then
        print_success "Worker is responding"
    else
        print_error "Worker is not responding"
    fi
else
    print_error "Worker not deployed"
fi

# Check Pages deployment
print_step "Checking Pages deployment..."
if wrangler pages project list | grep -q "schemes-management"; then
    print_success "Pages project exists"
    
    PAGES_URL="https://schemes-management.pages.dev"
    echo "   URL: $PAGES_URL"
    
    # Test Pages health
    print_step "Testing Pages accessibility..."
    if curl -s "$PAGES_URL" > /dev/null 2>&1; then
        print_success "Pages site is accessible"
    else
        print_error "Pages site is not accessible"
    fi
else
    print_error "Pages project not found"
fi

# Check KV namespace
print_step "Checking KV namespace..."
if wrangler kv:namespace list | grep -q "schemes-management-kv"; then
    KV_ID=$(wrangler kv:namespace list | grep "schemes-management-kv" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_success "KV namespace exists: $KV_ID"
else
    print_error "KV namespace not found"
fi

# Check secrets
print_step "Checking Worker secrets..."
if wrangler secret list --env production | grep -q "SUPABASE_URL"; then
    print_success "Secrets are configured"
else
    print_error "Secrets not configured"
fi

echo ""
print_color $BLUE "📊 Summary:"
echo "• Worker: https://schemes-management-worker.$SUBDOMAIN.workers.dev"
echo "• Pages:  https://schemes-management.pages.dev"
echo "• KV:     $KV_ID"
echo ""
print_color $BLUE "🛠️  Common commands:"
echo "• View logs:     wrangler tail schemes-management-worker"
echo "• Redeploy:      npm run deploy-now"  
echo "• Local dev:     wrangler dev"
echo "• Pages deploy:  wrangler pages deploy dist --project-name schemes-management"