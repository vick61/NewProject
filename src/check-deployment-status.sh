#!/bin/bash

# 🔍 Deployment Status Checker for Schemes Management Platform

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

print_color $BLUE "🔍 Deployment Status Check"
print_color $BLUE "=========================="

# Check if scripts are executable
print_color $YELLOW "📋 Checking script permissions..."

if [ -x "deploy-gcp.sh" ]; then
    print_color $GREEN "✅ deploy-gcp.sh is executable"
else
    print_color $RED "❌ deploy-gcp.sh is not executable"
    echo "   Run: chmod +x deploy-gcp.sh"
fi

if [ -x "environment-setup.sh" ]; then
    print_color $GREEN "✅ environment-setup.sh is executable"
else
    print_color $RED "❌ environment-setup.sh is not executable"
    echo "   Run: chmod +x environment-setup.sh"
fi

if [ -x "deploy-now.sh" ]; then
    print_color $GREEN "✅ deploy-now.sh is executable"
else
    print_color $RED "❌ deploy-now.sh is not executable"
    echo "   Run: chmod +x deploy-now.sh"
fi

echo ""

# Check if environment is configured
print_color $YELLOW "🔧 Checking environment configuration..."

if [ -f ".env.production" ]; then
    print_color $GREEN "✅ .env.production exists"
    
    if grep -q "VITE_SUPABASE_URL" .env.production; then
        print_color $GREEN "✅ Supabase URL configured"
    else
        print_color $RED "❌ Supabase URL not found in .env.production"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env.production; then
        print_color $GREEN "✅ Supabase Anon Key configured"
    else
        print_color $RED "❌ Supabase Anon Key not found in .env.production"
    fi
else
    print_color $RED "❌ .env.production not found"
    echo "   Run: ./environment-setup.sh"
fi

echo ""

# Check if essential files exist
print_color $YELLOW "📁 Checking essential deployment files..."

essential_files=("Dockerfile" "nginx.conf" "package.json" "tsconfig.json" "vite.config.ts" "App.tsx")

for file in "${essential_files[@]}"; do
    if [ -f "$file" ]; then
        print_color $GREEN "✅ $file exists"
    else
        print_color $RED "❌ $file missing"
    fi
done

echo ""

# Check if Google Cloud SDK is available
print_color $YELLOW "☁️ Checking Google Cloud SDK..."

if command -v gcloud &> /dev/null; then
    print_color $GREEN "✅ Google Cloud SDK installed"
    
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -n "$PROJECT_ID" ]; then
        print_color $GREEN "✅ GCP Project configured: $PROJECT_ID"
    else
        print_color $YELLOW "⚠️  No GCP project configured"
        echo "   Run: gcloud config set project YOUR_PROJECT_ID"
    fi
    
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
        print_color $GREEN "✅ Google Cloud authenticated"
    else
        print_color $YELLOW "⚠️  Not authenticated with Google Cloud"
        echo "   Run: gcloud auth login"
    fi
else
    print_color $RED "❌ Google Cloud SDK not installed"
    echo "   Install: curl https://sdk.cloud.google.com | bash"
fi

echo ""

# Check if Node.js and npm are available
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
    echo "   Install Node.js 18 or later"
fi

echo ""

# Summary
print_color $BLUE "📋 Deployment Status Summary"
print_color $BLUE "============================="

if [ -x "deploy-now.sh" ] && [ -f ".env.production" ] && command -v gcloud &> /dev/null && command -v node &> /dev/null; then
    print_color $GREEN "🎉 Ready to deploy!"
    echo ""
    print_color $BLUE "🚀 Quick deployment options:"
    echo "1. Run: npm run deploy-now    (Complete automated process)"
    echo "2. Run: ./deploy-now.sh       (Direct script execution)"
    echo "3. Run: ./deploy-gcp.sh       (Just deployment, skip environment setup)"
else
    print_color $YELLOW "⚠️  Some requirements are missing. Please fix the issues above."
    echo ""
    print_color $BLUE "🔧 Quick fixes:"
    echo "1. Make scripts executable: npm run make-executable"
    echo "2. Setup environment: ./environment-setup.sh"
    echo "3. Install Google Cloud SDK: curl https://sdk.cloud.google.com | bash"
    echo "4. Authenticate: gcloud auth login"
fi