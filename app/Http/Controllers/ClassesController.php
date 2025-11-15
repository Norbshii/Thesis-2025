<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ClassModel;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\AttendanceEntry;
use App\Services\SmsService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use App\Mail\StudentSignInNotification;
use App\Events\ClassUpdated;
use App\Events\AttendanceUpdated;

class ClassesController extends Controller
{
    public function __construct(
        private SmsService $sms
    ) {
    }

    public function index(Request $request)
    {
        $teacherEmail = $request->query('teacherEmail');
        $studentEmail = $request->query('studentEmail');
        
        $query = ClassModel::with(['teacher', 'building', 'students']);
        
        // Filter by teacher email if provided
        if ($teacherEmail) {
            $query->where('teacher_email', $teacherEmail);
        }
        
        // Filter by student enrollment if provided
        if ($studentEmail) {
            $query->whereHas('students', function ($q) use ($studentEmail) {
                $q->where('email', $studentEmail);
            });
        }
        
        $classes = $query->orderBy('class_code', 'asc')->get();

        $formattedClasses = $classes->map(function ($class) {
            $building = null;
            if ($class->building) {
                $building = [
                    'id' => $class->building->id,
                    'name' => $class->building->name,
                    'latitude' => (float) $class->building->latitude,
                    'longitude' => (float) $class->building->longitude,
                ];
            }
            
            // Get enrolled students
            $enrolledStudents = $class->students->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'enrolled_at' => $student->pivot->enrolled_at ?? null
                ];
            })->toArray();
            
