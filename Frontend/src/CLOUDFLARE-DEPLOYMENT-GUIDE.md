# 🚀 Cloudflare Deployment Guide - Schemes Management Platform

This guide will help you deploy your comprehensive schemes management website to Cloudflare Pages + Workers.

## 📋 Prerequisites

1. **Node.js & npm** (v18+)
2. **Cloudflare Account** (free tier works)
3. **Supabase Account** with your existing project
4. **Git repository** (optional but recommended)

## 🛠️ Step 1: Install Required Tools

```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Verify installation
wrangler --version
```

## 🔐 Step 2: Authenticate with Cloudflare

```bash
# Login to Cloudflare
wrangler login

# This will open a browser window for authentication
# Follow the prompts and authorize the CLI
```

## 🌍 Step 3: Set Up Environment Variables

Create a `.env.cloudflare` file in your project root:

```bash
# Create environment file
cp .env.example .env.cloudflare  # if you have an example file
# OR create manually:
touch .env.cloudflare
```

Edit `.env.cloudflare` with your actual values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://baabzbunxucblvtojbfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MTU0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Cloudflare Configuration (will be updated after deployment)
VITE_CLOUDFLARE_WORKER_URL=https://schemes-management-worker.your-subdomain.workers.dev
```

**⚠️ IMPORTANT:** Replace `your_supabase_service_role_key_here` with your actual Supabase service role key from the Supabase dashboard.

## 🔧 Step 4: Update Configuration Files

### Update `wrangler.toml` with your details:

```toml
name = "schemes-management-worker"
main = "worker/index.js"
compatibility_date = "2024-01-15"
compatibility_flags = ["nodejs_compat"]

# Environment variables for production
[env.production]
name = "schemes-management-worker"
vars = { NODE_ENV = "production" }

# CORS settings - update with your domain
[env.production.vars]
ALLOWED_ORIGINS = "https://schemes-management.pages.dev,https://yourdomain.com"

# Routes - customize based on your domain (optional)
# [[env.production.routes]]
# pattern = "api.yourdomain.com/*"
# zone_name = "yourdomain.com"
```

### Update `utils/supabase/info.tsx` to support Cloudflare:

The file is already configured to automatically detect and use Cloudflare Worker URL when available.

## 🚀 Step 5: Deploy Using the Automated Script

```bash
# Make the deployment script executable
chmod +x deploy-cloudflare.sh

# Run the deployment
npm run deploy-now
# OR
./deploy-cloudflare.sh
```

The script will:
1. ✅ Check prerequisites
2. 🔐 Verify Cloudflare authentication
3. 📦 Install dependencies
4. 🏗️ Build the React frontend
5. 🗃️ Create KV namespace for data storage
6. 🔑 Configure Worker secrets
7. 🔧 Deploy the Cloudflare Worker (backend)
8. 🌐 Deploy to Cloudflare Pages (frontend)

## 📝 Step 6: Manual Deployment (Alternative)

If the automated script has issues, you can deploy manually:

### Deploy the Worker:

```bash
# Install dependencies
npm install

# Build the worker
npm run build:worker

# Create KV namespace
wrangler kv:namespace create "schemes-management-kv"

# Note the KV namespace ID and update wrangler.toml
# Replace YOUR_KV_NAMESPACE_ID with the actual ID

# Set environment secrets
echo "https://baabzbunxucblvtojbfj.supabase.co" | wrangler secret put SUPABASE_URL --env production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MVM0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4" | wrangler secret put SUPABASE_ANON_KEY --env production
echo "YOUR_SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production

# Deploy the worker
wrangler deploy --env production
```

### Deploy the Frontend:

```bash
# Build the React app
npm run build

# Create Pages project (if it doesn't exist)
wrangler pages project create schemes-management --production-branch main

# Deploy to Pages
wrangler pages deploy dist --project-name schemes-management
```

## 🔗 Step 7: Update Frontend Configuration

After deployment, update your frontend to use the Cloudflare Worker URL:

1. Copy your Worker URL from the deployment output
2. Update `.env.cloudflare` with the actual Worker URL
3. Optionally, set environment variables in the Cloudflare Pages dashboard

## 🧪 Step 8: Test Your Deployment

1. **Test the Worker API directly:**
   ```bash
   curl https://schemes-management-worker.your-subdomain.workers.dev/health
   ```

2. **Test the full application:**
   - Visit `https://schemes-management.pages.dev`
   - Try logging in
   - Check the Debug tab for connection status

## 🛠️ Troubleshooting

### Common Issues:

1. **"KV namespace not found":**
   - Make sure you've updated `wrangler.toml` with the correct KV namespace ID
   - Run: `wrangler kv:namespace list` to see your namespaces

2. **"Worker deployment failed":**
   - Check that all secrets are set: `wrangler secret list`
   - Verify your `wrangler.toml` configuration

3. **"Frontend can't connect to backend":**
   - Verify the Worker URL in your environment variables
   - Check CORS configuration in the Worker
   - Look at browser network tab for specific errors

4. **"Authentication errors":**
   - Verify Supabase credentials are correct
   - Check that service role key has proper permissions

### Debug Commands:

```bash
# View Worker logs
wrangler tail schemes-management-worker

# Test Worker locally
wrangler dev --env development

# List KV namespaces
wrangler kv:namespace list

# List secrets
wrangler secret list

# View Pages deployments
wrangler pages deployment list schemes-management
```

## 🌟 Post-Deployment Steps

1. **Custom Domain (Optional):**
   - Add CNAME records in your DNS:
     - `api.yourdomain.com` → `schemes-management-worker.your-subdomain.workers.dev`
     - `app.yourdomain.com` → `schemes-management.pages.dev`

2. **Environment Variables in Pages:**
   - Go to Cloudflare dashboard → Pages → schemes-management → Settings → Environment variables
   - Add your environment variables for production

3. **Monitoring:**
   - Set up Cloudflare Analytics
   - Monitor Worker usage in the dashboard

## 📞 Support

If you encounter issues:

1. Check the Debug Panel in your application
2. Review Cloudflare dashboard logs
3. Use `wrangler tail` to see real-time Worker logs
4. Verify all environment variables are correctly set

## 🎉 Success!

Your Schemes Management Platform should now be running on:
- **Frontend:** `https://schemes-management.pages.dev`
- **Backend API:** `https://schemes-management-worker.your-subdomain.workers.dev`

The application includes:
- ✅ User authentication with dual login methods
- ✅ Scheme creation and management
- ✅ Distributor management
- ✅ Sales data upload and calculations
- ✅ Real-time connection monitoring
- ✅ Comprehensive debugging tools
- ✅ User data isolation and security