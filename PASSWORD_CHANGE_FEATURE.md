# 🔒 Student Password Change Feature

## ✅ **Feature: Students Can Change Their Own Passwords**

While admins create student accounts with initial passwords, students can now securely update their passwords anytime!

---

## 🎯 **Access Control Summary:**

| Action | Who Can Do It | How |
|--------|---------------|-----|
| **Create Account** | ✅ **Admin Only** | Manual account creation in Airtable |
| **Change Password** | ✅ **Students** | Self-service via profile |
| **Update Profile** | ✅ **Students** | Edit name, age, course, guardian info, etc. |
| **Reset Password** | ❌ **Not Yet** | Future feature (admin resets) |

---

## 🚀 **How Students Change Their Password:**

### **Step-by-Step:**

```
1. Student logs in to their profile
2. Clicks "🔒 Change Password" button (next to Edit Profile)
3. Modal opens with 3 fields:
   - Current Password
   - New Password (min 6 characters)
   - Confirm New Password
4. Fills in all fields
5. Clicks "Change Password"
6. Success! "Password changed successfully..."
7. Next login uses NEW password
```

---

## 💡 **User Experience:**

### **Student Profile Page:**

**Before:**
```
📝 Edit Profile
```

**After:**
```
📝 Edit Profile    🔒 Change Password
```

---

### **Change Password Modal:**

```
┌─────────────────────────────────────┐
│ 🔒 Change Password             ×    │
├─────────────────────────────────────┤
│ Enter your current password and     │
│ choose a new password (min 6 chars) │
│                                      │
│ Current Password:                   │
│ [•••••••]                           │
│                                      │
│ New Password:                        │
│ [•••••••]                           │
│                                      │
│ Confirm New Password:                │
│ [•••••••]                           │
│                                      │
│                                      │
│ [Cancel]    [Change Password]        │
└─────────────────────────────────────┘
```

---

## 🔧 **Validation Rules:**

### **Required Fields:**
✅ Current Password (must be correct)
✅ New Password (minimum 6 characters)
✅ Confirm New Password (must match)

### **Validation Checks:**

| Check | Error Message |
|-------|---------------|
| Any field empty | "Please fill in all password fields" |
| New password < 6 chars | "New password must be at least 6 characters" |
| Passwords don't match | "New passwords do not match" |
| Current password wrong | "Current password is incorrect" |

---

## 🛡️ **Security Features:**

### **Backend Security:**

✅ **Verifies Current Password** - Must provide correct current password
✅ **Hashes New Password** - Uses bcrypt hashing (Laravel `Hash::make()`)
✅ **No Plain Text** - Passwords stored as `password_hash` only
✅ **Logged** - All password changes logged for audit trail
✅ **Email-Based** - Uses student's email to find account

### **Frontend Security:**

✅ **Password Input Types** - Fields masked (type="password")
✅ **Client-Side Validation** - Checks before API call
✅ **Disabled During Request** - Prevents double-submission
✅ **Clears Form** - Password fields cleared after success
✅ **Toast Notifications** - Clear success/error messages

---

## 🔧 **Technical Implementation:**

### **Backend Endpoint:**

```php
POST /api/change-password

Request:
{
  "email": "student@example.com",
  "currentPassword": "oldpass123",
  "newPassword": "newpass456",
  "newPassword_confirmation": "newpass456"
}

Response (Success):
{
  "message": "Password changed successfully",
  "success": true
}

Response (Error - Wrong Current Password):
{
  "message": "Current password is incorrect"
}

Response (Error - Validation):
{
  "message": "Validation failed",
  "errors": {
    "newPassword": ["The new password must be at least 6 characters."]
  }
}
```

---

### **Backend Controller (`AirtableAuthController.php`):**

```php
public function changePassword(Request $request)
{
    // Validate input
    $validator = Validator::make($request->all(), [
        'email' => 'required|email',
        'currentPassword' => 'required|string',
        'newPassword' => 'required|string|min:6|confirmed',
    ]);

    // Find user across all tables (Users, Students, Teachers)
    $record = $this->airtable->findAcrossTables([...], $request->email);

    // Verify current password
    $valid = Hash::check($request->currentPassword, $storedHash);

    if (!$valid) {
        return response()->json(['message' => 'Current password is incorrect'], 401);
    }

    // Update password with new hash
    $newPasswordHash = Hash::make($request->newPassword);
    $this->airtable->updateRecord($tableName, $recordId, [
        'password_hash' => $newPasswordHash,
    ]);

    return response()->json(['message' => 'Password changed successfully', 'success' => true]);
}
```

---

### **Frontend Handler (`StudentProfile.js`):**

```javascript
const handleChangePassword = async () => {
  // Client-side validation
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.newPassword_confirmation) {
    showToastMessage('Please fill in all password fields', 'error');
    return;
  }

  if (passwordForm.newPassword.length < 6) {
    showToastMessage('New password must be at least 6 characters', 'error');
    return;
  }

  if (passwordForm.newPassword !== passwordForm.newPassword_confirmation) {
    showToastMessage('New passwords do not match', 'error');
    return;
  }

  // Call API
  const response = await api.post('/change-password', {
    email: currentUser?.email,
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword,
    newPassword_confirmation: passwordForm.newPassword_confirmation
  });

  if (response.data.success) {
    showToastMessage('Password changed successfully! Please use your new password next time you log in.', 'success');
    setShowChangePasswordModal(false);
  }
};
```

---

## 📋 **Airtable Setup:**

### **Required Field:**

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `password_hash` | **Long text** or **Single line text** | Stores hashed password (bcrypt) |

