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
                
                // Only include records that have at least an email or name
                if (!empty($fields['email']) || !empty($fields['name'])) {
                    $students[] = [
                        'id' => $rec['id'],
                        'name' => $fields['name'] ?? '',
                        'email' => $fields['email'] ?? '',
                        'course' => $fields['course'] ?? '',
                        'age' => $fields['age'] ?? null,
                        'address' => $fields['address'] ?? '',
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




