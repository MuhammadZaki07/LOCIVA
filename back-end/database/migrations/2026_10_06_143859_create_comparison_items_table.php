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
        Schema::create('comparison_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('comparison_id')->constrained('simulation_comparisons');
            $table->foreignUuid('simulation_id')->constrained('simulations');
            $table->timestamp('created_at')->nullable();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comparison_items');
    }
};
