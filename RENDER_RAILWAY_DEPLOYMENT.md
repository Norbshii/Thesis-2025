# 🚀 DEPLOYMENT GUIDE: Render + Railway (MySQL + WebSockets)

## 📋 OVERVIEW

**What Changed:**
- ❌ **OLD:** Airtable database
- ✅ **NEW:** MySQL database on Railway
- ✅ **NEW:** WebSockets for real-time updates
- ✅ **NEW:** Auto-open/close classes (cron jobs)

**Services:**
1. **Railway** - MySQL Database
2. **Render Backend** - Laravel API + WebSocket Server
3. **Render Frontend** - React App

---

## 🗄️ PART 1: RAILWAY (MySQL DATABASE)

### Step 1: Create Railway MySQL Database

1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click **"New Project"**
4. Select **"Provision MySQL"**
5. Click **"Deploy"**

### Step 2: Get Database Credentials

Once deployed, click on your MySQL service and go to **"Variables"** tab.

You'll see:
```
MYSQLHOST=containers-us-west-XXX.railway.app
MYSQLPORT=XXXX
MYSQLDATABASE=railway
MYSQLUSER=root
MYSQLPASSWORD=XXXXXXXXXXXXX
MYSQL_URL=mysql://root:password@host:port/railway
```

**Copy these values!** You'll need them for Render.

### Step 3: Import Your Local Database to Railway

**Option A: Using Railway CLI (Recommended)**

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Link to your project:
```bash
railway link
```

4. Export your local database:
```bash
# In your project directory (where XAMPP is running)
mysqldump -u root -p pinpoint_db > database_backup.sql
# Enter your XAMPP MySQL password when prompted
```

5. Import to Railway:
```bash
# Get Railway MySQL shell
railway run mysql -h $MYSQLHOST -P $MYSQLPORT -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < database_backup.sql
```

**Option B: Using phpMyAdmin (Easier)**

1. In your local phpMyAdmin:
   - Select `pinpoint_db`
   - Click **"Export"** tab
   - Format: **SQL**
   - Click **"Export"** button
   - Save the `.sql` file

