<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\ClassModel;
use App\Models\AttendanceEntry;
use App\Services\AirtableService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AirtableDataSeeder extends Seeder
{
    protected $airtable;

    public function __construct()
    {
        $this->airtable = new AirtableService(
            env('AIRTABLE_API_KEY'),
            env('AIRTABLE_BASE_ID')
        );
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🚀 Starting Airtable data migration...');
        
        // Import Teachers
        $this->importTeachers();
        
        // Import Students
        $this->importStudents();
        
        // Import Classes
        $this->importClasses();
        
        // Import Attendance Entries
        $this->importAttendanceEntries();
        
        $this->command->info('✅ Airtable data migration completed!');
    }

    protected function importTeachers()
    {
        $this->command->info('📥 Importing teachers...');
        
        try {
            $teachersTable = config('airtable.tables.teachers');
            $response = $this->airtable->listRecords($teachersTable);
            $records = $response['records'] ?? [];
            
            foreach ($records as $record) {
                $fields = $record['fields'] ?? [];
                
                // Get email (check both lowercase and capitalized)
                $email = $fields['email'] ?? $fields['Email'] ?? null;
                if (!$email) {
                    $this->command->warn("Skipping teacher record without email: {$record['id']}");
                    continue;
                }
                
                // Get password (check both formats)
                $password = $fields['password_hash'] ?? $fields['Password_hash'] ?? 
                           $fields['password'] ?? $fields['Password'] ?? null;
                
                // If password is not a bcrypt hash, hash it
                if ($password && !str_starts_with($password, '$2y$')) {
                    $password = Hash::make($password);
                } elseif (!$password) {
                    // Generate a default password if none exists
                    $password = Hash::make('password123');
                    $this->command->warn("Generated default password for teacher: $email");
                }
                
                Teacher::updateOrCreate(
                    ['email' => $email],
                    [
                        'airtable_id' => $record['id'],
                        'name' => $fields['Name'] ?? $fields['name'] ?? $email,
                        'username' => $fields['Username'] ?? $fields['username'] ?? null,
                        'password' => $password,
                        'first_name' => $fields['First Name'] ?? $fields['first_name'] ?? null,
                        'last_name' => $fields['Last Name'] ?? $fields['last_name'] ?? null,
                        'role' => 'teacher',
                    ]
                );
            }
            
            $this->command->info("✅ Imported " . count($records) . " teachers");
        } catch (\Exception $e) {
            $this->command->error("Error importing teachers: " . $e->getMessage());
            Log::error("Teacher import error: " . $e->getMessage());
        }
    }

    protected function importStudents()
    {
        $this->command->info('📥 Importing students...');
        
        try {
            $studentsTable = config('airtable.tables.students');
            $response = $this->airtable->listRecords($studentsTable);
            $records = $response['records'] ?? [];
            
            foreach ($records as $record) {
                $fields = $record['fields'] ?? [];
                
                // Get email (check both lowercase and capitalized)
                $email = $fields['email'] ?? $fields['Email'] ?? null;
                if (!$email) {
                    $this->command->warn("Skipping student record without email: {$record['id']}");
                    continue;
                }
                
                // Get password (check both formats)
                $password = $fields['password_hash'] ?? $fields['Password_hash'] ?? 
                           $fields['password'] ?? $fields['Password'] ?? null;
                
                // If password is not a bcrypt hash, hash it
                if ($password && !str_starts_with($password, '$2y$')) {
                    $password = Hash::make($password);
                } elseif (!$password) {
                    // Generate a default password if none exists
                    $password = Hash::make('password123');
                    $this->command->warn("Generated default password for student: $email");
                }
                
                Student::updateOrCreate(
                    ['email' => $email],
                    [
                        'airtable_id' => $record['id'],
                        'name' => $fields['Name'] ?? $fields['name'] ?? $email,
                        'username' => $fields['Username'] ?? $fields['username'] ?? null,
                        'password' => $password,
                        'first_name' => $fields['First Name'] ?? $fields['first_name'] ?? null,
                        'last_name' => $fields['Last Name'] ?? $fields['last_name'] ?? null,
                        'role' => 'student',
                        'age' => $fields['Age'] ?? $fields['age'] ?? null,
                        'course' => $fields['Course Year & Section'] ?? $fields['Course'] ?? $fields['course'] ?? null,
                        'address' => $fields['Address'] ?? $fields['address'] ?? null,
                        'guardian_phone' => $fields['guardianPhone'] ?? $fields['Guardian Phone'] ?? null,
                    ]
                );
            }
            
            $this->command->info("✅ Imported " . count($records) . " students");
        } catch (\Exception $e) {
            $this->command->error("Error importing students: " . $e->getMessage());
            Log::error("Student import error: " . $e->getMessage());
        }
    }

    protected function importClasses()
    {
        $this->command->info('📥 Importing classes...');
        
        try {
            $classesTable = config('airtable.tables.classes');
            $response = $this->airtable->listRecords($classesTable);
            $records = $response['records'] ?? [];
            
            foreach ($records as $record) {
                $fields = $record['fields'] ?? [];
                
                $classCode = $fields['Class Code'] ?? $fields['code'] ?? null;
                if (!$classCode) {
                    $this->command->warn("Skipping class record without code: {$record['id']}");
                    continue;
                }
                
                // Get teacher email
                $teacherEmail = $fields['Teacher'] ?? $fields['teacher'] ?? null;
                
                // Handle linked record array
                if (is_array($teacherEmail)) {
                    $teacherEmail = $teacherEmail[0] ?? null;
                }
                
                // Find teacher by email
                $teacher = null;
                if ($teacherEmail) {
                    $teacher = Teacher::where('email', $teacherEmail)->first();
                }
                
                if (!$teacher) {
                    $this->command->warn("Teacher not found for class: $classCode (email: $teacherEmail)");
                    continue;
                }
                
                // Convert time formats (e.g., "1:00PM" to "13:00:00")
                $startTime = $this->convertToMySQLTime($fields['Start Time'] ?? $fields['start_time'] ?? '08:00:00');
                $endTime = $this->convertToMySQLTime($fields['End Time'] ?? $fields['end_time'] ?? '09:00:00');
                
                ClassModel::updateOrCreate(
                    ['class_code' => $classCode],
                    [
                        'airtable_id' => $record['id'],
                        'class_name' => $fields['Class Name'] ?? $fields['name'] ?? $classCode,
                        'teacher_id' => $teacher->id,
                        'teacher_email' => $teacher->email,
                        'teacher_name' => $fields['Teacher Name'] ?? $teacher->name,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'days' => $fields['Days'] ?? $fields['days'] ?? null,
                        'room' => $fields['Room'] ?? $fields['room'] ?? null,
                        'is_open' => $fields['Is Open'] ?? $fields['is_open'] ?? false,
                        'current_session_opened' => $fields['Current Session Opened'] ?? null,
                        'current_session_lat' => $fields['Current Session Lat'] ?? null,
                        'current_session_lon' => $fields['Current Session Lon'] ?? null,
                        'auto_close_time' => $fields['Auto Close Time'] ?? null,
                        'geofence_radius' => $fields['Geofence Radius'] ?? 100,
                        'late_threshold' => $fields['Late Threshold'] ?? 15,
                    ]
                );
            }
            
            $this->command->info("✅ Imported " . count($records) . " classes");
        } catch (\Exception $e) {
            $this->command->error("Error importing classes: " . $e->getMessage());
            Log::error("Class import error: " . $e->getMessage());
        }
    }

    protected function importAttendanceEntries()
    {
        $this->command->info('📥 Importing attendance entries...');
        
        try {
            $attendanceTable = config('airtable.tables.attendance');
            $response = $this->airtable->listRecords($attendanceTable);
            $records = $response['records'] ?? [];
            
            $imported = 0;
            $skipped = 0;
            
            foreach ($records as $record) {
                $fields = $record['fields'] ?? [];
                
                $classCode = $fields['Class Code'] ?? null;
                $studentEmail = $fields['Student Email'] ?? null;
                $date = $fields['Date'] ?? null;
                
                if (!$classCode || !$studentEmail || !$date) {
                    $skipped++;
                    continue;
                }
                
                // Find class and student
                $class = ClassModel::where('class_code', $classCode)->first();
                $student = Student::where('email', $studentEmail)->first();
                
                if (!$class || !$student) {
                    $skipped++;
                    continue;
                }
                
                try {
                    AttendanceEntry::updateOrCreate(
                        [
                            'class_id' => $class->id,
                            'student_id' => $student->id,
                            'date' => $date,
                        ],
                        [
                            'airtable_id' => $record['id'],
                            'class_code' => $classCode,
                            'class_name' => $fields['Class Name'] ?? $class->class_name,
                            'teacher_email' => $fields['Teacher Email'] ?? $class->teacher_email,
                            'student_email' => $studentEmail,
                            'student_name' => $fields['Student Name'] ?? $student->name,
                            'sign_in_time' => $fields['Sign In Time'] ?? '00:00:00',
                            'status' => $fields['Status'] ?? 'On Time',
                            'distance' => $fields['Distance'] ?? null,
                            'student_latitude' => $fields['Student Latitude'] ?? null,
                            'student_longitude' => $fields['Student Longitude'] ?? null,
                            'timestamp' => $fields['Timestamp'] ?? now(),
                        ]
                    );
                    $imported++;
                } catch (\Exception $e) {
                    // Duplicate entry, skip
                    $skipped++;
                }
            }
            
            $this->command->info("✅ Imported $imported attendance entries ($skipped skipped/duplicates)");
        } catch (\Exception $e) {
            $this->command->error("Error importing attendance: " . $e->getMessage());
            Log::error("Attendance import error: " . $e->getMessage());
        }
    }
    
    /**
     * Convert various time formats to MySQL time format (HH:MM:SS)
     */
    private function convertToMySQLTime($time)
    {
        if (empty($time)) {
            return '00:00:00';
        }
        
        // If already in correct format (HH:MM:SS or HH:MM), return as is
        if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $time)) {
            // Add seconds if not present
            if (substr_count($time, ':') === 1) {
                return $time . ':00';
            }
            return $time;
        }
        
        // Try to parse various formats (1:00PM, 1:00 PM, 13:00, etc.)
        try {
            $dateTime = \Carbon\Carbon::parse($time);
            return $dateTime->format('H:i:s');
        } catch (\Exception $e) {
            // If parsing fails, return default
            return '00:00:00';
        }
    }
}
