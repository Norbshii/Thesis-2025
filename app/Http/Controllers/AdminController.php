<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\Teacher;
use App\Models\Student;
use App\Events\StudentUpdated;

class AdminController extends Controller
{
    /**
     * Get all users (teachers and students)
     */
    public function getUsers(Request $request)
    {
        try {
            $teachers = Teacher::select('id', 'name', 'email', 'username', 'role', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($teacher) {
                    return [
                        'id' => $teacher->id,
                        'name' => $teacher->name,
                        'email' => $teacher->email,
                        'username' => $teacher->username,
                        'role' => $teacher->role,
                        'type' => 'teacher', // for frontend to distinguish
                        'created_at' => $teacher->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            $students = Student::select('id', 'name', 'email', 'username', 'course', 'created_at')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($student) {
                    return [
                        'id' => $student->id,
                        'name' => $student->name,
                        'email' => $student->email,
                        'username' => $student->username,
                        'course' => $student->course,
                        'role' => 'student',
                        'type' => 'student',
                        'created_at' => $student->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'success' => true,
                'teachers' => $teachers,
                'students' => $students,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching users: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching users',
            ], 500);
        }
    }

    /**
     * Create a new user (teacher, admin, or student)
     */
    public function createUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,teacher,student',
            'name' => 'nullable|string|max:255',
            'username' => 'nullable|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'course' => 'nullable|string|max:255', // For students
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $role = $request->role;
        $email = $request->email;
        $username = $request->username ?? $email;

        // Check if user already exists
        if ($role === 'admin' || $role === 'teacher') {
            $exists = Teacher::where('email', $email)->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'User with this email already exists',
                ], 409);
            }

            $user = Teacher::create([
                'name' => $request->name ?? $username,
                'email' => $email,
                'username' => $username,
                'password' => Hash::make($request->password),
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'role' => $role,
            ]);

            return response()->json([
                'success' => true,
                'message' => ucfirst($role) . ' created successfully',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'role' => $user->role,
                    'type' => 'teacher',
                ],
            ], 201);
        } else { // student
            $exists = Student::where('email', $email)->exists();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student with this email already exists',
                ], 409);
            }

            $user = Student::create([
                'name' => $request->name ?? $username,
                'email' => $email,
                'username' => $username,
                'password' => Hash::make($request->password),
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'course' => $request->course,
                'role' => 'student',
            ]);
            
            // Broadcast student list updated
            broadcast(new StudentUpdated(Student::all()));

            return response()->json([
                'success' => true,
                'message' => 'Student created successfully',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'course' => $user->course,
                    'role' => 'student',
                    'type' => 'student',
                ],
            ], 201);
        }
    }

    /**
     * Update a user
     */
    public function updateUser(Request $request, $type, $id)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|email|max:255',
            'name' => 'nullable|string|max:255',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
            'course' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            if ($type === 'teacher') {
                $user = Teacher::findOrFail($id);
            } else {
                $user = Student::findOrFail($id);
            }

            // Update fields
            if ($request->has('name')) {
                $user->name = $request->name;
            }
            if ($request->has('email')) {
                $user->email = $request->email;
            }
            if ($request->has('username')) {
                $user->username = $request->username;
            }
            if ($request->has('password') && !empty($request->password)) {
                $user->password = Hash::make($request->password);
            }
            if ($type === 'student' && $request->has('course')) {
                $user->course = $request->course;
            }

            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating user',
            ], 500);
        }
    }

    /**
     * Delete a user
     */
    public function deleteUser(Request $request, $type, $id)
    {
        try {
            if ($type === 'teacher') {
                $user = Teacher::findOrFail($id);
                
                // Prevent deleting yourself
                $authUser = $request->auth_user;
                if ($authUser && $authUser->id == $id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You cannot delete your own account',
                    ], 403);
                }
                
                $user->delete();
            } else {
                $user = Student::findOrFail($id);
                $user->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting user',
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function getStats(Request $request)
    {
        try {
            $teacherCount = Teacher::where('role', 'teacher')->count();
            $adminCount = Teacher::where('role', 'admin')->count();
            $studentCount = Student::count();
            $classCount = \App\Models\ClassModel::count();
            $buildingCount = \App\Models\Building::count();

            return response()->json([
                'success' => true,
                'stats' => [
                    'teachers' => $teacherCount,
                    'admins' => $adminCount,
                    'students' => $studentCount,
                    'classes' => $classCount,
                    'buildings' => $buildingCount,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching statistics',
            ], 500);
        }
    }
}
