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
        Schema::table('attendance_entries', function (Blueprint $table) {
            $table->timestamp('geofence_entry_time')->nullable()->after('timestamp');
            $table->timestamp('geofence_exit_time')->nullable()->after('geofence_entry_time');
            $table->integer('time_inside_geofence')->nullable()->comment('Time in seconds')->after('geofence_exit_time');
            $table->integer('time_outside_geofence')->nullable()->comment('Time in seconds')->after('time_inside_geofence');
            $table->boolean('currently_inside')->default(true)->after('time_outside_geofence');
            $table->timestamp('last_location_update')->nullable()->after('currently_inside');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_entries', function (Blueprint $table) {
            $table->dropColumn([
                'geofence_entry_time',
                'geofence_exit_time',
                'time_inside_geofence',
                'time_outside_geofence',
                'currently_inside',
                'last_location_update',
            ]);
        });
    }
};
