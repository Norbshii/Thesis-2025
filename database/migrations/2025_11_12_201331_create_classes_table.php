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
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('airtable_id')->unique()->nullable(); // For migration reference
            $table->string('class_code')->unique();
            $table->string('class_name');
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->string('teacher_email')->nullable(); // For reference
            $table->string('teacher_name')->nullable(); // For reference
            $table->time('start_time');
            $table->time('end_time');
            $table->string('days')->nullable(); // e.g., "Mon,Wed,Fri"
            $table->string('room')->nullable();
            $table->boolean('is_open')->default(false);
            $table->timestamp('current_session_opened')->nullable();
            $table->decimal('current_session_lat', 10, 8)->nullable();
            $table->decimal('current_session_lon', 11, 8)->nullable();
            $table->timestamp('auto_close_time')->nullable();
            $table->integer('geofence_radius')->default(100); // meters
            $table->integer('late_threshold')->default(15); // minutes
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
