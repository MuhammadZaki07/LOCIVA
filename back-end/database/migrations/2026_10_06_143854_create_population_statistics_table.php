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
        Schema::create('population_statistics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('area_id')->constrained('areas');
            $table->string('source', 50)->nullable();
            $table->integer('year');
            $table->bigInteger('population')->nullable();
            $table->decimal('population_density', 12, 2)->nullable();
            $table->bigInteger('male_population')->nullable();
            $table->bigInteger('female_population')->nullable();
            $table->json('age_data')->nullable();
            $table->json('economic_data')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['area_id', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('population_statistics');
    }
};
