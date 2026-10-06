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
        Schema::create('simulation_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('simulation_id')->constrained('simulations');
            $table->decimal('population_score', 5, 2)->nullable();
            $table->decimal('pedestrian_score', 5, 2)->nullable();
            $table->decimal('accessibility_score', 5, 2)->nullable();
            $table->decimal('target_market_score', 5, 2)->nullable();
            $table->decimal('competition_score', 5, 2)->nullable();
            $table->decimal('area_compatibility_score', 5, 2)->nullable();
            $table->decimal('infrastructure_score', 5, 2)->nullable();
            $table->decimal('total_score', 5, 2)->nullable();
            $table->string('status', 30)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('simulation_scores');
    }
};
