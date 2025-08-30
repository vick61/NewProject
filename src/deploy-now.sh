#!/bin/bash

# 🚀 Quick Deploy Script for Schemes Management Platform
# This script makes all deployment scripts executable and starts deployment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_color() {
    echo -e "${1}${2}${NC}"
}

print_color $BLUE "🚀 Schemes Management Platform - Quick Deploy"
print_color $BLUE "============================================="

# Step 1: Make all scripts executable
print_color $YELLOW "📋 Step 1: Making deployment scripts executable..."

chmod +x deploy-gcp.sh
chmod +x environment-setup.sh
chmod +x make-executable.sh
chmod +x deploy-scripts/*.sh 2>/dev/null || echo "deploy-scripts directory not found, skipping..."

print_color $GREEN "✅ All deployment scripts are now executable"

# Step 2: Check if environment is set up
if [ ! -f ".env.production" ]; then
    print_color $YELLOW "📋 Step 2: Setting up environment variables..."
    print_color $BLUE "You need to provide your Supabase credentials to proceed."
    
    echo ""
    read -p "Do you want to set up environment variables now? (y/N): " setup_env
    
    if [[ $setup_env == [Yy]* ]]; then
        ./environment-setup.sh
    else
        print_color $YELLOW "⚠️  Environment setup skipped. You'll need to run ./environment-setup.sh manually before deploying."
        exit 1
    fi
else
    print_color $GREEN "✅ Environment variables already configured"
fi

# Step 3: Start deployment
print_color $YELLOW "📋 Step 3: Starting GCP deployment..."

echo ""
print_color $BLUE "🎯 Ready to deploy your Schemes Management Platform to GCP!"
print_color $BLUE "Choose your deployment method in the next screen..."

echo ""
read -p "Press Enter to start deployment..." -r

# Launch the main deployment script
./deploy-gcp.sh

print_color $GREEN "🎉 Deployment process completed!"

echo ""
print_color $BLUE "📋 What to do next:"
echo "1. Test your deployed application"
echo "2. Check all authentication flows work"
echo "3. Test scheme creation and calculations"
echo "4. Set up monitoring (optional)"
echo "5. Configure custom domain (optional)"