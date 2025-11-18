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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('airtable_id')->unique()->nullable(); // For migration reference
            $table->string('name');
            $table->string('email')->unique();
            $table->string('username')->nullable();
            $table->string('password'); // Will store bcrypt hash
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('role')->default('student');
            $table->integer('age')->nullable();
            $table->string('course')->nullable(); // Course Year & Section
            $table->text('address')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('relationship')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
