<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AirtableService;

class StudentsController extends Controller
{
    public function __construct(private AirtableService $airtable)
    {
    }

    /**
     * Get all students from Airtable Students table
     */
    public function index(Request $request)
    {
        try {
            $table = config('airtable.tables.students');
            $response = $this->airtable->listRecords($table);
            $records = $response['records'] ?? [];

            $students = [];
            foreach ($records as $rec) {
                $fields = $rec['fields'] ?? [];
                
                // Support both lowercase and capitalized field names
                $email = $fields['email'] ?? $fields['Email'] ?? '';
                $name = $fields['name'] ?? $fields['Name'] ?? '';
                
                // Only include records that have at least an email or name
                if (!empty($email) || !empty($name)) {
                    $students[] = [
                        'id' => $rec['id'],
                        'name' => $name,
                        'email' => $email,
                        'course' => $fields['course'] ?? $fields['Course'] ?? $fields['Course Year & Section'] ?? '',
                        'age' => $fields['age'] ?? $fields['Age'] ?? null,
                        'address' => $fields['address'] ?? $fields['Address'] ?? '',
                    ];
                }
            }

            return response()->json([
                'students' => $students,
                'count' => count($students)
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch students: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch students',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}




