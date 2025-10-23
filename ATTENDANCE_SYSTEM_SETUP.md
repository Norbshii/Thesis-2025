# Attendance System Setup Guide

## Overview
The attendance system automatically records student sign-ins with geolocation validation, timestamps, and late status tracking.

---

## Airtable Table Structure

### **Attendance Entries Table**

This table stores all attendance records when students sign in to a class.

#### Required Fields:

| Field Name | Field Type | Description | Example |
|------------|------------|-------------|---------|
| `Class Code` | Single line text | The code of the class | "CS 101" |
| `Class Name` | Single line text | The name of the class | "Introduction to Computing" |
| `Date` | Date | The date of attendance | "2025-10-22" |
| `Teacher` | Email or Single line text | Teacher's email who created the class | "teacher@school.edu" |
| `Student Email` | Email or Single line text | Student's email address | "student@school.edu" |
| `Student Name` | Single line text | Student's full name | "John Doe" |
| `Sign In Time` | Single line text | Time the student signed in | "08:15:30" |
| `Status` | Single select or Single line text | "On Time" or "Late" | "On Time" |
| `Distance` | Number (decimal) | Distance from classroom in meters | 25.5 |
| `Timestamp` | Date with time | Full timestamp of sign-in | "2025-10-22T08:15:30+08:00" |

#### Optional but Recommended Fields:

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `Classes` | Link to another record | Link to Classes table |
| `Student` | Link to another record | Link to Students table |

---

## How the Attendance System Works

### **Flow:**

```
1. Teacher opens class
   ↓
2. Teacher's location captured (geofence set)
   ↓
3. Student clicks "Sign In"
   ↓
4. Student's location captured
   ↓
5. Backend validates:
   - Is class open?
   - Is student enrolled?
   - Is student within 50m geofence?
   ↓
6. If valid → Create attendance record in Airtable
   ↓
7. Attendance record includes:
   - Class info
   - Student info  
   - Sign-in time
   - Status (On Time / Late)
   - Distance from classroom
```

---

## Setup Instructions

### Step 1: Create Attendance Entries Table in Airtable

1. Go to your Airtable base
2. Click **"Add or import"** → **"Create empty table"**
3. Name it: **`Attendance Entries`**
4. Add the following fields:

#### Basic Fields:
- **Class Code** (Single line text)
- **Class Name** (Single line text)
- **Date** (Date)
- **Teacher** (Email or Single line text)
- **Student Email** (Email)
- **Student Name** (Single line text)
- **Sign In Time** (Single line text)
- **Status** (Single select: "On Time", "Late")
- **Distance** (Number, decimal, 2 decimals)
- **Timestamp** (Date with time)

### Step 2: Update .env File

Add this line to your `.env` file:
```
AIRTABLE_TABLE_ATTENDANCE=Attendance Entries
```

Or if using table ID:
```
AIRTABLE_TABLE_ATTENDANCE=tblXXXXXXXXXXXXXX
```

### Step 3: Link to Other Tables (Optional but Recommended)

For better data relationships:

1. **In Attendance Entries table:**
   - Add field: **Classes** (Link to another record → Classes table)
   - Add field: **Student** (Link to another record → Students table)

2. **In Classes table:**
   - Field **Attendance Entries** will automatically be created
   - Shows all attendance records for that class

3. **In Students table:**
   - Add field: **Attendance** (Link to another record → Attendance Entries table)
   - Shows all attendance records for that student

---

## What Gets Recorded

When a student successfully signs in, the following is automatically saved:

### Example Attendance Record:
```
Class Code: "CS 101"
Class Name: "Introduction to Computing"
Date: "2025-10-22"
Teacher: "prof.smith@school.edu"
Student Email: "john.doe@student.edu"
Student Name: "John Doe"
Sign In Time: "08:15:30"
Status: "On Time"
Distance: 25.5
Timestamp: "2025-10-22T08:15:30+08:00"
```

---

## Status Determination

### **"On Time"**
- Student signs in **before** (Start Time + Late Threshold)
- Example: Class starts at 8:00, Late Threshold is 15 minutes
  - Sign in at 8:14 → "On Time"

### **"Late"**
- Student signs in **after** (Start Time + Late Threshold)
- Example: Class starts at 8:00, Late Threshold is 15 minutes
  - Sign in at 8:16 → "Late"

---

## Viewing Attendance Data

### In Airtable:

