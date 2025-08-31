#!/bin/bash

# Google Cloud Storage Static Hosting Deployment Script
set -e

echo "🚀 Starting Cloud Storage deployment..."

# Configuration - UPDATE THESE VALUES
BUCKET_NAME="your-domain.com"  # Change this to your domain or preferred bucket name
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Using project: $PROJECT_ID"
echo "🪣 Bucket name: $BUCKET_NAME"

# Check if bucket name is still default
if [ "$BUCKET_NAME" = "your-domain.com" ]; then
    echo "❌ Please update BUCKET_NAME in this script to your actual domain or preferred name"
    echo "   Edit deploy-scripts/deploy-storage.sh and change the BUCKET_NAME variable"
    exit 1
fi

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable storage.googleapis.com
gcloud services enable compute.googleapis.com

# Create bucket if it doesn't exist
if ! gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    echo "🪣 Creating bucket: $BUCKET_NAME"
    gsutil mb gs://$BUCKET_NAME
else
    echo "✅ Bucket $BUCKET_NAME already exists"
fi

# Configure bucket for static website hosting
echo "🔧 Configuring static website hosting..."
gsutil web set -m index.html -e index.html gs://$BUCKET_NAME

# Make bucket publicly readable
echo "🔓 Setting bucket permissions..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Build the application
echo "🔨 Building application..."
npm run build

# Deploy to bucket
echo "📦 Uploading files to bucket..."
gsutil -m cp -r dist/* gs://$BUCKET_NAME/

# Set cache headers for static assets
echo "⚡ Setting cache headers..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$BUCKET_NAME/**/*.js
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$BUCKET_NAME/**/*.css
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$BUCKET_NAME/**/*.png
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$BUCKET_NAME/**/*.jpg
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://$BUCKET_NAME/**/*.svg

echo ""
echo "✅ Deployment successful!"
echo "🌐 Your app is live at: https://storage.googleapis.com/$BUCKET_NAME/index.html"
echo "🌐 Or at: http://$BUCKET_NAME (if using custom domain)"
echo ""
echo "💡 To set up a custom domain:"
echo "   1. Create a CNAME record pointing to c.storage.googleapis.com"
echo "   2. Verify domain ownership in Cloud Console"
echo "   3. Access your site at https://$BUCKET_NAME"
echo ""
echo "⚡ To set up Cloud CDN for better performance:"
echo "   gcloud compute backend-buckets create schemes-management-backend --gcs-bucket-name=$BUCKET_NAME"