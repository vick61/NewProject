# GCP Deployment Guide for Schemes Management Platform

This guide provides multiple options for deploying your React-based Schemes Management Platform to Google Cloud Platform (GCP).

## Prerequisites

1. **Google Cloud Account**: Ensure you have a GCP account and a project created
2. **Google Cloud SDK**: Install the `gcloud` CLI tool
3. **Node.js**: Version 18 or higher
4. **Supabase**: Your backend will remain on Supabase - only the frontend is being deployed to GCP

## Authentication Setup

```bash
# Install Google Cloud SDK (if not already installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable appengine.googleapis.com
```

## Deployment Options

### Option 1: Firebase Hosting (Recommended - Easiest)

Firebase Hosting is ideal for React applications and provides excellent performance with global CDN.

#### Setup:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init hosting

# Build the application
npm run build

# Deploy to Firebase
firebase deploy
```

#### Benefits:
- ✅ Easy deployment and rollback
- ✅ Built-in SSL certificates
- ✅ Global CDN
- ✅ Custom domains
- ✅ Preview channels for testing

### Option 2: Google Cloud Storage + Cloud CDN (Cost-Effective)

Static hosting using Cloud Storage with CDN for global performance.

#### Setup:
```bash
# Create a bucket (replace with your domain name)
gsutil mb gs://your-domain.com

# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://your-domain.com

# Enable static website hosting
gsutil web set -m index.html -e index.html gs://your-domain.com

# Build and deploy
npm run build
gsutil -m cp -r dist/* gs://your-domain.com/

# Optional: Set up Cloud CDN
gcloud compute backend-buckets create schemes-management-backend --gcs-bucket-name=your-domain.com
```

#### Benefits:
- ✅ Very cost-effective
- ✅ Excellent performance with CDN
- ✅ Custom domains with SSL
- ✅ Scales automatically

### Option 3: Google Cloud Run (Containerized)

Deploy as a containerized application with automatic scaling.

#### Setup:
```bash
# Build and deploy in one command
gcloud run deploy schemes-management \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10

# Or build with Docker first
docker build -t gcr.io/YOUR_PROJECT_ID/schemes-management .
docker push gcr.io/YOUR_PROJECT_ID/schemes-management
gcloud run deploy schemes-management \
  --image gcr.io/YOUR_PROJECT_ID/schemes-management \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Benefits:
- ✅ Serverless with automatic scaling
- ✅ Pay only for what you use
- ✅ Custom domains with SSL
- ✅ Health checks and monitoring

### Option 4: Google App Engine (Fully Managed)

Platform-as-a-Service with automatic scaling and load balancing.

#### Setup:
```bash
# Build the application
npm run build

# Deploy to App Engine
gcloud app deploy app.yaml

# View your application
gcloud app browse
```

#### Benefits:
- ✅ Fully managed platform
- ✅ Automatic scaling
- ✅ Built-in monitoring
- ✅ Custom domains with SSL

## Environment Variables Setup

For all deployment methods, you'll need to set up environment variables for your Supabase connection:

### Option 1: Using Cloud Secret Manager (Recommended)

```bash
# Store Supabase credentials in Secret Manager
echo -n "YOUR_SUPABASE_URL" | gcloud secrets create supabase-url --data-file=-
echo -n "YOUR_SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key --data-file=-

# For Cloud Run, add secrets as environment variables
gcloud run services update schemes-management \
  --update-env-vars SUPABASE_URL="YOUR_SUPABASE_URL",SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

### Option 2: Build-time Environment Variables

Create a `.env.production` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Custom Domain Setup

### For Firebase Hosting:
```bash
firebase hosting:channel:deploy --domain your-domain.com
```

### For Cloud Storage:
```bash
# Create a CNAME record pointing to c.storage.googleapis.com
# Then verify domain ownership in Cloud Console
```

### For Cloud Run:
```bash
gcloud run domain-mappings create --service schemes-management --domain your-domain.com
```

## CI/CD Pipeline Setup

### Using Cloud Build:

1. Connect your repository to Cloud Build
2. Update the `cloudbuild.yaml` file with your bucket names and project ID
3. Set up triggers for automatic deployment

```bash
# Create a build trigger
gcloud builds triggers create github \
  --repo-name YOUR_REPO_NAME \
  --repo-owner YOUR_GITHUB_USERNAME \
  --branch-pattern "^main$" \
  --build-config cloudbuild.yaml
```

## Monitoring and Optimization

### Performance Monitoring:
- Enable Google Analytics 4
- Use Web Vitals monitoring
- Set up uptime checks

### Cost Optimization:
- Enable Cloud CDN for static assets
- Use appropriate caching headers
- Monitor usage with Cloud Monitoring

## Security Best Practices

1. **Environment Variables**: Never commit sensitive data to your repository
2. **HTTPS**: All deployment options provide HTTPS by default
3. **CORS**: Configure CORS properly in your Supabase settings
4. **CSP**: Consider implementing Content Security Policy headers

## Troubleshooting

### Common Issues:

1. **Build Failures**: Check Node.js version compatibility
2. **CORS Errors**: Verify Supabase CORS settings
3. **404 Errors**: Ensure SPA routing is configured correctly
4. **Slow Loading**: Enable compression and CDN

### Debug Commands:
```bash
# Check deployment logs
gcloud app logs tail -s default  # App Engine
gcloud run logs read --service=schemes-management  # Cloud Run

# Check build logs
gcloud builds list
gcloud builds log BUILD_ID
```

## Cost Estimates

| Service | Monthly Cost (Est.) | Use Case |
|---------|-------------------|----------|
| Firebase Hosting | $0-10 | Small to medium traffic |
| Cloud Storage + CDN | $5-20 | High traffic static site |
| Cloud Run | $10-50 | Dynamic scaling needs |
| App Engine | $20-100 | Enterprise applications |

## Recommended Approach

For most use cases, **Firebase Hosting** is recommended because:
- Easiest to set up and maintain
- Excellent performance with global CDN
- Built-in SSL and custom domains
- Great developer experience
- Generous free tier

## Next Steps

1. Choose your deployment method
2. Set up environment variables
3. Configure custom domain (optional)
4. Set up monitoring and alerts
5. Implement CI/CD pipeline
6. Test thoroughly in production

## Support

For additional help:
- Google Cloud Documentation: https://cloud.google.com/docs
- Firebase Documentation: https://firebase.google.com/docs
- Supabase Documentation: https://supabase.com/docs