            return [
                'id' => (string) $class->id, // Frontend expects string ID
                'code' => $class->class_code,
                'name' => $class->class_name,
                'date' => $class->days, // "days" field maps to "Date" in frontend
                'maxStudents' => 30, // Default value (not stored in current schema)
                'startTime' => $class->start_time ? Carbon::parse($class->start_time)->format('H:i') : null,
                'endTime' => $class->end_time ? Carbon::parse($class->end_time)->format('H:i') : null,
                'teacher' => $class->teacher_email,
                'instructor' => $class->teacher_name ?? 'N/A',
                'time_slot' => 'Always Available', // Default value
                'is_signed_in' => false, // Legacy field
                'always_available' => false, // Legacy field
                'isOpen' => (bool) $class->is_open,
                'isManualControl' => false, // Not implemented in MySQL yet
                'lateThreshold' => $class->late_threshold ?? 15,
                'enrolledStudents' => $enrolledStudents, // Now returns actual enrolled students
                'currentSessionLat' => $class->current_session_lat,
                'currentSessionLon' => $class->current_session_lon,
                'currentSessionOpened' => $class->current_session_opened ? $class->current_session_opened->toIso8601String() : null,
                'autoCloseTime' => $class->auto_close_time ? $class->auto_close_time->toIso8601String() : null,
                'building' => $building, // Include building data
                'building_id' => $class->building_id, // Include building ID
            ];
        });

        return response()->json(['classes' => $formattedClasses]);
    }

    public function update(Request $request, $id)
    {
        $class = ClassModel::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:200',
            'date' => 'required|string', // days of week
            'startTime' => 'required|string',
            'endTime' => 'required|string',
            'maxStudents' => 'required|integer|min:1',
            'lateThreshold' => 'required|integer|min:1',
            'isManualControl' => 'boolean',
            'teacherEmail' => 'required|email',
            'building_id' => 'nullable|integer|exists:buildings,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Find teacher by email
        $teacher = Teacher::where('email', $request->input('teacherEmail'))->first();
        
        // Update class
        $class->update([
            'class_code' => $request->input('code'),
            'class_name' => $request->input('name'),
            'teacher_id' => $teacher ? $teacher->id : null,
            'teacher_email' => $request->input('teacherEmail'),
            'teacher_name' => $teacher ? $teacher->name : null,
            'start_time' => $request->input('startTime'),
            'end_time' => $request->input('endTime'),
            'days' => $request->input('date'),
            'room' => $request->input('room', null),
            'geofence_radius' => $request->input('geofenceRadius', 100),
            'late_threshold' => $request->input('lateThreshold'),
            'building_id' => $request->input('building_id'),
        ]);

        // Reload relationships
        $class->load(['teacher', 'building', 'students']);

        // Broadcast class updated event
        broadcast(new ClassUpdated($class, 'updated'));

        return response()->json([
            'success' => true,
            'message' => 'Class updated successfully',
            'class' => $class
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:200',
            'date' => 'required|string', // days of week
            'startTime' => 'required|string',
            'endTime' => 'required|string',
            'maxStudents' => 'required|integer|min:1',
            'lateThreshold' => 'required|integer|min:1',
            'isManualControl' => 'boolean',
            'teacherEmail' => 'required|email',
            'building_id' => 'nullable|integer|exists:buildings,id', // Optional building reference
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Find teacher by email
        $teacher = Teacher::where('email', $request->input('teacherEmail'))->first();
        
        // Create class
        $class = ClassModel::create([
            'class_code' => $request->input('code'),
            'class_name' => $request->input('name'),
            'teacher_id' => $teacher ? $teacher->id : null,
            'teacher_email' => $request->input('teacherEmail'),
            'teacher_name' => $teacher ? $teacher->name : null,
            'start_time' => $request->input('startTime'),
            'end_time' => $request->input('endTime'),
            'days' => $request->input('date'),
            'late_threshold' => (int)$request->input('lateThreshold'),
            'geofence_radius' => env('GEOFENCE_RADIUS', 100),
            'building_id' => $request->input('building_id'), // Store building reference
        ]);

        // Broadcast class created event
        broadcast(new ClassUpdated($class, 'created'));

        return response()->json([
            'message' => 'Class created successfully',
            'class' => [
                'id' => (string) $class->id,
                'code' => $class->class_code,
                'name' => $class->class_name,
                'date' => $class->days,
                'startTime' => $class->start_time,
                'endTime' => $class->end_time,
                'maxStudents' => 30,
                'lateThreshold' => $class->late_threshold,
                'isManualControl' => false,
                'isOpen' => false,
                'teacher' => $class->teacher_email,
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

        $classId = $request->input('record_id');
        $action = $request->input('action');

        $class = ClassModel::findOrFail($classId);
        // This was a legacy endpoint - not actively used
        // Could be removed or repurposed

        return response()->json([
            'message' => 'Class status updated successfully',
            'record' => $class,
        ]);
    }

    /**
     * Add students to a class (requires pivot table implementation)
     */
    public function addStudents(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|integer',
            'studentIds' => 'required|array',
            'studentIds.*' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            $class = ClassModel::findOrFail($request->input('classId'));
            $studentIds = $request->input('studentIds');
            
            // Attach students (sync will prevent duplicates)
            $class->students()->syncWithoutDetaching($studentIds);
            
            // Get enrolled students count
            $enrolledCount = $class->students()->count();
            
            return response()->json([
                'message' => 'Students added successfully',
                'enrolledStudents' => $studentIds,
                'totalEnrolled' => $enrolledCount
            ]);
        } catch (\Exception $e) {
            \Log::error('Error adding students to class: ' . $e->getMessage());
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
            'classId' => 'required|integer',
            'studentId' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            $class = ClassModel::findOrFail($request->input('classId'));
            $studentId = $request->input('studentId');
            
            // Detach the student
            $class->students()->detach($studentId);
            
            // Get remaining enrolled students count
            $enrolledCount = $class->students()->count();
            
            return response()->json([
                'message' => 'Student removed successfully',
                'totalEnrolled' => $enrolledCount
            ]);
        } catch (\Exception $e) {
            \Log::error('Error removing student from class: ' . $e->getMessage());
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
        \Log::info('Opening class request', [
            'classId' => $request->input('classId'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'latitude_type' => gettype($request->input('latitude')),
            'longitude_type' => gettype($request->input('longitude'))
        ]);

        $validator = Validator::make($request->all(), [
            'classId' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            \Log::error('Class open validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input' => $request->all()
            ]);
            return response()->json([
                'message' => 'Validation failed', 
                'errors' => $validator->errors(),
                'debug_input' => $request->all()
            ], 422);
        }

        $classId = $request->input('classId');
        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');

        try {
            $class = ClassModel::findOrFail($classId);
            
            // Calculate auto-close time based on class duration
            $autoCloseTime = null;
            if ($class->start_time && $class->end_time) {
                try {
                    // Parse start and end times
                    $start = Carbon::createFromFormat('H:i:s', $class->start_time);
                    $end = Carbon::createFromFormat('H:i:s', $class->end_time);
                    
                    // Calculate duration in minutes
                    $durationMinutes = $end->diffInMinutes($start);
                    
                    // Set auto-close time = current time + duration
                    $autoCloseTime = now()->addMinutes($durationMinutes);
                    
                    \Log::info('Auto-close time calculated', [
                        'scheduledStart' => $class->start_time,
                        'scheduledEnd' => $class->end_time,
                        'duration' => $durationMinutes . ' minutes',
                        'actualOpen' => now()->format('H:i'),
                        'autoClose' => $autoCloseTime->format('H:i')
                    ]);
                } catch (\Exception $timeError) {
                    \Log::warning('Could not calculate auto-close time: ' . $timeError->getMessage());
                }
            }
            
            // Update class with session data
            $class->update([
                'is_open' => true,
                'current_session_lat' => (float)$latitude,
                'current_session_lon' => (float)$longitude,
                'current_session_opened' => now(),
                'auto_close_time' => $autoCloseTime,
            ]);
            
            $message = 'Class opened successfully with geofence';
            if ($autoCloseTime) {
                $closeAt = $autoCloseTime->format('h:i A');
                $message .= " (will auto-close at {$closeAt})";
            }
            
            // Broadcast class opened event
            broadcast(new ClassUpdated($class->fresh(['teacher', 'building', 'students']), 'opened'));
            
            return response()->json([
                'message' => $message,
                'class' => $class,
                'geofence_active' => true,
                'auto_close_time' => $autoCloseTime ? $autoCloseTime->toIso8601String() : null,
            ]);
            
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

        $classId = $request->input('classId');

        try {
            $class = ClassModel::findOrFail($classId);
            
            // Mark class as closed (session data stays for history)
            $class->update(['is_open' => false]);
            
            // Broadcast class closed event
            broadcast(new ClassUpdated($class->fresh(['teacher', 'building', 'students']), 'closed'));

            return response()->json([
                'message' => 'Class closed successfully',
                'class' => $class,
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

        $classId = $request->input('classId');
        $additionalMinutes = $request->input('additionalMinutes');

        try {
            $class = ClassModel::findOrFail($classId);
            
            if (!$class->end_time) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class has no end time set'
                ], 400);
            }

            // Calculate new end time
            try {
                $endDateTime = Carbon::createFromFormat('H:i:s', $class->end_time);
                $newEndDateTime = $endDateTime->addMinutes($additionalMinutes);
                $newEndTime = $newEndDateTime->format('H:i:s');
                
                // Update class with new end time and ensure it stays open
                $class->update([
                    'end_time' => $newEndTime,
                    'is_open' => true,
                ]);

                \Log::info('Class extended', [
                    'classId' => $classId,
                    'oldEndTime' => $class->end_time,
                    'newEndTime' => $newEndTime,
                    'additionalMinutes' => $additionalMinutes
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "Class extended by {$additionalMinutes} minutes",
                    'oldEndTime' => $class->end_time,
                    'newEndTime' => $newEndTime,
                    'class' => $class,
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

        // Manual control not implemented in MySQL schema yet
        // Would need to add is_manual_control column to classes table
        
        return response()->json([
            'success' => false,
            'message' => 'Manual control not yet implemented in MySQL',
            'requiresMigration' => true
        ], 400);
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

        $classId = $request->input('classId');
        $studentEmail = $request->input('studentEmail');
        $studentName = $request->input('studentName');
        $studentLat = $request->input('latitude');
        $studentLon = $request->input('longitude');

        try {
            // Get class record to check if open and get current session geofence
            $class = ClassModel::findOrFail($classId);

            // Check if class is open
            if (!$class->is_open) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class is not open for sign-in yet'
                ], 403);
            }

            // Get current session geofence data
            $teacherLat = $class->current_session_lat;
            $teacherLon = $class->current_session_lon;
            $sessionOpened = $class->current_session_opened;

            if ($teacherLat === null || $teacherLon === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class geofence not set. Teacher needs to open the class first.'
                ], 403);
            }

            // Calculate distance between student and teacher
            $distance = $this->calculateDistance($teacherLat, $teacherLon, $studentLat, $studentLon);
            
            // Geofence radius
            $geofenceRadius = $class->geofence_radius ?? env('GEOFENCE_RADIUS', 100);

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
            $todayDate = $currentDateTime->format('Y-m-d');
            
            // Check for duplicate sign-in (same student, same class, same day)
            $existingAttendance = AttendanceEntry::where('class_code', $class->class_code)
                ->where('student_email', $studentEmail)
                ->whereDate('date', $todayDate)
                ->first();
            
            if ($existingAttendance) {
                $signInTime = Carbon::parse($existingAttendance->sign_in_time)->format('H:i:s');
                
                \Log::info('Duplicate sign-in attempt blocked', [
                    'student' => $studentEmail,
                    'class' => $class->class_code,
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

            // Get student record for guardian info (for SMS and email)
            $student = Student::where('email', $studentEmail)->first();
            $guardianPhone = $student ? $student->guardian_phone : null;
            $guardianEmail = $student ? $student->guardian_email : null;
            $guardianName = $student ? $student->guardian_name : 'Guardian';

            // Calculate if late based on when teacher ACTUALLY opened the class
            $lateThreshold = $class->late_threshold ?? 15;
            $isLate = false;
            
            if ($sessionOpened) {
                // Use the actual time teacher opened the class
                $classOpenedTime = $sessionOpened->timestamp;
                $signInTime = $currentDateTime->timestamp;
                $thresholdTime = $classOpenedTime + ($lateThreshold * 60);
                $isLate = $signInTime > $thresholdTime;
                
                \Log::info('Late threshold calculation', [
                    'classOpenedAt' => $sessionOpened->toIso8601String(),
                    'signInAt' => $currentDateTime->toIso8601String(),
                    'lateThreshold' => $lateThreshold,
                    'thresholdTime' => date('Y-m-d H:i:s', $thresholdTime),
                    'isLate' => $isLate
                ]);
            }

            // Store attendance record in attendance_entries table
            $attendanceRecord = AttendanceEntry::create([
                'class_id' => $class->id,
                'student_id' => $student ? $student->id : null,
                'class_code' => $class->class_code,
                'class_name' => $class->class_name,
                'teacher_email' => $class->teacher_email,
                'student_email' => $studentEmail,
                'student_name' => $studentName,
                'date' => $todayDate,
                'sign_in_time' => $currentDateTime->format('H:i:s'),
                'status' => $isLate ? 'Late' : 'On Time',
                'distance' => round($distance, 2),
                'student_latitude' => (float)$studentLat,
                'student_longitude' => (float)$studentLon,
                'timestamp' => $currentDateTime,
                'geofence_entry_time' => $currentDateTime,
                'currently_inside' => true,
                'time_inside_geofence' => 0,
                'time_outside_geofence' => 0,
                'last_location_update' => $currentDateTime,
            ]);

            \Log::info('Attendance record created successfully', ['id' => $attendanceRecord->id]);

            // Send SMS to guardian (if phone number exists and SMS is configured)
            $smsResult = null;
            if ($guardianPhone && !empty(env('SEMAPHORE_API_KEY'))) {
                try {
                    $signInTimeFormatted = $currentDateTime->format('g:i A'); // 12-hour format
                    
                    $message = $this->sms->generateAttendanceMessage(
                        $studentName,
                        $class->class_name,
                        $class->teacher_name ?? $class->teacher_email,
                        $signInTimeFormatted,
                        $isLate
                    );
                    
                    $smsResult = $this->sms->sendSMS($guardianPhone, $message);
                    
                    if ($smsResult['success']) {
                        \Log::info('SMS sent to guardian', [
                            'phone' => $guardianPhone,
                            'student' => $studentName,
                            'class' => $class->class_name
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

            // Send email notification to guardian (if email address exists and Resend is configured)
            $emailSent = false;
            if ($guardianEmail && !empty(env('RESEND_API_KEY'))) {
                try {
                    $emailData = [
                        'studentName' => $studentName,
                        'guardianName' => $guardianName,
                        'className' => $class->class_name,
                        'signInTime' => $currentDateTime->format('g:i A'),
                        'signInDate' => $currentDateTime->format('l, F j, Y'),
                        'status' => $isLate ? 'Late' : 'On Time',
                        'distance' => round($distance, 2),
                        'isWithinGeofence' => $distance <= $geofenceRadius,
                        'teacherName' => $class->teacher_name ?? 'Teacher',
                    ];

                    Mail::to($guardianEmail)->send(new StudentSignInNotification($emailData));
                    $emailSent = true;

                    \Log::info('Email sent to guardian', [
                        'email' => $guardianEmail,
                        'student' => $studentName,
                        'class' => $class->class_name
                    ]);
                } catch (\Exception $emailError) {
                    \Log::error('Email failed to send', [
                        'email' => $guardianEmail,
                        'error' => $emailError->getMessage()
                    ]);
                }
            } elseif (!$guardianEmail) {
                \Log::info('Email not sent: No guardian email for student', ['student' => $studentName]);
            } else {
                \Log::info('Email not sent: RESEND_API_KEY not configured');
            }

            // Broadcast attendance update event
            $attendanceData = [
                'id' => $attendanceRecord->id,
                'student_name' => $studentName,
                'student_email' => $studentEmail,
                'sign_in_time' => $currentDateTime->format('H:i:s'),
                'status' => $isLate ? 'Late' : 'On Time',
                'distance' => round($distance, 2),
                'latitude' => (float)$studentLat,
                'longitude' => (float)$studentLon,
                'timestamp' => $currentDateTime->toIso8601String(),
            ];
            broadcast(new AttendanceUpdated($classId, $attendanceData));
            
            return response()->json([
                'success' => true,
                'message' => $isLate ? 'Signed in successfully (Late)' : 'Signed in successfully (On time)',
                'isLate' => $isLate,
                'signInTime' => $currentDateTime->format('H:i:s'),
                'distance' => round($distance, 2),
                'smsSent' => isset($smsResult) && $smsResult['success'],
                'emailSent' => $emailSent,
                'smsNote' => !$guardianPhone ? 'Add guardian phone to receive SMS alerts' : ($smsResult ? null : 'SMS service not configured'),
                'emailNote' => !$guardianEmail ? 'Add guardian email to receive email notifications' : (!$emailSent && env('RESEND_API_KEY') ? 'Email service error' : null)
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
            $class = ClassModel::findOrFail($classId);
            
            \Log::info('Fetching attendance', [
                'classId' => $classId,
                'classCode' => $class->class_code,
                'requestedDate' => $request->query('date')
            ]);
            
            // Get date filter if provided
            $date = $request->query('date');
            
            // Build query
            $query = AttendanceEntry::where('class_code', $class->class_code)
                ->orderBy('sign_in_time', 'asc');
            
            if ($date) {
                $query->whereDate('date', $date);
            }
            
            $attendanceRecords = $query->get()->map(function ($record) {
                return [
                    'id' => $record->id,
                    'studentName' => $record->student_name,
                    'studentEmail' => $record->student_email,
                    'date' => $record->date->format('Y-m-d'),
                    'signInTime' => $record->sign_in_time,
                    'status' => $record->status,
                    'distance' => $record->distance,
                    'timestamp' => $record->timestamp ? $record->timestamp->toIso8601String() : null,
                    'isLate' => $record->status === 'Late',
                    'latitude' => $record->student_latitude,
                    'longitude' => $record->student_longitude,
                    'timeInsideGeofence' => $record->time_inside_geofence ?? 0,
                    'timeOutsideGeofence' => $record->time_outside_geofence ?? 0,
                    'currentlyInside' => $record->currently_inside ?? false,
                    'geofenceEntryTime' => $record->geofence_entry_time ? $record->geofence_entry_time->toIso8601String() : null,
                    'geofenceExitTime' => $record->geofence_exit_time ? $record->geofence_exit_time->toIso8601String() : null,
                ];
            });
            
            \Log::info('Attendance records found', ['count' => $attendanceRecords->count()]);
            
            return response()->json([
                'success' => true,
                'attendance' => $attendanceRecords,
                'classCode' => $class->class_code,
                'className' => $class->class_name,
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
