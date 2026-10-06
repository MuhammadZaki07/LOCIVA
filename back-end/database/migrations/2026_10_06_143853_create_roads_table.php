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
        Schema::create('roads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('area_id')->nullable()->constrained('areas');
            $table->string('external_id', 150)->nullable();
            $table->string('source', 50)->nullable();
            $table->string('name', 200)->nullable();
            $table->string('road_type', 100)->nullable();
            $table->string('access_type', 100)->nullable();
            $table->geometry('geom')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roads');
    }
};
