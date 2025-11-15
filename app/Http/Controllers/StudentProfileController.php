<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Support\Facades\Validator;

class StudentProfileController extends Controller
{
    /**
     * Find user record (student or teacher) by email
     */
    private function findUserRecord(string $email): ?array
    {
        // Try to find as student first
        $student = Student::where('email', $email)->first();
        if ($student) {
            return [
                'type' => 'student',
                'model' => $student,
            ];
        }
        
        // Try to find as teacher
        $teacher = Teacher::where('email', $email)->first();
        if ($teacher) {
            return [
                'type' => 'teacher',
                'model' => $teacher,
            ];
        }
        
        return null;
    }

    public function get(Request $request)
    {
        \Log::info('===== STUDENT PROFILE GET REQUEST =====');
        
        $email = $request->query('email');
        \Log::info('Profile request received', ['email' => $email]);
        
        if (!$email) {
            \Log::warning('No email provided in profile request');
            return response()->json(['message' => 'Email is required'], 422);
        }

        $userRecord = $this->findUserRecord($email);
        
        if (!$userRecord) {
            \Log::warning('User not found for profile', ['email' => $email]);
            return response()->json(['message' => 'User not found'], 404);
        }

        $user = $userRecord['model'];
        $type = $userRecord['type'];
        
        // DEBUG: Log user data
        \Log::info('User profile data', [
            'email' => $email,
            'type' => $type,
            'user_data' => $user->toArray()
        ]);
        
        if ($type === 'student') {
            $profile = [
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department ?? null,
                'age' => $user->age,
                'course' => $user->course,
                'section' => $user->section,
                'address' => $user->address,
                'guardianName' => $user->guardian_name,
                'relationship' => $user->relationship,
                'guardianEmail' => $user->guardian_email,
            ];
        } else {
            // Teacher profile (limited fields)
            $profile = [
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department ?? null,
                'age' => null,
                'course' => null,
                'address' => null,
                'guardianName' => null,
                'relationship' => null,
                'guardianEmail' => null,
            ];
        }

        return response()->json([
            'profile' => $profile,
            'record_id' => $user->id,
            'table' => $type,
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'name' => 'nullable|string|max:100',
            'age' => 'nullable|integer|min:1|max:120',
            'course' => 'nullable|string|max:100',
            'section' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:200',
            'guardianName' => 'nullable|string|max:100',
            'relationship' => 'nullable|string|max:100',
            'guardianEmail' => 'nullable|email|max:100',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $userRecord = $this->findUserRecord($request->input('email'));
        
        if (!$userRecord) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user = $userRecord['model'];
        $type = $userRecord['type'];
        
        \Log::info('Update profile request', [
            'type' => $type,
            'email' => $request->input('email'),
            'request_data' => $request->all()
        ]);
        
        // Build update data
        $updateData = [];
        
        if ($request->filled('name')) {
            $updateData['name'] = $request->input('name');
        }
        
        // Only update student-specific fields for students
        if ($type === 'student') {
            if ($request->filled('age')) {
                $updateData['age'] = $request->input('age');
            }
            if ($request->filled('course')) {
                $updateData['course'] = $request->input('course');
            }
            if ($request->filled('section')) {
                $updateData['section'] = $request->input('section');
            }
            if ($request->filled('address')) {
                $updateData['address'] = $request->input('address');
            }
            if ($request->filled('guardianName')) {
                $updateData['guardian_name'] = $request->input('guardianName');
            }
            if ($request->filled('relationship')) {
                $updateData['relationship'] = $request->input('relationship');
            }
            if ($request->filled('guardianEmail')) {
                $updateData['guardian_email'] = $request->input('guardianEmail');
            }
        }
        
        \Log::info('Fields to update', ['fields' => $updateData]);

        if (empty($updateData)) {
            return response()->json(['message' => 'No fields to update'], 400);
        }

        // Update the user
        $user->update($updateData);

        return response()->json([
            'message' => 'Profile updated',
            'record' => $user->fresh()
        ]);
    }

    /**
     * Get available course options from MySQL
     * This fetches all unique course values from existing student records
     */
    public function getCourseOptions(Request $request)
    {
        try {
            // Fetch all unique course values from students table
            $courses = Student::whereNotNull('course')
                ->where('course', '!=', '')
                ->distinct()
                ->pluck('course')
                ->sort()
                ->values()
                ->toArray();
            
            return response()->json([
                'courses' => $courses
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to fetch course options: ' . $e->getMessage());
            
            // Return empty array on error so the UI doesn't break
            return response()->json([
                'courses' => []
            ]);
        }
    }
}
