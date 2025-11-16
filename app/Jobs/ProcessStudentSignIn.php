<?php

namespace App\Jobs;

use App\Events\AttendanceUpdated;
use App\Models\AttendanceEntry;
use App\Models\ClassModel;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessStudentSignIn implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $classId,
        public string $studentEmail,
        public string $studentName,
        public float $studentLat,
        public float $studentLon,
        public float $distance,
        public bool $isLate,
        public string $currentDateTime, // Store as string for queue serialization
        public ?int $studentId = null
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $class = ClassModel::findOrFail($this->classId);
            $currentDateTime = Carbon::parse($this->currentDateTime);
            $todayDate = $currentDateTime->format('Y-m-d');
            $geofenceRadius = $class->geofence_radius ?? env('GEOFENCE_RADIUS', 500);

            // Store attendance record in attendance_entries table
            $attendanceRecord = AttendanceEntry::create([
                'class_id' => $class->id,
                'student_id' => $this->studentId,
                'class_code' => $class->class_code,
                'class_name' => $class->class_name,
                'teacher_email' => $class->teacher_email,
                'student_email' => $this->studentEmail,
                'student_name' => $this->studentName,
                'date' => $todayDate,
                'sign_in_time' => $currentDateTime->format('H:i:s'),
                'status' => $this->isLate ? 'Late' : 'On Time',
                'distance' => round($this->distance, 2),
                'student_latitude' => (float)$this->studentLat,
                'student_longitude' => (float)$this->studentLon,
                'timestamp' => $currentDateTime,
                'geofence_entry_time' => $currentDateTime,
                'currently_inside' => true,
                'time_inside_geofence' => 0,
                'time_outside_geofence' => 0,
                'last_location_update' => $currentDateTime,
            ]);

            Log::info('✅ Attendance record created via queue', [
                'id' => $attendanceRecord->id,
                'student' => $this->studentName,
                'class' => $class->class_code
            ]);

            // EMAIL FUNCTIONALITY COMMENTED OUT - Not in use currently
            /*
            // Send email notification to guardian (if email address exists)
            $emailSent = false;
            if ($guardianEmail) {
                try {
                    // Email sending code here...
                } catch (\Exception $emailError) {
                    Log::error('❌ Email failed to send', [
                        'email' => $guardianEmail,
                        'error' => $emailError->getMessage()
                    ]);
                }
            }
            */

            // Broadcast attendance update event
            $attendanceData = [
                'id' => $attendanceRecord->id,
                'student_name' => $this->studentName,
                'student_email' => $this->studentEmail,
                'sign_in_time' => $currentDateTime->format('H:i:s'),
                'status' => $this->isLate ? 'Late' : 'On Time',
                'distance' => round($this->distance, 2),
                'latitude' => (float)$this->studentLat,
                'longitude' => (float)$this->studentLon,
                'timestamp' => $currentDateTime->toIso8601String(),
            ];
            broadcast(new AttendanceUpdated($this->classId, $attendanceData));

        } catch (\Exception $e) {
            Log::error('❌ Failed to process student sign-in in queue', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'class_id' => $this->classId,
                'student' => $this->studentEmail
            ]);
            throw $e; // Re-throw to trigger retry
        }
    }
}
