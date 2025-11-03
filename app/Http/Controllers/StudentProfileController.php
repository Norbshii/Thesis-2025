<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AirtableService;
use Illuminate\Support\Facades\Validator;

class StudentProfileController extends Controller
{
    public function __construct(private AirtableService $airtable)
    {
    }

    private function findUserRecord(string $usernameOrEmail): ?array
    {
        $tableUsers = config('airtable.tables.users');
        $tableStudents = config('airtable.tables.students');
        $tableTeachers = config('airtable.tables.teachers');

        return $this->airtable->findAcrossTables([
            $tableUsers,
            $tableStudents,
            $tableTeachers,
        ], $usernameOrEmail);
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

        $rec = $this->findUserRecord($email);
        if (!$rec) {
            \Log::warning('User not found for profile', ['email' => $email]);
            return response()->json(['message' => 'User not found'], 404);
        }

        $fields = $rec['fields'] ?? [];
        
        // DEBUG: Log all available fields to see what Airtable is returning
        \Log::info('Student profile fields from Airtable', [
            'email' => $email,
            'available_fields' => array_keys($fields),
            'all_field_values' => $fields
        ]);
        
        $profile = [
            'name' => $fields['Name'] ?? $fields['name'] ?? trim(($fields['first_name'] ?? $fields['First_name'] ?? '') . ' ' . ($fields['last_name'] ?? $fields['Last_name'] ?? '')),
            'email' => $fields['Email'] ?? $fields['email'] ?? $email,
            'department' => $fields['department'] ?? $fields['Department'] ?? null,
            'age' => $fields['Age'] ?? $fields['age'] ?? null,
            'course' => $fields['Course Year & Section'] ?? $fields['Course'] ?? $fields['course'] ?? null,
            'address' => $fields['Address'] ?? $fields['address'] ?? null,
            'guardianName' => $fields['Name of Guardian'] ?? $fields['GuardianName'] ?? $fields['guardianName'] ?? ($fields['guardian_name'] ?? null),
            'relationship' => $fields['Relationship'] ?? $fields['relationship'] ?? null,
            'guardianPhone' => $fields['Phone Number'] ?? $fields['GuardianPhone'] ?? $fields['guardianPhone'] ?? ($fields['guardian_phone'] ?? null),
        ];

        return response()->json([
            'profile' => $profile,
            'record_id' => $rec['id'],
            'table' => $rec['__table'] ?? null,
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'name' => 'nullable|string|max:100',
            'age' => 'nullable|integer|min:1|max:120',
            'course' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:200',
            'guardianName' => 'nullable|string|max:100',
            'relationship' => 'nullable|string|max:100',
            'guardianPhone' => 'nullable|string|max:50',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $rec = $this->findUserRecord($request->input('email'));
        if (!$rec) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Determine which field names to use based on what exists in the record
        $existingFields = $rec['fields'] ?? [];
        
        \Log::info('Update profile - existing fields', [
            'existing_field_names' => array_keys($existingFields),
            'request_data' => $request->all()
        ]);
        
        // Helper function to find the correct field name (case-insensitive)
        $findFieldName = function($possibleNames) use ($existingFields) {
            foreach ($possibleNames as $name) {
                if (array_key_exists($name, $existingFields)) {
                    return $name;
                }
            }
            // Default to the first option (capitalized) even if not found
            return $possibleNames[0];
        };
        
        $fields = [];
        
        // Map input fields to Airtable field names
        if ($request->filled('name')) {
            $fields[$findFieldName(['Name', 'name'])] = $request->input('name');
        }
        if ($request->filled('age')) {
            $fields[$findFieldName(['Age', 'age'])] = $request->input('age');
        }
        if ($request->filled('course')) {
            $fields[$findFieldName(['Course Year & Section', 'Course', 'course'])] = $request->input('course');
        }
        if ($request->filled('address')) {
            $fields[$findFieldName(['Address', 'address'])] = $request->input('address');
        }
        if ($request->filled('guardianName')) {
            $fields[$findFieldName(['Name of Guardian', 'GuardianName', 'guardianName', 'guardian_name'])] = $request->input('guardianName');
        }
        if ($request->filled('relationship')) {
            $fields[$findFieldName(['Relationship', 'relationship'])] = $request->input('relationship');
        }
        if ($request->filled('guardianPhone')) {
            $fields[$findFieldName(['Phone Number', 'GuardianPhone', 'guardianPhone', 'guardian_phone'])] = $request->input('guardianPhone');
        }
        
        \Log::info('Fields to update', ['fields' => $fields]);

        if (empty($fields)) {
            return response()->json(['message' => 'No fields to update'], 400);
        }

        $table = $rec['__table'] ?? config('airtable.tables.users');
        $updated = $this->airtable->updateRecord($table, $rec['id'], $fields);

        return response()->json(['message' => 'Profile updated', 'record' => $updated]);
    }

    /**
     * Get available course options from Airtable
     * This fetches all unique course values from existing student records
     */
    public function getCourseOptions(Request $request)
    {
        try {
            $tableStudents = config('airtable.tables.students');
            
            // Fetch all student records to get unique course values
            $response = $this->airtable->listRecords($tableStudents, [
                'fields' => ['Course Year & Section'],
                'pageSize' => 100
            ]);
            
            $records = $response['records'] ?? [];
            $courses = [];
            
            // Extract unique course values
            foreach ($records as $rec) {
                $fields = $rec['fields'] ?? [];
                $course = $fields['Course Year & Section'] ?? null;
                
                if ($course && !in_array($course, $courses)) {
                    $courses[] = $course;
                }
            }
            
            // Sort alphabetically
            sort($courses);
            
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


