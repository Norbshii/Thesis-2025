<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attendance_entries', function (Blueprint $table) {
            $table->id();
            $table->string('airtable_id')->unique()->nullable(); // For migration reference
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('class_code');
            $table->string('class_name');
            $table->string('teacher_email')->nullable();
            $table->string('student_email');
            $table->string('student_name');
            $table->date('date');
            $table->time('sign_in_time');
            $table->string('status'); // 'On Time' or 'Late'
            $table->decimal('distance', 8, 2)->nullable(); // Distance from teacher
            $table->decimal('student_latitude', 10, 8)->nullable();
            $table->decimal('student_longitude', 11, 8)->nullable();
            $table->timestamp('timestamp');
            $table->timestamps();
            
            // Prevent duplicate sign-ins
            $table->unique(['class_id', 'student_id', 'date'], 'unique_attendance_per_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_entries');
    }
};
