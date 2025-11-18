<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassModel extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'airtable_id',
        'class_code',
        'class_name',
        'teacher_id',
        'teacher_email',
        'teacher_name',
        'start_time',
        'end_time',
        'days',
        'room',
        'building_id',
        'is_open',
        'current_session_opened',
        'current_session_lat',
        'current_session_lon',
        'auto_close_time',
        'geofence_radius',
        'late_threshold',
    ];

    protected $casts = [
        'is_open' => 'boolean',
        'current_session_opened' => 'datetime',
        'auto_close_time' => 'datetime',
        'current_session_lat' => 'decimal:8',
        'current_session_lon' => 'decimal:8',
        'geofence_radius' => 'integer',
        'late_threshold' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function teacher()
    {
        return $this->belongsTo(Teacher::class, 'teacher_id');
    }

    public function building()
    {
        return $this->belongsTo(Building::class, 'building_id');
    }

    public function attendanceEntries()
    {
        return $this->hasMany(AttendanceEntry::class, 'class_id');
    }

    public function students()
    {
        return $this->belongsToMany(Student::class, 'class_student', 'class_id', 'student_id')
                    ->withTimestamps()
                    ->withPivot('enrolled_at');
    }
}
