<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;

class StudentsController extends Controller
{
    /**
     * Get all students from MySQL students table
     */
    public function index(Request $request)
    {
        try {
            $students = Student::orderBy('name', 'asc')->get();

            $formattedStudents = $students->map(function ($student) {
                return [
                    'id' => (string) $student->id,  // Frontend might expect string ID
                    'name' => $student->name,
                    'email' => $student->email,
                    'course' => $student->course ?? '',
                    'age' => $student->age,
                    'address' => $student->address ?? '',
                ];
            });

            return response()->json([
                'students' => $formattedStudents,
                'count' => $formattedStudents->count()
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
