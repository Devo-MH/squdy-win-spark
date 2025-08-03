# 🚀 Deploy to Railway via Web Interface

## Quick Setup (5 minutes)

### Step 1: Connect GitHub to Railway
1. Go to **https://railway.app/**
2. Click **"Start a New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select **`squdy-win-spark`** repository
5. Choose **`backend`** folder as the root directory

### Step 2: Set Environment Variables
In Railway dashboard → **Variables** tab, add:

```bash
MONGODB_URI=mongodb+srv://dinabahnasy:wma8hgj_JWD3jbx1gvk@cluster0.d9mxajj.mongodb.net/dcampaign?retryWrites=true&w=majority
NODE_ENV=production
PORT=3001
```

### Step 3: Deploy
1. Railway will **automatically detect** our `package.json`
2. It will run `npm start` (which runs our `start.js`)
3. Our smart start script will detect `MONGODB_URI` and use MongoDB
4. ✅ **Your backend will be live!**

### Step 4: Get Your Backend URL
- Railway will provide a URL like: `https://your-app-name.railway.app`
- Test it: `https://your-app-name.railway.app/health`

---

## 🎯 Why This Works Perfectly

✅ **Smart Start Script**: Our `backend/start.js` automatically detects MongoDB URI  
✅ **MongoDB Atlas**: Your connection string is ready  
✅ **Zero Config**: Railway auto-detects Node.js  
✅ **Auto-Deploy**: Any GitHub push will trigger redeploy  

---

## 🚀 Ready to Deploy?

**Choose your preferred method:**
1. **Web Interface** (Recommended - easier)
2. **GitHub Actions** (Automatic)
3. **CLI** (Try again with Railway login)