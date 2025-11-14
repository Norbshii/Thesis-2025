<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use App\Models\Teacher;
use App\Models\Student;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string|min:6',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $username = $request->username;
        $password = $request->password;

        // Try to find user in Teachers table first (includes both teachers and admins)
        $user = Teacher::where('email', $username)
                      ->orWhere('username', $username)
                      ->first();
        
        $role = $user ? $user->role : null;
        
        // If not found in teachers, try students
        if (!$user) {
            $user = Student::where('email', $username)
                          ->orWhere('username', $username)
                          ->first();
            $role = 'student';
        }

        if (!$user) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        // Verify password
        if (!Hash::check($password, $user->password)) {
            return response()->json(['message' => 'Invalid email or password'], 401);
        }

        // Generate token (you can use Laravel Sanctum for production)
        $token = base64_encode('mysql|' . $user->id . '|' . $role . '|' . now()->timestamp);

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'username' => $user->username ?? $user->email,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $role,
            ],
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:6|confirmed',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'role' => 'required|in:student,teacher,admin',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $role = $request->role;

        // Check if user already exists
        if ($role === 'teacher' || $role === 'admin') {
            $exists = Teacher::where('email', $request->email)
                            ->orWhere('username', $request->username)
                            ->exists();
            if ($exists) {
                return response()->json(['message' => 'Teacher with this email or username already exists'], 409);
            }

            $user = Teacher::create([
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'name' => trim(($request->first_name ?? '') . ' ' . ($request->last_name ?? '')),
                'role' => $role,
            ]);
        } else {
            $exists = Student::where('email', $request->email)
                            ->orWhere('username', $request->username)
                            ->exists();
            if ($exists) {
                return response()->json(['message' => 'Student with this email or username already exists'], 409);
            }

            $user = Student::create([
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'name' => trim(($request->first_name ?? '') . ' ' . ($request->last_name ?? '')),
                'role' => 'student',
            ]);
        }

        $token = base64_encode('mysql|' . $user->id . '|' . $role . '|' . now()->timestamp);

        return response()->json([
            'message' => 'Registration successful',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $role,
            ],
            'token' => $token,
        ], 201);
    }

    public function changePassword(Request $request)
    {
        // Accept both camelCase (from frontend) and snake_case
        $currentPassword = $request->input('currentPassword') ?? $request->input('current_password');
        $newPassword = $request->input('newPassword') ?? $request->input('new_password');
        $newPasswordConfirmation = $request->input('newPassword_confirmation') ?? $request->input('new_password_confirmation');

        $validator = Validator::make([
            'email' => $request->email,
            'currentPassword' => $currentPassword,
            'newPassword' => $newPassword,
            'newPassword_confirmation' => $newPasswordConfirmation,
        ], [
            'email' => 'required|email',
            'currentPassword' => 'required|string|min:6',
            'newPassword' => 'required|string|min:6',
            'newPassword_confirmation' => 'required|same:newPassword',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed', 
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;

        // Find user in teachers or students
        $user = Teacher::where('email', $email)->first();
        $role = 'teacher';

        if (!$user) {
            $user = Student::where('email', $email)->first();
            $role = 'student';
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        // Verify current password
        if (!Hash::check($currentPassword, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 401);
        }

        // Update password
        $user->password = Hash::make($newPassword);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    }

    public function logout(Request $request)
    {
        // For token-based auth, frontend will just remove the token
        return response()->json(['message' => 'Logged out successfully']);
    }
}
