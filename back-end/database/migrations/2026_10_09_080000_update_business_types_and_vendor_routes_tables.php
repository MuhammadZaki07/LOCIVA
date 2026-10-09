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
        // 1. Enhance business_types to fully power the Business Catalog & GIS Scoring dynamically
        Schema::table('business_types', function (Blueprint $table) {
            $table->string('category', 100)->nullable()->after('name');
            $table->string('scale', 50)->nullable()->after('category'); // gerobak, warung, toko, ruko, kios
            $table->string('icon', 50)->nullable()->after('scale');
            $table->integer('min_radius_m')->nullable()->after('default_radius_m');
            $table->integer('max_radius_m')->nullable()->after('min_radius_m');
            $table->json('target_demographics')->nullable()->after('max_radius_m');
            $table->json('competitor_categories')->nullable()->after('target_demographics');
        });

        // 2. Enhance vendor_routes for Mobile Vendor Route Planning & Sharing
        Schema::table('vendor_routes', function (Blueprint $table) {
            $table->foreignUuid('business_id')->nullable()->change();
            $table->foreignUuid('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->json('waypoints')->nullable()->after('name');
            $table->string('start_location_name', 200)->nullable()->after('waypoints');
            $table->string('end_location_name', 200)->nullable()->after('start_location_name');
            $table->string('status', 50)->default('planned')->after('estimated_duration'); // planned, active, completed
            $table->boolean('is_shared')->default(false)->after('status');
            $table->text('notes')->nullable()->after('is_shared');
            $table->json('route_coordinates')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('business_types', function (Blueprint $table) {
            $table->dropColumn([
                'category',
                'scale',
                'icon',
                'min_radius_m',
                'max_radius_m',
                'target_demographics',
                'competitor_categories',
            ]);
        });

        Schema::table('vendor_routes', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn([
                'user_id',
                'waypoints',
                'start_location_name',
                'end_location_name',
                'status',
                'is_shared',
                'notes',
                'route_coordinates',
            ]);
        });
    }
};