2. Connect to Railway database using a MySQL client:
   - Download [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) or [TablePlus](https://tableplus.com/)
   - Create new connection with Railway credentials
   - Open connection
   - Run the exported SQL file

---

## 🔧 PART 2: RENDER BACKEND (Laravel)

### Step 1: Update Environment Variables on Render

Go to your **Backend service** on Render → **Environment** tab.

**REMOVE these Airtable variables:**
```
AIRTABLE_API_KEY
AIRTABLE_BASE_ID
AIRTABLE_TABLE_TEACHERS
AIRTABLE_TABLE_STUDENTS
AIRTABLE_TABLE_CLASSES
AIRTABLE_TABLE_ATTENDANCE
```

**ADD/UPDATE these MySQL + WebSocket variables:**

```bash
# Database (from Railway)
DB_CONNECTION=mysql
DB_HOST=containers-us-west-XXX.railway.app
DB_PORT=XXXX
DB_DATABASE=railway
DB_USERNAME=root
DB_PASSWORD=XXXXXXXXXXXXX

# Broadcasting (WebSockets)
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=pinpoint
PUSHER_APP_KEY=pinpointkey
PUSHER_APP_SECRET=pinpointsecret
PUSHER_APP_CLUSTER=mt1

# Email (Resend - keep existing)
RESEND_API_KEY=re_XXXXXXXXXXXXXXXX
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=onboarding@resend.dev
MAIL_FROM_NAME="PinPoint Attendance"

# App Settings (keep existing)
APP_NAME=PinPoint
APP_ENV=production
APP_KEY=base64:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
APP_DEBUG=false
APP_URL=https://your-backend.onrender.com

# Session/Cache (keep existing)
SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=database
```

### Step 2: Update Build Command

Go to **Settings** → **Build & Deploy**

**Build Command:**
```bash
composer install --no-dev --optimize-autoloader && php artisan config:cache && php artisan route:cache && php artisan view:cache
```

### Step 3: Update Start Command

**⚠️ IMPORTANT:** You need to run **TWO processes** on Render:

**Option A: Using Procfile (Recommended)**

Create a file named `Procfile` (no extension) in your project root:

```
web: php artisan serve --host=0.0.0.0 --port=$PORT
websocket: php artisan websockets:serve --host=0.0.0.0 --port=6001
worker: php artisan schedule:work
```

**Then update Render Start Command to:**
```bash
sh -c 'php artisan websockets:serve --host=0.0.0.0 --port=6001 & php artisan schedule:work & php artisan serve --host=0.0.0.0 --port=$PORT'
```

This runs:
1. WebSocket server on port 6001
2. Laravel Scheduler (for auto-open/close classes)
3. Laravel API server

### Step 4: Add Custom Headers (CORS for WebSockets)

Go to **Settings** → **Headers & Redirects**

Add custom header:
```
Key: Access-Control-Allow-Origin
Value: *
```

### Step 5: Expose WebSocket Port

Render doesn't support multiple ports on free tier. You have **2 options**:

**Option 1: Use External Pusher (Free Tier - Recommended)**

Instead of self-hosted WebSockets, use Pusher.com (free tier):

1. Go to [Pusher.com](https://pusher.com)
2. Create free account
3. Create new app/channel
4. Copy credentials
5. Update Render env variables:
```bash
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=123456
PUSHER_APP_KEY=your_actual_key
PUSHER_APP_SECRET=your_actual_secret
PUSHER_APP_CLUSTER=ap1
PUSHER_HOST=
PUSHER_PORT=
PUSHER_SCHEME=https
```

6. Update `config/broadcasting.php`:
```php
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'cluster' => env('PUSHER_APP_CLUSTER'),
        'encrypted' => true,
        'host' => env('PUSHER_HOST') ?: null,
        'port' => env('PUSHER_PORT') ?: null,
        'scheme' => env('PUSHER_SCHEME', 'https'),
        'useTLS' => true,
    ],
],
```

**Option 2: Upgrade Render Plan ($25/mo)**

This allows multiple ports and background workers.

### Step 6: Run Migrations

After deployment, run migrations via Render Shell:

1. Go to your Backend service
2. Click **"Shell"** tab
3. Run:
```bash
php artisan migrate --force
```

---

## 🎨 PART 3: RENDER FRONTEND (React)

### Step 1: Update Environment Variables

Go to your **Frontend service** on Render → **Environment** tab.

**UPDATE these variables:**

```bash
# Backend API (your Render backend URL)
REACT_APP_API_URL=https://your-backend.onrender.com

# WebSocket Configuration (Option 1: Pusher.com)
REACT_APP_PUSHER_KEY=your_actual_key
REACT_APP_PUSHER_CLUSTER=ap1
REACT_APP_PUSHER_HOST=
REACT_APP_PUSHER_PORT=
REACT_APP_PUSHER_SCHEME=https

# OR (Option 2: Self-hosted - if you have paid plan)
REACT_APP_PUSHER_KEY=pinpointkey
REACT_APP_PUSHER_CLUSTER=mt1
REACT_APP_PUSHER_HOST=your-backend.onrender.com
REACT_APP_PUSHER_PORT=6001
REACT_APP_PUSHER_SCHEME=https
```

### Step 2: Update Echo Configuration

Update `src/services/echo.js` to use environment variables:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.REACT_APP_PUSHER_KEY || 'pinpointkey',
    cluster: process.env.REACT_APP_PUSHER_CLUSTER || 'mt1',
    wsHost: process.env.REACT_APP_PUSHER_HOST || window.location.hostname,
    wsPort: process.env.REACT_APP_PUSHER_PORT || 6001,
    wssPort: process.env.REACT_APP_PUSHER_PORT || 6001,
    forceTLS: process.env.REACT_APP_PUSHER_SCHEME === 'https',
    encrypted: true,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${process.env.REACT_APP_API_URL}/broadcasting/auth`,
});

export default echo;
```

### Step 3: Build Command (Should Already Be Set)

```bash
npm install && npm run build
```

### Step 4: Publish Directory (Should Already Be Set)

```
build
```

---

## ⏰ PART 4: AUTO-OPEN/CLOSE CLASSES (CRON JOBS)

Your Laravel Scheduler needs to run continuously.

### Option 1: Using Render Cron Jobs (Free)

1. Create a new **Cron Job** service on Render
2. **Command:**
```bash
php artisan classes:auto-manage
```
3. **Schedule:** Every minute (`* * * * *`)
4. **Environment:** Copy same env variables from Backend

### Option 2: Using Background Worker (Render Paid Plan)

Already included in the Start Command from Part 2, Step 3:
```bash
php artisan schedule:work &
```

This runs in the background continuously.

---

## 🧪 TESTING YOUR DEPLOYMENT

### Test 1: Database Connection

Open Render Shell for Backend:
```bash
php artisan tinker
```

Run:
```php
\DB::connection()->getPdo();
\App\Models\ClassModel::count();
\App\Models\Student::count();
```

Should show counts, not errors.

### Test 2: WebSockets

Open browser console on your frontend:
```javascript
// Should show WebSocket connection
console.log('WebSocket connected:', echo.connector.pusher.connection.state);
```

### Test 3: Real-Time Updates

1. Open Teacher Dashboard in Chrome
2. Open Student Dashboard in Firefox
3. Teacher opens a class
4. **Student should see "OPEN" status immediately** (< 1 second)

### Test 4: Auto-Open/Close

1. Create a test class that starts in 2 minutes
2. Wait 2 minutes
3. **Class should auto-open** (check backend logs)
4. Wait until end time + 1 minute
5. **Class should auto-close**

---

## 📝 DEPLOYMENT CHECKLIST

### Before Deploying:

- [ ] Export local database from phpMyAdmin
- [ ] Create Railway MySQL database
- [ ] Import database to Railway
- [ ] Get Railway connection credentials
- [ ] Sign up for Pusher.com (or plan to upgrade Render)
- [ ] Update `src/services/echo.js` for production

### Render Backend:

- [ ] Remove Airtable env variables
- [ ] Add Railway MySQL env variables
- [ ] Add Pusher/WebSocket env variables
- [ ] Update Start Command (include scheduler & websockets)
- [ ] Add CORS headers
- [ ] Redeploy
- [ ] Run migrations via Shell

### Render Frontend:

- [ ] Add WebSocket env variables
- [ ] Update echo.js configuration
- [ ] Redeploy

### Test Everything:

- [ ] Database connection works
- [ ] API endpoints respond
- [ ] Login works
- [ ] WebSocket connection established
- [ ] Real-time updates work
- [ ] Auto-open/close works (wait for scheduled time)
- [ ] Email notifications work

---

## 🚨 TROUBLESHOOTING

### "SQLSTATE[HY000] [2002] Connection refused"

**Fix:** Double-check Railway credentials in Render env variables.

### "WebSocket connection failed"

**Fix:** 
- Make sure WebSocket server is running (check Render logs)
- OR use Pusher.com instead (easier for free tier)

### "Class didn't auto-open/close"

**Fix:** 
- Check if scheduler is running: `ps aux | grep schedule`
- Check logs: `tail -f storage/logs/laravel.log`
- Make sure cron job is set up on Render

### "429 Too Many Requests" (even with WebSockets)

**Fix:** 
- Make sure frontend is using WebSockets (check browser console)
- Check that old polling code is removed
- Verify echo.js is imported and initialized

---

## 💰 COST BREAKDOWN

**Free Tier:**
- Railway: $5/month (free $5 credit)
- Render Backend: Free (with sleep after inactivity)
- Render Frontend: Free
- Pusher: Free (100 connections, 200k messages/day)
- Resend: Free (100 emails/day)

**Total: FREE** (with $5 Railway credit)

**Paid Option (Better Performance):**
- Railway: $5/month
- Render Backend: $25/month (for background workers + multiple ports)
- Render Frontend: Free
- **Total: $30/month**

---

## 📚 HELPFUL COMMANDS

**Check Database Connection:**
```bash
php artisan tinker
\DB::connection()->getPdo();
```

**Check Migrations:**
```bash
php artisan migrate:status
```

**Check Scheduler:**
```bash
php artisan schedule:list
```

**Manually Run Auto-Manage:**
```bash
php artisan classes:auto-manage
```

**Clear All Caches:**
```bash
php artisan optimize:clear
```

---

Made with ❤️ for your deployment!

