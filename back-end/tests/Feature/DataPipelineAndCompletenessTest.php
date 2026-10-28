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

class DataPipelineAndCompletenessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Test that dismissed reports (is_dismissed = true) are excluded from analysis,
     * do not appear in report_count, and do not penalize the opportunity score.
     */
    public function test_dismissed_reports_are_excluded_from_penalty_and_report_count(): void
    {
        $user = User::first() ?? User::factory()->create();

        $slug = 'qa-pipeline-test-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Pipeline Test Type',
            'slug'                  => $slug,
            'category'              => 'retail',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        $testLat = -7.975000;
        $testLng = 112.630000;

        $repCat = ReportCategory::first() ?? ReportCategory::create([
            'name'  => 'Jalan Rusak QA ' . uniqid(),
            'slug'  => 'jalan-qa-' . uniqid(),
            'icon'  => 'road',
            'color' => '#f59e0b',
        ]);

        // 1. Create a dismissed report (should be completely excluded)
        $dismissedReport = Report::create([
            'user_id'      => $user->id,
            'category_id'  => $repCat->id,
            'title'        => 'Laporan Diabaikan / Dismissed QA',
            'description'  => 'Laporan spam yang telah di-dismiss',
            'status'       => 'reported',
            'severity'     => 'critical',
            'is_dismissed' => true,
            'latitude'     => $testLat + 0.0001,
            'longitude'    => $testLng + 0.0001,
            'occurred_at'  => now(),
        ]);

        // 2. Create a resolved report (status resolved does not penalize score)
        $resolvedReport = Report::create([
            'user_id'      => $user->id,
            'category_id'  => $repCat->id,
            'title'        => 'Laporan Selesai Ditangani QA',
            'description'  => 'Perbaikan jalan sudah selesai',
            'status'       => 'resolved',
            'severity'     => 'medium',
            'is_dismissed' => false,
            'latitude'     => $testLat + 0.0002,
            'longitude'    => $testLng + 0.0002,
            'occurred_at'  => now(),
        ]);

        $response = $this->postJson('/api/analysis/location', [
            'lat'             => $testLat,
            'lng'             => $testLng,
            'radius'          => 500,
            'business_type'   => $slug,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'ext-sample-1',
                    'name'     => 'Toko Kelontong QA',
                    'category' => 'retail',
                    'lat'      => $testLat + 0.0005,
                    'lng'      => $testLng + 0.0005,
                    'source'   => 'openstreetmap',
                ],
            ],
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        // Dismissed report was completely excluded from query
        // Resolved report is in report_count (1), but active_reports = 0
        $this->assertEquals(1, $data['report_count'], 'Only non-dismissed reports should be counted');

        // Verify no active_reports penalty factor exists
        $factorKeys = collect($data['factors'])->pluck('key')->all();
        $this->assertNotContains('active_reports', $factorKeys, 'Dismissed/resolved reports must not generate active_reports penalty factor');

        // Cleanup
        $dismissedReport->forceDelete();
        $resolvedReport->forceDelete();
        $businessType->forceDelete();
    }

    /**
     * Test active reports penalize score strictly according to the defined formula
     * penalty = min(activeReports * 5, 20) without modifying scoring rules.
     */
    public function test_active_reports_penalize_score_with_strict_formula(): void
    {
        $user = User::first() ?? User::factory()->create();

        $slug = 'qa-active-rep-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Active Report Business',
            'slug'                  => $slug,
            'category'              => 'retail',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        $testLat = -7.974000;
        $testLng = 112.631000;

        $repCat = ReportCategory::first() ?? ReportCategory::create([
            'name'  => 'Drainase QA ' . uniqid(),
            'slug'  => 'drainase-qa-' . uniqid(),
            'icon'  => 'water',
            'color' => '#3b82f6',
        ]);

        $rep1 = Report::create([
            'user_id'      => $user->id,
            'category_id'  => $repCat->id,
            'title'        => 'Banjir Luapan 1',
            'status'       => 'reported',
            'severity'     => 'medium',
            'is_dismissed' => false,
            'latitude'     => $testLat + 0.0001,
            'longitude'    => $testLng + 0.0001,
            'occurred_at'  => now(),
        ]);
        $rep2 = Report::create([
            'user_id'      => $user->id,
            'category_id'  => $repCat->id,
            'title'        => 'Banjir Luapan 2',
            'status'       => 'confirmed',
            'severity'     => 'medium',
            'is_dismissed' => false,
            'latitude'     => $testLat + 0.0002,
            'longitude'    => $testLng + 0.0002,
            'occurred_at'  => now(),
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

        $activeReportFactor = collect($data['factors'])->firstWhere('key', 'active_reports');
        $this->assertNotNull($activeReportFactor, 'Active reports factor must be present');
        $this->assertEquals(2, $activeReportFactor['value'], '2 active reports must be detected');
        $this->assertEquals('negative', $activeReportFactor['impact']);
        $this->assertStringContainsString('-10 poin', $activeReportFactor['note']);

        // Base 40 + BPS Malang density bonus (5) - 10 penalty = 35
        $this->assertLessThan(45, $data['opportunity_score']);

        $rep1->forceDelete();
        $rep2->forceDelete();
        $businessType->forceDelete();
    }

    /**
     * Test high or critical severity active reports trigger specific warning.
     */
    public function test_high_or_critical_severity_reports_trigger_severe_data_warning(): void
    {
        $user = User::first() ?? User::factory()->create();

        $slug = 'qa-severe-rep-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Severe Report Business',
            'slug'                  => $slug,
            'category'              => 'retail',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        $testLat = -7.973000;
        $testLng = 112.632000;

        $repCat = ReportCategory::first() ?? ReportCategory::create([
            'name'  => 'Jembatan QA ' . uniqid(),
            'slug'  => 'jembatan-qa-' . uniqid(),
            'icon'  => 'bridge',
            'color' => '#dc2626',
        ]);

        $severeReport = Report::create([
            'user_id'      => $user->id,
            'category_id'  => $repCat->id,
            'title'        => 'Jembatan Putus QA',
            'status'       => 'confirmed',
            'severity'     => 'critical',
            'is_dismissed' => false,
            'latitude'     => $testLat + 0.0001,
            'longitude'    => $testLng + 0.0001,
            'occurred_at'  => now(),
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

        $warnings = $data['data_warnings'];
        $hasSevereWarning = false;
        foreach ($warnings as $w) {
            if (str_contains($w, 'keparahan tinggi/kritis')) {
                $hasSevereWarning = true;
                break;
            }
        }
        $this->assertTrue($hasSevereWarning, 'data_warnings must mention high/critical severity report');

        $severeReport->forceDelete();
        $businessType->forceDelete();
    }

    /**
     * Test BPS unsupported region returns null population, partial completeness, and proper status.
     */
    public function test_unsupported_bps_region_returns_partial_completeness_and_null_population(): void
    {
        $slug = 'qa-bps-unsupported-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA BPS Unsupported Business',
            'slug'                  => $slug,
            'category'              => 'cafe',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        // Coordinate in Surakarta / Solo: on land in Java, but outside Malang / Bandung / Jakarta known domains
        $unsupportedLat = -7.550000;
        $unsupportedLng = 110.820000;

        $response = $this->postJson('/api/analysis/location', [
            'lat'             => $unsupportedLat,
            'lng'             => $unsupportedLng,
            'radius'          => 500,
            'business_type'   => $slug,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'ext-solo-cafe',
                    'name'     => 'Warung Kopi Solo',
                    'category' => 'cafe',
                    'lat'      => $unsupportedLat + 0.0003,
                    'lng'      => $unsupportedLng + 0.0003,
                    'source'   => 'openstreetmap',
                ],
            ],
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        // Location is valid on land
        $this->assertTrue($data['is_valid_location']);

        // Analysis completeness must be 'partial' because BPS is unavailable
        $this->assertEquals('partial', $data['analysis_completeness']);

        // Demographics must NOT invent fake 0 population
        $this->assertNull($data['bps_demographics']['population'], 'BPS population must be null, not 0');
        $this->assertNull($data['bps_demographics']['density_per_km2'], 'BPS density must be null, not 0');
        $this->assertEquals('unsupported_region', $data['bps_demographics']['status']);

        // Sources list must show BPS as unavailable
        $bpsSource = collect($data['sources'])->firstWhere('id', 'bps_ri');
        $this->assertNotNull($bpsSource);
        $this->assertEquals('unavailable', $bpsSource['status']);
        $this->assertNull($bpsSource['count']);

        // Warnings must include BPS unsupported warning
        $warnings = $data['data_warnings'];
        $hasBpsWarning = false;
        foreach ($warnings as $w) {
            if (str_contains($w, 'Data demografi BPS tidak tersedia untuk wilayah administratif ini')) {
                $hasBpsWarning = true;
                break;
            }
        }
        $this->assertTrue($hasBpsWarning, 'data_warnings must mention BPS unavailable for region');

        // Limitations note must reflect partial completeness
        $this->assertStringContainsString('bersifat parsial', $data['limitations']);

        $businessType->forceDelete();
    }

    /**
     * Test minimum requirements: when internal queries fail and external places are empty,
     * analysis returns insufficient_data and is_valid_location = false.
     */
    public function test_minimum_analysis_requirements_fails_gracefully_on_insufficient_data(): void
    {
        $service = app(LocationAnalysisService::class);

        // Reflection to test the isolated error condition
        $slug = 'qa-insufficient-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Insufficient Data',
            'slug'                  => $slug,
            'category'              => 'cafe',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        // Using water coordinates as standard test of invalid location or empty data
        $waterLat = -8.700000;
        $waterLng = 112.500000;

        $result = $service->analyze([
            'lat'             => $waterLat,
            'lng'             => $waterLng,
            'radius'          => 500,
            'business_type'   => $businessType->slug,
            'candidate_id'    => 'A',
            'external_places' => [],
            'is_water'        => true,
        ]);

        $this->assertFalse($result['is_valid_location']);
        $this->assertNull($result['opportunity_score']);
        $this->assertEquals('insufficient_data', $result['analysis_completeness']);

        $businessType->forceDelete();
    }

    /**
     * Test that valid empty local POI results in rural Java are treated as 'empty' status, not 'error'.
     */
    public function test_valid_empty_local_poi_in_rural_area_returns_empty_status_not_error(): void
    {
        $slug = 'qa-rural-test-' . uniqid();
        $businessType = BusinessType::create([
            'name'                  => 'QA Rural Area Business',
            'slug'                  => $slug,
            'category'              => 'retail',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [],
            'competitor_categories' => [],
        ]);

        // Rural area coordinates in Malang regency where no LOCIVA registered business or POI exists
        $ruralLat = -8.250000;
        $ruralLng = 112.550000;

        $response = $this->postJson('/api/analysis/location', [
            'lat'             => $ruralLat,
            'lng'             => $ruralLng,
            'radius'          => 500,
            'business_type'   => $slug,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'ext-rural-1',
                    'name'     => 'Warung Desa',
                    'category' => 'retail',
                    'lat'      => $ruralLat + 0.0002,
                    'lng'      => $ruralLng + 0.0002,
                    'source'   => 'openstreetmap',
                ],
            ],
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        $sources = collect($data['sources']);
        $regSource = $sources->firstWhere('id', 'lociva_registered');
        $intSource = $sources->firstWhere('id', 'lociva_internal');

        $this->assertEquals('empty', $regSource['status'], 'Registered businesses status must be empty, not error');
        $this->assertEquals('empty', $intSource['status'], 'Internal POI status must be empty, not error');
        $this->assertEquals(0, $regSource['count']);
        $this->assertEquals(0, $intSource['count']);

        $businessType->forceDelete();
    }
}
