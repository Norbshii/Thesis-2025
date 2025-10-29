# ✅ Render Deployment Checklist

Use this checklist to make sure everything is ready before deploying!

---

## 📋 Pre-Deployment Checklist

### Code Preparation
- [ ] All changes committed to Git
- [ ] Code pushed to GitHub
- [ ] `.env` file is in `.gitignore` (already done ✅)
- [ ] `build.sh` has executable permissions
- [ ] `config/cors.php` is ready for frontend URL

### Airtable Setup
- [ ] All required Airtable fields exist:
  - **Students Table**: email, name, age, department, password
  - **Teachers Table**: email, name, department, password
  - **Classes Table**: Class Code, Class Name, Start Time, End Time, Teacher, isOpen, Current Session Lat, Current Session Lon, Current Session Opened, Late Threshold, Enrolled Students
  - **Attendance Entries Table**: Class Code, Class Name, Date, Teacher Email, Student Email, Student Name, Sign In Time, Status, Distance, Timestamp

- [ ] You have these Airtable values ready:
  - [ ] API Key: `pat...`
  - [ ] Base ID: `app...`
  - [ ] Students Table ID: `tbl...`
  - [ ] Teachers Table ID: `tbl...`
  - [ ] Classes Table ID: `tbl...`
  - [ ] Attendance Table ID: `tbl...`

### Testing
- [ ] App works locally on `http://localhost:3000`
- [ ] Backend API works on `http://localhost:8000`
- [ ] Login works for both teacher and student
- [ ] Geolocation works (HTTPS required in production)
- [ ] Classes can be created and opened
- [ ] Students can sign in to classes
- [ ] Attendance records are saved to Airtable

---

## 🚀 Deployment Steps

### Step 1: Backend Deployment
- [ ] Created Web Service on Render
- [ ] Set build command
- [ ] Set start command
- [ ] Added all environment variables (see list below)
- [ ] Deployment successful
- [ ] Backend URL copied: `https://______.onrender.com`

### Step 2: Frontend Deployment
- [ ] Created Static Site on Render
- [ ] Set build command: `npm install && npm run build`
- [ ] Set publish directory: `build`
- [ ] Added `REACT_APP_API_URL` environment variable
- [ ] Deployment successful
- [ ] Frontend URL copied: `https://______.onrender.com`

### Step 3: CORS Configuration
- [ ] Added frontend URL to `config/cors.php`
- [ ] Committed and pushed changes
- [ ] Backend redeployed automatically

---

## 🔑 Required Environment Variables

### Backend (11 variables)
```
✅ APP_NAME=StudentAttendance
✅ APP_ENV=production
✅ APP_DEBUG=false
✅ APP_KEY=(auto-generated)
✅ APP_URL=https://your-backend-url.onrender.com
✅ AIRTABLE_API_KEY=pat...
✅ AIRTABLE_BASE_ID=app...
✅ AIRTABLE_TABLE_STUDENTS=tbl...
✅ AIRTABLE_TABLE_TEACHERS=tbl...
✅ AIRTABLE_TABLE_CLASSES=tbl...
✅ AIRTABLE_TABLE_ATTENDANCE=tbl...
✅ GEOFENCE_RADIUS=100
```

### Frontend (1 variable)
```
✅ REACT_APP_API_URL=https://your-backend-url.onrender.com
```

---

## 🧪 Post-Deployment Testing

### Teacher Flow
- [ ] Login as teacher
- [ ] View dashboard with classes
- [ ] Create a new class
- [ ] Add students to class
- [ ] Open class (geolocation should work)
- [ ] View class details
- [ ] View attendance records
- [ ] Close class

### Student Flow
- [ ] Login as student
- [ ] View enrolled classes
- [ ] Sign in to an open class (within geofence)
- [ ] Try signing in from outside geofence (should fail)
- [ ] Try signing in to closed class (should fail)
- [ ] Verify attendance record appears in teacher's view

### Data Verification
- [ ] Check Airtable Attendance Entries table
- [ ] Verify correct date/time (Philippines timezone)
- [ ] Verify status (On Time vs Late)
- [ ] Verify distance calculation
- [ ] Verify all student information is correct

---

## 🐛 Common Issues & Solutions

### Issue: Backend returns 500 error
**Solution:**
1. Check Render logs: Dashboard → Backend Service → Logs
2. Verify all environment variables are set
3. Make sure `APP_KEY` is generated
4. Check Airtable credentials

### Issue: Frontend can't connect to backend
**Solution:**
1. Verify `REACT_APP_API_URL` is correct
2. Check CORS configuration in `config/cors.php`
3. Make sure backend is running (check Render status)

### Issue: Geolocation not working
**Solution:**
1. Ensure you're using HTTPS (Render provides this)
2. Check browser permissions
3. Test on mobile device for accurate GPS
4. Temporarily increase `GEOFENCE_RADIUS` for testing

### Issue: Time is wrong (not Philippines time)
**Solution:**
1. Verify `config/app.php` has `'timezone' => 'Asia/Manila'`
2. Clear config cache: `php artisan config:clear`
3. Redeploy

### Issue: App sleeps after 15 minutes (free tier)
**Solution:**
1. This is normal on free tier
2. First request after sleep takes ~30 seconds
3. Upgrade to Starter plan ($7/month) to prevent sleep

---

## 📊 Render Dashboard

Monitor your apps:
- **Backend Logs**: https://dashboard.render.com → Your Backend Service → Logs
- **Frontend Logs**: https://dashboard.render.com → Your Static Site → Logs
- **Metrics**: Check CPU, Memory, Request count

---

## 🎯 Production Readiness

Before going live with real users:

- [ ] Test with multiple students simultaneously
- [ ] Verify geofence accuracy in actual classroom
- [ ] Test with different devices (iOS, Android)
- [ ] Set `GEOFENCE_RADIUS` appropriately (100m recommended)
- [ ] Set `APP_DEBUG=false` in production
- [ ] Consider upgrading to paid Render plan
- [ ] Set up error monitoring
- [ ] Create backup of Airtable data
- [ ] Document admin procedures for teachers

---

## 🔄 Updating Your Deployment

Render auto-deploys on Git push:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically:
1. Pull latest code
2. Run build command
3. Deploy new version

Manual redeploy:
- Dashboard → Your Service → "Manual Deploy" → "Deploy latest commit"

---

## 💡 Tips

1. **Use Render's free SSL** - HTTPS is automatic
2. **Monitor logs** - Check for errors regularly
3. **Test thoroughly** - Use test accounts before real deployment
4. **Backup Airtable** - Export data regularly
5. **Document changes** - Keep track of what you deploy

---

## 🎉 Success!

When all checkboxes are ticked, your app is live and ready for testing!

**Next Steps:**
1. Share URLs with test users
2. Gather feedback
3. Monitor performance
4. Iterate and improve

Good luck with your deployment! 🚀

