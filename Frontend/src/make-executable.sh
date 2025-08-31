#!/bin/bash

# 🔧 Make All Deployment Scripts Executable
# This script ensures all deployment-related scripts have proper permissions

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_color() {
    echo -e "${1}${2}${NC}"
}

print_color $BLUE "🔧 Making deployment scripts executable..."

# Core deployment scripts
scripts=(
    "deploy-gcp.sh"
    "deploy-cloudflare.sh"
    "cloudflare-setup.sh"
    "environment-setup.sh" 
    "deploy-now.sh"
    "check-deployment-status.sh"
)

# Make core scripts executable
for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        print_color $GREEN "✅ Made $script executable"
    else
        print_color $YELLOW "⚠️  $script not found (skipping)"
    fi
done

# Make deploy-scripts directory scripts executable if it exists
if [ -d "deploy-scripts" ]; then
    chmod +x deploy-scripts/*.sh 2>/dev/null || true
    print_color $GREEN "✅ Made deploy-scripts/*.sh executable"
else
    print_color $YELLOW "⚠️  deploy-scripts directory not found (skipping)"
fi

echo ""
print_color $GREEN "✅ All deployment scripts are now executable!"

echo ""
print_color $BLUE "🚀 Quick deployment options:"
echo "1. npm run deploy-now      # Complete automated process (RECOMMENDED)"
echo "2. ./deploy-now.sh         # Direct script execution"
echo "3. ./environment-setup.sh  # Setup environment only"
echo "4. ./deploy-gcp.sh         # Deploy only (requires environment setup)"
echo "5. ./check-deployment-status.sh  # Check if ready to deploy"

echo ""
print_color $BLUE "💡 Pro tip: Run 'npm run deploy-now' for the easiest experience!"