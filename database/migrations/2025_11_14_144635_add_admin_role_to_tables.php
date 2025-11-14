<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // The teachers table already has a 'role' column from the original migration
        // We just need to ensure it can store 'admin' value
        // No schema change needed - the role column already exists and can store any string
        
        // Note: We're keeping admin users in the teachers table
        // They will have role='admin' instead of role='teacher'
        
        // This migration serves as documentation that admin role is now supported
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Nothing to revert - no schema changes were made
    }
};