**View 1: By Class**
1. Go to Attendance Entries table
2. Group by: **Class Code**
3. Sort by: **Sign In Time**
4. Filter: **Date** = Today

**View 2: By Student**
1. Group by: **Student Name**
2. Sort by: **Date** (descending)
3. Shows attendance history per student

**View 3: Late Students**
1. Filter: **Status** = "Late"
2. Group by: **Class Code**
3. Shows all late arrivals

**View 4: By Date**
1. Group by: **Date**
2. Filter: Date is within → Last 7 days
3. Shows weekly attendance

---

## Duplicate Prevention

### Current Behavior:
- Student can sign in multiple times to the same class
- Each sign-in creates a new attendance record

### To Prevent Duplicates (Optional):

**Option 1: Manual Check in Frontend**
- Store signed-in classes in browser state
- Disable sign-in button after first sign-in

**Option 2: Backend Validation**
- Before creating attendance record, check if student already signed in today
- Reject duplicate sign-ins

**Option 3: Airtable Automation**
- Create an automation that removes duplicate records
- Keep only the first sign-in of the day

---

## Exporting Attendance Data

### For Reports:

1. **CSV Export:**
   - Click **"Download CSV"** in Airtable
   - Open in Excel/Google Sheets
   - Filter/sort as needed

2. **By Class:**
   - Filter by Class Code
   - Export to CSV
   - Send to teacher

3. **By Date Range:**
   - Filter: Date is within → Custom range
   - Export to CSV

4. **Summary Report:**
   - Create a view with grouping
   - Count records per student
   - Shows attendance frequency

---

## API Endpoints

### Student Sign-In (POST /api/classes/student-signin)

**Request:**
```json
{
  "classId": "recXXXXXXXXXXXXXX",
  "studentEmail": "student@school.edu",
  "studentName": "John Doe",
  "latitude": 14.5995,
  "longitude": 120.9842
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Signed in successfully (On time)",
  "isLate": false,
  "signInTime": "08:15:30",
  "distance": 25.5
}
```

**What Happens:**
1. Validates geolocation (within 50m)
2. Calculates late status
3. Creates attendance record in Airtable
4. Returns success message

---

## Troubleshooting

### Issue 1: Attendance Not Saving
**Symptoms:** Student signs in successfully but no record in Airtable

**Solutions:**
1. Check field names match exactly (case-sensitive)
2. Verify `AIRTABLE_TABLE_ATTENDANCE` is set in .env
3. Check Laravel logs: `storage/logs/laravel.log`
4. Look for "Failed to save attendance record" error

### Issue 2: Wrong Status (Always "On Time" or "Late")
**Cause:** Start Time or Late Threshold not set correctly

**Solutions:**
1. Check Classes table has **Start Time** field
2. Check Classes table has **Late Threshold** field
3. Verify time format is "HH:mm" (e.g., "08:00")

### Issue 3: Missing Fields Error
**Error:** `UNKNOWN_FIELD_NAME: "Field Name"`

**Solution:** Add the missing field to your Attendance Entries table

### Issue 4: Distance Shows as 0
**Cause:** Geolocation fields not in Classes table

**Solutions:**
1. Add **Teacher Latitude** and **Teacher Longitude** to Classes table
2. Teacher must open class to set geofence
3. Student must allow location access

---

## Statistics & Reports

### Useful Formulas in Airtable:

**Total Attendance Count:**
```
COUNT({Attendance Entries})
```

**Late Percentage:**
```
COUNTIF({Status}, "Late") / COUNT({Attendance Entries}) * 100
```

**Average Distance:**
```
AVERAGE({Distance})
```

**Attendance Rate per Student:**
- Link Students → Attendance Entries
- Create formula: `COUNT({Attendance}) / {Total Classes Enrolled}`

---

## Future Enhancements

Planned features:

- [ ] Prevent duplicate sign-ins on same day
- [ ] Attendance summary dashboard
- [ ] Export attendance reports
- [ ] Email attendance to teachers
- [ ] SMS parent notifications for absences
- [ ] Attendance analytics (graphs/charts)
- [ ] Automated absence marking
- [ ] QR code backup for sign-in

---

## Summary

✅ **Attendance System Features:**
- Automatic attendance recording
- Geolocation validation (50m geofence)
- Late detection based on configurable threshold
- Distance tracking
- Complete audit trail with timestamps
- Easy data export from Airtable
- No duplicate validation needed (each sign-in recorded)

Your attendance data is now automatically saved to Airtable every time a student signs in! 📊✅


