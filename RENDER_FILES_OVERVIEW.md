# 📁 Render Deployment Files Overview

This document explains all the files created for Render deployment.

---

## 📄 Configuration Files

### 1. `render.yaml`
**Purpose**: Blueprint for deploying both backend and frontend to Render

**What it does:**
- Defines two services: backend (PHP) and frontend (static)
- Specifies build and start commands
- Lists required environment variables
- Configures routing for React app

**You can use this for:** One-click deployment (if you choose "Blueprint" option in Render)

---

### 2. `build.sh`
**Purpose**: Backend build script

**What it does:**
- Installs PHP dependencies with Composer
- Caches Laravel configurations for faster performance
- Sets proper file permissions for Laravel

**When it runs:** During backend deployment on Render

---

### 3. `Procfile`
**Purpose**: Tells Render how to start the backend server

**What it does:**
- Starts Laravel's built-in PHP server on the correct port
- Binds to `0.0.0.0` to accept external connections

**When it runs:** When backend service starts on Render

---

### 4. `.env.example`
**Purpose**: Template for environment variables

**What it does:**
- Shows which environment variables are needed
- Provides placeholder values
- Serves as documentation

**How to use it:**
- Copy values to Render's environment variable settings
- Replace placeholders with your actual values

---

### 5. `.gitignore`
**Purpose**: Tells Git which files NOT to upload to GitHub

**What it does:**
- Excludes `.env` file (keeps secrets safe!)
- Excludes `node_modules` and `vendor` folders
- Excludes build artifacts

**Why it matters:** Protects your Airtable API keys from being exposed

---

### 6. `src/config.js`
**Purpose**: Centralizes API URL configuration

**What it does:**
- Uses `REACT_APP_API_URL` environment variable in production
- Falls back to `http://localhost:8000` for local development
- Makes it easy to switch between environments

**How to use it:**
```javascript
import config from './config';
axios.get(`${config.API_URL}/api/classes`)
```

---

### 7. `config/cors.php` (updated)
**Purpose**: Allows frontend to communicate with backend

**What it does:**
- Lists allowed origins (websites that can call your API)
- Currently allows `localhost:3000` for development
- You'll add your Render frontend URL here after deployment

**Important:** Without this, your frontend can't talk to your backend!

---

## 📚 Documentation Files

### 1. `RENDER_DEPLOYMENT_GUIDE.md`
**The complete guide** with:
- Detailed step-by-step instructions
- Screenshots locations
- Troubleshooting section
- Configuration explanations
- Free tier limitations

**Best for:** First-time deployers or when you need detailed help

---

### 2. `RENDER_QUICK_START.md`
**The fast track** with:
- Condensed steps
- Quick commands
- Essential configuration only
- Get live in 10 minutes

**Best for:** Experienced users or quick deployments

---

### 3. `DEPLOYMENT_CHECKLIST.md`
**The safety net** with:
- Pre-deployment checklist
- Post-deployment testing steps
- Environment variable verification
- Common issues & solutions

**Best for:** Making sure you don't miss anything

---

### 4. `README.md` (updated)
**The main documentation** now includes:
- Link to deployment guides
- Quick overview of deployment process
- Key features for Render deployment

---

## 🎯 Which Files Go Where?

### On GitHub (all of these):
- ✅ `render.yaml`
- ✅ `build.sh`
- ✅ `Procfile`
- ✅ `.env.example`
- ✅ `.gitignore`
- ✅ `src/config.js`
- ✅ `config/cors.php`
- ✅ All documentation files

### NOT on GitHub:
- ❌ `.env` (contains secrets!)
- ❌ `node_modules/`
- ❌ `vendor/`
- ❌ `build/`

### On Render (set manually):
- 🔑 Environment variables (from `.env.example`)

---

## 🚀 Deployment Flow

```
1. Push code to GitHub
   ↓
2. Render detects new commit
   ↓
3. Render reads render.yaml or your manual config
   ↓
4. Backend: Runs build.sh → Starts with Procfile
   Frontend: Runs npm build → Serves static files
   ↓
5. Services are live! 🎉
```

---

## 🔑 Environment Variables Mapping

| Local (.env) | Render Dashboard | Purpose |
|--------------|------------------|---------|
| `APP_KEY` | Auto-generated | Laravel encryption |
| `AIRTABLE_API_KEY` | Manual entry | Airtable access |
| `AIRTABLE_BASE_ID` | Manual entry | Your base |
| `AIRTABLE_TABLE_*` | Manual entry | Table IDs |
| `GEOFENCE_RADIUS` | Manual entry | Distance limit |
| `REACT_APP_API_URL` | Manual entry | Connect frontend to backend |

---

## 📝 Quick Reference

### Backend Commands
```bash
# Build
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache

# Start
php artisan serve --host=0.0.0.0 --port=$PORT
```

### Frontend Commands
```bash
# Build
npm install && npm run build

# Output directory
./build
```

---

## 🐛 Common Questions

**Q: Do I need to edit all these files?**
A: No! They're ready to use. You only need to:
1. Add environment variables in Render dashboard
2. Update CORS after getting frontend URL

**Q: Which guide should I follow?**
A: Start with `RENDER_QUICK_START.md`. If you get stuck, refer to `RENDER_DEPLOYMENT_GUIDE.md`.

**Q: Can I use the `render.yaml` file?**
A: Yes! When creating a new service, choose "Blueprint" and Render will use this file.

**Q: What if I want to deploy to a different platform?**
A: The same concepts apply. Most platforms need:
- Build command
- Start command
- Environment variables
- Static file directory (for frontend)

---

## 🎓 Learning Resources

**Render Documentation:**
- https://render.com/docs/deploy-php
- https://render.com/docs/deploy-create-react-app

**Laravel Deployment:**
- https://laravel.com/docs/9.x/deployment

---

That's everything you need to know about the deployment files! 🚀

If you have questions, check the guides or refer back to this overview.

