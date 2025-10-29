# 📱 Semaphore SMS Integration Setup Guide

Complete guide to set up SMS notifications for guardian alerts.

---

## 🎯 What This Does

When a student signs in to class, their guardian automatically receives an SMS:

**On Time:**
```
PinPoint Alert: Your child Dave Emanuel Lima signed in on time to Software Engineering at 2:30 PM with Prof. Santos.
```

**Late:**
```
PinPoint Alert: Your child Dave Emanuel Lima signed in LATE to Software Engineering at 2:45 PM. Expected: 2:30 PM. Teacher: Prof. Santos.
```

**No Phone Number:**
```
Please add your guardian's phone number in your profile before signing in.
```

---

## 🚀 Step 1: Create Semaphore Account

1. **Go to**: https://semaphore.co
2. **Click "Sign Up"**
3. **Fill in your details**:
   - Name
   - Email
   - Password
   - Company: Your School Name
   - Country: Philippines
4. **Verify your email**
5. **Login to your dashboard**

---

## 💰 Step 2: Add Credits

1. **Go to**: Dashboard → **Buy Credits**
2. **Choose amount**:
   - ₱100 = ~100-200 messages
   - ₱500 = ~500-1000 messages
   - ₱1000 = ~1000-2000 messages
3. **Payment methods**:
   - GCash
   - PayMaya
   - Credit/Debit Card
   - Bank Transfer
4. **Complete payment**

**Pricing:** ~₱0.50-1.00 per SMS

---

## 🔑 Step 3: Get Your API Key

1. **Login to Semaphore dashboard**
2. **Go to**: Account → **API**
3. **Copy your API Key** (looks like: `abc123def456...`)
4. **Save it** - you'll need this for Step 4

---

## ⚙️ Step 4: Configure Your App

### **Local Development (.env file):**

Open your `.env` file and add:

```env
# Semaphore SMS Configuration
SEMAPHORE_API_KEY=your_api_key_here
SEMAPHORE_SENDER_NAME=PinPoint
```

**Replace** `your_api_key_here` with your actual API key from Step 3.

### **Render Production:**

1. **Go to**: Render Dashboard → **pinpoint-v4o2** (backend)
2. **Click**: Environment tab
3. **Add these environment variables**:

| Key | Value |
|-----|-------|
| `SEMAPHORE_API_KEY` | Your API key from Semaphore |
| `SEMAPHORE_SENDER_NAME` | `PinPoint` |

4. **Save and redeploy**

---

## 🧪 Step 5: Test SMS

### **Test Locally:**

1. **Make sure** `.env` has your `SEMAPHORE_API_KEY`
2. **Start your backend**: `php artisan serve`
3. **Start your frontend**: `npm start`
4. **Sign in as a student** who has `guardianPhone` in Airtable
5. **Check**:
   - Guardian should receive SMS
   - Check Laravel logs: `storage/logs/laravel.log`

### **Test on Render:**

1. **Make sure** Environment variables are set in Render
2. **Deploy** both backend and frontend
3. **Sign in as a student**
4. **Guardian receives SMS!**

---

## ✅ Features Included

### **1. Guardian Phone Required**
- Students MUST add guardian phone before signing in
- Shows error message if phone is missing

### **2. Different Messages for Late/On Time**
- **On Time**: Standard message
- **Late**: Mentions "LATE" and expected time

### **3. Phone Number Formats Supported**
- `09123456789` (with 0)
- `9123456789` (without 0)
- `+639123456789` (international)
- `639123456789` (country code)

All automatically converted to correct format!

### **4. Error Handling**
- If SMS fails, sign-in still works
- Errors logged for debugging
- Guardian still gets notified (just might be delayed)

---

## 💡 SMS Message Examples

### **Regular Sign-In:**
```
PinPoint Alert: Your child Maria Santos signed in on time to Math 101 at 8:00 AM with Mrs. Cruz.
```

### **Late Sign-In:**
```
PinPoint Alert: Your child Juan Reyes signed in LATE to Physics Lab at 10:45 AM. Expected: 10:30 AM. Teacher: Mr. Garcia.
```

---

## 🔍 Troubleshooting

### **SMS Not Sending?**

**Check 1: API Key**
```bash
# In backend terminal
php artisan tinker
>>> env('SEMAPHORE_API_KEY')
# Should show your API key
```

**Check 2: Credits**
- Login to Semaphore dashboard
- Check if you have remaining credits

**Check 3: Phone Number**
- Make sure guardian phone is in Airtable
- Format: `09123456789` or `9123456789`

**Check 4: Logs**
```bash
# Check Laravel logs
tail -f storage/logs/laravel.log
```

Look for:
- `SMS sent successfully`
- `SMS sending failed`
- Error messages

### **"SMS service not configured"**
- Make sure `SEMAPHORE_API_KEY` is set in `.env` (local) or Render (production)

### **"Invalid phone number format"**
- Guardian phone must be 11 digits starting with 09
- Or 10 digits starting with 9
- Or 12 digits starting with 63

### **Student can't sign in**
- If guardian phone is missing, student will see error
- Student needs to add phone in their profile first

---

## 💰 Cost Estimation

**Example:** 100 students, 5 days/week, 20 weeks

- 100 students × 5 days × 20 weeks = 10,000 SMS
- Cost: ₱5,000 - ₱10,000 per semester
- Per student: ₱50-100 per semester

**Very affordable** for peace of mind! 📱

---

## 🎓 Best Practices

1. **Start with ₱100** to test
2. **Monitor usage** in Semaphore dashboard
3. **Top up regularly** - low balance = no SMS
4. **Inform parents** they'll receive SMS
5. **Keep backup** of API key

---

## 🆘 Need Help?

**Semaphore Support:**
- Email: support@semaphore.co
- Website: https://semaphore.co/docs

**Your Development Team:**
- Check Laravel logs
- Check Render logs
- Test locally first

---

## 🎉 You're All Set!

Your SMS notification system is ready! Students' guardians will now receive real-time attendance alerts! 📲✅

