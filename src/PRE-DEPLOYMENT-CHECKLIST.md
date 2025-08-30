# 📋 Pre-Deployment Checklist

Before deploying to Cloudflare, make sure you have everything ready:

## ✅ Required Information

### 1. Supabase Service Role Key
You need your **Supabase Service Role Key** (not the anon key). 

**Where to find it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `baabzbunxucblvtojbfj`
3. Go to **Settings** → **API**
4. Copy the **service_role** key (starts with `eyJ...`)

### 2. Cloudflare Account
- Free Cloudflare account (signup at [cloudflare.com](https://cloudflare.com))
- No payment method required for basic usage

## 🛠️ Required Tools

### Install Node.js (if not installed):
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from: https://nodejs.org/
```

### Install Wrangler CLI:
```bash
npm install -g wrangler
wrangler --version
```

## 🚀 Quick Deployment Steps

### Step 1: Authenticate with Cloudflare
```bash
wrangler login
```
This will open a browser window. Login to your Cloudflare account and authorize the CLI.

### Step 2: Set up your environment
Create `.env.cloudflare` file:
```env
# Copy your actual Supabase service role key here
SUPABASE_SERVICE_ROLE_KEY=eyJ_YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE

# These are already correct for your project
VITE_SUPABASE_URL=https://baabzbunxucblvtojbfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhYWJ6YnVueHVjYmx2dG9qYmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjkyNDAsImV4cCI6MjA3MTU0NTI0MH0.4Cr44RQtGzBfs4QlyqXHd3ogvrsN2YULMQdAdygnfx4

# This will be updated after deployment
VITE_CLOUDFLARE_WORKER_URL=https://schemes-management-worker.your-subdomain.workers.dev
```

### Step 3: Deploy everything
```bash
npm run deploy-now
```

This single command will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Build your React app
- ✅ Create Cloudflare KV storage
- ✅ Configure secrets
- ✅ Deploy the backend Worker
- ✅ Deploy the frontend to Pages

## 🎯 Expected Results

After successful deployment:

### Your URLs:
- **Frontend:** `https://schemes-management.pages.dev`
- **Backend:** `https://schemes-management-worker.YOUR_SUBDOMAIN.workers.dev`

### What works:
- ✅ User authentication (email/password and mobile OTP)
- ✅ Scheme creation and management
- ✅ Distributor management  
- ✅ Sales data upload and calculations
- ✅ Real-time connection monitoring
- ✅ All existing features from your local version

## 🆘 If Something Goes Wrong

### Common Issues:

1. **"Not authenticated"** → Run `wrangler login`

2. **"KV namespace not found"** → The script will create it and ask you to update `wrangler.toml`

3. **"Service role key invalid"** → Double-check the key in `.env.cloudflare`

4. **"Worker not responding"** → Check `wrangler tail schemes-management-worker` for logs

### Debug Commands:
```bash
# Check status
./check-deployment.sh

# View real-time logs
wrangler tail schemes-management-worker

# Test Worker directly
curl https://schemes-management-worker.YOUR_SUBDOMAIN.workers.dev/health

# Redeploy if needed
npm run deploy-now
```

## 📞 Support

If you run into issues:

1. **Check the deployment logs** - the script shows detailed output
2. **Use the debug commands** above to troubleshoot
3. **Check your `.env.cloudflare`** file has the correct values
4. **Verify Cloudflare authentication** with `wrangler whoami`

## 🎉 Ready to Deploy?

If you have:
- ✅ Cloudflare account
- ✅ Wrangler CLI installed  
- ✅ Service role key from Supabase
- ✅ `.env.cloudflare` file configured

Then run:
```bash
npm run deploy-now
```

Your comprehensive schemes management platform will be live on Cloudflare in just a few minutes! 🚀