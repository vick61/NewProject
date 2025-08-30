#!/bin/bash

# Environment Setup Script for GCP Deployment
set -e

echo "🔧 Setting up GCP environment for Schemes Management Platform..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK is not installed."
    echo "   Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
    echo "🔑 Please login to Google Cloud..."
    gcloud auth login
fi

# Get or set project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo "📋 No project set. Please enter your GCP Project ID:"
    read -p "Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo "📋 Using project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable appengine.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable firebase.googleapis.com

echo "✅ APIs enabled successfully!"

# Set up environment variables for Supabase
echo ""
echo "🔐 Setting up Supabase environment variables..."
echo "Please provide your Supabase credentials:"

read -p "Supabase URL: " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY

# Store in Secret Manager
echo "💾 Storing credentials in Secret Manager..."
echo -n "$SUPABASE_URL" | gcloud secrets create supabase-url --data-file=- || \
echo -n "$SUPABASE_URL" | gcloud secrets versions add supabase-url --data-file=-

echo -n "$SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key --data-file=- || \
echo -n "$SUPABASE_ANON_KEY" | gcloud secrets versions add supabase-anon-key --data-file=-

# Create .env.production file for build-time variables
cat > .env.production << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

echo "✅ Environment variables set up successfully!"

# Make deployment scripts executable
echo "🔧 Making deployment scripts executable..."
chmod +x deploy-scripts/*.sh

echo ""
echo "🎉 Setup complete! You can now deploy using:"
echo ""
echo "📦 Firebase Hosting (Recommended):"
echo "   ./deploy-scripts/deploy-firebase.sh"
echo ""
echo "🏃 Cloud Run (Serverless):"
echo "   ./deploy-scripts/deploy-cloud-run.sh"
echo ""
echo "🪣 Cloud Storage (Static):"
echo "   Edit deploy-scripts/deploy-storage.sh to set your bucket name, then run:"
echo "   ./deploy-scripts/deploy-storage.sh"
echo ""
echo "⚙️  App Engine (Managed):"
echo "   gcloud app deploy app.yaml"
echo ""
echo "💡 For detailed instructions, see: gcp-deployment-guide.md"