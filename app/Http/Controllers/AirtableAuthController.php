<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Services\AirtableService;

class AirtableAuthController extends Controller
{
    public function __construct(private AirtableService $airtable)
    {
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string|min:6',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableStudents = config('airtable.tables.students');
        $tableTeachers = config('airtable.tables.teachers');

        // Removed $tableUsers and do NOT search 'users' table
        $record = $this->airtable->findAcrossTables([
            $tableStudents,
            $tableTeachers,
        ], $request->username);
        if (!$record) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }
        $fields = $record['fields'] ?? [];

        // Passwords are stored as plaintext or hashed? Prefer hashed; if plaintext, compare directly.
        // Check both lowercase and capitalized field names for compatibility
        $storedHash = $fields['password_hash'] ?? $fields['Password_hash'] ?? null;
        $storedPlain = $fields['password'] ?? $fields['Password'] ?? null;

        // DEBUG: Log what we found
        \Log::info('Password check for user', [
            'email' => $request->username,
            'has_password_hash' => !empty($storedHash),
            'has_password' => !empty($storedPlain),
            'password_hash_preview' => $storedHash ? substr($storedHash, 0, 20) . '...' : 'null',
            'password_preview' => $storedPlain ? substr($storedPlain, 0, 20) . '...' : 'null',
            'input_password_length' => strlen($request->password)
        ]);

        $valid = false;
        if ($storedHash) {
            // Standard: compare against bcrypt hash in password_hash field
            $valid = Hash::check($request->password, $storedHash);
            \Log::info('Password check via password_hash', ['valid' => $valid]);
        } elseif ($storedPlain) {
            // Handle both legacy plaintext and bcrypt stored in "password" field
            // Detect bcrypt hash format (e.g., $2y$10$...)
            if (is_string($storedPlain) && preg_match('/^\$2[aby]\$\d{2}\$/', $storedPlain) === 1) {
                // "password" holds a bcrypt hash; verify properly
                $valid = Hash::check($request->password, $storedPlain);
                \Log::info('Password check via password field (bcrypt)', ['valid' => $valid]);
            } else {
                // Legacy plaintext fallback
                $valid = hash_equals((string)$storedPlain, (string)$request->password);
                \Log::info('Password check via password field (plaintext)', ['valid' => $valid]);
            }
        } else {
            \Log::warning('No password field found in user record');
        }

