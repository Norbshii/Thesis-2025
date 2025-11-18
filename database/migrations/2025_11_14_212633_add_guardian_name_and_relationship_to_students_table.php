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
        Schema::table('students', function (Blueprint $table) {
            // Add guardian_name and relationship columns if they don't exist
            if (!Schema::hasColumn('students', 'guardian_name')) {
                $table->string('guardian_name')->nullable()->after('address');
            }
            if (!Schema::hasColumn('students', 'relationship')) {
                $table->string('relationship')->nullable()->after('guardian_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('students', function (Blueprint $table) {
            // Drop the columns if they exist
            if (Schema::hasColumn('students', 'guardian_name')) {
                $table->dropColumn('guardian_name');
            }
            if (Schema::hasColumn('students', 'relationship')) {
                $table->dropColumn('relationship');
            }
        });
    }
};
