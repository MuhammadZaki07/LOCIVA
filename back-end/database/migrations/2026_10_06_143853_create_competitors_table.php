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
        Schema::create('competitors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_type_id')->constrained('business_types');
            $table->foreignUuid('poi_id')->nullable()->constrained('pois');
            $table->string('name', 200);
            $table->string('category', 100)->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->text('address')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->integer('review_count')->nullable();
            $table->string('source', 50)->nullable();
            $table->string('external_id', 150)->nullable();
            $table->geometry('geom', subtype: 'point')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competitors');
    }
};
