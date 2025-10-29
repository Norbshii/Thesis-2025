# ⚡ Quick Start - Deploy to Render in 10 Minutes

Follow these steps to get your app live on Render quickly!

---

## 🚀 Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## 🔧 Step 2: Deploy Backend

1. Go to https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `student-attendance-backend`
   - **Build Command**: 
     ```
     composer install --no-dev --optimize-autoloader && php artisan config:cache && php artisan route:cache
     ```
   - **Start Command**: 
     ```
     php artisan serve --host=0.0.0.0 --port=$PORT
     ```
5. Add these environment variables:
   ```
   APP_ENV=production
   APP_DEBUG=false
   AIRTABLE_API_KEY=patziQrv2K0Gi9Ma9.74cab60fc27be24464a3198652c23f0a7189a7a7003ed227dbade557ac36d626
   AIRTABLE_BASE_ID=appT96N6jX4ZWDYUy
   AIRTABLE_TABLE_STUDENTS=tbldCCRCR0hLNv5BN
   AIRTABLE_TABLE_TEACHERS=tbl7UpOOzgZsXMwFg
   AIRTABLE_TABLE_CLASSES=tbl6kzsJkbyl5Cqqr
   AIRTABLE_TABLE_ATTENDANCE=tblXW92OSS8XADH8Y
   GEOFENCE_RADIUS=100
   ```
6. Click **Create Web Service**
7. **Copy your backend URL** (e.g., `https://student-attendance-backend.onrender.com`)

---

## 🎨 Step 3: Deploy Frontend

1. Click **New +** → **Static Site**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `student-attendance-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```
   (Replace with your actual backend URL from Step 2)
5. Click **Create Static Site**

---

## 🔗 Step 4: Update CORS

1. Copy your frontend URL (e.g., `https://student-attendance-frontend.onrender.com`)
2. Edit `config/cors.php` in your code:
   ```php
   'allowed_origins' => [
       'http://localhost:3000',
       'https://student-attendance-frontend.onrender.com', // Add this line
   ],
   ```
3. Commit and push:
   ```bash
   git add config/cors.php
   git commit -m "Add frontend URL to CORS"
   git push
   ```
4. Render will auto-redeploy your backend

---

## ✅ Step 5: Test!

1. Visit your frontend URL
2. Login with your credentials
3. Test the geofencing features
4. Check if attendance records are saved

---

## 🐛 Troubleshooting

**Backend won't start?**
- Check logs in Render dashboard
- Verify all environment variables are set

**Can't connect to backend?**
- Make sure CORS is configured
- Check `REACT_APP_API_URL` is correct

**Geolocation not working?**
- HTTPS is required (Render provides this automatically)
- Check browser permissions

---

## 📞 Need More Help?

See the full guide: `RENDER_DEPLOYMENT_GUIDE.md`

---

That's it! Your app should now be live! 🎉

