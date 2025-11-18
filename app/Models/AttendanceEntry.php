<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'airtable_id',
        'class_id',
        'student_id',
        'class_code',
        'class_name',
        'teacher_email',
        'student_email',
        'student_name',
        'date',
        'sign_in_time',
        'status',
        'distance',
        'student_latitude',
        'student_longitude',
        'timestamp',
        'geofence_entry_time',
        'geofence_exit_time',
        'time_inside_geofence',
        'time_outside_geofence',
        'currently_inside',
        'last_location_update',
    ];

    protected $casts = [
        'date' => 'date',
        'timestamp' => 'datetime',
        'distance' => 'decimal:2',
        'student_latitude' => 'decimal:8',
        'student_longitude' => 'decimal:8',
        'geofence_entry_time' => 'datetime',
        'geofence_exit_time' => 'datetime',
        'time_inside_geofence' => 'integer',
        'time_outside_geofence' => 'integer',
        'currently_inside' => 'boolean',
        'last_location_update' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
