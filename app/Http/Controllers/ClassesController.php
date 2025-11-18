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
use Resend\Resend;
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
        try {
            $class = ClassModel::findOrFail($id);
            
            \Log::info('Class update request', [
                'class_id' => $id,
                'request_data' => $request->all()
            ]);
            
            $validator = Validator::make($request->all(), [
                'code' => 'required|string|max:50',
                'name' => 'required|string|max:200',
                'date' => 'nullable|string', // days of week - optional for mobile
                'startTime' => 'required|string',
                'endTime' => 'required|string',
                'maxStudents' => 'nullable|integer|min:1',
                'lateThreshold' => 'required|integer|min:1',
                'isManualControl' => 'nullable|boolean',
                'teacherEmail' => 'required|email',
                'building_id' => 'nullable|integer|exists:buildings,id',
            ]);

            if ($validator->fails()) {
                \Log::error('Class update validation failed', [
                    'errors' => $validator->errors()->toArray(),
                    'input' => $request->all()
                ]);
                return response()->json([
                    'message' => 'Validation failed', 
                    'errors' => $validator->errors()
                ], 422);
            }

            // Find teacher by email
            $teacher = Teacher::where('email', $request->input('teacherEmail'))->first();
            
            // Check if class_code is changing
            $oldClassCode = $class->class_code;
            $newClassCode = $request->input('code');
            $classCodeChanged = $oldClassCode !== $newClassCode;
            
            // Update class (only update fields that are provided)
            $updateData = [
                'class_code' => $newClassCode,
                'class_name' => $request->input('name'),
                'teacher_id' => $teacher ? $teacher->id : null,
                'teacher_email' => $request->input('teacherEmail'),
                'teacher_name' => $teacher ? $teacher->name : null,
                'start_time' => $request->input('startTime'),
                'end_time' => $request->input('endTime'),
                'late_threshold' => $request->input('lateThreshold'),
            ];

            // Only update if provided
            if ($request->has('date')) {
                $updateData['days'] = $request->input('date');
            }
            if ($request->has('maxStudents')) {
                $updateData['max_students'] = $request->input('maxStudents');
            }
            if ($request->has('isManualControl')) {
                $updateData['is_manual_control'] = $request->input('isManualControl');
            }
            if ($request->has('building_id')) {
                $updateData['building_id'] = $request->input('building_id');
            }
            if ($request->has('geofenceRadius')) {
                $updateData['geofence_radius'] = $request->input('geofenceRadius');
            }

            $class->update($updateData);

            // If class_code or class_name changed, update all attendance records
            if ($classCodeChanged) {
                // Class code changed - update both code and name
                $updatedCount = AttendanceEntry::where('class_code', $oldClassCode)
                    ->update([
                        'class_code' => $newClassCode,
                        'class_name' => $request->input('name')
                    ]);
                
                \Log::info('Updated attendance records after class code change', [
                    'old_code' => $oldClassCode,
                    'new_code' => $newClassCode,
                    'updated_records' => $updatedCount
                ]);
            } else {
                // Class code same but name might have changed - update name only
                $updatedCount = AttendanceEntry::where('class_code', $newClassCode)
                    ->update(['class_name' => $request->input('name')]);
                
                if ($updatedCount > 0) {
                    \Log::info('Updated attendance records class name', [
                        'class_code' => $newClassCode,
                        'new_name' => $request->input('name'),
                        'updated_records' => $updatedCount
                    ]);
                }
            }

            // If class is open and end time changed, recalculate auto_close_time
            if ($class->is_open && $request->has('endTime') && $class->current_session_opened) {
                $start = \Carbon\Carbon::parse($class->current_session_opened);
                $endTime = \Carbon\Carbon::createFromFormat('H:i:s', $request->input('endTime'));
                $today = \Carbon\Carbon::today();
                $endDateTime = $today->copy()->setTimeFromTimeString($endTime->format('H:i:s'));
                
                // Calculate new duration from session start
                $newDuration = $start->diffInMinutes($endDateTime);
                $newAutoCloseTime = $start->copy()->addMinutes($newDuration);
                
                $class->update(['auto_close_time' => $newAutoCloseTime]);
                
                \Log::info('Recalculated auto_close_time for open class', [
                    'class_id' => $id,
                    'new_end_time' => $request->input('endTime'),
                    'new_auto_close_time' => $newAutoCloseTime->toDateTimeString()
                ]);
            }

            // Reload relationships
            $class->load(['teacher', 'building', 'students']);

            // Broadcast class updated event
            broadcast(new ClassUpdated($class, 'updated'));

            \Log::info('Class updated successfully', ['class_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Class updated successfully',
                'class' => $class
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating class', [
                'class_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
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
     * Open class with geolocation (uses building location, not teacher GPS)
     * Note: Geofence validation uses building location from class->building relationship, not this session location
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
            
            // Calculate geofence time for all students who signed in to this session
            $this->calculateGeofenceTimes($class);
            
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
        // Test mode: Allow sign-in without location for testing
        $testMode = env('ALLOW_TEST_MODE', false);
        
        \Log::info('Student sign-in attempt', [
            'test_mode' => $testMode,
            'has_latitude' => $request->has('latitude'),
            'has_longitude' => $request->has('longitude'),
            'student' => $request->input('studentName'),
            'class' => $request->input('classId')
        ]);
        
        $rules = [
            'classId' => 'required|string',
            'studentEmail' => 'required|email',
            'studentName' => 'required|string',
        ];
        
        // Only require location if not in test mode
        if (!$testMode) {
            $rules['latitude'] = 'required|numeric|between:-90,90';
            $rules['longitude'] = 'required|numeric|between:-180,180';
        }
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            \Log::error('Student sign-in validation failed', [
                'test_mode' => $testMode,
                'errors' => $validator->errors()->toArray(),
                'input' => $request->all()
            ]);
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $classId = $request->input('classId');
        $studentEmail = $request->input('studentEmail');
        $studentName = $request->input('studentName');
        $studentLat = $request->input('latitude');
        $studentLon = $request->input('longitude');
        
        // Validate coordinates are provided and valid (not 0,0 which is in the ocean)
        if (!$testMode) {
            if ($studentLat === null || $studentLon === null) {
                \Log::error('Student coordinates missing', [
                    'student' => $studentName,
                    'has_lat' => $request->has('latitude'),
                    'has_lon' => $request->has('longitude'),
                    'lat_value' => $request->input('latitude'),
                    'lon_value' => $request->input('longitude')
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Location not available. Please enable location permissions and try again.'
                ], 400);
            }
            
            // Check if coordinates are valid (not 0,0 which is invalid)
            if ((float)$studentLat == 0 && (float)$studentLon == 0) {
                \Log::error('Student coordinates are 0,0 (invalid)', [
                    'student' => $studentName,
                    'lat' => $studentLat,
                    'lon' => $studentLon
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid location detected. Please refresh the page and allow location access, then try again.'
                ], 400);
            }
            
            // Validate coordinate ranges
            if ((float)$studentLat < -90 || (float)$studentLat > 90 || 
                (float)$studentLon < -180 || (float)$studentLon > 180) {
                \Log::error('Student coordinates out of range', [
                    'student' => $studentName,
                    'lat' => $studentLat,
                    'lon' => $studentLon
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid location coordinates. Please try again.'
                ], 400);
            }
        }
        
        // Cast to float for calculations
        $studentLat = (float)$studentLat;
        $studentLon = (float)$studentLon;

        try {
            // Get class record with building relationship
            $class = ClassModel::with('building')->findOrFail($classId);

            // Check if class is open
            if (!$class->is_open) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class is not open for sign-in yet'
                ], 403);
            }

            // ONLY use building location for geofence validation (constant, reliable location)
            // Teacher session location is no longer used for geofence
            $geofenceLat = null;
            $geofenceLon = null;

            if (!$class->building || !$class->building->latitude || !$class->building->longitude) {
                // Reject if no building assigned (unless test mode)
                if (!$testMode) {
                    \Log::warning('No building assigned to class - geofence validation failed', [
                        'class' => $class->class_code,
                        'class_id' => $class->id,
                        'has_building' => $class->building ? 'yes' : 'no',
                        'building_id' => $class->building_id
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'This class does not have a building assigned. Please contact your teacher or administrator to assign a building to this class.'
                    ], 403);
                }
            } else {
                // Use building location (constant, reliable)
                $geofenceLat = (float)$class->building->latitude;
                $geofenceLon = (float)$class->building->longitude;
                
                // Validate building coordinates are valid (not 0,0)
                if ($geofenceLat == 0 && $geofenceLon == 0) {
                    \Log::error('Building coordinates are 0,0 (invalid)', [
                        'building' => $class->building->name,
                        'building_id' => $class->building->id,
                        'class' => $class->class_code
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Building location is not configured correctly. Please contact your administrator.'
                    ], 500);
                }
                
                // Validate building coordinate ranges
                if ($geofenceLat < -90 || $geofenceLat > 90 || 
                    $geofenceLon < -180 || $geofenceLon > 180) {
                    \Log::error('Building coordinates out of range', [
                        'building' => $class->building->name,
                        'building_id' => $class->building->id,
                        'lat' => $geofenceLat,
                        'lon' => $geofenceLon
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Building location is invalid. Please contact your administrator.'
                    ], 500);
                }
                
                \Log::info('Using building location for geofence validation', [
                    'building' => $class->building->name,
                    'building_id' => $class->building->id,
                    'lat' => $geofenceLat,
                    'lon' => $geofenceLon
                ]);
            }

            // Calculate distance between student and geofence center (building location)
            // In test mode, set distance to 0 (always within geofence) - ONLY in development
            if ($testMode && env('APP_ENV') === 'local') {
                $distance = 0;
                \Log::warning('⚠️ TEST MODE: Geofence check bypassed (LOCAL ENV ONLY)', [
                    'student' => $studentName,
                    'class' => $class->class_code,
                    'env' => env('APP_ENV')
                ]);
            } elseif ($testMode && env('APP_ENV') !== 'local') {
                // Test mode in production is NOT allowed - treat as normal validation
                \Log::warning('⚠️ Test mode enabled in production - ignoring and enforcing geofence', [
                    'student' => $studentName,
                    'class' => $class->class_code
                ]);
                // Only calculate if we have valid geofence coordinates
                if ($geofenceLat !== null && $geofenceLon !== null) {
                    $distance = $this->calculateDistance($geofenceLat, $geofenceLon, $studentLat, $studentLon);
                } else {
                    // No building - reject even in test mode (production)
                    return response()->json([
                        'success' => false,
                        'message' => 'This class does not have a building assigned. Please contact your teacher or administrator.'
                    ], 403);
                }
            } else {
                // Normal validation - calculate distance from student to building
                // At this point, geofenceLat/Lon should be set (we return early if no building)
                if ($geofenceLat === null || $geofenceLon === null) {
                    \Log::error('Geofence coordinates are null in normal validation', [
                        'class' => $class->class_code,
                        'has_building' => $class->building ? 'yes' : 'no'
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Geofence location error. Please contact support.'
                    ], 500);
                }
                $distance = $this->calculateDistance($geofenceLat, $geofenceLon, $studentLat, $studentLon);
            }
            
            // Geofence radius (increased for testing flexibility)
            $geofenceRadius = $class->geofence_radius ?? env('GEOFENCE_RADIUS', 500);

            \Log::info('Geofence validation', [
                'class' => $class->class_code,
                'student' => $studentName,
                'building' => $class->building ? $class->building->name : 'none',
                'geofenceLat' => $geofenceLat,
                'geofenceLon' => $geofenceLon,
                'studentLat' => $studentLat,
                'studentLon' => $studentLon,
                'studentCoords_valid' => ($studentLat != 0 || $studentLon != 0) ? 'yes' : 'NO - INVALID',
                'buildingCoords_valid' => ($geofenceLat != 0 || $geofenceLon != 0) ? 'yes' : 'NO - INVALID',
                'distance' => round($distance, 2),
                'radius' => $geofenceRadius,
                'withinRange' => $distance <= $geofenceRadius,
                'testMode' => $testMode
            ]);
            
            // Safety check: If distance is unreasonably large (> 1000km), something is wrong
            if ($distance > 1000000) { // 1000km
                \Log::error('🚨 UNREASONABLE DISTANCE CALCULATED - Coordinates likely invalid', [
                    'distance' => round($distance, 2) . 'm',
                    'distance_km' => round($distance / 1000, 2) . 'km',
                    'geofenceLat' => $geofenceLat,
                    'geofenceLon' => $geofenceLon,
                    'studentLat' => $studentLat,
                    'studentLon' => $studentLon,
                    'building' => $class->building ? $class->building->name : 'none'
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Location error detected. Please refresh the page, ensure location permissions are enabled, and try again. If the problem persists, contact support.',
                    'error_type' => 'invalid_coordinates'
                ], 400);
            }

            if ($distance > $geofenceRadius) {
                \Log::warning('🚨 Student outside geofence - SIGN-IN REJECTED', [
                    'student' => $studentName,
                    'studentEmail' => $studentEmail,
                    'class' => $class->class_code,
                    'building' => $class->building ? $class->building->name : 'none',
                    'geofenceLocation' => [$geofenceLat, $geofenceLon],
                    'studentLocation' => [$studentLat, $studentLon],
                    'distance' => round($distance, 2) . 'm',
                    'max_allowed' => $geofenceRadius . 'm',
                    'difference' => round($distance - $geofenceRadius, 2) . 'm too far',
                    'suspicious' => $distance > ($geofenceRadius * 2) ? 'YES - Very far from building' : 'NO'
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => sprintf(
                        'You are %.0fm away from %s. Maximum distance allowed is %.0fm. Please move %.0fm closer to the building to sign in.',
                        $distance,
                        $class->building ? $class->building->name : 'the classroom',
                        $geofenceRadius,
                        $distance - $geofenceRadius
                    ),
                    'distance' => round($distance, 2),
                    'required' => $geofenceRadius,
                    'building' => $class->building ? $class->building->name : null
                ], 403);
            }

            // Get current time for duplicate check and attendance recording
            $currentDateTime = now();
            $todayDate = $currentDateTime->format('Y-m-d');
            
            // Check for duplicate sign-in (same student, same class ID, same day)
            // Check by class_id first (most specific), then fallback to class_code
            $existingAttendance = AttendanceEntry::where('class_id', $class->id)
                ->where('student_email', $studentEmail)
                ->whereDate('date', $todayDate)
                ->first();
            
            if ($existingAttendance) {
                $signInTime = Carbon::parse($existingAttendance->sign_in_time)->format('g:i A');
                $className = $existingAttendance->class_name ?? $class->class_name;
                
                \Log::info('Duplicate sign-in attempt blocked', [
                    'student' => $studentEmail,
                    'class_id' => $class->id,
                    'class_code' => $class->class_code,
                    'class_name' => $className,
                    'date' => $todayDate,
                    'originalSignIn' => $signInTime,
                    'existing_attendance_id' => $existingAttendance->id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => "You have already signed in to '{$className}' today at {$signInTime}. You can only sign in once per class per day.",
                    'alreadySignedIn' => true,
                    'signInTime' => $signInTime,
                    'className' => $className,
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
            
            // Get session opened time from class (when teacher opened it)
            $sessionOpened = $class->current_session_opened;
            
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

            // Dispatch sign-in processing to queue for better performance
            \App\Jobs\ProcessStudentSignIn::dispatch(
                $class->id,
                $studentEmail,
                $studentName,
                $studentLat,
                $studentLon,
                $distance,
                $isLate,
                $currentDateTime->toIso8601String(), // Convert to string for queue serialization
                $student ? $student->id : null
            );

            \Log::info('✅ Student sign-in queued for processing', [
                'student' => $studentName,
                'class' => $class->class_code,
                'isLate' => $isLate
            ]);

            // EMAIL FUNCTIONALITY COMMENTED OUT - Not in use currently
            // Email sending has been moved to queue job (ProcessStudentSignIn)
            // Uncomment and enable in the job when email functionality is needed
            /*
            // Send email notification to guardian (if email address exists)
            $emailSent = false;
            if ($guardianEmail) {
                try {
                    // ... email sending code ...
                } catch (\Exception $emailError) {
                    \Log::error('❌ Email failed to send', [
                        'email' => $guardianEmail,
                        'error' => $emailError->getMessage()
                    ]);
                }
            }
            */
            
            // Return immediate response - actual processing happens in queue
            return response()->json([
                'success' => true,
                'message' => $isLate ? 'Signed in successfully (Late)' : 'Signed in successfully (On time)',
                'isLate' => $isLate,
                'signInTime' => $currentDateTime->format('H:i:s'),
                'distance' => round($distance, 2),
                'queued' => true, // Indicate that processing is queued
                'note' => 'Your sign-in is being processed. Attendance will update shortly.'
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
            
            \Log::info('Fetching attendance - START', [
                'classId' => $classId,
                'classCode' => $class->class_code,
                'requestedDate' => $request->query('date')
            ]);
            
            // Get date filter if provided
            $date = $request->query('date');
            
            // Debug: Check total records for this class (no date filter)
            $totalForClass = AttendanceEntry::where('class_code', $class->class_code)->count();
            \Log::info('Total attendance records for class', [
                'class_code' => $class->class_code,
                'total_count' => $totalForClass
            ]);
            
            // Build query
            $query = AttendanceEntry::where('class_code', $class->class_code)
                ->orderBy('sign_in_time', 'asc');
            
            if ($date) {
                $query->whereDate('date', $date);
                \Log::info('Applying date filter', ['date' => $date]);
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
            
            \Log::info('Attendance records found', [
                'count' => $attendanceRecords->count(),
                'records' => $attendanceRecords->toArray()
            ]);
            
            return response()->json([
                'success' => true,
                'attendance' => $attendanceRecords,
                'classCode' => $class->class_code,
                'className' => $class->class_name,
                'debug' => [
                    'requestedDate' => $date,
                    'totalRecordsForClass' => $totalForClass,
                    'returnedCount' => $attendanceRecords->count()
                ]
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

    /**
     * Calculate geofence time for all students in the current session
     */
    private function calculateGeofenceTimes($class)
    {
        try {
            $now = now();
            $todayDate = $now->format('Y-m-d');
            
            // Get all attendance records for today's session
            $attendanceRecords = AttendanceEntry::where('class_code', $class->class_code)
                ->whereDate('date', $todayDate)
                ->where('currently_inside', true)
                ->get();
            
            foreach ($attendanceRecords as $record) {
                if ($record->geofence_entry_time) {
                    // Calculate time from entry to now (class close time)
                    $entryTime = \Carbon\Carbon::parse($record->geofence_entry_time);
                    $timeInsideSeconds = $entryTime->diffInSeconds($now);
                    
                    $record->update([
                        'time_inside_geofence' => $timeInsideSeconds,
                        'geofence_exit_time' => $now,
                        'currently_inside' => false,
                    ]);
                    
                    \Log::info('Updated geofence time for student', [
                        'student' => $record->student_name,
                        'entry_time' => $entryTime->toDateTimeString(),
                        'exit_time' => $now->toDateTimeString(),
                        'time_inside_seconds' => $timeInsideSeconds,
                        'time_inside_minutes' => round($timeInsideSeconds / 60, 1)
                    ]);
                }
            }
            
            \Log::info('Calculated geofence times for class', [
                'class_code' => $class->class_code,
                'records_updated' => $attendanceRecords->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to calculate geofence times', [
                'class_code' => $class->class_code,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Delete an attendance record
     */
    public function deleteAttendance(Request $request, $attendanceId)
    {
        try {
            $attendanceRecord = AttendanceEntry::findOrFail($attendanceId);
            
            \Log::info('Deleting attendance record', [
                'attendance_id' => $attendanceId,
                'student' => $attendanceRecord->student_name,
                'class' => $attendanceRecord->class_code,
                'date' => $attendanceRecord->date
            ]);
            
            $studentName = $attendanceRecord->student_name;
            $classCode = $attendanceRecord->class_code;
            
            // Delete the record
            $attendanceRecord->delete();
            
            \Log::info('Attendance record deleted successfully', [
                'attendance_id' => $attendanceId,
                'student' => $studentName,
                'class' => $classCode
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Attendance record deleted successfully',
                'deleted_id' => $attendanceId
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to delete attendance record', [
                'attendance_id' => $attendanceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
