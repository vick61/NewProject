#!/bin/bash

# 🔍 Cloudflare Deployment Status Checker

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_color() {
    echo -e "${1}${2}${NC}"
}

print_color $BLUE "🔍 Cloudflare Deployment Status Check"
print_color $BLUE "======================================"

# Check Node.js and npm
print_color $YELLOW "📦 Checking Node.js environment..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_color $GREEN "✅ Node.js installed: $NODE_VERSION"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_color $GREEN "✅ npm installed: $NPM_VERSION"
    else
        print_color $RED "❌ npm not found"
    fi
else
    print_color $RED "❌ Node.js not installed"
fi

echo ""

# Check Wrangler CLI
print_color $YELLOW "☁️ Checking Cloudflare Wrangler CLI..."

if command -v wrangler &> /dev/null; then
    WRANGLER_VERSION=$(wrangler --version 2>/dev/null || echo "unknown")
    print_color $GREEN "✅ Wrangler CLI installed: $WRANGLER_VERSION"
    
    # Check authentication
    if wrangler whoami &> /dev/null; then
        USER_INFO=$(wrangler whoami 2>/dev/null | head -1 || echo "Unknown user")
        print_color $GREEN "✅ Authenticated with Cloudflare: $USER_INFO"
    else
        print_color $YELLOW "⚠️  Not authenticated with Cloudflare"
        echo "   Run: wrangler login"
    fi
else
    print_color $RED "❌ Wrangler CLI not installed"
    echo "   Install: npm install -g wrangler"
fi

echo ""

# Check if scripts are executable
print_color $YELLOW "🔧 Checking deployment scripts..."

scripts=("deploy-cloudflare.sh" "cloudflare-setup.sh")

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            print_color $GREEN "✅ $script is executable"
        else
            print_color $YELLOW "⚠️  $script exists but not executable"
            echo "   Run: chmod +x $script"
        fi
    else
        print_color $RED "❌ $script not found"
    fi
done

echo ""

# Check environment configuration
print_color $YELLOW "🔧 Checking environment configuration..."

if [ -f ".env.cloudflare" ]; then
    print_color $GREEN "✅ .env.cloudflare exists"
    
    source .env.cloudflare
    
    if [ "$VITE_SUPABASE_URL" != "your_supabase_url_here" ] && [ ! -z "$VITE_SUPABASE_URL" ]; then
        print_color $GREEN "✅ Supabase URL configured"
    else
        print_color $RED "❌ Supabase URL not configured"
    fi
    
    if [ "$VITE_SUPABASE_ANON_KEY" != "your_supabase_anon_key_here" ] && [ ! -z "$VITE_SUPABASE_ANON_KEY" ]; then
        print_color $GREEN "✅ Supabase Anon Key configured"
    else
        print_color $RED "❌ Supabase Anon Key not configured"
    fi
    
    if [ "$SUPABASE_SERVICE_ROLE_KEY" != "your_service_role_key_here" ] && [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        print_color $GREEN "✅ Supabase Service Role Key configured"
    else
        print_color $RED "❌ Supabase Service Role Key not configured"
    fi
else
    print_color $RED "❌ .env.cloudflare not found"
    echo "   Run: npm run cf:setup"
fi

echo ""

# Check essential files
print_color $YELLOW "📁 Checking essential files..."

essential_files=("wrangler.toml" "pages.toml" "package.json" "worker/index.ts")

for file in "${essential_files[@]}"; do
    if [ -f "$file" ]; then
        print_color $GREEN "✅ $file exists"
    else
        print_color $RED "❌ $file missing"
    fi
done

echo ""

# Check if dependencies are installed
print_color $YELLOW "📦 Checking dependencies..."

if [ -d "node_modules" ]; then
    print_color $GREEN "✅ Node modules installed"
    
    # Check for specific Cloudflare dependencies
    if [ -d "node_modules/wrangler" ] || npm list wrangler &> /dev/null; then
        print_color $GREEN "✅ Wrangler dependency available"
    else
        print_color $YELLOW "⚠️  Wrangler dependency not found locally"
        echo "   Install: npm install"
    fi
    
    if [ -d "node_modules/hono" ] || npm list hono &> /dev/null; then
        print_color $GREEN "✅ Hono framework available"
    else
        print_color $YELLOW "⚠️  Hono dependency not found"
        echo "   Install: npm install"
    fi
else
    print_color $RED "❌ Node modules not installed"
    echo "   Run: npm install"
fi

echo ""

# Summary and recommendations
print_color $BLUE "📋 Deployment Readiness Summary"
print_color $BLUE "==============================="

if command -v wrangler &> /dev/null && wrangler whoami &> /dev/null && [ -f ".env.cloudflare" ]; then
    print_color $GREEN "🎉 Ready for Cloudflare deployment!"
    echo ""
    print_color $BLUE "🚀 Quick deployment commands:"
    echo "• Full setup + deploy: npm run deploy-now"
    echo "• Setup only: npm run cf:setup"
    echo "• Deploy only: npm run deploy-cloudflare"
    echo "• Worker only: npm run cf:worker:deploy"
    echo "• Pages only: npm run cf:pages:deploy"
else
    print_color $YELLOW "⚠️  Some setup required before deployment"
    echo ""
    print_color $BLUE "🔧 Required actions:"
    
    if ! command -v wrangler &> /dev/null; then
        echo "1. Install Wrangler: npm install -g wrangler"
    fi
    
    if ! wrangler whoami &> /dev/null 2>&1; then
        echo "2. Login to Cloudflare: wrangler login"
    fi
    
    if [ ! -f ".env.cloudflare" ]; then
        echo "3. Setup environment: npm run cf:setup"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "4. Install dependencies: npm install"
    fi
fi

echo ""
print_color $BLUE "📖 More info: README-Cloudflare.md"
print_color $GREEN "✨ Your Schemes Management Platform is almost ready for the edge!"