        if (!$valid) {
            \Log::warning('Login failed: password validation failed');
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        // Enforce login tab vs role mapping
        $user = [
            'id' => $record['id'],
            'username' => $fields['username'] ?? $fields['Username'] ?? $fields['email'] ?? $fields['Email'] ?? null,
            'email' => $fields['email'] ?? $fields['Email'] ?? null,
            'first_name' => $fields['first_name'] ?? $fields['First_name'] ?? null,
            'last_name' => $fields['last_name'] ?? $fields['Last_name'] ?? null,
            'role' => $fields['role'] ?? $fields['Role'] ?? 'student',
        ];

        // Return a mock token since Sanctum tokens are for DB users; keep frontend flow identical
        $token = base64_encode('airtable|' . $user['id'] . '|' . now()->timestamp);

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $validator = Validator($request->all(), [
            'username' => 'required|string|min:3|max:50',
            'email' => 'required|email',
            'password' => 'required|string|min:6|confirmed',
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'role' => 'required|string|in:student,teacher,admin',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableUsers = config('airtable.tables.users');
        $tableStudents = config('airtable.tables.students');
        $tableTeachers = config('airtable.tables.teachers');

        // Check duplicates in any table
        $existing = $this->airtable->findAcrossTables([
            $tableUsers,
            $tableStudents,
            $tableTeachers,
        ], $request->username) ?: $this->airtable->findAcrossTables([
            $tableUsers,
            $tableStudents,
            $tableTeachers,
        ], $request->email);
        if ($existing) {
            return response()->json(['message' => 'User already exists'], 409);
        }

        // Choose table by role if split tables configured; fallback to users
        $targetTable = match ($request->role) {
            'student' => ($tableStudents ?: $tableUsers),
            'teacher' => ($tableTeachers ?: $tableUsers),
            default => $tableUsers,
        };

        $fields = [
            'username' => $request->username,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'role' => $request->role,
        ];

        $created = $this->airtable->createRecord($targetTable, $fields);
        $user = [
            'id' => $created['id'],
            'username' => $fields['username'],
            'email' => $fields['email'],
            'first_name' => $fields['first_name'],
            'last_name' => $fields['last_name'],
            'role' => $fields['role'],
        ];

        $token = base64_encode('airtable|' . $user['id'] . '|' . now()->timestamp);

        return response()->json([
            'message' => 'Registration successful',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Change password for authenticated user
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $tableUsers = config('airtable.tables.users');
        $tableStudents = config('airtable.tables.students');
        $tableTeachers = config('airtable.tables.teachers');

        // Find user across all tables
        $record = $this->airtable->findAcrossTables([
            $tableStudents,
            $tableTeachers,
        ], $request->email);

        if (!$record) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $fields = $record['fields'] ?? [];
        $recordId = $record['id'];
        $tableName = $record['__table'] ?? $tableUsers;

        // Verify current password
        // Check both lowercase and capitalized field names for compatibility
        $storedHash = $fields['password_hash'] ?? $fields['Password_hash'] ?? null;
        $storedPlain = $fields['password'] ?? $fields['Password'] ?? null;

        $valid = false;
        if ($storedHash) {
            $valid = Hash::check($request->currentPassword, $storedHash);
        } elseif ($storedPlain) {
            // Check if it's a bcrypt hash stored in Password field
            if (is_string($storedPlain) && preg_match('/^\$2[aby]\$\d{2}\$/', $storedPlain) === 1) {
                $valid = Hash::check($request->currentPassword, $storedPlain);
            } else {
                $valid = hash_equals($storedPlain, $request->currentPassword);
            }
        }

        if (!$valid) {
            return response()->json([
                'message' => 'Current password is incorrect'
            ], 401);
        }

        // Update password
        try {
            $newPasswordHash = Hash::make($request->newPassword);
            
            // Try to update password_hash first (preferred), fall back to password/Password field
            try {
                $this->airtable->updateRecord($tableName, $recordId, [
                    'password_hash' => $newPasswordHash,
                ]);
                
                \Log::info('Password changed successfully (using password_hash)', [
                    'email' => $request->email,
                    'recordId' => $recordId,
                    'table' => $tableName
                ]);
            } catch (\Exception $hashError) {
                // If password_hash field doesn't exist, try password field (lowercase)
                if (str_contains($hashError->getMessage(), 'UNKNOWN_FIELD_NAME')) {
                    \Log::warning('password_hash field not found, trying password field');
                    
                    try {
                        $this->airtable->updateRecord($tableName, $recordId, [
                            'password' => $newPasswordHash,
                        ]);
                        
                        \Log::info('Password changed successfully (using password field)', [
                            'email' => $request->email,
                            'recordId' => $recordId,
                            'table' => $tableName
                        ]);
                    } catch (\Exception $passError) {
                        // If lowercase password doesn't exist, try Password (capitalized)
                        if (str_contains($passError->getMessage(), 'UNKNOWN_FIELD_NAME')) {
                            \Log::warning('password field not found, trying Password field (capitalized)');
                            
                            $this->airtable->updateRecord($tableName, $recordId, [
                                'Password' => $newPasswordHash,
                            ]);
                            
                            \Log::info('Password changed successfully (using Password field)', [
                                'email' => $request->email,
                                'recordId' => $recordId,
                                'table' => $tableName
                            ]);
                        } else {
                            throw $passError;
                        }
                    }
                } else {
                    throw $hashError;
                }
            }

            return response()->json([
                'message' => 'Password changed successfully',
                'success' => true
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to change password: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to change password. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


