# 🚀 Deploying to Render - Complete Guide

This guide will walk you through deploying your Student Attendance System to Render for testing and production use.

---

## 📋 Prerequisites

Before you begin, make sure you have:

1. ✅ A [Render account](https://render.com) (free tier works!)
2. ✅ Your code pushed to a GitHub repository
3. ✅ Your Airtable credentials ready:
   - API Key
   - Base ID
   - Table IDs for Students, Teachers, Classes, and Attendance Entries

---

## 🎯 Deployment Strategy

We'll deploy **TWO separate services** on Render:

1. **Backend (Laravel API)** - Web Service
2. **Frontend (React App)** - Static Site

---

## 📦 Part 1: Deploy the Backend (Laravel API)

### Step 1: Create a New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository

### Step 2: Configure the Backend Service

**Basic Settings:**
- **Name**: `student-attendance-backend` (or any name you prefer)
- **Region**: Choose closest to Philippines (e.g., Singapore)
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (if Laravel is at root)
- **Runtime**: `PHP`
- **Build Command**:
  ```bash
  composer install --no-dev --optimize-autoloader && php artisan config:cache && php artisan route:cache && php artisan view:cache
  ```
- **Start Command**:
  ```bash
  php artisan serve --host=0.0.0.0 --port=$PORT
  ```

### Step 3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `APP_NAME` | `StudentAttendance` | App name |
| `APP_ENV` | `production` | Environment |
| `APP_DEBUG` | `false` | Disable debug in production |
| `APP_KEY` | Click "Generate" | Laravel encryption key |
| `APP_URL` | `https://your-backend-url.onrender.com` | Update after deployment |
| `LOG_CHANNEL` | `stack` | Logging |
| `LOG_LEVEL` | `error` | Only log errors |
| `CACHE_DRIVER` | `file` | Cache driver |
| `SESSION_DRIVER` | `file` | Session driver |
| `SESSION_LIFETIME` | `120` | Session timeout |
| `AIRTABLE_API_KEY` | `patziQrv...` | Your Airtable API key |
| `AIRTABLE_BASE_ID` | `appT96N6jX4ZWDYUy` | Your Airtable Base ID |
| `AIRTABLE_TABLE_STUDENTS` | `tbldCCRCR0hLNv5BN` | Students table ID |
| `AIRTABLE_TABLE_TEACHERS` | `tbl7UpOOzgZsXMwFg` | Teachers table ID |
| `AIRTABLE_TABLE_CLASSES` | `tbl6kzsJkbyl5Cqqr` | Classes table ID |
| `AIRTABLE_TABLE_ATTENDANCE` | `tblXW92OSS8XADH8Y` | Attendance table ID |
| `GEOFENCE_RADIUS` | `100` | Geofence radius in meters |

**⚠️ IMPORTANT:** Replace the Airtable values with YOUR actual values!

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, copy your backend URL (e.g., `https://student-attendance-backend.onrender.com`)

---

## 🎨 Part 2: Deploy the Frontend (React App)

### Step 1: Update Frontend API URL

Before deploying, update your React app to use the backend URL:

1. Open `src/config.js` (or create it):
   ```javascript
   const config = {
     API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000'
   };
   
   export default config;
   ```

2. Update all API calls to use this config:
   ```javascript
   import config from './config';
   
   // Instead of: axios.get('/api/classes')
   axios.get(`${config.API_URL}/api/classes`)
   ```

**OR** update `package.json` proxy (easier for testing):
```json
{
  "proxy": "https://your-backend-url.onrender.com"
}
```

### Step 2: Create a Static Site

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository
4. Select your repository

### Step 3: Configure the Frontend Service

**Basic Settings:**
- **Name**: `student-attendance-frontend`
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`

### Step 4: Add Environment Variable

Click **"Advanced"** → **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://your-backend-url.onrender.com` |

### Step 5: Deploy Frontend

1. Click **"Create Static Site"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, you'll get your frontend URL (e.g., `https://student-attendance-frontend.onrender.com`)

---

## 🔧 Part 3: Configure CORS

Your backend needs to allow requests from your frontend domain.

### Update Laravel CORS Configuration

1. Edit `config/cors.php`:
   ```php
   return [
       'paths' => ['api/*', 'sanctum/csrf-cookie'],
       'allowed_methods' => ['*'],
       'allowed_origins' => [
           'https://student-attendance-frontend.onrender.com',
           'http://localhost:3000', // Keep for local development
       ],
       'allowed_origins_patterns' => [],
       'allowed_headers' => ['*'],
       'exposed_headers' => [],
       'max_age' => 0,
       'supports_credentials' => true,
   ];
   ```

2. Commit and push this change
3. Render will automatically redeploy your backend

---

## ✅ Part 4: Test Your Deployment

1. **Visit your frontend URL**: `https://student-attendance-frontend.onrender.com`
2. **Try logging in** with your test credentials
3. **Test geolocation features**:
   - Open a class as a teacher
   - Sign in as a student
   - Check if geofencing works

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: 500 Internal Server Error**
- Check Render logs: Dashboard → Your Backend Service → Logs
- Make sure all environment variables are set correctly
- Verify `APP_KEY` is generated

**Problem: Airtable connection fails**
- Double-check all Airtable environment variables
- Test your API key in Airtable API playground

### Frontend Issues

**Problem: Can't connect to backend**
- Check if `REACT_APP_API_URL` is set correctly
- Verify CORS is configured properly
- Check browser console for errors

**Problem: 404 on page refresh**
- Make sure "Rewrite Rules" are set in Render:
  - Source: `/*`
  - Destination: `/index.html`

### Geolocation Issues

**Problem: Geolocation not working**
- Render provides HTTPS by default (required for geolocation)
- Check browser permissions
- Test on mobile device for accurate GPS

---

## 🔄 Updating Your Deployment

Render automatically deploys when you push to your GitHub repository:

1. Make changes locally
2. Commit and push to GitHub
3. Render automatically rebuilds and deploys

To manually redeploy:
- Go to your service → Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 💰 Render Free Tier Limits

**Free Plan Includes:**
- ✅ 750 hours/month (enough for testing)
- ✅ Auto-sleep after 15 minutes of inactivity
- ✅ HTTPS included
- ✅ Auto-deploys from GitHub
- ⚠️ Slow cold starts (first request after sleep takes ~30 seconds)

**For Production:**
- Consider upgrading to Starter plan ($7/month) for:
  - No auto-sleep
  - Faster performance
  - More resources

---

## 📝 Environment Variables Checklist

Before deploying, make sure you have these ready:

### Backend
- [ ] `APP_KEY` (auto-generated)
- [ ] `APP_URL` (update after deployment)
- [ ] `AIRTABLE_API_KEY`
- [ ] `AIRTABLE_BASE_ID`
- [ ] `AIRTABLE_TABLE_STUDENTS`
- [ ] `AIRTABLE_TABLE_TEACHERS`
- [ ] `AIRTABLE_TABLE_CLASSES`
- [ ] `AIRTABLE_TABLE_ATTENDANCE`
- [ ] `GEOFENCE_RADIUS`

### Frontend
- [ ] `REACT_APP_API_URL`

---

## 🎉 You're Done!

Your Student Attendance System is now live and accessible from anywhere! 

**Next Steps:**
1. Share the frontend URL with teachers and students
2. Test thoroughly with real users
3. Monitor logs for any issues
4. Consider setting up a custom domain

---

## 📞 Need Help?

If you encounter issues:
1. Check Render logs first
2. Verify all environment variables
3. Test locally to isolate the issue
4. Check browser console for frontend errors

Happy deploying! 🚀

