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
            'login_type' => 'nullable|string|in:student,admin',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableUsers = config('airtable.tables.users');
        $tableStudents = config('airtable.tables.students');
        $tableTeachers = config('airtable.tables.teachers');

        $record = $this->airtable->findAcrossTables([
            $tableUsers,
            $tableStudents,
            $tableTeachers,
        ], $request->username);
        if (!$record) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }
        $fields = $record['fields'] ?? [];

        // Passwords are stored as plaintext or hashed? Prefer hashed; if plaintext, compare directly.
        $storedHash = $fields['password_hash'] ?? null;
        $storedPlain = $fields['password'] ?? null;

        $valid = false;
        if ($storedHash) {
            $valid = Hash::check($request->password, $storedHash);
        } elseif ($storedPlain) {
            $valid = hash_equals($storedPlain, $request->password);
        }

        if (!$valid) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        // Enforce login tab vs role mapping
        $loginType = $request->input('login_type');
        $roleValue = strtolower((string)($fields['role'] ?? ''));
        if ($loginType === 'student' && $roleValue !== 'student') {
            return response()->json(['message' => 'This account is not a student. Use the Admin Login tab.'], 403);
        }
        if ($loginType === 'admin' && $roleValue !== 'teacher') {
            return response()->json(['message' => 'This account is not a teacher. Use the Student Login tab.'], 403);
        }

        $user = [
            'id' => $record['id'],
            'username' => $fields['username'] ?? $fields['email'] ?? null,
            'email' => $fields['email'] ?? null,
            'first_name' => $fields['first_name'] ?? null,
            'last_name' => $fields['last_name'] ?? null,
            'role' => $fields['role'] ?? 'student',
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
            $tableUsers,
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
        $storedHash = $fields['password_hash'] ?? null;
        $storedPlain = $fields['password'] ?? null;

        $valid = false;
        if ($storedHash) {
            $valid = Hash::check($request->currentPassword, $storedHash);
        } elseif ($storedPlain) {
            $valid = hash_equals($storedPlain, $request->currentPassword);
        }

        if (!$valid) {
            return response()->json([
                'message' => 'Current password is incorrect'
            ], 401);
        }

        // Update password
        try {
            $newPasswordHash = Hash::make($request->newPassword);
            
            $this->airtable->updateRecord($tableName, $recordId, [
                'password_hash' => $newPasswordHash,
                // Optionally clear plaintext password field if it exists
                // 'password' => null,
            ]);

            \Log::info('Password changed successfully', [
                'email' => $request->email,
                'recordId' => $recordId,
                'table' => $tableName
            ]);

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


