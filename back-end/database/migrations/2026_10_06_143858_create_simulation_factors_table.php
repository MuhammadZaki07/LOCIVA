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
        Schema::create('simulation_factors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('simulation_id')->constrained('simulations');
            $table->string('factor', 100);
            $table->decimal('score', 5, 2)->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('contribution', 5, 2)->nullable();
            $table->text('explanation')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('simulation_factors');
    }
};
