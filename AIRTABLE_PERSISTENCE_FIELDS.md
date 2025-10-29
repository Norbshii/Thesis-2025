# 🔧 Airtable Fields for Class Persistence

## 📋 **Required Fields in `Classes` Table:**

Add these fields to your Airtable `Classes` table for full persistence:

| Field Name | Field Type | Required | Description |
|------------|------------|----------|-------------|
| `isOpen` | **Checkbox** | ✅ **YES** | Tracks if class is currently open for sign-in |
| `Current Session Lat` | **Number** | ⚠️ Recommended | Teacher's latitude when class opened (for geofencing) |
| `Current Session Lon` | **Number** | ⚠️ Recommended | Teacher's longitude when class opened (for geofencing) |
| `Current Session Opened` | **Date** | ⚠️ Recommended | When the current session started (for late calculation) |

---

## ✅ **How to Add These Fields:**

### **Step 1: Add `isOpen` Field (REQUIRED)**
1. Open your Airtable base
2. Go to `Classes` table
3. Click **+** (Add field)
4. Select **Checkbox** as field type
5. Name it: `isOpen`
6. Click **Create field**

✅ **This field enables persistence!**

---

### **Step 2: Add Geofencing Fields (Recommended)**

**Add `Current Session Lat`:**
1. Click **+** (Add field)
2. Select **Number** as field type
3. Name it: `Current Session Lat`
4. Format: **Decimal** (8 decimal places)
5. Allow negative numbers: ✅
6. Click **Create field**

**Add `Current Session Lon`:**
1. Click **+** (Add field)
2. Select **Number** as field type
3. Name it: `Current Session Lon`
4. Format: **Decimal** (8 decimal places)
5. Allow negative numbers: ✅
6. Click **Create field**

✅ **These fields enable geofencing!**

---

### **Step 3: Add Session Timestamp (Recommended)**

**Add `Current Session Opened`:**
1. Click **+** (Add field)
2. Select **Date** as field type
3. Name it: `Current Session Opened`
4. Include time: ✅
5. Time format: **24 hour** or **12 hour** (your choice)
6. Date format: **Local** or **GMT** (recommend GMT)
7. Click **Create field**

✅ **This field enables accurate late tracking!**

---

## 🎯 **What Happens If Fields Are Missing:**

### **If `isOpen` is missing:**
- ❌ Status won't persist after reload
- ❌ Status won't sync across devices
- ⚠️ **This is the CRITICAL field!**

### **If geofencing fields are missing:**
- ⚠️ Class will open without geofencing
- ⚠️ Students can sign in from anywhere
- ✅ Basic attendance still works
- Backend will show warning in logs

### **If `Current Session Opened` is missing:**
- ⚠️ Late calculation uses class `Start Time` instead
- ⚠️ Less accurate for flexible start times
- ✅ Late detection still works (based on scheduled time)

---

## 🔍 **How to Verify Fields Exist:**

### **Method 1: Visual Check**
1. Open Airtable → Your Base → `Classes` table
2. Look at column headers
3. Confirm you see:
   - ✅ `isOpen` (checkbox icon)
   - ✅ `Current Session Lat` (number icon)
   - ✅ `Current Session Lon` (number icon)
   - ✅ `Current Session Opened` (calendar icon)

### **Method 2: Test Opening a Class**
1. Open your admin dashboard
2. Click "Open Class"
3. Allow location access
4. Go to Airtable → Classes table
5. Check the class row:
   - ✅ `isOpen` should be **checked** ✓
   - ✅ `Current Session Lat` should have a number (e.g., 10.7019)
   - ✅ `Current Session Lon` should have a number (e.g., 122.5622)
   - ✅ `Current Session Opened` should show date & time

### **Method 3: Check Backend Logs**
1. Look at Laravel logs: `storage/logs/laravel.log`
2. After opening a class, check for:
   ```
   [INFO] Class opened successfully with geofence
   ```
3. If you see warning:
   ```
   [WARNING] Could not save session fields, opening without geofence
   ```
   → Fields are missing in Airtable!

---

## 📊 **Complete Classes Table Structure:**

Your `Classes` table should have at least these fields:

| Field Name | Type | Purpose |
|------------|------|---------|
| `Class Code` | Single line text | Unique identifier (e.g., "CS 101") |
| `Class Name` | Single line text | Display name (e.g., "Intro to CS") |
| `Date` | Date | Scheduled class date |
| `Start Time` | Single line text | When class starts (e.g., "09:00") |
| `End Time` | Single line text | When class ends (e.g., "10:30") |
| `Max Students` | Number | Maximum enrollment |
| `Late Threshold` | Number | Minutes late before marked late (e.g., 15) |
| `Teacher` | Email | Teacher's email address |
| `Enrolled Students` | Link to Students | Linked student records |
| `isOpen` ✨ | **Checkbox** | **Persistence field** |
| `Current Session Lat` ✨ | **Number** | **Geofencing field** |
| `Current Session Lon` ✨ | **Number** | **Geofencing field** |
| `Current Session Opened` ✨ | **Date** | **Late tracking field** |

✨ = New fields for persistence & geofencing

---

## 🚀 **Quick Setup Command:**

Unfortunately, Airtable doesn't support CLI field creation. You must add them manually via the web interface. But it only takes **2 minutes**!

---

## ✅ **After Adding Fields:**

1. **No code changes needed!** The backend already checks for these fields
2. **No restart needed!** Laravel picks them up automatically
3. **Test immediately!** Open a class and check Airtable

---

## 🎊 **Benefits of Having All Fields:**

✅ **Full Persistence** - Status survives reloads & device changes  
✅ **Geofencing** - Students must be physically present  
✅ **Accurate Late Tracking** - Based on actual open time  
✅ **Audit Trail** - See when classes were opened  
✅ **Multi-Device Sync** - All devices see same status  

---

## 🔄 **Migration from Old Setup:**

If you already have classes without these fields:

**Good News:** Existing classes will work fine!
- New field values start as empty/unchecked
- First time you open a class, fields populate
- No data loss or migration needed

**Your existing class data is safe!** ✅

---

## 📞 **Quick Reference:**

**CRITICAL field (must have):**
- `isOpen` (Checkbox)

**Recommended fields (for full features):**
- `Current Session Lat` (Number, decimals)
- `Current Session Lon` (Number, decimals)
- `Current Session Opened` (Date with time)

**Add these 4 fields = Complete persistence & geofencing!** 🎉

---

**Ready to add these fields? It takes 2 minutes!** ⏱️

