#!/bin/bash

# Google Cloud Run Deployment Script
set -e

echo "🚀 Starting Cloud Run deployment..."

# Configuration
SERVICE_NAME="schemes-management"
REGION="us-central1"
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Using project: $PROJECT_ID"
echo "📍 Region: $REGION"
echo "🏷️  Service name: $SERVICE_NAME"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# Build and deploy
echo "🔨 Building and deploying to Cloud Run..."
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

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo ""
echo "✅ Deployment successful!"
echo "🌐 Your app is live at: $SERVICE_URL"
echo ""
echo "💡 To set up a custom domain:"
echo "   gcloud run domain-mappings create --service $SERVICE_NAME --domain your-domain.com --region $REGION"
echo ""
echo "📊 To view logs:"
echo "   gcloud run logs read --service=$SERVICE_NAME --region=$REGION"