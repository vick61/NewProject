#!/bin/bash

# 🚀 Quick GCP Deployment Script for Schemes Management Platform
# This script provides multiple deployment options for your application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

print_color $BLUE "🚀 Schemes Management Platform - GCP Deployment"
print_color $BLUE "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_color $RED "❌ Google Cloud SDK not found!"
    echo ""
    echo "Please install Google Cloud SDK:"
    echo "curl https://sdk.cloud.google.com | bash"
    echo "exec -l \$SHELL"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
    print_color $YELLOW "🔑 Please authenticate with Google Cloud..."
    gcloud auth login
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    print_color $YELLOW "📋 No project configured. Please enter your GCP Project ID:"
    read -p "Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

print_color $GREEN "📋 Using project: $PROJECT_ID"

# Show deployment options
echo ""
print_color $BLUE "🎯 Deployment Options:"
echo "1. Firebase Hosting (Recommended - Easy setup, fast CDN)"
echo "2. Cloud Run (Serverless containers with auto-scaling)"
echo "3. Cloud Storage (Static hosting, most cost-effective)"
echo "4. App Engine (Fully managed platform)"
echo "5. Exit"

echo ""
read -p "Choose deployment method (1-5): " choice

case $choice in
    1)
        print_color $BLUE "🔥 Deploying to Firebase Hosting..."
        
        # Check if Firebase CLI is installed
        if ! command -v firebase &> /dev/null; then
            print_color $YELLOW "Installing Firebase CLI..."
            npm install -g firebase-tools
        fi
        
        # Login to Firebase if needed
        if ! firebase projects:list &> /dev/null; then
            print_color $YELLOW "🔑 Please login to Firebase..."
            firebase login
        fi
        
        # Initialize Firebase if needed
        if [ ! -f "firebase.json" ]; then
            print_color $YELLOW "Initializing Firebase..."
            firebase init hosting --project $PROJECT_ID
        fi
        
        # Build and deploy
        print_color $BLUE "🔨 Building application..."
        npm run build
        
        print_color $BLUE "📦 Deploying to Firebase..."
        firebase deploy --only hosting --project $PROJECT_ID
        
        FIREBASE_URL="https://$PROJECT_ID.web.app"
        print_color $GREEN "✅ Deployment successful!"
        print_color $GREEN "🌐 Your app is live at: $FIREBASE_URL"
        ;;
        
    2)
        print_color $BLUE "🏃 Deploying to Cloud Run..."
        
        # Enable APIs
        print_color $BLUE "🔧 Enabling required APIs..."
        gcloud services enable cloudbuild.googleapis.com run.googleapis.com
        
        # Deploy
        SERVICE_NAME="schemes-management"
        REGION="us-central1"
        
        print_color $BLUE "🔨 Building and deploying..."
        gcloud run deploy $SERVICE_NAME \
            --source . \
            --platform managed \
            --region $REGION \
            --allow-unauthenticated \
            --memory 1Gi \
            --cpu 1 \
            --min-instances 0 \
            --max-instances 10 \
            --port 8080 \
            --set-env-vars "NODE_ENV=production"
        
        SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
        print_color $GREEN "✅ Deployment successful!"
        print_color $GREEN "🌐 Your app is live at: $SERVICE_URL"
        ;;
        
    3)
        print_color $BLUE "🪣 Deploying to Cloud Storage..."
        
        # Get bucket name
        DEFAULT_BUCKET="$PROJECT_ID-schemes-management"
        read -p "Enter bucket name (default: $DEFAULT_BUCKET): " BUCKET_NAME
        BUCKET_NAME=${BUCKET_NAME:-$DEFAULT_BUCKET}
        
        # Enable APIs
        print_color $BLUE "🔧 Enabling required APIs..."
        gcloud services enable storage.googleapis.com
        
        # Create bucket
        if ! gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
            print_color $BLUE "🪣 Creating bucket: $BUCKET_NAME"
            gsutil mb gs://$BUCKET_NAME
        fi
        
        # Configure for static hosting
        gsutil web set -m index.html -e index.html gs://$BUCKET_NAME
        gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
        
        # Build and deploy
        print_color $BLUE "🔨 Building application..."
        npm run build
        
        print_color $BLUE "📦 Uploading files..."
        gsutil -m cp -r dist/* gs://$BUCKET_NAME/
        
        # Set cache headers
        gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$BUCKET_NAME/**/*.{js,css,png,jpg,svg}
        
        STORAGE_URL="https://storage.googleapis.com/$BUCKET_NAME/index.html"
        print_color $GREEN "✅ Deployment successful!"
        print_color $GREEN "🌐 Your app is live at: $STORAGE_URL"
        ;;
        
    4)
        print_color $BLUE "⚙️ Deploying to App Engine..."
        
        # Enable APIs
        print_color $BLUE "🔧 Enabling required APIs..."
        gcloud services enable appengine.googleapis.com
        
        # Build
        print_color $BLUE "🔨 Building application..."
        npm run build
        
        # Deploy
        print_color $BLUE "📦 Deploying to App Engine..."
        gcloud app deploy app.yaml --quiet
        
        APP_URL="https://$PROJECT_ID.uc.r.appspot.com"
        print_color $GREEN "✅ Deployment successful!"
        print_color $GREEN "🌐 Your app is live at: $APP_URL"
        ;;
        
    5)
        print_color $YELLOW "👋 Exiting..."
        exit 0
        ;;
        
    *)
        print_color $RED "❌ Invalid option. Please run the script again."
        exit 1
        ;;
esac

echo ""
print_color $BLUE "💡 Next Steps:"
echo "1. Test your deployed application"
echo "2. Set up a custom domain (optional)"
echo "3. Configure monitoring and alerts"
echo "4. Set up CI/CD for automatic deployments"

echo ""
print_color $GREEN "🎉 Deployment complete! Your Schemes Management Platform is now live on GCP!"