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
        Schema::table('classes', function (Blueprint $table) {
            // Add building_id reference
            $table->foreignId('building_id')->nullable()->after('room')->constrained('buildings')->onDelete('set null');
            
            // Add index for performance
            $table->index('building_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('classes', function (Blueprint $table) {
            // Drop foreign key and column
            $table->dropForeign(['building_id']);
            $table->dropColumn('building_id');
        });
    }
};
