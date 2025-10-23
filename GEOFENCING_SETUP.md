# Geofencing & Location-Based Attendance System

## Overview
This feature ensures students can only sign in to a class if they are physically present within **50 meters** of the teacher's location (classroom). It uses the browser's Geolocation API and the Haversine formula for distance calculation.

---

## How It Works

### Teacher Opens Class:
1. **Teacher clicks "Open Class"** button on Admin Dashboard
2. **Browser requests location permission** (if not already granted)
3. **Teacher's coordinates (latitude/longitude) are captured**
4. **Geofence is established** with a 50-meter radius around the teacher's location
5. **Location is saved to Airtable** in the Classes table

### Student Signs In:
1. **Student clicks "Sign In"** button for an open class
2. **Browser requests location permission** (if not already granted)
3. **Student's coordinates are captured**
4. **Backend calculates distance** between student and teacher using the Haversine formula
5. **Validation:**
   - ✅ **Within 50m** → Sign-in allowed (success message with distance)
   - ❌ **Outside 50m** → Sign-in denied (error message with distance)

---

## Required Airtable Fields

Add these fields to your **Classes** table in Airtable:

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `Teacher Latitude` | Number (decimal) | Teacher's latitude when opening class |
| `Teacher Longitude` | Number (decimal) | Teacher's longitude when opening class |
| `Opened At` | Date/Time | Timestamp when class was opened |
| `Closed At` | Date/Time | Timestamp when class was closed |

**Note:** These fields are optional. If they don't exist yet, you'll get `UNKNOWN_FIELD_NAME` errors when opening a class.

---

## Setup Instructions

### Step 1: Add Fields to Airtable

1. Go to your **Classes** table in Airtable
2. Click the **+** button to add new fields
3. Add the following fields:
   - **Field name:** `Teacher Latitude`
     - **Type:** Number
     - **Precision:** Decimal (8 decimal places recommended)
   - **Field name:** `Teacher Longitude`
     - **Type:** Number
     - **Precision:** Decimal (8 decimal places recommended)
   - **Field name:** `Opened At`
     - **Type:** Date (with time)
     - **Include time:** Yes
   - **Field name:** `Closed At`
     - **Type:** Date (with time)
     - **Include time:** Yes

### Step 2: Enable Location Permissions

**For Testing on Localhost:**
- Modern browsers allow geolocation on `localhost` for development
- Click "Allow" when the browser prompts for location access

**For Production (HTTPS Required):**
- Geolocation API only works on HTTPS (secure connections)
- Deploy your app with SSL certificate
- Or use services like ngrok for testing

### Step 3: Test the Feature

#### As Teacher:
1. Login as teacher/admin
2. Go to Admin Dashboard
3. Click **"Open Class"** on any class card
4. **Allow location access** when prompted
5. See success message: "Class opened successfully with geofence (50m radius)"

#### As Student:
1. Login as student
2. Go to Student Dashboard
3. Try to sign in to the open class
4. **Test 1:** If within 50m → See "Signed in successfully (On time)" with distance
5. **Test 2:** If outside 50m → See "You are not within the classroom area. Please move closer to sign in."

---

## API Endpoints

### 1. Open Class with Geofence
**`POST /api/classes/open`**

**Request:**
```json
{
  "classId": "recXXXXXXXXXXXXXX",
  "latitude": 14.5995,
  "longitude": 120.9842
}
```

**Response (Success):**
```json
{
  "message": "Class opened successfully with geofence",
  "class": { ... }
}
```

---

### 2. Close Class
**`POST /api/classes/close`**

**Request:**
```json
{
  "classId": "recXXXXXXXXXXXXXX"
}
```

**Response (Success):**
```json
{
  "message": "Class closed successfully",
  "class": { ... }
}
```

---

### 3. Student Sign-In with Geolocation
**`POST /api/classes/student-signin`**

**Request:**
```json
{
  "classId": "recXXXXXXXXXXXXXX",
  "studentEmail": "student@example.com",
  "studentName": "John Doe",
  "latitude": 14.5996,
  "longitude": 120.9843
}
```

**Response (Success - Within Geofence):**
```json
{
  "success": true,
  "message": "Signed in successfully (On time)",
  "isLate": false,
  "signInTime": "08:15:30",
  "distance": 25.5
}
```

**Response (Error - Outside Geofence):**
```json
{
  "success": false,
  "message": "You are not within the classroom area. Please move closer to sign in.",
  "distance": 125.7,
  "required": 50
}
```

