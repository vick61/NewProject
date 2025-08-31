#!/bin/bash

# 🔧 Cloudflare Environment Setup for Schemes Management Platform

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

print_color $BLUE "🔧 Cloudflare Environment Setup"
print_color $BLUE "==============================="

echo ""
print_color $YELLOW "This script will help you configure your Cloudflare deployment environment."
echo ""

# Function to prompt for input with validation
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local current_value="$3"
    local is_secret="$4"
    
    if [ "$is_secret" = "true" ]; then
        echo -n "$prompt"
        if [ ! -z "$current_value" ] && [ "$current_value" != "your_"*"_here" ]; then
            echo -n " [Current: ***hidden***]"
        fi
        echo -n ": "
        read -s user_input
        echo "" # New line after hidden input
    else
        echo -n "$prompt"
        if [ ! -z "$current_value" ] && [ "$current_value" != "your_"*"_here" ]; then
            echo -n " [Current: $current_value]"
        fi
        echo -n ": "
        read user_input
    fi
    
    if [ ! -z "$user_input" ]; then
        eval "$var_name=\"$user_input\""
    elif [ -z "$current_value" ] || [ "$current_value" = "your_"*"_here" ]; then
        print_color $RED "❌ This field is required!"
        prompt_input "$prompt" "$var_name" "$current_value" "$is_secret"
    fi
}

# Load existing environment if available
ENV_FILE=".env.cloudflare"
if [ -f "$ENV_FILE" ]; then
    print_color $GREEN "✅ Found existing .env.cloudflare"
    source "$ENV_FILE"
else
    print_color $YELLOW "📋 Creating new .env.cloudflare"
fi

echo ""
print_color $BLUE "📋 Supabase Configuration"
print_color $BLUE "========================="
echo ""
print_color $YELLOW "You can find these values in your Supabase project dashboard:"
echo "• Project URL: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
echo "• API Keys: Same location, under 'Project API keys'"
echo ""

# Collect Supabase information
prompt_input "Supabase Project URL (https://xxx.supabase.co)" "SUPABASE_URL" "$VITE_SUPABASE_URL" "false"
prompt_input "Supabase Anon Key" "SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "true"
prompt_input "Supabase Service Role Key" "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "true"

echo ""
print_color $BLUE "🌐 Cloudflare Configuration"
print_color $BLUE "==========================="
echo ""

# Get Cloudflare subdomain if available
if command -v wrangler &> /dev/null && wrangler whoami &> /dev/null 2>&1; then
    SUBDOMAIN=$(wrangler whoami 2>/dev/null | grep "account" | grep -o '"subdomain":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ ! -z "$SUBDOMAIN" ]; then
        DEFAULT_WORKER_URL="https://schemes-management-worker.$SUBDOMAIN.workers.dev"
        print_color $GREEN "✅ Detected Cloudflare subdomain: $SUBDOMAIN"
    else
        DEFAULT_WORKER_URL="https://schemes-management-worker.your-subdomain.workers.dev"
    fi
else
    DEFAULT_WORKER_URL="https://schemes-management-worker.your-subdomain.workers.dev"
    print_color $YELLOW "⚠️  Wrangler not available. Using placeholder URL."
fi

prompt_input "Worker URL" "WORKER_URL" "${CLOUDFLARE_WORKER_URL:-$DEFAULT_WORKER_URL}" "false"

# Optional: Custom domain configuration
echo ""
print_color $BLUE "🔗 Custom Domain (Optional)"
print_color $BLUE "==========================="
echo ""
print_color $YELLOW "If you have a custom domain, you can configure it here:"
echo "Leave blank to use Cloudflare's default domains"
echo ""

prompt_input "Custom API domain (e.g., api.yourdomain.com) [Optional]" "CUSTOM_API_DOMAIN" "$CUSTOM_API_DOMAIN" "false"
prompt_input "Custom App domain (e.g., app.yourdomain.com) [Optional]" "CUSTOM_APP_DOMAIN" "$CUSTOM_APP_DOMAIN" "false"

# Write environment file
echo ""
print_color $YELLOW "📝 Writing configuration to $ENV_FILE..."

cat > "$ENV_FILE" << EOF
# Cloudflare Environment Configuration for Schemes Management Platform
# Generated on $(date)

# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# Cloudflare Worker Configuration
CLOUDFLARE_WORKER_URL=$WORKER_URL
VITE_API_BASE_URL=$WORKER_URL

# Custom Domains (Optional)
CUSTOM_API_DOMAIN=${CUSTOM_API_DOMAIN:-}
CUSTOM_APP_DOMAIN=${CUSTOM_APP_DOMAIN:-}

# Environment
NODE_ENV=production
EOF

print_color $GREEN "✅ Configuration saved to $ENV_FILE"

# Validate configuration
echo ""
print_color $YELLOW "🔍 Validating configuration..."

if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    print_color $RED "⚠️  Warning: Supabase URL format looks incorrect"
fi

if [[ ${#SUPABASE_ANON_KEY} -lt 100 ]]; then
    print_color $RED "⚠️  Warning: Supabase Anon Key seems too short"
fi

if [[ ${#SUPABASE_SERVICE_KEY} -lt 100 ]]; then
    print_color $RED "⚠️  Warning: Supabase Service Role Key seems too short"
fi

print_color $GREEN "✅ Configuration validation completed"

# Update utils/supabase/info.tsx for Cloudflare
echo ""
print_color $YELLOW "📝 Updating Supabase info file for Cloudflare..."

cat > "utils/supabase/info.tsx" << EOF
// Supabase configuration for Cloudflare deployment
// This file is automatically generated by cloudflare-setup.sh

export const projectId = '${SUPABASE_URL#https://}'
export const projectUrl = '$SUPABASE_URL'
export const publicAnonKey = '$SUPABASE_ANON_KEY'

// Cloudflare Worker URL
export const workerUrl = '$WORKER_URL'
export const apiBaseUrl = '$WORKER_URL'
EOF

print_color $GREEN "✅ Supabase info file updated"

# Summary
echo ""
print_color $BLUE "📋 Configuration Summary"
print_color $BLUE "======================="
echo ""
print_color $GREEN "✅ Supabase URL: $SUPABASE_URL"
print_color $GREEN "✅ Worker URL: $WORKER_URL"
if [ ! -z "$CUSTOM_API_DOMAIN" ]; then
    print_color $GREEN "✅ Custom API Domain: $CUSTOM_API_DOMAIN"
fi
if [ ! -z "$CUSTOM_APP_DOMAIN" ]; then
    print_color $GREEN "✅ Custom App Domain: $CUSTOM_APP_DOMAIN"
fi

echo ""
print_color $BLUE "🚀 Next Steps:"
echo "1. Run: npm run deploy-cloudflare"
echo "2. Or run: npm run deploy-now"
echo ""
print_color $BLUE "🔧 Advanced Options:"
echo "• Deploy worker only: npm run cf:worker:deploy"
echo "• Deploy pages only: npm run cf:pages:deploy"
echo "• Test locally: wrangler dev"

echo ""
print_color $GREEN "🎉 Cloudflare environment setup completed!"
print_color $BLUE "Your Schemes Management Platform is ready for Cloudflare deployment."