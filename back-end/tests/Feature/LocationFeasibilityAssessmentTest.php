<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\BusinessType;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\Road;
use App\Services\LocationAnalysisService;
use App\Services\LocationFeasibilityService;
use Tests\TestCase;

class LocationFeasibilityAssessmentTest extends TestCase
{
    protected LocationAnalysisService $service;
    protected LocationFeasibilityService $feasibilityService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->feasibilityService = new LocationFeasibilityService();
        $this->service = app(LocationAnalysisService::class);
    }

    /**
     * 1. Test malformed and out-of-range coordinates are rejected early.
     */
    public function test_malformed_and_out_of_range_coordinates_are_rejected(): void
    {
        // Out of range latitude (> 90)
        $res1 = $this->postJson('/api/analysis/location', [
            'lat'           => 95.5,
            'lng'           => 112.63,
            'radius'        => 500,
            'business_type' => 'kedai-kopi',
        ]);
        $res1->assertStatus(422);

        // Out of range longitude (< -180)
        $res2 = $this->postJson('/api/analysis/location', [
            'lat'           => -7.98,
            'lng'           => -195.0,
            'radius'        => 500,
            'business_type' => 'kedai-kopi',
        ]);
        $res2->assertStatus(422);

        // Non-numeric malformed coordinates
        $res3 = $this->postJson('/api/analysis/location', [
            'lat'           => 'not-a-latitude',
            'lng'           => 112.63,
            'radius'        => 500,
            'business_type' => 'kedai-kopi',
        ]);
        $res3->assertStatus(422);

        // Direct service invocation with invalid coordinate throws InvalidArgumentException
        $this->expectException(\InvalidArgumentException::class);
        $this->service->analyze([
            'lat'           => 120.0,
            'lng'           => 112.63,
            'radius'        => 500,
            'business_type' => 'kedai-kopi',
        ]);
    }

    /**
     * 2. Test open-water detection marks geographic validity unsuitable and does not invent land score.
     */
    public function test_open_water_detection_marks_geographic_validity_unsuitable(): void
    {
        $response = $this->postJson('/api/analysis/location', [
            'lat'           => -8.500000,
            'lng'           => 112.600000,
            'radius'        => 500,
            'business_type' => 'kedai-kopi',
            'is_water'      => true,
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertFalse($data['is_valid_location']);
        $this->assertTrue($data['is_water_or_offshore']);
        $this->assertNull($data['opportunity_score']);

        // Check separate feasibility structure
        $this->assertArrayHasKey('geographic_validity', $data);
        $this->assertEquals('unsuitable', $data['geographic_validity']['status']);
        $this->assertTrue($data['geographic_validity']['is_water']);
        $this->assertEquals('water', $data['geographic_validity']['terrain']);

        // Overall recommendation should be unsuitable
        $this->assertEquals('unsuitable', $data['overall_recommendation']['status']);
        $this->assertNotEmpty($data['overall_recommendation']['blocking_reasons']);
    }

    /**
     * 3. Test road proximity versus road carriageway intersection distinction.
     */
    public function test_road_proximity_versus_road_carriageway_intersection_distinction(): void
    {
        // Create a road along latitude -7.980000 between lng 112.630000 and 112.632000
        $road = Road::create([
            'name'       => 'Jalan Protokol Uji Coba',
            'road_type'  => 'primary',
            'metadata'   => [
                'coordinates' => [
                    [112.630000, -7.980000],
                    [112.632000, -7.980000],
                ],
            ],
        ]);

        try {
            // Case A: Point directly ON the carriageway (distance 0m)
            $onRoadLat = -7.980000;
            $onRoadLng = 112.631000;

            $accessOnRoad = $this->feasibilityService->assessRoadAccessibility(
                $onRoadLat,
                $onRoadLng,
                'toko',
                'toko-kelontong'
            );

            $this->assertEquals('on_carriageway', $accessOnRoad['relationship']);
            $this->assertEquals('unsuitable', $accessOnRoad['status'], 'Fixed shop on carriageway must be unsuitable');
            $this->assertFalse($accessOnRoad['business_type_compatible']);
            $this->assertLessThanOrEqual(3.0, $accessOnRoad['nearest_road_distance_m']);

            // Case B: Point NEAR the road / roadside (distance ~11 meters, sidewalk/frontage)
            // 0.0001 deg lat ≈ 11.1 meters
            $roadsideLat = -7.980100;
            $roadsideLng = 112.631000;

            $accessRoadside = $this->feasibilityService->assessRoadAccessibility(
                $roadsideLat,
                $roadsideLng,
                'toko',
                'toko-kelontong'
            );

            $this->assertEquals('roadside', $accessRoadside['relationship']);
            $this->assertEquals('valid', $accessRoadside['status'], 'Shop roadside must be valid');
            $this->assertTrue($accessRoadside['business_type_compatible']);
            $this->assertGreaterThan(3.0, $accessRoadside['nearest_road_distance_m']);
            $this->assertLessThanOrEqual(25.0, $accessRoadside['nearest_road_distance_m']);

        } finally {
            $road->forceDelete();
        }
    }

    /**
     * 4. Test missing zoning data reports unverified instead of falsely assuming permitted.
     */
    public function test_missing_zoning_data_reports_unverified(): void
    {
        $lat = -7.982000;
        $lng = 112.632000;

        $restrictions = $this->feasibilityService->assessOfficialRestrictions($lat, $lng, 'warung');

        $this->assertEquals('unverified', $restrictions['status']);
        $this->assertEmpty($restrictions['verified_restrictions']);
        $this->assertEquals('unverified_no_authoritative_zoning_dataset', $restrictions['provenance']['source']);
        $this->assertNull($restrictions['provenance']['effective_date']);
        $this->assertStringContainsString('belum tersedia', $restrictions['provenance']['coverage_limitations']);
    }

    /**
     * 5. Test verified restrictions marks legal status prohibited with provenance and details.
     */
    public function test_verified_official_restrictions_marks_status_prohibited(): void
    {
        $lat = -7.985000;
        $lng = 112.635000;

        $secCat = ReportCategory::firstOrCreate(
            ['slug' => 'security'],
            ['name' => 'Penertiban & Keamanan', 'description' => 'Penertiban zonasi trotoar']
        );

        $report = Report::create([
            'user_id'     => \App\Models\User::first()->id ?? \App\Models\User::factory()->create()->id,
            'category_id' => $secCat->id,
            'title'       => 'Operasi Penertiban PKL & Zona Merah Dilarang Berjualan',
            'description' => 'Satpol PP menetapkan sterilisasi trotoar dan penertiban pedagang tanpa izin.',
            'latitude'    => $lat,
            'longitude'   => $lng,
            'severity'    => 'critical',
            'status'      => 'confirmed',
            'occurred_at' => now()->subDays(2),
        ]);

        try {
            $restrictions = $this->feasibilityService->assessOfficialRestrictions($lat, $lng, 'gerobak');

            $this->assertEquals('prohibited', $restrictions['status']);
            $this->assertNotEmpty($restrictions['verified_restrictions']);
            $this->assertEquals('lociva_verified_restrictions', $restrictions['provenance']['source']);
            $this->assertNotNull($restrictions['provenance']['effective_date']);
            $this->assertStringContainsString('Operasi Penertiban PKL', $restrictions['verified_restrictions'][0]['title']);

        } finally {
            $report->forceDelete();
        }
    }

    /**
     * 6. Test business-type differences between mobile food cart and warehouse.
     */
    public function test_business_type_suitability_differences_between_gerobak_and_warehouse(): void
    {
        // Road at -7.970000
        $road = Road::create([
            'name'       => 'Jalan Akses Lingkungan',
            'road_type'  => 'residential',
            'metadata'   => [
                'coordinates' => [
                    [112.620000, -7.970000],
                    [112.625000, -7.970000],
                ],
            ],
        ]);

        try {
            // Location 1: Roadside (10m from road)
            $roadsideLat = -7.970090; // ~10m from road
            $roadsideLng = 112.622000;

            // For gerobak: roadside is valid and compatible
            $gerobakEval = $this->feasibilityService->assessRoadAccessibility(
                $roadsideLat,
                $roadsideLng,
                'gerobak',
                'gerobak-bakso'
            );
            $this->assertEquals('valid', $gerobakEval['status']);
            $this->assertTrue($gerobakEval['business_type_compatible']);

            // Location 2: Distant location (100m from road)
            $distantLat = -7.970900; // ~100m from road
            $distantLng = 112.622000;

            // For warehouse: distant location without road frontage is unsuitable
            $warehouseEval = $this->feasibilityService->assessRoadAccessibility(
                $distantLat,
                $distantLng,
                'warehouse',
                'gudang-logistik'
            );
            $this->assertEquals('unsuitable', $warehouseEval['status']);
            $this->assertFalse($warehouseEval['business_type_compatible']);
            $this->assertStringContainsString('pergudangan', $warehouseEval['notes'][0]);

        } finally {
            $road->forceDelete();
        }
    }

    /**
     * 7. CRITICAL: Test high market potential with verified hard restriction.
     * Rule: High market potential must NEVER override a verified hard restriction!
     * Market potential score is preserved, but overall recommendation is blocked.
     */
    public function test_high_market_potential_with_verified_hard_restriction_preserves_score_but_blocks_recommendation(): void
    {
        $lat = -7.975000;
        $lng = 112.630000;

        // Create an official restricted area
        $area = Area::create([
            'name'      => 'Kawasan Steril & Zona Merah Bebas PKL',
            'type'      => 'restricted_zone',
            'latitude'  => $lat,
            'longitude' => $lng,
        ]);

        try {
            $response = $this->postJson('/api/analysis/location', [
                'lat'             => $lat,
                'lng'             => $lng,
                'radius'          => 500,
                'business_type'   => 'kedai-kopi',
                'candidate_id'    => 'A',
                'external_places' => [],
            ]);

            $response->assertStatus(200);
            $data = $response->json('data');

            // 1. Market potential score must be PRESERVED (not zeroed out or masked)
            $this->assertNotNull($data['opportunity_score'], 'Market opportunity score must be preserved');
            $this->assertGreaterThan(0, $data['opportunity_score'], 'Opportunity score is preserved based on demographics & POIs');

            // 2. Legal restrictions status must be PROHIBITED
            $this->assertEquals('prohibited', $data['legal_restrictions']['status']);
            $this->assertNotEmpty($data['legal_restrictions']['verified_restrictions']);

            // 3. Overall recommendation must be PROHIBITED despite high market potential!
            $this->assertEquals('prohibited', $data['overall_recommendation']['status']);
            $this->assertNotEmpty($data['overall_recommendation']['blocking_reasons']);

            // 4. Recommendation summary explicitly explains that market score does not override hard restriction
            $summary = $data['overall_recommendation']['summary'];
            $this->assertStringContainsString('TIDAK DAPAT DIREKOMENDASIKAN', $summary);
            $this->assertStringContainsString('larangan', $summary);

        } finally {
            $area->forceDelete();
        }
    }

    /**
     * 8. Test rural and mountainous locations are not falsely assumed unsuitable.
     */
    public function test_rural_locations_are_not_falsely_assumed_unsuitable(): void
    {
        $lat = -7.250000;
        $lng = 110.400000;

        $geo = $this->feasibilityService->assessGeographicValidity($lat, $lng, false, ['poi_total' => 0]);

        $this->assertNotEquals('unsuitable', $geo['status']);
        $this->assertFalse($geo['is_water']);
        $this->assertEquals('rural_or_sparse', $geo['terrain']);
    }
}