**Response (Error - Class Not Open):**
```json
{
  "success": false,
  "message": "Class is not open for sign-in yet"
}
```

---

## Geofence Configuration

### Default Radius
- **50 meters** (approximately the size of a classroom/small building)

### Customizing the Radius
To change the geofence radius, edit this line in `ClassesController.php`:

```php
// Line 385
$geofenceRadius = 50; // Change to your desired radius in meters
```

**Recommended Radii:**
- **Small classroom:** 20-30 meters
- **Large classroom/lecture hall:** 50 meters (default)
- **School campus:** 100-200 meters
- **University campus:** 500+ meters

---

## Distance Calculation

The system uses the **Haversine formula** to calculate the great-circle distance between two points on Earth (student and teacher locations).

**Formula:**
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c
```

Where:
- `R` = Earth's radius (6,371,000 meters)
- `Δlat` = Difference in latitude
- `Δlon` = Difference in longitude

**Accuracy:** Typically within 0.5% (very accurate for small distances like classrooms)

---

## Error Handling

### Common Errors & Solutions

#### 1. "Geolocation is not supported by your browser"
- **Cause:** Browser doesn't support Geolocation API
- **Solution:** Use a modern browser (Chrome, Firefox, Safari, Edge)

#### 2. "Location permission denied"
- **Cause:** User denied location access
- **Solution:** Go to browser settings and enable location for the site

#### 3. "Location unavailable"
- **Cause:** GPS signal lost or device doesn't have GPS
- **Solution:** Move to area with better GPS signal or enable Wi-Fi for better accuracy

#### 4. "Location request timed out"
- **Cause:** GPS took too long to respond
- **Solution:** Try again or check device settings

#### 5. "UNKNOWN_FIELD_NAME: Teacher Latitude"
- **Cause:** Airtable fields not created yet
- **Solution:** Add the required fields to your Classes table (see Step 1)

#### 6. "You are not within the classroom area"
- **Cause:** Student is outside the 50m geofence
- **Solution:** Student needs to physically move closer to the classroom

---

## Security & Privacy

### Location Data Storage:
- **Teacher location:** Stored in Airtable only while class is open
- **Student location:** NOT stored (only used for distance validation)
- **Data cleared:** When teacher closes the class

### Privacy Considerations:
- Location is only requested when opening/signing in
- Students must grant permission each time
- Location is not tracked continuously
- Only distance is shown, not exact coordinates

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Yes | Full support |
| Firefox | ✅ Yes | Full support |
| Safari | ✅ Yes | Full support (iOS requires HTTPS) |
| Edge | ✅ Yes | Full support |
| Internet Explorer | ❌ No | Not supported |

**Mobile Support:**
- ✅ iOS Safari (requires HTTPS)
- ✅ Android Chrome
- ✅ Android Firefox

---

## Testing Tips

### 1. Test on Different Devices
- Desktop/laptop (less accurate GPS)
- Smartphone (more accurate GPS)
- Tablet

### 2. Test Location Spoofing (for development)
**Chrome DevTools:**
1. Open DevTools (F12)
2. Click the 3 dots menu → More tools → Sensors
3. Set custom location (latitude/longitude)

**Firefox:**
1. Type `about:config` in address bar
2. Search `geo.enabled`
3. Install location spoofing extension

### 3. Test Edge Cases
- Student exactly at 50m boundary
- Student with location services disabled
- Class not yet opened
- Class already closed

---

## Future Enhancements

### Planned Features:
- [ ] Attendance records stored in separate Attendance table
- [ ] SMS notifications to parents (using Twilio/similar)
- [ ] Configurable geofence radius per class
- [ ] Location history for teachers
- [ ] Map view showing geofence boundary
- [ ] Auto-close class after end time

---

## Troubleshooting

### Geolocation not working on localhost?
- **Solution:** Most browsers allow geolocation on localhost. Check browser console for errors.

### "Class opened but students can't sign in"?
- **Check:** Is the class showing as "Open" on student dashboard?
- **Check:** Do the Airtable fields exist (`Teacher Latitude`, `Teacher Longitude`)?
- **Check:** Is student's browser asking for location permission?

### Distance calculation seems wrong?
- **Check:** Are both teacher and student locations being captured correctly?
- **Note:** Initial GPS lock may be inaccurate. Wait a few seconds and try again.

---

## Summary

✅ **Geofencing Implemented!**

- Teachers open class → Set 50m geofence
- Students sign in → Location validated
- Outside geofence → Sign-in blocked
- Within geofence → Sign-in allowed + late detection

This ensures **physical presence** for attendance! 🎯📍


