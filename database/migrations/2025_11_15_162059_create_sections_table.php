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
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g., "BSCS 4B", "BSIT 3A"
            $table->string('course'); // e.g., "BSCS", "BSIT", "BTLED"
            $table->string('year_level'); // e.g., "1", "2", "3", "4"
            $table->string('section_letter'); // e.g., "A", "B", "C"
            $table->integer('capacity')->default(40); // Max students per section
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Indexes for performance
            $table->index('course');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('sections');
    }
};
