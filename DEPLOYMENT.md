# 🚀 Deployment Guide - CAPTCHA Solver

This guide covers deploying your CAPTCHA Solver app to **Render** or **Railway**.

---

## ⚠️ Important Note: Model File Size

Your ML models are large (~130MB total). Both platforms support this, but you'll need **Git LFS** or upload models manually.

```
Final_Project_ViT_four.h5  → 35 MB
Unified_Pro_Model_Math.h5  → 64 MB
```

---

## 📦 Option 1: Deploy to Render (Recommended)

### Step 1: Push to GitHub

```bash
# Initialize git if not already
git init

# Install Git LFS for large model files
git lfs install
git lfs track "*.h5"

# Add all files
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/captcha-solver.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and configure everything
5. Click **"Create Web Service"**
6. Wait 5-10 minutes for build to complete

### Step 3: Access Your App

Your app will be live at: `https://captcha-solver.onrender.com`

> **Note**: Free tier instances spin down after 15 min of inactivity. First request may take ~30 seconds.

---

## 🚂 Option 2: Deploy to Railway

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repository
4. Railway will detect `railway.toml` and `Dockerfile`
5. Click **"Deploy"**

### Step 3: Get Your URL

1. Go to **Settings** → **Domains**
2. Click **"Generate Domain"**
3. Your app will be at: `https://your-app.up.railway.app`

---

## 🔧 Testing Locally with Docker

Before deploying, test the Docker build locally:

```bash
# Build the image
docker build -t captcha-solver .

# Run the container
docker run -p 8000:8000 captcha-solver

# Open http://localhost:8000
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Container configuration |
| `render.yaml` | Render platform config |
| `railway.toml` | Railway platform config |
| `.dockerignore` | Exclude files from build |

---

## ❓ Troubleshooting

### Build fails with "out of memory"
- Your models are large. Use Git LFS or host models on external storage (GCS, S3).

### App doesn't start
- Check logs in Render/Railway dashboard
- Ensure `/api/health` returns `{"text": true, "math": true}`

### Slow first request
- Free tier instances sleep after inactivity. First request wakes them up (~30s).

---

## 🎉 Success!

Once deployed, share your app URL:
```
https://your-app-name.onrender.com
https://your-app-name.up.railway.app
```
