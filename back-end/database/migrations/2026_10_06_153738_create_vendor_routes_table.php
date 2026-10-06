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
        Schema::create('vendor_routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')
                ->constrained('businesses');
            $table->string('name');
            $table->geometry(
                'route_geometry',
                subtype: 'linestring'
            )->nullable();
            $table->decimal('distance', 10, 2)->nullable();
            $table->integer('estimated_duration')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_routes');
    }
};
