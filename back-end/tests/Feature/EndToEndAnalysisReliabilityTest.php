<?php

namespace Tests\Feature;

use App\Models\AnalysisSnapshot;
use App\Models\Area;
use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\Simulation;
use App\Models\SimulationScore;
use App\Models\SimulationSession;
use App\Models\User;
use App\Services\BpsApiService;
use App\Services\LocationAnalysisService;
use App\Services\SimulationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EndToEndAnalysisReliabilityTest extends TestCase
{
    protected User $user;
    protected BusinessType $businessType;
    protected Business $business;
    protected LocationAnalysisService $analysisService;
    protected SimulationService $simulationService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::first() ?? User::factory()->create([
            'email' => 'e2e_user_' . uniqid() . '@example.com',
        ]);

        $slug = 'e2e-type-' . uniqid();
        $this->businessType = BusinessType::create([
            'name'                  => 'E2E Kuliner Test Type',
            'slug'                  => $slug,
            'category'              => 'food',
            'scale'                 => 'warung',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => [
                ['category' => 'school', 'weight' => 20],
                ['category' => 'campus', 'weight' => 20],
            ],
            'competitor_categories' => ['restaurant', 'cafe'],
        ]);

        $this->business = Business::create([
            'user_id'          => $this->user->id,
            'business_type_id' => $this->businessType->id,
            'name'             => 'E2E Warung Uji Coba',
            'address'          => 'Jl. Uji Coba Malang No. 1',
            'latitude'         => -7.975000,
            'longitude'        => 112.630000,
        ]);

        $this->analysisService   = app(LocationAnalysisService::class);
        $this->simulationService = app(SimulationService::class);
    }

    protected function tearDown(): void
    {
        if (isset($this->businessType)) {
            $simIds = \App\Models\Simulation::where('business_type_id', $this->businessType->id)->pluck('id');
            \App\Models\AnalysisSnapshot::whereIn('simulation_id', $simIds)->forceDelete();
            \App\Models\SimulationScore::whereIn('simulation_id', $simIds)->forceDelete();
            \App\Models\Simulation::where('business_type_id', $this->businessType->id)->forceDelete();
        }
        if (isset($this->business)) {
            $this->business->forceDelete();
        }
        if (isset($this->businessType)) {
            $this->businessType->forceDelete();
        }
        parent::tearDown();
    }

    // -------------------------------------------------------------------------
    // Helper: build a canonical candidate payload for SimulationService
    // -------------------------------------------------------------------------
    private function cleanupSession(SimulationSession $session): void
    {
        $simIds = \App\Models\Simulation::where('session_id', $session->id)->pluck('id');
        \App\Models\AnalysisSnapshot::whereIn('simulation_id', $simIds)->forceDelete();
        \App\Models\SimulationScore::whereIn('simulation_id', $simIds)->forceDelete();
        \App\Models\Simulation::where('session_id', $session->id)->forceDelete();
        $session->forceDelete();
    }

    private function candidatePayload(
        string $sessionId,
        string $candidateId,
        float $lat,
        float $lng,
        string $status = 'draft',
        ?array $scores = null
    ): array {
        $payload = [
            'session_id'       => $sessionId,
            'candidate_id'     => $candidateId,
            'business_id'      => $this->business->id,
            'business_type_id' => $this->businessType->id,
            'latitude'         => $lat,
            'longitude'        => $lng,
            'radius_m'         => 500,
            'status'           => $status,
        ];

        if ($scores !== null) {
            $payload['scores'] = $scores;
        }

        return $payload;
    }

    // =========================================================================
    // Requirement 1: Successful analysis using all four agreed data sources.
    // (Local POI DB, internal business DB, civic reports, BPS demographic data)
    // =========================================================================
    public function test_1_successful_analysis_using_all_four_agreed_data_sources(): void
    {
        $lat = -7.975000;
        $lng = 112.630000;

        // Ensure POI exists
        $poi = Poi::create([
            'name'      => 'SMA Negeri E2E Malang',
            'category'  => 'amenity:school',
            'latitude'  => $lat + 0.0005,
            'longitude' => $lng + 0.0005,
            'source'    => 'lociva_internal',
        ]);

        // Ensure registered business exists
        $regBiz = Business::create([
            'user_id'          => $this->user->id,
            'business_type_id' => $this->businessType->id,
            'name'             => 'Mitra Terdaftar E2E',
            'latitude'         => $lat + 0.0008,
            'longitude'        => $lng + 0.0008,
            'status'           => 'approved',
        ]);

        // Ensure report exists
        $secCat = ReportCategory::firstOrCreate(['slug' => 'road'], ['name' => 'Jalan Rusak']);
        $report = Report::create([
            'user_id'     => $this->user->id,
            'category_id' => $secCat->id,
            'title'       => 'Lubang Jalan Sedang',
            'latitude'    => $lat + 0.0003,
            'longitude'   => $lng + 0.0003,
            'severity'    => 'medium',
            'status'      => 'confirmed',
        ]);

        try {
            $response = $this->postJson('/api/analysis/location', [
                'lat'           => $lat,
                'lng'           => $lng,
                'radius'        => 500,
                'business_type' => $this->businessType->slug,
                'candidate_id'  => 'A',
            ]);

            $response->assertStatus(200);
            $data = $response->json('data');

            // All 4 sources must be transparently represented
            $sources = collect($data['sources'])->keyBy('id');
            $this->assertTrue($sources->has('lociva_registered'), 'Registered businesses source must be present');
            $this->assertTrue($sources->has('lociva_internal'), 'Internal POI source must be present');
            $this->assertTrue($sources->has('bps_ri'), 'BPS demographic source must be present');

            $this->assertGreaterThan(0, $data['registered_business_total']);
            $this->assertGreaterThan(0, $data['internal_poi_total']);
            $this->assertGreaterThan(0, $data['report_count']);
            $this->assertNotNull($data['bps_demographics']);

            // Opportunity score must be calculated deterministically
            $this->assertNotNull($data['opportunity_score']);
            $this->assertGreaterThan(0, $data['opportunity_score']);
            $this->assertEquals('1.0', $data['algorithm_version']);

        } finally {
            $poi->forceDelete();
            $regBiz->forceDelete();
            $report->forceDelete();
        }
    }

    // =========================================================================
    // Requirement 2: BPS unavailable with valid cached data.
    // (Simulates BPS outage while cache has valid demographic data)
    // =========================================================================
    public function test_2_bps_unavailable_with_valid_cached_data(): void
    {
        $lat      = -7.975000;
        $lng      = 112.630000;
        $domainId = '3573'; // Kota Malang

        // Pre-populate cache with verified BPS live indicator
        $cacheKey = "bps_live_indicator_v2_{$domainId}";
        Cache::put($cacheKey, [
            'population'      => 891859,
            'density_per_km2' => 8103,
            'year'            => 2025,
            'source'          => 'BPS Kota Malang (Cached Live Indicator)',
        ], now()->addHours(24));

        // Mock BPS API to fail with 500 error / connection failure
        Http::fake([
            'webapi.bps.go.id/*' => Http::response(null, 500),
        ]);

        $res = $this->analysisService->analyze([
            'lat'           => $lat,
            'lng'           => $lng,
            'radius'        => 500,
            'business_type' => $this->businessType->slug,
            'candidate_id'  => 'A',
        ]);

        $this->assertNotNull($res['bps_demographics']);
        $this->assertEquals(891859, $res['bps_demographics']['population']);
        $this->assertStringContainsString('BPS', $res['bps_demographics']['source']);
        $this->assertNotNull($res['opportunity_score']);
    }

    // =========================================================================
    // Requirement 3: BPS unavailable without valid cached data.
    // (Analysis completes with partial completeness without crashing)
    // =========================================================================
    public function test_3_bps_unavailable_without_valid_cached_data(): void
    {
        // Coordinate in unsupported rural area (outside curated BPS domains)
        $lat = -7.100000;
        $lng = 109.500000;

        $res = $this->analysisService->analyze([
            'lat'           => $lat,
            'lng'           => $lng,
            'radius'        => 500,
            'business_type' => $this->businessType->slug,
            'candidate_id'  => 'A',
        ]);

        // Must not crash; returns partial completeness
        $this->assertEquals('partial', $res['analysis_completeness']);
        $this->assertEquals('unsupported_region', $res['bps_demographics']['status']);
        $this->assertNull($res['bps_demographics']['population']);

        // Data warnings must transparently state that BPS data is unavailable
        $hasBpsWarning = collect($res['data_warnings'])->some(fn($w) => str_contains($w, 'BPS'));
        $this->assertTrue($hasBpsWarning, 'Warning must explain that BPS demographic data is missing');
    }

    // =========================================================================
    // Requirement 4: Empty local POI query versus genuinely insufficient coverage.
    // (Empty result in rural area is reported as 'empty' status, not query failure)
    // =========================================================================
    public function test_4_empty_local_poi_query_distinguished_from_query_failure(): void
    {
        // Remote location confirmed to have 0 POIs within 500m radius
        // (-8.5, 115.5 is a sparsely populated coastal area; verified to have 0 records)
        $lat = -8.500000;
        $lng = 115.500000;

        $res = $this->analysisService->analyze([
            'lat'           => $lat,
            'lng'           => $lng,
            'radius'        => 500,
            'business_type' => $this->businessType->slug,
            'candidate_id'  => 'A',
        ]);

        $this->assertTrue($res['is_valid_location']);
        $this->assertEquals(0, $res['internal_poi_total']);

        // Check source status: must be 'empty', NOT 'error'
        $poiSource = collect($res['sources'])->firstWhere('id', 'lociva_internal');
        $this->assertEquals('empty', $poiSource['status']);
    }

    // =========================================================================
    // Requirement 5: Missing or invalid citizen reports.
    // (Dismissed reports do not penalize, active reports penalize accurately)
    // =========================================================================
    public function test_5_missing_or_invalid_citizen_reports_handling(): void
    {
        $lat = -7.975000;
        $lng = 112.630000;

        $cat = ReportCategory::firstOrCreate(['slug' => 'road'], ['name' => 'Jalan']);

        // Create dismissed report
        $dismissedReport = Report::create([
            'user_id'      => $this->user->id,
            'category_id'  => $cat->id,
            'title'        => 'Laporan Palsu / Ditolak',
            'latitude'     => $lat + 0.0001,
            'longitude'    => $lng + 0.0001,
            'severity'     => 'critical',
            'status'       => 'dismissed',
            'is_dismissed' => true,
        ]);

        try {
            $res = $this->analysisService->analyze([
                'lat'           => $lat,
                'lng'           => $lng,
                'radius'        => 500,
                'business_type' => $this->businessType->slug,
                'candidate_id'  => 'A',
            ]);

            // Dismissed report must be excluded from active count
            $this->assertEquals(0, $res['report_count']);

            // Penalties factor must not include penalty from dismissed report
            $reportFactor = collect($res['factors'])->firstWhere('key', 'reports_penalty');
            $this->assertEquals(0, $reportFactor['value'] ?? 0);

        } finally {
            $dismissedReport->forceDelete();
        }
    }

    // =========================================================================
    // Requirement 6: Candidate coordinates changed after a successful analysis.
    // (Old snapshot remains preserved; score status is marked 'stale')
    // =========================================================================
    public function test_6_candidate_coordinates_changed_after_successful_analysis(): void
    {
        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'business_id' => $this->business->id,
            'name'        => 'Sesi Uji Stale Coordination',
        ]);

        // Step 1: Save candidate at Pos 1 WITH analysis scores → creates snapshot & score
        $result1 = $this->simulationService->saveCandidateLocation(
            $this->user->id,
            $this->candidatePayload($session->id, 'A', -7.975000, 112.630000, 'calculated', [
                'opportunity_score' => 75,
                'competition_score' => 30,
            ])
        );

        $simulationId = $result1['simulation_id'];
        $this->assertNotNull($simulationId);

        // Snapshot should exist for pos-1 analysis
        $firstSnapshot = AnalysisSnapshot::where('simulation_id', $simulationId)->first();
        $this->assertNotNull($firstSnapshot, 'Snapshot must be created after first analysis');

        // Step 2: Coordinates changed → save without scores → stale is triggered
        // Status is NOT 'scores', 'failed', or 'draft', so else branch fires
        // Existing score status is 'calculated' → marked stale
        $this->simulationService->saveCandidateLocation(
            $this->user->id,
            $this->candidatePayload($session->id, 'A', -7.985000, 112.640000, 'location_selected')
        );

        // Score status must be 'stale'
        $scoreStatus = SimulationScore::where('simulation_id', $simulationId)->value('status');
        $this->assertEquals('stale', $scoreStatus, 'Score status must be stale after coordinates change');

        // Historical snapshot still exists and was NOT overwritten
        $snapshotCount = AnalysisSnapshot::where('simulation_id', $simulationId)->count();
        $this->assertEquals(1, $snapshotCount, 'Snapshot must not be duplicated or deleted');
        $this->assertEquals(-7.975000, (float) $firstSnapshot->analyzed_lat);

        $this->cleanupSession($session);
    }

    // =========================================================================
    // Requirement 7: More than three candidates associated with one business.
    // =========================================================================
    public function test_7_more_than_three_candidates_associated_with_one_business(): void
    {
        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'business_id' => $this->business->id,
            'name'        => 'Sesi 5 Kandidat',
        ]);

        $candidateIds = ['A', 'B', 'C', 'D', 'E'];

        foreach ($candidateIds as $idx => $cId) {
            $result = $this->simulationService->saveCandidateLocation(
                $this->user->id,
                $this->candidatePayload(
                    $session->id,
                    $cId,
                    -7.970000 + ($idx * 0.002),
                    112.630000 + ($idx * 0.002),
                    'draft'
                )
            );
            // Each call must return a simulation_id
            $this->assertNotNull($result['simulation_id'], "Candidate {$cId} must have a simulation_id");
        }

        $savedCandidates = Simulation::where('session_id', $session->id)->get();
        $this->assertCount(5, $savedCandidates, 'All 5 candidates must be persisted');

        $savedTags = $savedCandidates->pluck('target_market')->map(fn($t) => str_replace('Candidate_', '', $t))->sort()->values()->toArray();
        $this->assertEquals($candidateIds, $savedTags, 'All candidate IDs (A–E) must be recorded');

        $this->cleanupSession($session);
    }

    // =========================================================================
    // Requirement 8: Concurrent or duplicate analysis submissions.
    // (Duplicate requests within short deduplication window are safely coalesced)
    // =========================================================================
    public function test_8_duplicate_analysis_submissions_are_safely_deduplicated(): void
    {
        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'business_id' => $this->business->id,
            'name'        => 'Sesi Deduplikasi',
        ]);

        $payload = $this->candidatePayload($session->id, 'A', -7.975000, 112.630000, 'calculated', [
            'opportunity_score' => 80,
            'competition_score' => 20,
        ]);

        // Submission 1
        $result1 = $this->simulationService->saveCandidateLocation($this->user->id, $payload);

        // Immediate duplicate submission (<2s window): same lat/lng/score/radius
        $result2 = $this->simulationService->saveCandidateLocation($this->user->id, $payload);

        // Both must resolve to the same simulation
        $this->assertEquals($result1['simulation_id'], $result2['simulation_id']);

        // Exactly 1 snapshot record must be persisted (deduplication window applied)
        $snapshots = AnalysisSnapshot::where('simulation_id', $result1['simulation_id'])->get();
        $this->assertCount(1, $snapshots, 'Duplicate submission within 2s must produce exactly one snapshot');

        $this->cleanupSession($session);
    }

    // =========================================================================
    // Requirement 9: A high market-potential score combined with a verified hard location restriction.
    // (Preserves market potential score, but blocks overall recommendation)
    // =========================================================================
    public function test_9_high_market_potential_combined_with_verified_hard_restriction(): void
    {
        $lat = -7.975000;
        $lng = 112.630000;

        $area = Area::create([
            'name'      => 'Kawasan Steril Penertiban PKL',
            'type'      => 'restricted_zone',
            'latitude'  => $lat,
            'longitude' => $lng,
        ]);

        try {
            $res = $this->analysisService->analyze([
                'lat'           => $lat,
                'lng'           => $lng,
                'radius'        => 500,
                'business_type' => $this->businessType->slug,
                'candidate_id'  => 'A',
            ]);

            // Market potential score must be PRESERVED
            $this->assertNotNull($res['opportunity_score']);
            $this->assertGreaterThan(0, $res['opportunity_score']);

            // Legal restriction must be prohibited
            $this->assertEquals('prohibited', $res['legal_restrictions']['status']);

            // Overall recommendation must be blocked
            $this->assertEquals('prohibited', $res['overall_recommendation']['status']);
            $this->assertNotEmpty($res['overall_recommendation']['blocking_reasons']);
            $this->assertStringContainsString('TIDAK DAPAT DIREKOMENDASIKAN', $res['overall_recommendation']['summary']);

        } finally {
            $area->forceDelete();
        }
    }

    // =========================================================================
    // Requirement 10: Historical results remaining unchanged after source data changes.
    // (Immutable snapshot integrity)
    // =========================================================================
    public function test_10_historical_results_remain_unchanged_after_source_data_changes(): void
    {
        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'business_id' => $this->business->id,
            'name'        => 'Sesi Immutability',
        ]);

        $result = $this->simulationService->saveCandidateLocation(
            $this->user->id,
            array_merge(
                $this->candidatePayload($session->id, 'A', -7.975000, 112.630000, 'calculated', [
                    'opportunity_score' => 77,
                    'competition_score' => 25,
                ]),
                ['competitor_count' => 2]
            )
        );

        $simulationId = $result['simulation_id'];
        $snapshot = AnalysisSnapshot::where('simulation_id', $simulationId)->first();
        $this->assertNotNull($snapshot, 'Snapshot must exist after analysis save');

        $originalOpportunityScore = $snapshot->opportunity_score;
        $originalCompetitorCount  = $snapshot->competitor_count;

        // Simulate source data changes: change BusinessType configuration
        $this->businessType->update([
            'target_demographics'   => [['category' => 'office', 'weight' => 50]],
            'competitor_categories' => ['supermarket'],
        ]);

        // Re-read snapshot from database — must be identical
        $freshSnapshot = AnalysisSnapshot::find($snapshot->id);
        $this->assertEquals($originalOpportunityScore, $freshSnapshot->opportunity_score,
            'Stored opportunity_score must not change after BusinessType reconfiguration');
        $this->assertEquals($originalCompetitorCount, $freshSnapshot->competitor_count,
            'Stored competitor_count must not change after BusinessType reconfiguration');

        $this->cleanupSession($session);
    }

    // =========================================================================
    // Requirement 11: Security: authorization prevents cross-user access.
    // =========================================================================
    public function test_11_authorization_prevents_cross_user_access(): void
    {
        $otherUser     = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id'          => $otherUser->id,
            'business_type_id' => $this->businessType->id,
            'name'             => 'Usaha Pengguna Lain',
            'latitude'         => -7.980000,
            'longitude'        => 112.630000,
        ]);

        $session = SimulationSession::create([
            'user_id'     => $otherUser->id,
            'business_id' => $otherBusiness->id,
            'name'        => 'Sesi Rahasia User Lain',
        ]);

        // Attempting to save candidate under another user's business must throw HTTP 403
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        try {
            // $this->user attempts to access $otherUser's business → must be forbidden
            $this->simulationService->saveCandidateLocation(
                $this->user->id, // Attacker's user ID
                [
                    'session_id'       => $session->id,
                    'candidate_id'     => 'A',
                    'business_id'      => $otherBusiness->id,   // Victim's business
                    'business_type_id' => $this->businessType->id,
                    'latitude'         => -7.980000,
                    'longitude'        => 112.630000,
                    'radius_m'         => 500,
                    'status'           => 'draft',
                ]
            );
        } finally {
            $this->cleanupSession($session);
            $otherBusiness->forceDelete();
            $otherUser->forceDelete();
        }
    }
}
