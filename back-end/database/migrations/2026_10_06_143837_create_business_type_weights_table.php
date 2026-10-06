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
        Schema::create('business_type_weights', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_type_id')->constrained('business_types');
            $table->string('factor', 50);
            $table->decimal('weight', 5, 2);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('business_type_weights');
    }
};
