<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Student extends Authenticatable
{
    use HasFactory;

    protected $fillable = [
        'airtable_id',
        'name',
        'email',
        'username',
        'password',
        'first_name',
        'last_name',
        'role',
        'age',
        'course',
        'address',
        'guardian_name',
        'relationship',
        'guardian_email',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'age' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function attendanceEntries()
    {
        return $this->hasMany(AttendanceEntry::class, 'student_id');
    }

    public function classes()
    {
        return $this->belongsToMany(ClassModel::class, 'class_student', 'student_id', 'class_id')
                    ->withTimestamps()
                    ->withPivot('enrolled_at');
    }
}
