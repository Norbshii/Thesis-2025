<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle user login
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if user exists with username or email
        $user = User::where('username', $request->username)
                    ->orWhere('email', $request->username)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Get user's classes if they are a student
        $classes = [];
        if ($user->role === 'student') {
            $classes = [
                [
                    'id' => 1,
                    'code' => 'CC 201',
                    'name' => 'Introduction to Computing 2',
                    'instructor' => 'Prof. Smith',
                    'time_slot' => '8:00 AM - 10:00 AM',
                    'is_signed_in' => false
                ],
                [
                    'id' => 2,
                    'code' => 'CS 301',
                    'name' => 'Data Structures',
                    'instructor' => 'Prof. Johnson',
                    'time_slot' => '10:00 AM - 12:00 PM',
                    'is_signed_in' => false
                ],
                [
                    'id' => 3,
                    'code' => 'CS 401',
                    'name' => 'Algorithm Design',
                    'instructor' => 'Prof. Williams',
                    'time_slot' => '1:00 PM - 3:00 PM',
                    'is_signed_in' => false
                ],
                [
                    'id' => 4,
                    'code' => 'CS 501',
                    'name' => 'Software Engineering',
                    'instructor' => 'Prof. Brown',
                    'time_slot' => '3:00 PM - 5:00 PM',
                    'is_signed_in' => false
                ]
            ];
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->role,
            ],
            'token' => $token,
            'classes' => $classes
        ], 200);
    }

    /**
     * Handle user registration
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|unique:users,username|min:3|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'role' => 'required|string|in:student,teacher,admin',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'role' => $request->role,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->role,
            ],
            'token' => $token
        ], 201);
    }

    /**
     * Handle user logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful'
        ], 200);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()
        ], 200);
    }

    /**
     * Get student classes
     */
    public function getClasses(Request $request)
    {
        $user = $request->user();
        
        if ($user->role !== 'student') {
            return response()->json([
                'message' => 'Access denied. Student role required.'
            ], 403);
        }

        $classes = [
            [
                'id' => 1,
                'code' => 'CC 201',
                'name' => 'Introduction to Computing 2',
                'instructor' => 'Prof. Smith',
                'time_slot' => '8:00 AM - 10:00 AM',
                'is_signed_in' => false
            ],
            [
                'id' => 2,
                'code' => 'CS 301',
                'name' => 'Data Structures',
                'instructor' => 'Prof. Johnson',
                'time_slot' => '10:00 AM - 12:00 PM',
                'is_signed_in' => false
            ],
            [
                'id' => 3,
                'code' => 'CS 401',
                'name' => 'Algorithm Design',
                'instructor' => 'Prof. Williams',
                'time_slot' => '1:00 PM - 3:00 PM',
                'is_signed_in' => false
            ],
            [
                'id' => 4,
                'code' => 'CS 501',
                'name' => 'Software Engineering',
                'instructor' => 'Prof. Brown',
                'time_slot' => '3:00 PM - 5:00 PM',
                'is_signed_in' => false
            ]
        ];

        return response()->json([
            'classes' => $classes
        ], 200);
    }

    /**
     * Toggle class sign-in status
     */
    public function toggleClassSignIn(Request $request)
    {
        $user = $request->user();
        
        if ($user->role !== 'student') {
            return response()->json([
                'message' => 'Access denied. Student role required.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'class_id' => 'required|integer',
            'action' => 'required|string|in:sign_in,sign_out'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // In a real application, you would check time restrictions here
        // and update the database with sign-in/sign-out records
        
        return response()->json([
            'message' => 'Class status updated successfully',
            'class_id' => $request->class_id,
            'action' => $request->action,
            'timestamp' => now()->toISOString()
        ], 200);
    }
}
