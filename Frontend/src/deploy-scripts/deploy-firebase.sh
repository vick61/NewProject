#!/bin/bash

# Firebase Deployment Script for Schemes Management Platform
set -e

echo "🚀 Starting Firebase deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔑 Please login to Firebase..."
    firebase login
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Deploy to Firebase
echo "📦 Deploying to Firebase Hosting..."
firebase deploy --only hosting

# Get the deployment URL
PROJECT_ID=$(firebase use --show)
echo ""
echo "✅ Deployment successful!"
echo "🌐 Your app is live at: https://${PROJECT_ID}.web.app"
echo "🌐 Custom domain (if configured): https://${PROJECT_ID}.firebaseapp.com"
echo ""
echo "💡 To set up a custom domain:"
echo "   1. Go to Firebase Console > Hosting"
echo "   2. Click 'Add custom domain'"
echo "   3. Follow the verification steps"