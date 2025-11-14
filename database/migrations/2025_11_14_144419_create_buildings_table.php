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
        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Building name
            $table->decimal('latitude', 10, 8); // GPS latitude (e.g., 8.98765432)
            $table->decimal('longitude', 11, 8); // GPS longitude (e.g., 125.12345678)
            $table->text('description')->nullable(); // Optional description
            $table->string('address')->nullable(); // Optional address
            $table->boolean('is_active')->default(true); // Soft enable/disable
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['latitude', 'longitude']);
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
        Schema::dropIfExists('buildings');
    }
};
