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
        $email = $request->query('email');
        if (!$email) {
            return response()->json(['message' => 'Email is required'], 422);
        }

        $rec = $this->findUserRecord($email);
        if (!$rec) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $fields = $rec['fields'] ?? [];
        $profile = [
            'name' => $fields['name'] ?? trim(($fields['first_name'] ?? '') . ' ' . ($fields['last_name'] ?? '')),
            'email' => $fields['email'] ?? $email,
            'department' => $fields['department'] ?? null,
            'age' => $fields['age'] ?? null,
            'course' => $fields['course'] ?? null,
            'address' => $fields['address'] ?? null,
            'guardianName' => $fields['guardianName'] ?? ($fields['guardian_name'] ?? null),
            'relationship' => $fields['relationship'] ?? null,
            'guardianPhone' => $fields['guardianPhone'] ?? ($fields['guardian_phone'] ?? null),
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

        $fields = [];
        $map = [
            'name' => 'name',
            'age' => 'age',
            'course' => 'course',
            'address' => 'address',
            'guardianName' => 'guardianName',
            'relationship' => 'relationship',
            'guardianPhone' => 'guardianPhone',
        ];
        foreach ($map as $inputKey => $fieldName) {
            if ($request->filled($inputKey)) {
                $fields[$fieldName] = $request->input($inputKey);
            }
        }

        if (empty($fields)) {
            return response()->json(['message' => 'No fields to update'], 400);
        }

        $table = $rec['__table'] ?? config('airtable.tables.users');
        $updated = $this->airtable->updateRecord($table, $rec['id'], $fields);

        return response()->json(['message' => 'Profile updated', 'record' => $updated]);
    }
}