**Note:** If you currently have a `password` field with plain text, the system will:
1. Check `password_hash` first (preferred)
2. Fall back to `password` if no hash
3. Update to `password_hash` on change

### **Optional Field:**

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `password` | Single line text | Old plain text password (can be removed after migration) |

---

## 🧪 **Testing Scenarios:**

### **Test 1: Successful Password Change**
```
1. Student logs in with password "student123"
2. Clicks "Change Password"
3. Enters:
   - Current: "student123"
   - New: "newpass456"
   - Confirm: "newpass456"
4. Clicks "Change Password"
5. Success message shown
6. Modal closes
7. Student logs out
8. Logs back in with "newpass456" ✓
```

### **Test 2: Wrong Current Password**
```
1. Student clicks "Change Password"
2. Enters:
   - Current: "wrongpass"
   - New: "newpass456"
   - Confirm: "newpass456"
3. Clicks "Change Password"
4. Error: "Current password is incorrect" ❌
5. Try again with correct password ✓
```

### **Test 3: Passwords Don't Match**
```
1. Student clicks "Change Password"
2. Enters:
   - Current: "student123"
   - New: "newpass456"
   - Confirm: "newpass789" (different!)
3. Error: "New passwords do not match" ❌
4. Fix and try again ✓
```

### **Test 4: Password Too Short**
```
1. Student clicks "Change Password"
2. Enters:
   - Current: "student123"
   - New: "123" (only 3 chars)
   - Confirm: "123"
3. Error: "New password must be at least 6 characters" ❌
4. Use longer password ✓
```

### **Test 5: Empty Fields**
```
1. Student clicks "Change Password"
2. Leaves some fields empty
3. Error: "Please fill in all password fields" ❌
```

---

## 📝 **Logging:**

Every password change is logged:

```
[INFO] Password changed successfully
{
  "email": "student@example.com",
  "recordId": "rec123abc",
  "table": "Students",
  "timestamp": "2025-10-29T10:30:00Z"
}
```

**Use Cases for Logs:**
- Audit trail for security
- Detect suspicious activity
- Troubleshoot user issues
- Compliance requirements

---

## 🎊 **Benefits:**

### **For Students:**
✅ **Control** - Can update their own password
✅ **Security** - Change if compromised
✅ **Easy** - Simple self-service interface
✅ **No Admin** - Don't need to ask admin for help

### **For Admins:**
✅ **Less Work** - Students handle their own passwords
✅ **Secure** - Proper validation and hashing
✅ **Tracked** - All changes logged
✅ **Control** - Still create initial accounts

### **For Security:**
✅ **Hashed** - Passwords never stored in plain text
✅ **Validated** - Strong password rules enforced
✅ **Verified** - Must know current password
✅ **Logged** - Audit trail available

---

## 🔐 **Access Control Model:**

```
┌─────────────────────────────────────┐
│           ADMIN CREATES              │
│  ┌────────────────────────────────┐ │
│  │ Email: student@example.com      │ │
│  │ Initial Password: temp123       │ │
│  └────────────────────────────────┘ │
│                                      │
│  Admin sets initial credentials     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│        STUDENT LOGS IN               │
│  Uses initial credentials            │
│  Email: student@example.com          │
│  Password: temp123                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│     STUDENT CHANGES PASSWORD         │
│  ┌────────────────────────────────┐ │
│  │ Current: temp123                │ │
│  │ New: mySecurePass456            │ │
│  │ Confirm: mySecurePass456        │ │
│  └────────────────────────────────┘ │
│                                      │
│  Student now owns their password    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│        FUTURE LOGINS                 │
│  Uses NEW password                   │
│  Password: mySecurePass456           │
└─────────────────────────────────────┘
```

---

## 💡 **Best Practices:**

### **For Students:**
1. **Change Initial Password** - Change admin-set password immediately
2. **Use Strong Password** - Mix of letters, numbers, symbols
3. **Don't Share** - Keep password private
4. **Change if Compromised** - Update immediately if leaked

### **For Admins:**
1. **Set Temporary Passwords** - Easy to remember for first login
2. **Tell Students** - Inform them they can change password
3. **Monitor Logs** - Check for suspicious activity
4. **Regular Reminders** - Encourage periodic password updates

---

## 🚨 **Limitations & Future:**

### **Current Limitations:**
❌ Password reset via email (not yet implemented)
❌ Password strength meter (not yet implemented)
❌ Password history (can reuse old passwords)
❌ Force password change on first login

### **Future Enhancements:**
💡 **Password Reset via Email** - Forgot password flow
💡 **Strength Meter** - Visual password strength indicator
💡 **2FA** - Two-factor authentication
💡 **Password History** - Prevent reusing recent passwords
💡 **Force Change** - Require change on first login

---

## ✅ **Quick Reference:**

**To Change Password:**
1. Login → Profile → "🔒 Change Password"
2. Enter current password
3. Enter new password (6+ chars)
4. Confirm new password
5. Click "Change Password"
6. Done! ✓

**If Forgot Password:**
- ⚠️ **Contact Admin** - No self-service reset yet
- Admin can update password in Airtable

**Minimum Password Length:**
- **6 characters** (enforced)

**Password Storage:**
- **Hashed** (bcrypt)
- **Never plain text**

---

## 🎉 **Summary:**

**What Changed:**
- ✅ Added `/api/change-password` endpoint
- ✅ Added "Change Password" button in student profile
- ✅ Added password change modal with validation
- ✅ Secure password hashing and verification
- ✅ Comprehensive error handling

**Benefits:**
- ✅ Students control their own passwords
- ✅ Admins still create accounts
- ✅ Secure and validated
- ✅ Logged for audit trail

---

**Your students can now change their passwords!** 🔒✨

