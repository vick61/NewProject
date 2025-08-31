# 🚀 DEPLOY IN 2 MINUTES

## Step 1: Setup (30 seconds)
```bash
# Make scripts executable
npm run make-executable

# Setup your environment (Supabase credentials)
./environment-setup.sh
```

## Step 2: Deploy (90 seconds)
```bash
# Choose deployment method and deploy
./deploy-gcp.sh
```

**Done! Your app is live on GCP!** 🎉

---

## 📋 What You Need Ready

- Google Cloud account (free tier OK)
- Supabase URL: `https://your-project.supabase.co`
- Supabase Anon Key (from Supabase dashboard)

---

## 🎯 Deployment Options

**Firebase Hosting** ⭐ **RECOMMENDED**
- Easiest and fastest
- Global CDN + SSL included
- Perfect for React apps

**Cloud Run**
- Serverless containers
- Auto-scales to zero
- Great for dynamic apps

**Cloud Storage**
- Static hosting
- Most cost-effective
- Simple and fast

---

## 🆘 Quick Fixes

**"gcloud not found"**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud auth login
```

**"Permission denied"**
```bash
chmod +x *.sh
./environment-setup.sh
```

**Build errors**
```bash
rm -rf node_modules
npm install
npm run build
```

---

## 💰 Costs (Rough estimates)

- **Firebase Hosting**: FREE for most apps
- **Cloud Run**: ~$0-5/month 
- **Cloud Storage**: ~$1-3/month

---

## ✅ After Deployment Checklist

- [ ] Test login functionality
- [ ] Create a test scheme
- [ ] Upload sample data
- [ ] Check calculations work
- [ ] Set up custom domain (optional)

---

**Ready? Just run:**
```bash
npm run make-executable && ./environment-setup.sh && ./deploy-gcp.sh
```

For detailed instructions: See `DEPLOY-NOW.md` or `gcp-deployment-guide.md`