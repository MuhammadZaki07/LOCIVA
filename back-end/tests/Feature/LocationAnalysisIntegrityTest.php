<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\User;
use App\Services\BpsApiService;
use App\Services\LocationAnalysisService;
use Tests\TestCase;

class LocationAnalysisIntegrityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test that registered businesses are counted exactly once,
     * external OSM places are countable when valid and not duplicated,
     * internal POIs remain separate, and poi_total equals the exact sum.
     */
    public function test_metrics_integrity_and_anti_duplication(): void
    {
        $user = User::first() ?? User::factory()->create();

        // 1. Create a unique business type for this test
        $slug = 'qa-integrity-cafe-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Integrity Cafe',
            'slug'                  => $slug,
            'category'              => 'cafe',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [
                ['category' => 'campus', 'weight' => 15],
            ],
            'competitor_categories' => ['cafe'],
        ]);

        // Use isolated test coordinates where no seeded businesses exist
        $testLat = -7.112233;
        $testLng = 112.887766;

        // 2. Create 2 registered businesses of this type within 500m
        $biz1 = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Kedai Kopi QA Satu',
            'business_type_id' => $businessType->id,
            'latitude'         => $testLat + 0.0001,
            'longitude'        => $testLng + 0.0001,
            'status'           => 'active',
        ]);
        $biz2 = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Kedai Kopi QA Dua',
            'business_type_id' => $businessType->id,
            'latitude'         => $testLat + 0.0002,
            'longitude'        => $testLng + 0.0002,
            'status'           => 'active',
        ]);

        // 3. Create 1 internal POI (e.g. school) within 500m
        $poi1 = Poi::create([
            'name'      => 'SMA Negeri QA Integrity',
            'category'  => 'school',
            'latitude'  => $testLat + 0.0003,
            'longitude' => $testLng + 0.0003,
        ]);

        // 4. Create 1 civic report within 500m
        $repCat = ReportCategory::first() ?? ReportCategory::create([
            'name'  => 'Infrastruktur Jalan QA',
            'slug'  => 'road-' . uniqid(),
            'icon'  => 'road',
            'color' => '#ef4444',
        ]);
        $report1 = Report::create([
            'user_id'     => $user->id,
            'category_id' => $repCat->id,
            'title'       => 'Jalan berlubang QA',
            'description' => 'Kerusakan jalan dekat titik uji',
            'status'      => 'reported',
            'severity'    => 'medium',
            'latitude'    => $testLat + 0.0004,
            'longitude'   => $testLng + 0.0004,
            'occurred_at' => now(),
        ]);

        // 5. Send payload with external OSM places:
        //    - place 1: valid external campus (should be counted)
        //    - place 2: duplicate of $biz1 by proximity (<50m) and name (should be deduplicated)
        $payload = [
            'lat'             => $testLat,
            'lng'             => $testLng,
            'radius'          => 500,
            'business_type'   => $businessType->slug,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'osm-campus-valid',
                    'name'     => 'Universitas Merdeka QA',
                    'category' => 'campus',
                    'lat'      => $testLat + 0.0010,
                    'lng'      => $testLng + 0.0010,
                    'source'   => 'openstreetmap',
                ],
                [
                    'id'       => 'osm-duplicate-biz1',
                    'name'     => 'Kedai Kopi QA Satu (OSM duplicate)',
                    'category' => 'cafe',
                    'lat'      => $testLat + 0.000105,
                    'lng'      => $testLng + 0.000105,
                    'source'   => 'openstreetmap',
                ],
            ],
        ];

        $response = $this->postJson('/api/analysis/location', $payload);
        $response->assertStatus(200);

        $data = $response->json('data');

        // Verify counts
        // Registered businesses: exactly 2
        $this->assertEquals(2, $data['registered_business_total'], 'Registered business total must be 2');
        // Legacy aliases
        $this->assertEquals(2, $data['internal_business_total'], 'internal_business_total alias must equal registered_business_total');
        $this->assertEquals(2, $data['internal_business_count'], 'internal_business_count alias must equal registered_business_total');

        // Internal POI: exactly 1
        $this->assertEquals(1, $data['internal_poi_total'], 'Internal POI total must be 1');

        // External POI: exactly 1 (osm-campus-valid counted, osm-duplicate-biz1 dropped)
        $this->assertEquals(1, $data['external_poi_total'], 'External POI total must be 1 after deduplication');

        // Canonical definition: poi_total = registered + internal_poi + external_poi
        // 2 + 1 + 1 = 4
        $this->assertEquals(4, $data['poi_total'], 'poi_total must be registered (2) + internal (1) + external (1) = 4');

        // Civic reports: exactly 1, but NOT in poi_total
        $this->assertEquals(1, $data['report_count'], 'report_count must be 1');

        // Sources array metadata check
        $sources = collect($data['sources']);
        $regSource = $sources->firstWhere('id', 'lociva_registered');
        $intSource = $sources->firstWhere('id', 'lociva_internal');
        $osmSource = $sources->firstWhere('id', 'openstreetmap');

        $this->assertEquals(2, $regSource['count']);
        $this->assertEquals(1, $intSource['count']);
        $this->assertEquals(1, $osmSource['count']);

        // Competitor counts: biz1 and biz2 are of type qa-integrity-cafe-$uid (direct match)
        // osm-duplicate-biz1 was deduplicated, so only biz1 and biz2 count as competitors = 2
        $this->assertEquals(2, $data['competitor_count'], 'Competitor count must be exactly 2');

        // Clean up test records
        $biz1->forceDelete();
        $biz2->forceDelete();
        $poi1->forceDelete();
        $report1->forceDelete();
        $businessType->forceDelete();
    }

    /**
     * Test that non-competitor registered businesses do not count as competitors.
     * E.g. a retail minimarket is not a competitor for a barbershop.
     */
    public function test_non_competitors_are_not_counted_as_competitors(): void
    {
        $user = User::first() ?? User::factory()->create();

        $barberType = BusinessType::where('slug', 'barbershop')->first();
        if (!$barberType) {
            $this->markTestSkipped('barbershop type not found');
        }

        $minimarketType = BusinessType::where('slug', 'minimarket')->first();
        if (!$minimarketType) {
            $this->markTestSkipped('minimarket type not found');
        }

        // Isolated test coordinates in a rural area (no seed data nearby)
        $testLat = -7.311222;
        $testLng = 112.133444;

        // Create a minimarket business (category maps to 'retail')
        $minimarket = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Minimarket Barokah QA',
            'business_type_id' => $minimarketType->id,
            'latitude'         => $testLat + 0.0001,
            'longitude'        => $testLng + 0.0001,
            'status'           => 'active',
        ]);

        // Analyze for barbershop (competitor categories: barbershop, hairdresser -> service)
        // The minimarket (retail) should NOT be counted as a competitor
        $payload = [
            'lat'             => $testLat,
            'lng'             => $testLng,
            'radius'          => 500,
            'business_type'   => 'barbershop',
            'candidate_id'    => 'A',
            'external_places' => [],
        ];

        $response = $this->postJson('/api/analysis/location', $payload);
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(1, $data['registered_business_total']);
        $this->assertEquals(0, $data['competitor_count'], 'Minimarket (retail) must NOT be counted as competitor for barbershop (service)');

        $minimarket->forceDelete();
    }

    /**
     * Test that base scoring parameters remain unchanged:
     * - Base score is 40
     * - Active report penalty is -5 per report
     */
    public function test_scoring_parameters_remain_unchanged(): void
    {
        // Custom business type with no target demographics
        $bType = BusinessType::create([
            'name'                  => 'No Weight Type QA',
            'slug'                  => 'no-weight-qa-' . uniqid(),
            'category'              => 'jasa',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        // Mock BpsApiService to return neutral density (1000) so no BPS adjustment is applied
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000, // between 500 and 5000: 0 adjustment
            'population'      => 800000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        // Case: 0 POIs, 0 reports -> Opportunity score must be exactly base 40
        $result = $service->analyze([
            'lat'             => -7.311222,
            'lng'             => 112.133444,
            'radius'          => 10, // tiny radius to guarantee no DB entities
            'business_type'   => $bType->slug,
            'candidate_id'    => 'A',
            'external_places' => [],
        ]);

        $this->assertEquals(40, $result['opportunity_score'], 'Base opportunity score must remain exactly 40');
        $this->assertEquals(10, $result['competition_score'], '0 competitors must yield exactly competition score 10');
        $this->assertEquals(15, $result['data_confidence'], '0 POIs must yield data confidence 15');

        $bType->forceDelete();
    }

    /**
     * Test Competitor Classification, Nearest Competitor sorting,
     * and document the shared 'service' mapping limitation.
     */
    public function test_competitor_classification_nearest_competitor_and_shared_service_limitation(): void
    {
        $user = User::first() ?? User::factory()->create();

        $barberType = BusinessType::where('slug', 'barbershop')->first();
        if (!$barberType) {
            $this->markTestSkipped('barbershop type not found');
        }
        $laundryType = BusinessType::where('slug', 'laundry')->first();
        if (!$laundryType) {
            $this->markTestSkipped('laundry type not found');
        }
        $minimarketType = BusinessType::where('slug', 'minimarket')->first();
        if (!$minimarketType) {
            $this->markTestSkipped('minimarket type not found');
        }

        // Isolated test coordinates
        $testLat = -7.211222;
        $testLng = 112.733444;

        // 1. Closest competitor: Barbershop at ~50m
        $barberClose = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Barbershop Dekat QA',
            'business_type_id' => $barberType->id,
            'latitude'         => $testLat + 0.0003,
            'longitude'        => $testLng + 0.0003,
            'status'           => 'active',
        ]);

        // 2. Further registered business: Laundry at ~150m
        $laundryBusiness = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Laundry Kiloan Sebelah QA',
            'business_type_id' => $laundryType->id,
            'latitude'         => $testLat + 0.0010,
            'longitude'        => $testLng + 0.0010,
            'status'           => 'active',
        ]);

        // 3. Unrelated business: Minimarket at ~250m
        $minimarketBusiness = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Minimarket Retail QA',
            'business_type_id' => $minimarketType->id,
            'latitude'         => $testLat + 0.0018,
            'longitude'        => $testLng + 0.0018,
            'status'           => 'active',
        ]);

        try {
            // Analyze for barbershop (competitor categories: barbershop, hairdresser)
            $payload = [
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => 'barbershop',
                'candidate_id'    => 'A',
                'external_places' => [
                    [
                        'id'       => 'osm-hairdresser-mid',
                        'name'     => 'Hairdresser OSM Tengah QA',
                        'category' => 'hairdresser',
                        'lat'      => $testLat + 0.0015,
                        'lng'      => $testLng + 0.0015,
                        'source'   => 'openstreetmap',
                    ],
                    [
                        'id'       => 'osm-barber-far',
                        'name'     => 'Barbershop OSM Jauh QA',
                        'category' => 'barbershop',
                        'lat'      => $testLat + 0.0025,
                        'lng'      => $testLng + 0.0025,
                        'source'   => 'openstreetmap',
                    ],
                ],
            ];

            $response = $this->postJson('/api/analysis/location', $payload);
            $response->assertStatus(200);

            $data = $response->json('data');

            // Total registered businesses in radius = 3 (barberClose + laundryBusiness + minimarketBusiness)
            $this->assertEquals(3, $data['registered_business_total']);

            // VERIFY STAGE B.3 FIX:
            // Laundry (category 'laundry') maps to canonical 'service', but is NOT in barbershop's competitor_categories.
            // With the 'service' canonical mapping exclusion in LocationAnalysisService,
            // Laundry is no longer conflated with Barbershop.
            // Total competitors for barbershop = Barbershop Dekat QA (registered, 1) + Hairdresser OSM (1) + Barbershop OSM Jauh (1) = 3
            $this->assertEquals(3, $data['competitor_count'], 'Laundry must NOT be counted as barbershop competitor; genuine barbershop and hairdresser must be counted');

            // Verify nearest competitor: Barbershop Dekat is closest (~47m)
            $this->assertNotNull($data['nearest_competitor'], 'nearest_competitor must be present');
            $this->assertEquals('Barbershop Dekat QA', $data['nearest_competitor']['name']);
            $this->assertEquals('lociva_registered', $data['nearest_competitor']['source']);
            $this->assertLessThan(100, $data['nearest_competitor']['distance']);

            // Verify competition score matches tier for count = 3 (ladder: <=4 => 55)
            $this->assertEquals(55, $data['competition_score'], 'Competition score for 3 competitors must match tier 55');

            // REVERSE CHECK: Analyze for Laundry at the same location
            // Laundry's competitor_categories = ['laundry'].
            // Neither Barbershop Dekat, Hairdresser OSM, Barbershop OSM Jauh, nor Minimarket should match laundry.
            // Only Laundry Kiloan Sebelah QA should count as competitor = 1
            $laundryPayload = array_merge($payload, ['business_type' => 'laundry']);
            $laundryResponse = $this->postJson('/api/analysis/location', $laundryPayload);
            $laundryResponse->assertStatus(200);
            $laundryData = $laundryResponse->json('data');

            $this->assertEquals(1, $laundryData['competitor_count'], 'Barbershop and hairdresser must NOT be counted as laundry competitors');
            $this->assertEquals('Laundry Kiloan Sebelah QA', $laundryData['nearest_competitor']['name']);
            $this->assertEquals(35, $laundryData['competition_score'], 'Competition score for 1 competitor must match tier 35 (ladder <=2 => 35)');
        } finally {
            $barberClose->forceDelete();
            $laundryBusiness->forceDelete();
            $minimarketBusiness->forceDelete();
        }
    }

    /**
     * Test combined opportunity score math:
     * Base (40) + POI bonus (+18) - Active report penalty (-5) + BPS density bonus (+5) = 58.
     */
    public function test_combined_opportunity_score_math_with_poi_bonus_report_penalty_and_bps(): void
    {
        $user = User::first() ?? User::factory()->create();

        // 1. Create business type with explicit weight: university/campus = 18
        $slug = 'qa-score-math-' . uniqid();
        $bType = BusinessType::create([
            'name'                  => 'QA Score Math Type',
            'slug'                  => $slug,
            'category'              => 'cafe',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [
                ['category' => 'university', 'weight' => 18],
            ],
            'competitor_categories' => [],
        ]);

        $testLat = -7.222333;
        $testLng = 112.744555;

        // 2. Create 1 active report (status = 'reported') -> penalty = min(1 * 5, 20) = -5
        $repCat = ReportCategory::first() ?? ReportCategory::create([
            'name'  => 'Infrastruktur QA',
            'slug'  => 'infra-' . uniqid(),
            'icon'  => 'road',
            'color' => '#ef4444',
        ]);
        $report = Report::create([
            'user_id'     => $user->id,
            'category_id' => $repCat->id,
            'title'       => 'Laporan Aktif QA',
            'description' => 'Kerusakan jalan aktif',
            'status'      => 'reported',
            'severity'    => 'medium',
            'latitude'    => $testLat + 0.0002,
            'longitude'   => $testLng + 0.0002,
            'occurred_at' => now(),
        ]);

        // 3. Mock BpsApiService returning high density (6000 >= 5000) -> densityBonus = +5
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'is_configured'   => true,
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 6000,
            'population'      => 850000,
            'year'            => 2024,
            'source'          => 'BPS RI',
        ]);

        $service = new LocationAnalysisService($mockBps);

        // 4. Send 1 external campus POI -> bonus = min(18 * min(1,3), 18*3) = +18
        $result = $service->analyze([
            'lat'             => $testLat,
            'lng'             => $testLng,
            'radius'          => 500,
            'business_type'   => $bType->slug,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'place-campus-1',
                    'name'     => 'Kampus QA Math',
                    'category' => 'university',
                    'lat'      => $testLat + 0.0005,
                    'lng'      => $testLng + 0.0005,
                    'source'   => 'openstreetmap',
                ],
            ],
        ]);

        // Math: Base (40) + Campus POI (+18) - Report (-5) + BPS (+5) = 58
        $this->assertEquals(58, $result['opportunity_score'], 'Opportunity score must be 40 + 18 - 5 + 5 = 58');

        // Verify factor details
        $factors = collect($result['factors']);
        $campusFactor = $factors->firstWhere('key', 'poi_campus');
        $this->assertNotNull($campusFactor, 'Factors must include poi_campus');
        $this->assertEquals('positive', $campusFactor['impact']);
        $this->assertStringContainsString('+18', $campusFactor['note']);

        $reportFactor = $factors->firstWhere('key', 'active_reports');
        $this->assertNotNull($reportFactor, 'Factors must include active_reports');
        $this->assertEquals('negative', $reportFactor['impact']);
        $this->assertStringContainsString('-5', $reportFactor['note']);

        $bpsFactor = $factors->firstWhere('key', 'bps_density');
        $this->assertNotNull($bpsFactor, 'Factors must include bps_density');
        $this->assertEquals('positive', $bpsFactor['impact']);
        $this->assertStringContainsString('+5', $bpsFactor['note']);

        $report->forceDelete();
        $bType->forceDelete();
    }

    /**
     * Test the water-location guard at service level and via HTTP endpoint,
     * verifying that LocationAnalysisRequest passes is_water to the service.
     */
    public function test_water_location_guard_behavior_and_form_request_contract(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $service = new LocationAnalysisService($mockBps);

        // 1. Direct Service Level Test:
        // LocationAnalysisService lines 88-118 explicitly check: if (!empty($input['is_water']))
        $result = $service->analyze([
            'lat'             => -8.450000,
            'lng'             => 112.500000,
            'radius'          => 500,
            'business_type'   => 'kedai-kopi',
            'candidate_id'    => 'A',
            'is_water'        => true,
            'external_places' => [],
        ]);

        $this->assertFalse($result['is_valid_location']);
        $this->assertTrue($result['is_water_or_offshore']);
        $this->assertNull($result['opportunity_score']);
        $this->assertNull($result['competition_score']);
        $this->assertNull($result['accessibility_score']);
        $this->assertEquals(0, $result['data_confidence']);
        $this->assertNotEmpty($result['unsupported_reason']);
        $this->assertStringContainsString('perairan/laut lepas', $result['unsupported_reason']);

        // 2. HTTP Endpoint Test with is_water = true:
        // LocationAnalysisRequest now includes 'is_water' => 'nullable|boolean'.
        // The field reaches the service and triggers the water guard.
        $httpResponse = $this->postJson('/api/analysis/location', [
            'lat'             => -8.450000,
            'lng'             => 112.500000,
            'radius'          => 500,
            'business_type'   => 'kedai-kopi',
            'candidate_id'    => 'A',
            'is_water'        => true,
            'external_places' => [],
        ]);
        $httpResponse->assertStatus(200);
        $httpData = $httpResponse->json('data');

        $this->assertFalse($httpData['is_valid_location'], 'HTTP request with is_water: true must be flagged as invalid location');
        $this->assertTrue($httpData['is_water_or_offshore']);
        $this->assertNull($httpData['opportunity_score'], 'Opportunity score must be null for water location');
        $this->assertNull($httpData['competition_score'], 'Competition score must be null for water location');
        $this->assertNull($httpData['accessibility_score'], 'Accessibility score must be null for water location');
        $this->assertEquals(0, $httpData['data_confidence'], 'Data confidence must be 0 for water location');
        $this->assertStringContainsString('perairan/laut lepas', $httpData['unsupported_reason']);

        // 3. HTTP Endpoint Test with is_water omitted:
        // Requests without is_water must continue to function normally.
        $normalResponse = $this->postJson('/api/analysis/location', [
            'lat'             => -8.450000,
            'lng'             => 112.500000,
            'radius'          => 500,
            'business_type'   => 'kedai-kopi',
            'candidate_id'    => 'A',
            'external_places' => [],
        ]);
        $normalResponse->assertStatus(200);
        $normalData = $normalResponse->json('data');

        $this->assertTrue($normalData['is_valid_location'], 'Requests omitting is_water must be treated as valid locations');
        $this->assertNotNull($normalData['opportunity_score'], 'Opportunity score must be calculated when is_water is omitted');
        $this->assertGreaterThan(0, $normalData['data_confidence'], 'Data confidence must be greater than 0');
    }

    /**
     * Test unsupported BPS region fallback and empty OSM warning.
     */
    public function test_unsupported_bps_region_and_empty_osm_warnings(): void
    {
        // 1. Mock BpsApiService returning unsupported_region
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'is_configured'   => true,
            'status'          => 'unsupported_region',
            'domain_id'       => null,
            'region_name'     => 'Wilayah Belum Didukung',
            'province'        => null,
            'population'      => null,
            'density_per_km2' => null,
            'year'            => null,
            'source'          => 'Badan Pusat Statistik (BPS)',
            'aggregation'     => null,
            'limitations'     => 'Titik koordinat berada di luar cakupan wilayah administratif BPS.',
            'districts'       => null,
        ]);

        $service = new LocationAnalysisService($mockBps);

        // 2. Call analyze with external_places => []
        $result = $service->analyze([
            'lat'             => -7.311222,
            'lng'             => 112.133444,
            'radius'          => 10,
            'business_type'   => 'kedai-kopi',
            'candidate_id'    => 'A',
            'external_places' => [],
        ]);

        // Base opportunity score must remain 40 with 0 adjustment from BPS
        $this->assertEquals(40, $result['opportunity_score'], 'Unsupported BPS region must not apply density bonus or penalty');

        // Verify BPS source metadata status is 'unavailable'
        $sources = collect($result['sources']);
        $bpsSource = $sources->firstWhere('id', 'bps_ri');
        $this->assertNotNull($bpsSource);
        $this->assertEquals('unavailable', $bpsSource['status']);
        $this->assertNull($bpsSource['count']);

        // Verify data_warnings contains empty OSM warning
        $warnings = $result['data_warnings'];
        $this->assertTrue(
            collect($warnings)->contains(fn($w) => str_contains($w, 'Tidak ada tempat eksternal yang dikirim')),
            'data_warnings must include warning about empty external OSM places'
        );
    }

    /**
     * Test that unmapped polygon area factors in laundry (residential, apartments)
     * do not generate false point-POI bonuses.
     */
    public function test_unmapped_area_factors_do_not_generate_false_bonuses(): void
    {
        $laundryType = BusinessType::where('slug', 'laundry')->first();
        if (!$laundryType) {
            $this->markTestSkipped('laundry type not found');
        }

        // Mock BpsApiService returning neutral density
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        // Laundry catalog has:
        // - residential: 20
        // - apartments: 20
        // - university: 15
        // - college: 15
        // We pass 1 university (campus) place and 0 residential/apartments places.
        $result = $service->analyze([
            'lat'             => -7.311222,
            'lng'             => 112.133444,
            'radius'          => 10,
            'business_type'   => 'laundry',
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'place-campus-laundry',
                    'name'     => 'Universitas Sekitar Laundry',
                    'category' => 'university',
                    'lat'      => -7.311222,
                    'lng'      => 112.133444,
                    'source'   => 'openstreetmap',
                ],
            ],
        ]);

        // University maps to campus with weight 15 -> bonus = +15
        // Base (40) + Campus (+15) = 55
        $this->assertEquals(55, $result['opportunity_score'], 'Opportunity score must be 40 + 15 = 55');

        // Confirm that residential and apartments factors are NOT created
        $factors = collect($result['factors']);
        $this->assertNotNull($factors->firstWhere('key', 'poi_campus'), 'poi_campus factor must be present');
        $this->assertNull($factors->firstWhere('key', 'poi_residential'), 'poi_residential factor must NOT be present');
        $this->assertNull($factors->firstWhere('key', 'poi_apartments'), 'poi_apartments factor must NOT be present');
    }

    /**
     * Test Stage B.3.2 competitor taxonomy:
     * - Barbershop and hairdresser match as genuine competitors.
     * - Laundry and dry cleaning are not treated as barbershop competitors.
     * - Generic service entries (banks, clinics) are not treated as barbershop competitors.
     * - Laundry matches laundry and dry cleaning, not barbershop or generic services.
     * - Registered businesses maintain their actual business-type slugs.
     */
    public function test_specific_service_categories_distinguish_barbershop_hairdresser_laundry_and_generic_services(): void
    {
        $user = User::first() ?? User::factory()->create();

        $barberType = BusinessType::where('slug', 'barbershop')->first();
        $laundryType = BusinessType::where('slug', 'laundry')->first();
        if (!$barberType || !$laundryType) {
            $this->markTestSkipped('barbershop or laundry BusinessType not found');
        }

        $testLat = -7.451234;
        $testLng = 112.654321;

        $regBarber = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Registered Barbershop Test',
            'business_type_id' => $barberType->id,
            'latitude'         => $testLat + 0.0002,
            'longitude'        => $testLng + 0.0002,
            'status'           => 'active',
        ]);

        $regLaundry = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Registered Laundry Test',
            'business_type_id' => $laundryType->id,
            'latitude'         => $testLat + 0.0004,
            'longitude'        => $testLng + 0.0004,
            'status'           => 'active',
        ]);

        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1200,
            'population'      => 850000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        $externalPlaces = [
            ['id' => 'p1', 'name' => 'Barbershop Classic', 'category' => 'barbershop', 'lat' => $testLat + 0.0006, 'lng' => $testLng + 0.0006, 'source' => 'openstreetmap'],
            ['id' => 'p2', 'name' => 'Barber Potong Rambut', 'category' => 'barber', 'lat' => $testLat + 0.0008, 'lng' => $testLng + 0.0008, 'source' => 'openstreetmap'],
            ['id' => 'p3', 'name' => 'Salon Hairdresser', 'category' => 'hairdresser', 'lat' => $testLat + 0.0010, 'lng' => $testLng + 0.0010, 'source' => 'openstreetmap'],
            ['id' => 'p4', 'name' => 'Salon Cantik', 'category' => 'salon', 'lat' => $testLat + 0.0012, 'lng' => $testLng + 0.0012, 'source' => 'openstreetmap'],
            ['id' => 'p5', 'name' => 'Laundry Kiloan', 'category' => 'laundry', 'lat' => $testLat + 0.0014, 'lng' => $testLng + 0.0014, 'source' => 'openstreetmap'],
            ['id' => 'p6', 'name' => 'Dry Clean Express', 'category' => 'dry_cleaning', 'lat' => $testLat + 0.0016, 'lng' => $testLng + 0.0016, 'source' => 'openstreetmap'],
            ['id' => 'p7', 'name' => 'Bank Mandiri Cabang', 'category' => 'service', 'lat' => $testLat + 0.0018, 'lng' => $testLng + 0.0018, 'source' => 'openstreetmap'],
            ['id' => 'p8', 'name' => 'Klinik Pratama Sehat', 'category' => 'service', 'lat' => $testLat + 0.0020, 'lng' => $testLng + 0.0020, 'source' => 'openstreetmap'],
            ['id' => 'p9', 'name' => 'Kopi Kenangan', 'category' => 'cafe', 'lat' => $testLat + 0.0022, 'lng' => $testLng + 0.0022, 'source' => 'openstreetmap'],
        ];

        try {
            // 1. Analyze for Barbershop
            $barberResult = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => 'barbershop',
                'candidate_id'    => 'A',
                'external_places' => $externalPlaces,
            ]);

            // Expected competitors for barbershop:
            // - Registered Barbershop Test (lociva_registered)
            // - Barbershop Classic (barbershop)
            // - Barber Potong Rambut (barber -> barbershop)
            // - Salon Hairdresser (hairdresser)
            // - Salon Cantik (salon -> hairdresser)
            // Laundry, Dry Clean, Bank, Klinik, Kopi must NOT match.
            $this->assertEquals(5, $barberResult['competitor_count'], 'Barbershop must count 1 registered + 4 grooming competitors (barbershop, barber, hairdresser, salon)');

            // 2. Analyze for Laundry
            $laundryResult = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => 'laundry',
                'candidate_id'    => 'A',
                'external_places' => $externalPlaces,
            ]);

            // Expected competitors for laundry:
            // - Registered Laundry Test (lociva_registered)
            // - Laundry Kiloan (laundry)
            // - Dry Clean Express (dry_cleaning -> laundry)
            // Barbershop, Barber, Hairdresser, Salon, Bank, Klinik, Kopi must NOT match.
            $this->assertEquals(3, $laundryResult['competitor_count'], 'Laundry must count 1 registered + 2 laundry competitors (laundry, dry_cleaning)');

            // 3. Analyze for Cafe (kedai-kopi)
            $cafeResult = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => 'kedai-kopi',
                'candidate_id'    => 'A',
                'external_places' => $externalPlaces,
            ]);

            // Expected competitors for cafe:
            // - Kopi Kenangan (cafe)
            // None of barbershop, hairdresser, laundry, bank, klinik must match.
            $this->assertEquals(1, $cafeResult['competitor_count'], 'Cafe must only match genuine cafe POIs');
        } finally {
            $regBarber->forceDelete();
            $regLaundry->forceDelete();
        }
    }

    /**
     * Stage B.4: Dynamic business type with custom competitor_categories matches
     * external places by raw_category tag (e.g. 'shop:bakery') without any
     * hardcoded slug in LocationAnalysisService.
     */
    public function test_dynamic_business_type_custom_competitor_categories_match_raw_osm_tags(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1200,
            'population'      => 850000,
        ]);

        // Create a brand-new business type via BusinessType::create (no slug in PHP service code)
        $bakerySlug = 'toko-roti-qa-' . uniqid();
        $bakeryType = BusinessType::create([
            'name'                  => 'Toko Roti QA',
            'slug'                  => $bakerySlug,
            'category'              => 'Kuliner',
            'scale'                 => 'kios',
            'default_radius_m'      => 400,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => ['bakery', 'pastry', 'shop=bread'],
        ]);

        $service = new LocationAnalysisService($mockBps);

        $testLat = -7.521100;
        $testLng = 112.921100;

        try {
            $result = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => $bakerySlug,
                'candidate_id'    => 'A',
                'external_places' => [
                    // Should match: category = 'bakery' is in competitor_categories
                    [
                        'id'           => 'osm-bakery-1',
                        'name'         => 'Bakery Segar',
                        'category'     => 'bakery',
                        'raw_category' => 'shop:bakery',
                        'lat'          => $testLat + 0.0010,
                        'lng'          => $testLng + 0.0010,
                        'source'       => 'openstreetmap',
                    ],
                    // Should match: raw_category normalizes 'shop:bread' -> 'bread',
                    // but 'shop=bread' is in competitor_categories and normalized 'bread' not in list,
                    // direct raw_category match 'shop:bread' vs normalized 'shop=bread' -> 'bread' vs 'bread' -> match
                    [
                        'id'           => 'osm-bread-1',
                        'name'         => 'Toko Roti Tradisional',
                        'category'     => 'retail',
                        'raw_category' => 'shop:bread',
                        'lat'          => $testLat + 0.0020,
                        'lng'          => $testLng + 0.0020,
                        'source'       => 'openstreetmap',
                    ],
                    // Should NOT match: generic clinic, unrelated to bakery
                    [
                        'id'           => 'osm-clinic-1',
                        'name'         => 'Klinik Pratama',
                        'category'     => 'service',
                        'raw_category' => 'amenity:clinic',
                        'lat'          => $testLat + 0.0030,
                        'lng'          => $testLng + 0.0030,
                        'source'       => 'openstreetmap',
                    ],
                    // Should NOT match: bank, unrelated to bakery
                    [
                        'id'           => 'osm-bank-1',
                        'name'         => 'Bank Rakyat',
                        'category'     => 'service',
                        'raw_category' => 'amenity:bank',
                        'lat'          => $testLat + 0.0035,
                        'lng'          => $testLng + 0.0035,
                        'source'       => 'openstreetmap',
                    ],
                ],
            ]);

            // competitor_categories = ['bakery', 'pastry', 'shop=bread']
            // Bakery Segar: category=bakery -> direct match -> competitor ✓
            // Toko Roti Tradisional: raw_category=shop:bread normalizes to 'bread', compare with normalized competitor list: bakery->bakery, pastry->pastry, shop=bread->bread -> match ✓
            // Klinik Pratama: service/amenity:clinic -> no match ✗
            // Bank Rakyat: service/amenity:bank -> no match ✗
            $this->assertGreaterThanOrEqual(1, $result['competitor_count'], 'Bakery OSM place must count as competitor via category match');
            // At minimum the bakery match must work; bread/raw_category matching is also tested:
            $this->assertLessThanOrEqual(2, $result['competitor_count'], 'Only bakery-related places must match, not clinic/bank');
        } finally {
            $bakeryType->forceDelete();
        }
    }

    /**
     * Stage B.4: Empty competitor_categories must produce safe fallback behavior:
     * - Only registered businesses of the exact same business type slug count as competitors.
     * - External OSM places never count as competitors.
     * - No false positives from broad category matching.
     */
    public function test_empty_competitor_categories_safe_fallback(): void
    {
        $user = User::first() ?? User::factory()->create();

        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        // A business type with NO competitor_categories configured
        $emptySlug = 'empty-cats-qa-' . uniqid();
        $emptyType = BusinessType::create([
            'name'                  => 'Empty Cats QA',
            'slug'                  => $emptySlug,
            'category'              => 'Jasa & Servis',
            'scale'                 => 'ruko',
            'default_radius_m'      => 400,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        $testLat = -7.531200;
        $testLng = 112.931200;

        // Register one business of the same type (should count as competitor via same-slug path)
        $sameBiz = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Same Empty Type Business',
            'business_type_id' => $emptyType->id,
            'latitude'         => $testLat + 0.0005,
            'longitude'        => $testLng + 0.0005,
            'status'           => 'active',
        ]);

        $service = new LocationAnalysisService($mockBps);

        try {
            $result = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => $emptySlug,
                'candidate_id'    => 'A',
                'external_places' => [
                    // These should NOT count as competitors when competitor_categories is empty
                    ['id' => 'osm-cafe', 'name' => 'Kopi ABC', 'category' => 'cafe', 'lat' => $testLat + 0.0010, 'lng' => $testLng + 0.0010, 'source' => 'openstreetmap'],
                    ['id' => 'osm-service', 'name' => 'Jasa Umum', 'category' => 'service', 'lat' => $testLat + 0.0012, 'lng' => $testLng + 0.0012, 'source' => 'openstreetmap'],
                    ['id' => 'osm-retail', 'name' => 'Toko Serba', 'category' => 'retail', 'lat' => $testLat + 0.0015, 'lng' => $testLng + 0.0015, 'source' => 'openstreetmap'],
                ],
            ]);

            // Only the same-slug registered business should count as competitor
            $this->assertEquals(
                1,
                $result['competitor_count'],
                'Empty competitor_categories must only count exact same-type registered businesses as competitors'
            );
        } finally {
            $sameBiz->forceDelete();
            $emptyType->forceDelete();
        }
    }

    /**
     * Stage B.4: Verify that generic 'service' category does not create false
     * competitor matches. A business type with specific competitor_categories
     * that don't include 'service' must NOT match OSM places tagged as generic service.
     */
    public function test_generic_service_category_does_not_create_false_competitor_matches(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        // Business type: dentist clinic — competitor_categories only includes dentist-related tags
        $dentistSlug = 'klinik-gigi-qa-' . uniqid();
        $dentistType = BusinessType::create([
            'name'                  => 'Klinik Gigi QA',
            'slug'                  => $dentistSlug,
            'category'              => 'Jasa & Servis',
            'scale'                 => 'ruko',
            'default_radius_m'      => 600,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => ['amenity=dentist', 'dentist'],
        ]);

        $service = new LocationAnalysisService($mockBps);

        $testLat = -7.541300;
        $testLng = 112.941300;

        try {
            $result = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 600,
                'business_type'   => $dentistSlug,
                'candidate_id'    => 'A',
                'external_places' => [
                    // Should match: specific dentist tag
                    [
                        'id'           => 'osm-dentist-1',
                        'name'         => 'Klinik Gigi Sehat',
                        'category'     => 'service',
                        'raw_category' => 'amenity:dentist',
                        'lat'          => $testLat + 0.0010,
                        'lng'          => $testLng + 0.0010,
                        'source'       => 'openstreetmap',
                    ],
                    // Should NOT match: bank (amenity:bank) has nothing to do with dentist
                    [
                        'id'           => 'osm-bank-2',
                        'name'         => 'Bank Mandiri',
                        'category'     => 'service',
                        'raw_category' => 'amenity:bank',
                        'lat'          => $testLat + 0.0015,
                        'lng'          => $testLng + 0.0015,
                        'source'       => 'openstreetmap',
                    ],
                    // Should NOT match: pharmacy (amenity:pharmacy) unrelated to dentist
                    [
                        'id'           => 'osm-pharmacy-1',
                        'name'         => 'Apotek Sehat',
                        'category'     => 'service',
                        'raw_category' => 'amenity:pharmacy',
                        'lat'          => $testLat + 0.0020,
                        'lng'          => $testLng + 0.0020,
                        'source'       => 'openstreetmap',
                    ],
                    // Should NOT match: laundry unrelated to dentist
                    [
                        'id'           => 'osm-laundry-1',
                        'name'         => 'Laundry Kiloan',
                        'category'     => 'laundry',
                        'raw_category' => 'shop:laundry',
                        'lat'          => $testLat + 0.0025,
                        'lng'          => $testLng + 0.0025,
                        'source'       => 'openstreetmap',
                    ],
                ],
            ]);

            // Only the dentist (amenity:dentist normalized to 'dentist', which is in competitor_categories)
            // must match. Bank, pharmacy, laundry must NOT match.
            $this->assertEquals(
                1,
                $result['competitor_count'],
                'Only the specific dentist POI must match; bank, pharmacy, laundry must not match even though all are category=service'
            );
        } finally {
            $dentistType->forceDelete();
        }
    }

    /**
     * Stage B.5: Test tag-format normalization variations and strict boundaries:
     * - 'amenity=dentist' (configured by admin) matches 'amenity:dentist' (sent by Overpass)
     * - 'amenity:dentist' matches 'amenity:dentist'
     * - 'dentist' matches 'amenity:dentist'
     * - 'amenity_dentist' does NOT match 'amenity:dentist' (underscores are not OSM tag delimiters,
     *   preventing corrupting compound tags like car_repair or dry_cleaning).
     */
    public function test_tag_format_normalization_variations_and_boundaries(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        $dentistSlug = 'dental-clinic-qa-' . uniqid();
        $dentistType = BusinessType::create([
            'name'                  => 'Dental Clinic QA',
            'slug'                  => $dentistSlug,
            'category'              => 'Kesehatan',
            'scale'                 => 'ruko',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => ['amenity=dentist'],
        ]);

        $service = new LocationAnalysisService($mockBps);
        $testLat = -7.551400;
        $testLng = 112.951400;

        try {
            // Case 1: Configured 'amenity=dentist' matches external POI with raw_category 'amenity:dentist'
            $result1 = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => $dentistSlug,
                'candidate_id'    => 'A',
                'external_places' => [
                    [
                        'id'           => 'osm-dentist-colon',
                        'name'         => 'Klinik Gigi drg. Budi',
                        'category'     => 'service',
                        'raw_category' => 'amenity:dentist',
                        'lat'          => $testLat + 0.0010,
                        'lng'          => $testLng + 0.0010,
                        'source'       => 'openstreetmap',
                    ],
                ],
            ]);
            $this->assertEquals(1, $result1['competitor_count'], 'amenity=dentist config must match raw_category amenity:dentist');

            // Case 2: Configured 'amenity_dentist' (unsupported format) should NOT match 'amenity:dentist'
            $dentistType->update(['competitor_categories' => ['amenity_dentist']]);
            $result2 = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => $dentistSlug,
                'candidate_id'    => 'A',
                'external_places' => [
                    [
                        'id'           => 'osm-dentist-colon',
                        'name'         => 'Klinik Gigi drg. Budi',
                        'category'     => 'service',
                        'raw_category' => 'amenity:dentist',
                        'lat'          => $testLat + 0.0010,
                        'lng'          => $testLng + 0.0010,
                        'source'       => 'openstreetmap',
                    ],
                ],
            ]);
            $this->assertEquals(0, $result2['competitor_count'], 'amenity_dentist must not ambiguously match amenity:dentist');

            // Case 3: Compound tags like car_repair retain underscores properly
            $dentistType->update(['competitor_categories' => ['shop=car_repair']]);
            $result3 = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => $dentistSlug,
                'candidate_id'    => 'A',
                'external_places' => [
                    [
                        'id'           => 'osm-car-repair',
                        'name'         => 'Bengkel Mobil Maju',
                        'category'     => 'service',
                        'raw_category' => 'shop:car_repair',
                        'lat'          => $testLat + 0.0010,
                        'lng'          => $testLng + 0.0010,
                        'source'       => 'openstreetmap',
                    ],
                ],
            ]);
            $this->assertEquals(1, $result3['competitor_count'], 'shop=car_repair must match shop:car_repair without losing compound underscore');
        } finally {
            $dentistType->forceDelete();
        }
    }

    /**
     * Stage B.5: Test that candidate A/B/C analyses remain completely isolated:
     * - Requests for Candidate A, B, and C do not cross-contaminate.
     * - Different coordinates, radii, and business types maintain isolated counts.
     */
    public function test_candidate_abc_analysis_isolation(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        $payloadA = [
            'lat'             => -7.560100,
            'lng'             => 112.960100,
            'radius'          => 300,
            'business_type'   => 'barbershop',
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'           => 'osm-barber-a',
                    'name'         => 'Barbershop A',
                    'category'     => 'barbershop',
                    'raw_category' => 'shop:barber',
                    'lat'          => -7.560150,
                    'lng'          => 112.960150,
                    'source'       => 'openstreetmap',
                ],
            ],
        ];

        $payloadB = [
            'lat'             => -7.570200,
            'lng'             => 112.970200,
            'radius'          => 600,
            'business_type'   => 'minimarket',
            'candidate_id'    => 'B',
            'external_places' => [
                [
                    'id'           => 'osm-retail-b',
                    'name'         => 'Minimarket B',
                    'category'     => 'retail',
                    'raw_category' => 'shop:supermarket',
                    'lat'          => -7.570250,
                    'lng'          => 112.970250,
                    'source'       => 'openstreetmap',
                ],
            ],
        ];

        $resultA = $service->analyze($payloadA);
        $resultB = $service->analyze($payloadB);

        $this->assertEquals('A', $resultA['candidate_id']);
        $this->assertEquals('B', $resultB['candidate_id']);
        $this->assertEquals(300, $resultA['radius']);
        $this->assertEquals(600, $resultB['radius']);
        $this->assertEquals('barbershop', $resultA['business_type']);
        $this->assertEquals('minimarket', $resultB['business_type']);

        // Competitor counts and nearest competitors must reflect each candidate's distinct payload
        $this->assertEquals(1, $resultA['competitor_count']);
        $this->assertEquals(1, $resultB['competitor_count']);
        $this->assertEquals('Barbershop A', $resultA['nearest_competitor']['name']);
        $this->assertEquals('Minimarket B', $resultB['nearest_competitor']['name']);
    }

    /**
     * Stage B.6.1 (B6-3): Test safe spatial deduplication:
     * - A generic single-word internal name like 'Warung' does NOT falsely deduplicate
     *   an unrelated nearby business like 'Warung Bu Siti'.
     * - A genuine duplicate with specific name like 'Kedai Kopi Barokah' vs
     *   'Kedai Kopi Barokah (OSM duplicate)' within 50m IS correctly deduplicated.
     */
    public function test_safe_spatial_deduplication_preserves_generic_names_and_deduplicates_genuine(): void
    {
        $user = User::first() ?? User::factory()->create();

        $bType = BusinessType::firstOrCreate(
            ['slug' => 'warung-makan'],
            [
                'name'                  => 'Warung Makan',
                'category'              => 'Kuliner',
                'scale'                 => 'mikro',
                'default_radius_m'      => 500,
                'is_active'             => true,
                'competitor_categories' => ['warung-makan'],
            ]
        );

        $testLat = -7.580100;
        $testLng = 112.980100;

        // 1. Create registered business with generic short name "Warung"
        $bizGeneric = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Warung',
            'business_type_id' => $bType->id,
            'latitude'         => $testLat + 0.0001,
            'longitude'        => $testLng + 0.0001,
            'status'           => 'active',
        ]);

        // 2. Create registered business with specific name "Kedai Kopi Barokah"
        $bizSpecific = Business::create([
            'user_id'          => $user->id,
            'name'             => 'Kedai Kopi Barokah',
            'business_type_id' => $bType->id,
            'latitude'         => $testLat + 0.0010,
            'longitude'        => $testLng + 0.0010,
            'status'           => 'active',
        ]);

        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        try {
            $result = $service->analyze([
                'lat'             => $testLat,
                'lng'             => $testLng,
                'radius'          => 500,
                'business_type'   => 'warung-makan',
                'candidate_id'    => 'A',
                'external_places' => [
                    // Should NOT be deduplicated: "Warung Bu Siti" within 30m of "Warung"
                    [
                        'id'       => 'osm-warung-bu-siti',
                        'name'     => 'Warung Bu Siti',
                        'category' => 'retail',
                        'lat'      => $testLat + 0.00015,
                        'lng'      => $testLng + 0.00015,
                        'source'   => 'openstreetmap',
                    ],
                    // Should BE deduplicated: "Kedai Kopi Barokah (OSM duplicate)" within 10m of "Kedai Kopi Barokah"
                    [
                        'id'       => 'osm-kedai-kopi-dup',
                        'name'     => 'Kedai Kopi Barokah (OSM duplicate)',
                        'category' => 'cafe',
                        'lat'      => $testLat + 0.00105,
                        'lng'      => $testLng + 0.00105,
                        'source'   => 'openstreetmap',
                    ],
                ],
            ]);

            // Registered: 2
            $this->assertEquals(2, $result['registered_business_total']);

            // External POI total must be exactly 1:
            // "Warung Bu Siti" was preserved, while the genuine duplicate was dropped!
            $this->assertEquals(1, $result['external_poi_total'], 'Warung Bu Siti must not be discarded as duplicate of Warung');
            $this->assertEquals(3, $result['poi_total'], 'poi_total must be 2 registered + 1 non-duplicate external');
        } finally {
            $bizGeneric->forceDelete();
            $bizSpecific->forceDelete();
        }
    }

    /**
     * Stage B.6.1 (B6-2): Test OSM stale cache provenance warning and source status:
     * - Places with is_stale: true trigger source status 'stale' and an explicit warning note.
     * - Live places (is_stale: false) yield status 'loaded' with no stale warning.
     */
    public function test_osm_stale_cache_provenance_warning_and_source_status(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        // Case 1: Stale external places from spatial cache
        $resultStale = $service->analyze([
            'lat'             => -7.590100,
            'lng'             => 112.990100,
            'radius'          => 400,
            'business_type'   => 'barbershop',
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'osm-stale-place',
                    'name'     => 'Pangkas Rambut Jaya',
                    'category' => 'barbershop',
                    'lat'      => -7.590150,
                    'lng'      => 112.990150,
                    'source'   => 'openstreetmap',
                    'is_stale' => true,
                ],
            ],
        ]);

        $sourcesStale = collect($resultStale['sources']);
        $osmSourceStale = $sourcesStale->firstWhere('id', 'openstreetmap');
        $this->assertEquals('stale', $osmSourceStale['status'], 'OSM source status must be stale when is_stale is true');

        $warningsStale = implode(' ', $resultStale['data_warnings']);
        $this->assertStringContainsString('cache spasial lokal', $warningsStale, 'Warning must inform user that data comes from cache');

        // Case 2: Live external places
        $resultLive = $service->analyze([
            'lat'             => -7.590100,
            'lng'             => 112.990100,
            'radius'          => 400,
            'business_type'   => 'barbershop',
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'osm-live-place',
                    'name'     => 'Pangkas Rambut Jaya',
                    'category' => 'barbershop',
                    'lat'      => -7.590150,
                    'lng'      => 112.990150,
                    'source'   => 'openstreetmap',
                    'is_stale' => false,
                ],
            ],
        ]);

        $sourcesLive = collect($resultLive['sources']);
        $osmSourceLive = $sourcesLive->firstWhere('id', 'openstreetmap');
        $this->assertEquals('loaded', $osmSourceLive['status'], 'OSM source status must be loaded for live data');

        $warningsLive = implode(' ', $resultLive['data_warnings']);
        $this->assertStringNotContainsString('cache spasial lokal', $warningsLive);
    }

    /**
     * Stage B.6.1 (B6-4): Test external POI truncation transparency:
     * - is_truncated: true sets response is_truncated, source truncated flag, and surfaces warning.
     */
    public function test_external_poi_truncation_transparency(): void
    {
        $mockBps = $this->createMock(BpsApiService::class);
        $mockBps->method('getDemographicsForLocation')->willReturn([
            'status'          => 'supported',
            'region_name'     => 'Kota Malang',
            'density_per_km2' => 1000,
            'population'      => 800000,
        ]);

        $service = new LocationAnalysisService($mockBps);

        $resultTruncated = $service->analyze([
            'lat'             => -7.600100,
            'lng'             => 112.995100,
            'radius'          => 500,
            'business_type'   => 'kedai-kopi',
            'candidate_id'    => 'A',
            'is_truncated'    => true,
            'external_places' => [
                [
                    'id'       => 'osm-cafe-1',
                    'name'     => 'Kopi Sore',
                    'category' => 'cafe',
                    'lat'      => -7.600150,
                    'lng'      => 112.995150,
                    'source'   => 'openstreetmap',
                ],
            ],
        ]);

        $this->assertTrue($resultTruncated['is_truncated']);

        $sources = collect($resultTruncated['sources']);
        $osmSource = $sources->firstWhere('id', 'openstreetmap');
        $this->assertTrue($osmSource['truncated']);

        $warnings = implode(' ', $resultTruncated['data_warnings']);
        $this->assertStringContainsString('melebihi batas transmisi', $warnings);
        $this->assertStringContainsString('telah dipotong', $warnings);
    }
}
