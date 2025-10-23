# Airtable Setup: Enrolled Students Feature

## Problem
Students added to a class disappear when you reload the page because they were only stored in React state (memory).

## Solution
Save enrolled students to Airtable so they persist across page reloads.

---

## Required Airtable Configuration

### Step 1: Add "Enrolled Students" Field to Classes Table

1. Go to your Airtable **Classes** table
2. Click the **+** button to add a new field
3. Configure the field:
   - **Field name**: `Enrolled Students`
   - **Field type**: **Link to another record**
   - **Link to table**: Select your **Students** table
   - **Allow linking to multiple records**: ✅ **Check this box** (very important!)
4. Click **Create field**

---

## What This Does

### Backend Changes Made:
1. ✅ Added `GET /api/students` endpoint to fetch all students
2. ✅ Added `POST /api/classes/add-students` endpoint to add students to a class
3. ✅ Added `POST /api/classes/remove-student` endpoint to remove a student from a class
4. ✅ Updated `GET /api/classes` to include `enrolledStudents` field
5. ✅ Added `getRecord()` method to AirtableService

### Frontend Changes Made:
1. ✅ Updated AdminDashboard to load students from Airtable Students table
2. ✅ Changed enrolled students from array of names to array of student IDs
3. ✅ Updated "Add Students" modal to call backend API when adding students
4. ✅ Updated "Remove Student" functionality to call backend API
5. ✅ Added helper function `getStudentById()` to convert IDs to names for display
6. ✅ Updated enrolled students display to show student name, email, and status

---

## How It Works Now

### When You Add Students to a Class:
1. Frontend sends student IDs to backend: `POST /api/classes/add-students`
2. Backend retrieves current class from Airtable
3. Backend merges new student IDs with existing ones
4. Backend updates the class record in Airtable with the new `Enrolled Students` array
5. Frontend updates local state to reflect the changes

### When You Remove a Student:
1. Frontend sends student ID to backend: `POST /api/classes/remove-student`
2. Backend retrieves current class from Airtable
3. Backend removes the student ID from the `Enrolled Students` array
4. Backend updates the class record in Airtable
5. Frontend updates local state to reflect the changes

### When You Reload the Page:
1. Frontend loads classes from `GET /api/classes`
2. Each class includes the `enrolledStudents` array (student IDs from Airtable)
3. Frontend displays student count: `{enrolledStudents.length}/{maxStudents}`
4. In the "Manage Students" modal, IDs are converted to names using `getStudentById()`

---

## Testing

After adding the "Enrolled Students" field to your Airtable Classes table:

1. **Refresh your admin dashboard**
2. Click "Manage Students" on any class
3. Add some students
4. **Reload the page** (F5 or Ctrl+R)
5. ✅ The students should still be there!

---

## Troubleshooting

### If you get an error like "UNKNOWN_FIELD_NAME: Enrolled Students"
- Make sure you created the field exactly as described above
- Field name must be: `Enrolled Students` (with a space)
- Field type must be: **Link to another record** → **Students** table
- Allow multiple records must be enabled

### If students show as just IDs instead of names
- Make sure the Students table has records with `id`, `name`, `email` fields
- Check browser console for errors
- Try hard refreshing the page (Ctrl+Shift+R)

---

## Next Steps

Once this is working, the enrolled students will:
- ✅ Persist across page reloads
- ✅ Be stored in Airtable
- ✅ Show in the "Manage Students" modal with name, email, and status
- ✅ Can be removed and will be saved permanently

This is a crucial step before implementing attendance tracking!

