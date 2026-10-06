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
        Schema::create('catchments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('simulation_id')->constrained('simulations');
            $table->string('type', 30);
            $table->integer('radius_m')->nullable();
            $table->geometry('geom')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catchments');
    }
};
