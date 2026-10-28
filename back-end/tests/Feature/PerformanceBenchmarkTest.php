<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\User;
use App\Services\LocationAnalysisService;
use Tests\TestCase;

class PerformanceBenchmarkTest extends TestCase
{
    /**
     * Test that the analysis pipeline measures and returns timing breakdowns
     * for all database queries and processing stages.
     */
    public function test_analysis_pipeline_duration_and_stage_timings_are_measured(): void
    {
        $slug = 'qa-perf-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Performance Test Type',
            'slug'                  => $slug,
            'category'              => 'cafe',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        $testLat = -7.975000;
        $testLng = 112.630000;

        $response = $this->postJson('/api/analysis/location', [
            'lat'             => $testLat,
            'lng'             => $testLng,
            'radius'          => 500,
            'business_type'   => $slug,
            'candidate_id'    => 'A',
            'external_places' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertArrayHasKey('performance', $data, 'Response must contain performance timing breakdown');
        $perf = $data['performance'];

        $this->assertArrayHasKey('total_ms', $perf);
        $this->assertArrayHasKey('registered_biz_ms', $perf);
        $this->assertArrayHasKey('internal_poi_ms', $perf);
        $this->assertArrayHasKey('reports_ms', $perf);
        $this->assertArrayHasKey('bps_ms', $perf);
        $this->assertArrayHasKey('scoring_ms', $perf);

        $this->assertGreaterThan(0, $perf['total_ms']);
        $this->assertGreaterThanOrEqual(0, $perf['registered_biz_ms']);
        $this->assertGreaterThanOrEqual(0, $perf['internal_poi_ms']);
        $this->assertGreaterThanOrEqual(0, $perf['reports_ms']);
        $this->assertGreaterThanOrEqual(0, $perf['bps_ms']);
        $this->assertGreaterThanOrEqual(0, $perf['scoring_ms']);

        // Benchmark threshold: total internal analysis time should be under 2000ms
        $this->assertLessThan(2000, $perf['total_ms'], 'Analysis pipeline execution should complete in under 2000ms');

        $businessType->forceDelete();
    }

    /**
     * Test spatial bounding box pruning: distant records (> radius) are pruned
     * while nearby records are accurately preserved and counted.
     */
    public function test_spatial_bounding_box_prunes_distant_records_safely(): void
    {
        $user = User::first() ?? User::factory()->create();

        $slug = 'qa-bbox-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Bounding Box Test Type',
            'slug'                  => $slug,
            'category'              => 'retail',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        $testLat = -7.970000;
        $testLng = 112.630000;

        // Nearby business: 150m away (lat + 0.001 ~ 111m)
        $nearbyBiz = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Toko Dekat QA',
            'business_type_id' => $businessType->id,
            'latitude'         => $testLat + 0.0010,
            'longitude'        => $testLng + 0.0010,
            'status'           => 'active',
        ]);

        // Distant business: ~11km away (lat + 0.100 ~ 11.1km)
        $distantBiz = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Toko Jauh QA',
            'business_type_id' => $businessType->id,
            'latitude'         => $testLat + 0.1000,
            'longitude'        => $testLng + 0.1000,
            'status'           => 'active',
        ]);

        $response = $this->postJson('/api/analysis/location', [
            'lat'             => $testLat,
            'lng'             => $testLng,
            'radius'          => 500,
            'business_type'   => $slug,
            'candidate_id'    => 'A',
            'external_places' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        // Exactly 1 nearby business should be included; distant business must be pruned
        $this->assertEquals(1, $data['registered_business_total']);

        $nearbyBiz->forceDelete();
        $distantBiz->forceDelete();
        $businessType->forceDelete();
    }
}

