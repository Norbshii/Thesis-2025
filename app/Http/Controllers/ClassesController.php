<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AirtableService;
use App\Services\SmsService;
use Illuminate\Support\Facades\Validator;

class ClassesController extends Controller
{
    public function __construct(
        private AirtableService $airtable,
        private SmsService $sms
    ) {
    }

    public function index(Request $request)
    {
        $tableName = config('airtable.tables.classes');
        $teacherEmail = $request->query('teacherEmail');
        
        $params = [
            'pageSize' => 100,
            'sort[0][field]' => 'Class Code',
            'sort[0][direction]' => 'asc',
        ];
        
        // Filter by teacher email if provided
        if ($teacherEmail) {
            $escapedEmail = addslashes($teacherEmail);
            $params['filterByFormula'] = "{Teacher}='{$escapedEmail}'";
        }
        
        $response = $this->airtable->listRecords($tableName, $params);
        $records = $response['records'] ?? [];

        $classes = array_map(function ($rec) {
            $f = $rec['fields'] ?? [];
            return [
                'id' => $rec['id'],
                'code' => $f['Class Code'] ?? $f['code'] ?? null,
                'name' => $f['Class Name'] ?? $f['name'] ?? null,
                'date' => $f['Date'] ?? null,
                'maxStudents' => $f['Max Students'] ?? 30,
                'startTime' => $f['Start Time'] ?? null,
                'endTime' => $f['End Time'] ?? null,
                'teacher' => $f['Teacher'] ?? null,
                'instructor' => $f['instructor'] ?? null,
                'time_slot' => $f['time_slot'] ?? 'Always Available',
                'is_signed_in' => (bool)($f['is_signed_in'] ?? false),
                'always_available' => (bool)($f['always_available'] ?? false),
                'isOpen' => (bool)($f['isOpen'] ?? false),
                'isManualControl' => (bool)($f['isManualControl'] ?? false),
                'lateThreshold' => $f['Late Threshold'] ?? $f['Late Threshold (minutes)'] ?? 15,
                'enrolledStudents' => $f['Enrolled Students'] ?? [],
            ];
        }, $records);

        return response()->json(['classes' => $classes]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:200',
            'date' => 'required|date',
            'startTime' => 'required|string',
            'endTime' => 'required|string',
            'maxStudents' => 'required|integer|min:1',
            'lateThreshold' => 'required|integer|min:1',
            'isManualControl' => 'boolean',
            'teacherEmail' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $fields = [
            'Class Code' => $request->input('code'),
            'Class Name' => $request->input('name'),
            'Date' => $request->input('date'),
            'Start Time' => $request->input('startTime'),
            'End Time' => $request->input('endTime'),
            'Max Students' => (int)$request->input('maxStudents'),
            'Late Threshold' => (int)$request->input('lateThreshold'),
            'Teacher' => $request->input('teacherEmail'),
        ];
        
        // Only include optional fields if they might exist in Airtable
        // These can be added to Airtable later: isManualControl (Checkbox), isOpen (Checkbox)
        // For now, we'll skip them to avoid UNKNOWN_FIELD_NAME errors

        $created = $this->airtable->createRecord($tableName, $fields);

        return response()->json([
            'message' => 'Class created successfully',
            'class' => [
                'id' => $created['id'],
                'code' => $fields['Class Code'],
                'name' => $fields['Class Name'],
                'date' => $fields['Date'],
                'startTime' => $fields['Start Time'],
                'endTime' => $fields['End Time'],
                'maxStudents' => $fields['Max Students'],
                'lateThreshold' => $fields['Late Threshold'],
                'isManualControl' => false,
                'isOpen' => false,
                'teacher' => $fields['Teacher'],
            ],
        ], 201);
    }

    public function toggle(Request $request)
    {
        $validator = Validator($request->all(), [
            'record_id' => 'required|string',
            'action' => 'required|string|in:sign_in,sign_out',
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $recordId = $request->input('record_id');
        $action = $request->input('action');

        $fields = [
            'is_signed_in' => $action === 'sign_in',
        ];

        $updated = $this->airtable->updateRecord($tableName, $recordId, $fields);

        return response()->json([
            'message' => 'Class status updated successfully',
            'record' => $updated,
        ]);
    }

    /**
     * Add students to a class
     */
    public function addStudents(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'studentIds' => 'required|array',
            'studentIds.*' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');
        $studentIds = $request->input('studentIds');

        // Get current class record to fetch existing enrolled students
        try {
            $classRecord = $this->airtable->getRecord($tableName, $classId);
            $existingStudents = $classRecord['fields']['Enrolled Students'] ?? [];
            
            // Merge with new student IDs (avoiding duplicates)
            $allStudents = array_unique(array_merge($existingStudents, $studentIds));

            // Update the class with new enrolled students
            $fields = [
                'Enrolled Students' => $allStudents,
            ];

            $updated = $this->airtable->updateRecord($tableName, $classId, $fields);

            return response()->json([
                'message' => 'Students added successfully',
                'enrolledStudents' => $allStudents,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to add students to class: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to add students',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove a student from a class
     */
    public function removeStudent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'studentId' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');
        $studentId = $request->input('studentId');

        try {
            $classRecord = $this->airtable->getRecord($tableName, $classId);
            $existingStudents = $classRecord['fields']['Enrolled Students'] ?? [];
            
            // Remove the student ID
            $updatedStudents = array_values(array_filter($existingStudents, function($id) use ($studentId) {
                return $id !== $studentId;
            }));

            // Update the class
            $fields = [
                'Enrolled Students' => $updatedStudents,
            ];

            $updated = $this->airtable->updateRecord($tableName, $classId, $fields);

            return response()->json([
                'message' => 'Student removed successfully',
                'enrolledStudents' => $updatedStudents,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to remove student from class: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to remove student',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Open class with geolocation (teacher's location)
     */
    public function openClass(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');
        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');

        try {
            // Try to open with session fields first
            try {
                $fields = [
                    'isOpen' => true,
                    'Current Session Lat' => (float)$latitude,
                    'Current Session Lon' => (float)$longitude,
                    'Current Session Opened' => now()->toIso8601String(),
                ];
                
                $updated = $this->airtable->updateRecord($tableName, $classId, $fields);
                
                return response()->json([
                    'message' => 'Class opened successfully with geofence',
                    'class' => $updated,
                    'geofence_active' => true,
                ]);
            } catch (\Exception $innerException) {
                \Log::warning('Could not save session fields, opening without geofence: ' . $innerException->getMessage());
                
                // Session fields don't exist, just open without them
                $updated = $this->airtable->updateRecord($tableName, $classId, ['isOpen' => true]);
                
                return response()->json([
                    'message' => 'Class opened (Geofence not available - add Current Session fields to Classes table)',
                    'class' => $updated,
                    'geofence_active' => false,
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to open class: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to open class',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Close class and clear geolocation
     */
    public function closeClass(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');

        try {
            // Mark class as closed (session data stays in Classes table for history)
            $updated = $this->airtable->updateRecord($tableName, $classId, ['isOpen' => false]);

            return response()->json([
                'message' => 'Class closed successfully',
                'class' => $updated,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to close class: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to close class',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Extend class time (emergency extension for late classes or extra time needed)
     */
    public function extendClass(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'additionalMinutes' => 'required|integer|min:5|max:180', // 5 minutes to 3 hours
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');
        $additionalMinutes = $request->input('additionalMinutes');

        try {
            // Get current class data
            $classRecord = $this->airtable->getRecord($tableName, $classId);
            $fields = $classRecord['fields'] ?? [];
            
            // Parse current end time
            $currentEndTime = $fields['End Time'] ?? null;
            
            if (!$currentEndTime) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class has no end time set'
                ], 400);
            }

            // Calculate new end time
            try {
                $endDateTime = \Carbon\Carbon::createFromFormat('H:i', $currentEndTime);
                $newEndDateTime = $endDateTime->addMinutes($additionalMinutes);
                $newEndTime = $newEndDateTime->format('H:i');
                
                // Update class with new end time and ensure it stays open
                $updated = $this->airtable->updateRecord($tableName, $classId, [
                    'End Time' => $newEndTime,
                    'isOpen' => true, // Ensure it stays open
                ]);

                \Log::info('Class extended', [
                    'classId' => $classId,
                    'oldEndTime' => $currentEndTime,
                    'newEndTime' => $newEndTime,
                    'additionalMinutes' => $additionalMinutes
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "Class extended by {$additionalMinutes} minutes",
                    'oldEndTime' => $currentEndTime,
                    'newEndTime' => $newEndTime,
                    'class' => $updated,
                ]);
            } catch (\Exception $timeError) {
                \Log::error('Failed to parse time: ' . $timeError->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid time format'
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to extend class: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to extend class',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle manual control mode for a class
     */
    public function toggleManualControl(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'isManualControl' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');
        $isManualControl = $request->input('isManualControl');

        try {
            // Try to update manual control field
            try {
                $updated = $this->airtable->updateRecord($tableName, $classId, [
                    'isManualControl' => $isManualControl
                ]);

                $mode = $isManualControl ? 'Manual Control' : 'Time-based';
                
                return response()->json([
                    'success' => true,
                    'message' => "Class switched to {$mode} mode",
                    'isManualControl' => $isManualControl,
                    'class' => $updated,
                ]);
            } catch (\Exception $fieldError) {
                \Log::warning('isManualControl field not found in Airtable. Add a checkbox field named "isManualControl"');
                
                return response()->json([
                    'success' => false,
                    'message' => 'Manual control field not available. Add "isManualControl" checkbox field to Classes table in Airtable.',
                    'requiresAirtableField' => true
                ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to toggle manual control: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update control mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in meters
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // Earth's radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        $distance = $earthRadius * $c;

        return $distance;
    }

    /**
     * Student sign-in with geolocation validation
     */
    public function studentSignIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'studentEmail' => 'required|email',
            'studentName' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $tableName = config('airtable.tables.classes');
        $classId = $request->input('classId');
        $studentEmail = $request->input('studentEmail');
        $studentName = $request->input('studentName');
        $studentLat = $request->input('latitude');
        $studentLon = $request->input('longitude');

        try {
            // Get class record to check if open and get current session geofence
            $classRecord = $this->airtable->getRecord($tableName, $classId);
            $fields = $classRecord['fields'] ?? [];

            // Check if class is open
            if (!($fields['isOpen'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class is not open for sign-in yet'
                ], 403);
            }

            // Get current session geofence data
            $teacherLat = $fields['Current Session Lat'] ?? null;
            $teacherLon = $fields['Current Session Lon'] ?? null;
            $sessionOpened = $fields['Current Session Opened'] ?? null;

            if ($teacherLat === null || $teacherLon === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class geofence not set. Teacher needs to open the class first.'
                ], 403);
            }

            // Calculate distance between student and teacher
            $distance = $this->calculateDistance($teacherLat, $teacherLon, $studentLat, $studentLon);
            
            // Geofence radius (100 meters - suitable for classroom + GPS accuracy margin)
            // Set to a very large number (50km) for development/testing
            // In production, change this to 100 for real classroom validation
            $geofenceRadius = env('GEOFENCE_RADIUS', 50000); // 50km for testing

            \Log::info('Geofence validation', [
                'teacherLat' => $teacherLat,
                'teacherLon' => $teacherLon,
                'studentLat' => $studentLat,
                'studentLon' => $studentLon,
                'distance' => round($distance, 2),
                'radius' => $geofenceRadius,
                'withinRange' => $distance <= $geofenceRadius
            ]);

            if ($distance > $geofenceRadius) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not within the classroom area. Please move closer to sign in.',
                    'distance' => round($distance, 2),
                    'required' => $geofenceRadius
                ], 403);
            }

            // Get current time for duplicate check and attendance recording
            $currentDateTime = now();
            
            // Check for duplicate sign-in (same student, same class, same day)
            $attendanceTable = config('airtable.tables.attendance_entries');
            $classCode = $fields['Class Code'] ?? null;
            $todayDate = $currentDateTime->format('Y-m-d');
            
            if ($attendanceTable && $classCode) {
                try {
                    // Build filter to check if student already signed in today for this class
                    $duplicateFilter = "AND(" .
                        "{Class Code}='" . str_replace("'", "\\'", $classCode) . "'," .
                        "{Student Email}='" . str_replace("'", "\\'", $studentEmail) . "'," .
                        "DATESTR({Date})='" . $todayDate . "'" .
                    ")";
                    
                    $existingRecords = $this->airtable->listRecords($attendanceTable, [
                        'filterByFormula' => $duplicateFilter,
                        'maxRecords' => 1
                    ]);
                    
                    if (!empty($existingRecords['records'])) {
                        $existingRecord = $existingRecords['records'][0];
                        $signInTime = $existingRecord['fields']['Sign In Time'] ?? 'earlier';
                        
                        \Log::info('Duplicate sign-in attempt blocked', [
                            'student' => $studentEmail,
                            'class' => $classCode,
                            'date' => $todayDate,
                            'originalSignIn' => $signInTime
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => "You have already signed in to this class today at {$signInTime}. Attendance has been recorded.",
                            'alreadySignedIn' => true,
                            'signInTime' => $signInTime,
                            'date' => $todayDate
                        ], 400);
                    }
                } catch (\Exception $duplicateError) {
                    // Log but don't block sign-in if duplicate check fails
                    \Log::warning('Duplicate check failed, allowing sign-in: ' . $duplicateError->getMessage());
                }
            }

            // Get student's guardian phone number (optional for SMS)
            $studentsTable = config('airtable.tables.students');
            $guardianPhone = null;
            try {
                $studentsList = $this->airtable->listRecords($studentsTable, [
                    'filterByFormula' => "{email}='" . str_replace("'", "\\'", $studentEmail) . "'",
                    'maxRecords' => 1
                ]);
                
                if (!empty($studentsList['records'])) {
                    $studentRecord = $studentsList['records'][0];
                    $guardianPhone = $studentRecord['fields']['guardianPhone'] ?? null;
                }
            } catch (\Exception $e) {
                \Log::error('Failed to fetch student guardian phone: ' . $e->getMessage());
            }

            // Student is within geofence, record attendance
            $lateThreshold = $fields['Late Threshold'] ?? 15;

            // Calculate if late based on when teacher ACTUALLY opened the class
            $isLate = false;
            if ($sessionOpened) {
                // Use the actual time teacher opened the class (not the scheduled start time)
                $classOpenedTime = strtotime($sessionOpened);
                $signInTime = $currentDateTime->timestamp;
                $thresholdTime = $classOpenedTime + ($lateThreshold * 60);
                $isLate = $signInTime > $thresholdTime;
                
                \Log::info('Late threshold calculation', [
                    'classOpenedAt' => $sessionOpened,
                    'signInAt' => $currentDateTime->toIso8601String(),
                    'lateThreshold' => $lateThreshold,
                    'thresholdTime' => date('Y-m-d H:i:s', $thresholdTime),
                    'isLate' => $isLate
                ]);
            }

            // Store attendance record in Attendance Entries table
            $attendanceTable = config('airtable.tables.attendance');
            try {
                // Build basic attendance record
                $attendanceRecord = [
                    'Class Code' => $fields['Class Code'] ?? $fields['code'] ?? '',
                    'Class Name' => $fields['Class Name'] ?? $fields['name'] ?? '',
                    'Date' => $currentDateTime->format('Y-m-d'),
                    'Teacher Email' => $fields['Teacher'] ?? '',
                    'Student Email' => $studentEmail,
                    'Student Name' => $studentName,
                    'Sign In Time' => $currentDateTime->format('H:i:s'),
                    'Status' => $isLate ? 'Late' : 'On Time',
                    'Distance' => round($distance, 2),
                    'Timestamp' => $currentDateTime->toIso8601String(),
                ];

                \Log::info('Creating attendance record with basic fields', $attendanceRecord);

                // Try to create the record
                $createdRecord = $this->airtable->createRecord($attendanceTable, $attendanceRecord);
                \Log::info('Attendance record created successfully', ['recordId' => $createdRecord['id'] ?? 'unknown']);

            } catch (\Exception $attendanceError) {
                // Log detailed error
                \Log::error('Failed to save attendance record: ' . $attendanceError->getMessage());
                \Log::error('Attempted to save to table: ' . $attendanceTable);
                \Log::error('Record data: ' . json_encode($attendanceRecord));
            }

            // Send SMS to guardian (if phone number exists and SMS is configured)
            $smsResult = null;
            if ($guardianPhone && !empty(env('SEMAPHORE_API_KEY'))) {
                try {
                    $className = $fields['Class Name'] ?? 'Class';
                    $teacherName = $fields['Teacher'] ?? 'Teacher';
                    $signInTime = $currentDateTime->format('g:i A'); // 12-hour format
                    
                    $message = $this->sms->generateAttendanceMessage(
                        $studentName,
                        $className,
                        $teacherName,
                        $signInTime,
                        $isLate
                    );
                    
                    $smsResult = $this->sms->sendSMS($guardianPhone, $message);
                    
                    if ($smsResult['success']) {
                        \Log::info('SMS sent to guardian', [
                            'phone' => $guardianPhone,
                            'student' => $studentName,
                            'class' => $className
                        ]);
                    } else {
                        \Log::warning('SMS failed to send', [
                            'phone' => $guardianPhone,
                            'error' => $smsResult['message']
                        ]);
                    }
                } catch (\Exception $smsError) {
                    \Log::error('SMS exception: ' . $smsError->getMessage());
                }
            } elseif (!$guardianPhone) {
                \Log::info('SMS not sent: No guardian phone number for student', ['student' => $studentName]);
            } else {
                \Log::info('SMS not sent: SEMAPHORE_API_KEY not configured');
            }

            return response()->json([
                'success' => true,
                'message' => $isLate ? 'Signed in successfully (Late)' : 'Signed in successfully (On time)',
                'isLate' => $isLate,
                'signInTime' => $currentDateTime->format('H:i:s'),
                'distance' => round($distance, 2),
                'smsSent' => isset($smsResult) && $smsResult['success'],
                'smsNote' => !$guardianPhone ? 'Add guardian phone to receive SMS alerts' : ($smsResult ? null : 'SMS service not configured')
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to sign in student: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to sign in',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance records for a specific class
     */
    public function getAttendance(Request $request, $classId)
    {
        try {
            $attendanceTable = config('airtable.tables.attendance');
            $classesTable = config('airtable.tables.classes');
            
            // Get the class details first
            $classRecord = $this->airtable->getRecord($classesTable, $classId);
            $classFields = $classRecord['fields'] ?? [];
            $classCode = $classFields['Class Code'] ?? '';
            
            \Log::info('Fetching attendance', [
                'classId' => $classId,
                'classCode' => $classCode,
                'requestedDate' => $request->query('date')
            ]);
            
            // Get date filter if provided
            $date = $request->query('date');
            
            // Build filter formula
            $filters = [];
            if ($classCode) {
                $filters[] = "{Class Code}='{$classCode}'";
            }
            if ($date) {
                // Use DATESTR for Date field type comparison
                $filters[] = "DATESTR({Date})='{$date}'";
            }
            
            $params = [
                'pageSize' => 100,
                'sort[0][field]' => 'Sign In Time',
                'sort[0][direction]' => 'asc',
            ];
            
            if (!empty($filters)) {
                $params['filterByFormula'] = 'AND(' . implode(',', $filters) . ')';
            }
            
            \Log::info('Airtable filter formula', ['formula' => $params['filterByFormula'] ?? 'none']);
            
            // Debug: Also fetch without filter to see all records
            $allRecords = $this->airtable->listRecords($attendanceTable, ['pageSize' => 10]);
            \Log::info('Total records in attendance table (unfiltered)', [
                'count' => count($allRecords['records'] ?? []),
                'sample' => !empty($allRecords['records']) ? $allRecords['records'][0]['fields'] ?? [] : 'none'
            ]);
            
            $response = $this->airtable->listRecords($attendanceTable, $params);
            $records = $response['records'] ?? [];
            
            \Log::info('Attendance records found', ['count' => count($records)]);
            
            // Debug: Log first record to see actual field values
            if (!empty($records)) {
                \Log::info('Sample attendance record', ['fields' => $records[0]['fields'] ?? []]);
            }
            
            $attendanceRecords = array_map(function ($rec) {
                $f = $rec['fields'] ?? [];
                return [
                    'id' => $rec['id'],
                    'studentName' => $f['Student Name'] ?? 'Unknown',
                    'studentEmail' => $f['Student Email'] ?? '',
                    'date' => $f['Date'] ?? '',
                    'signInTime' => $f['Sign In Time'] ?? '',
                    'status' => $f['Status'] ?? 'Unknown',
                    'distance' => $f['Distance'] ?? 0,
                    'timestamp' => $f['Timestamp'] ?? '',
                    'isLate' => ($f['Status'] ?? '') === 'Late',
                ];
            }, $records);
            
            return response()->json([
                'success' => true,
                'attendance' => $attendanceRecords,
                'classCode' => $classCode,
                'className' => $classFields['Class Name'] ?? '',
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to get attendance: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve attendance records',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}









