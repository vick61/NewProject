# 🚀 Deploy Your Schemes Management Platform to GCP

## Quick Start (2 minutes)

### Step 1: Setup Environment
```bash
# Make scripts executable
chmod +x environment-setup.sh deploy-gcp.sh

# Setup your Supabase credentials
./environment-setup.sh
```

### Step 2: Deploy
```bash
# Deploy to GCP (choose your preferred method)
./deploy-gcp.sh
```

**That's it! Your app will be live on GCP in minutes.**

---

## ⚡ Super Quick Firebase Deploy

If you just want to get online FAST:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and deploy
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## 🎯 Deployment Options

When you run `./deploy-gcp.sh`, you'll see:

1. **Firebase Hosting** ⭐ **RECOMMENDED**
   - Easiest setup
   - Global CDN
   - Free SSL
   - Custom domains

2. **Cloud Run** 
   - Serverless containers
   - Auto-scaling
   - Pay per use

3. **Cloud Storage**
   - Static hosting
   - Most cost-effective
   - Great for simple sites

4. **App Engine**
   - Fully managed
   - Enterprise features

---

## 📋 What You Need

1. **Google Cloud Account** (free tier available)
2. **Supabase Project** (your backend is already there)
3. **Node.js 18+** installed

---

## 🔧 Environment Variables

The setup script will ask for:
- Supabase URL: `https://your-project.supabase.co`
- Supabase Anon Key: Your public API key

---

## 🆘 Troubleshooting

### "gcloud not found"
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud auth login
```

### "Firebase not found"
```bash
npm install -g firebase-tools
firebase login
```

### "Build fails"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Supabase connection failed"
1. Check your Supabase URL and keys
2. Ensure your Supabase Edge Functions are deployed
3. Check the Debug tab in your app

---

## 🔒 Security

- Environment variables are stored securely
- Never commit `.env.production` to git
- Your Supabase backend stays secure on Supabase

---

## 💰 Cost Estimates

| Service | Free Tier | Typical Cost |
|---------|-----------|--------------|
| Firebase Hosting | 10GB, 1GB/day | $0-5/month |
| Cloud Run | 2M requests/month | $0-10/month |
| Cloud Storage | 5GB | $1-5/month |
| App Engine | 28 hours/day | $5-20/month |

---

## 🎉 After Deployment

1. **Test everything** - Login, create schemes, upload data
2. **Set up monitoring** - Check Google Cloud Console
3. **Custom domain** - Add your own domain if needed
4. **CI/CD** - Set up automatic deployments from Git

---

## 📞 Need Help?

- Check `gcp-deployment-guide.md` for detailed instructions
- Ensure your Supabase Edge Functions are deployed
- Test locally first with `npm run dev`

**Ready to deploy? Run `./deploy-gcp.sh` now!** 🚀