<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\AnalysisSnapshot;
use App\Models\Simulation;
use App\Models\SimulationSession;
use App\Models\User;
use App\Services\BpsApiService;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class AnalysisHistoryTest extends TestCase
{
    protected User $user;
    protected BusinessType $businessType;
    protected Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::first() ?? User::factory()->create();
        $this->businessType = BusinessType::first();

        $this->business = Business::firstOrCreate(
            [
                'user_id'          => $this->user->id,
                'business_type_id' => $this->businessType->id,
            ],
            [
                'name'        => 'Usaha Seblak Uji Analisis',
                'description' => 'Business for testing analysis snapshots',
                'latitude'    => -7.9800,
                'longitude'   => 112.6300,
                'is_demo'     => false,
            ]
        );
    }

    public function test_authoritative_backend_analysis_returns_algorithm_version_and_scores(): void
    {
        Sanctum::actingAs($this->user);

        // Mock BpsApiService to isolate external network calls
        $mockBps = Mockery::mock(BpsApiService::class);
        $mockBps->shouldReceive('getDemographicsForLocation')
            ->andReturn([
                'status'        => 'loaded',
                'region_name'   => 'Kota Malang',
                'population'    => 843810,
                'density_km2'   => 7671,
                'year'          => 2024,
            ]);
        $this->app->instance(BpsApiService::class, $mockBps);

        $payload = [
            'candidate_id'  => 'cand_test_01',
            'lat'           => -7.9820,
            'lng'           => 112.6310,
            'radius'        => 500,
            'business_type' => $this->businessType->slug,
            'external_places' => [
                [
                    'name'     => 'Warung Seblak Pesaing',
                    'category' => 'food',
                    'lat'      => -7.9825,
                    'lng'      => 112.6315,
                    'source'   => 'openstreetmap',
                ],
            ],
        ];

        $response = $this->postJson('/api/analysis/location', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.algorithm_version', '1.0')
            ->assertJsonPath('data.candidate_id', 'cand_test_01')
            ->assertJsonPath('data.is_valid_location', true);

        $this->assertNotNull($response->json('data.opportunity_score'));
        $this->assertIsArray($response->json('data.factors'));
        $this->assertIsArray($response->json('data.sources'));
    }

    public function test_successful_analysis_creates_new_immutable_snapshot_record(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'candidate_id'     => 'cand_snap_01',
            'latitude'         => -7.9810,
            'longitude'        => 112.6320,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'business_id'      => $this->business->id,
            'status'           => 'calculated',
            'algorithm_version'=> '1.0',
            'analyzed_lat'     => -7.9810,
            'analyzed_lng'     => 112.6320,
            'competitor_count' => 2,
            'report_count'     => 1,
            'data_warnings'    => ['Peringatan pengujian'],
            'sources'          => [
                ['id' => 'openstreetmap', 'count' => 5, 'status' => 'loaded'],
            ],
            'factors'          => [
                ['key' => 'competition', 'label' => 'Persaingan', 'value' => 70, 'impact' => 'neutral'],
            ],
            'scores'           => [
                'opportunity_score'   => 75,
                'competition_score'   => 60,
                'accessibility_score' => 80,
                'data_confidence'     => 85,
            ],
        ];

        $response = $this->postJson('/api/simulations/candidate', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'calculated')
            ->assertJsonPath('data.snapshots_count', 1);

        $this->assertDatabaseHas('analysis_snapshots', [
            'algorithm_version'   => '1.0',
            'analyzed_lat'        => -7.9810,
            'analyzed_lng'        => 112.6320,
            'opportunity_score'   => 75,
            'competition_score'   => 60,
            'accessibility_score' => 80,
            'data_confidence'     => 85,
            'competitor_count'    => 2,
            'report_count'        => 1,
            'status'              => 'success',
        ]);

        $snapshot = AnalysisSnapshot::latest()->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(['Peringatan pengujian'], $snapshot->data_warnings);
        $this->assertCount(1, $snapshot->factors);
        $this->assertEquals('competition', $snapshot->factors[0]['key']);
    }

    public function test_repeated_analysis_creates_append_only_history_without_overwriting(): void
    {
        Sanctum::actingAs($this->user);

        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Multi Run Session',
            'description' => "Test multi runs [business_id:{$this->business->id}]",
        ]);

        // Run 1: Score 70
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'business_id'      => $this->business->id,
            'status'           => 'calculated',
            'analyzed_lat'     => -7.9800,
            'analyzed_lng'     => 112.6300,
            'scores'           => [
                'opportunity_score'   => 70,
                'competition_score'   => 50,
                'accessibility_score' => 75,
                'data_confidence'     => 80,
            ],
        ])->assertStatus(200);

        // Simulate time passing (3 seconds) to bypass duplicate submission debounce
        $this->travel(3)->seconds();

        // Run 2: Re-analysis with different scores / radius (e.g. radius adjusted to 800)
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 800,
            'business_type_id' => $this->businessType->id,
            'business_id'      => $this->business->id,
            'status'           => 'calculated',
            'analyzed_lat'     => -7.9800,
            'analyzed_lng'     => 112.6300,
            'scores'           => [
                'opportunity_score'   => 82,
                'competition_score'   => 65,
                'accessibility_score' => 85,
                'data_confidence'     => 90,
            ],
        ])->assertStatus(200);

        $simulation = Simulation::where('session_id', $session->id)
            ->where('target_market', 'Candidate_A')
            ->first();

        // Assert 2 snapshots exist (append-only history)
        $snapshots = AnalysisSnapshot::where('simulation_id', $simulation->id)->orderBy('created_at')->get();
        $this->assertCount(2, $snapshots);

        // First snapshot MUST retain Run 1 data
        $this->assertEquals(70, $snapshots[0]->opportunity_score);
        $this->assertEquals(500, $snapshots[0]->radius_m);

        // Second snapshot MUST retain Run 2 data
        $this->assertEquals(82, $snapshots[1]->opportunity_score);
        $this->assertEquals(800, $snapshots[1]->radius_m);
    }

    public function test_changing_coordinates_marks_status_stale_and_preserves_old_snapshot(): void
    {
        Sanctum::actingAs($this->user);

        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Stale Check Session',
        ]);

        // Initial analysis run at Point A
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'status'           => 'calculated',
            'analyzed_lat'     => -7.9800,
            'analyzed_lng'     => 112.6300,
            'scores'           => [
                'opportunity_score' => 78,
            ],
        ])->assertStatus(200);

        // User drags candidate pin to Point B without running analysis
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9950,
            'longitude'        => 112.6450,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            // No scores passed
        ])->assertStatus(200);

        $simulation = Simulation::where('session_id', $session->id)->first();

        // Current coordinates are updated to Point B
        $this->assertEquals(-7.9950, $simulation->latitude);
        $this->assertEquals(112.6450, $simulation->longitude);

        // Score status is marked stale for current coordinates
        $this->assertEquals('stale', $simulation->score->status);

        // Historical snapshot is preserved at Point A
        $snapshot = AnalysisSnapshot::where('simulation_id', $simulation->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(-7.9800, $snapshot->analyzed_lat);
        $this->assertEquals(112.6300, $snapshot->analyzed_lng);
        $this->assertEquals(78, $snapshot->opportunity_score);
    }

    public function test_failed_analysis_attempt_is_distinguishable_from_successful_history(): void
    {
        Sanctum::actingAs($this->user);

        // Submit failed analysis
        $response = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'cand_failed_01',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'status'           => 'failed',
            'data_warnings'    => ['Lokasi berada di perairan lepas pantai.'],
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('analysis_snapshots', [
            'status'            => 'failed',
            'opportunity_score' => null,
        ]);

        $sim = Simulation::where('target_market', 'Candidate_cand_failed_01')->first();
        $this->assertNotNull($sim);

        $snapshot = AnalysisSnapshot::where('simulation_id', $sim->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals('failed', $snapshot->status);
        $this->assertNull($snapshot->opportunity_score);
    }

    public function test_duplicate_submission_within_short_window_is_safely_deduplicated(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'candidate_id'     => 'cand_dedup_01',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'status'           => 'calculated',
            'analyzed_lat'     => -7.9800,
            'analyzed_lng'     => 112.6300,
            'scores'           => [
                'opportunity_score' => 88,
            ],
        ];

        // First submit
        $res1 = $this->postJson('/api/simulations/candidate', $payload);
        $res1->assertStatus(200);

        // Immediate rapid double submit
        $res2 = $this->postJson('/api/simulations/candidate', $payload);
        $res2->assertStatus(200);

        $sim = Simulation::where('target_market', 'Candidate_cand_dedup_01')->first();
        $count = AnalysisSnapshot::where('simulation_id', $sim->id)->count();

        // Must only create 1 snapshot row due to debounce protection
        $this->assertEquals(1, $count);
    }

    public function test_snapshot_data_is_immutable_even_if_current_business_type_config_changes(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'candidate_id'          => 'cand_freeze_01',
            'latitude'              => -7.9800,
            'longitude'             => 112.6300,
            'radius_m'              => 500,
            'business_type_id'      => $this->businessType->id,
            'status'                => 'calculated',
            'competitor_categories' => ['cafe', 'restaurant', 'bakery'],
            'scores'                => [
                'opportunity_score' => 91,
            ],
        ];

        $this->postJson('/api/simulations/candidate', $payload)->assertStatus(200);

        $sim = Simulation::where('target_market', 'Candidate_cand_freeze_01')->first();
        $this->assertNotNull($sim);

        $snapshot = AnalysisSnapshot::where('simulation_id', $sim->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(['cafe', 'restaurant', 'bakery'], $snapshot->competitor_categories);

        // Later, admin updates the business type categories
        $this->businessType->update([
            'competitor_categories' => ['new_category_xyz'],
        ]);

        // Historical snapshot MUST NOT change
        $snapshot->refresh();
        $this->assertEquals(['cafe', 'restaurant', 'bakery'], $snapshot->competitor_categories);
    }

    public function test_reopening_session_restores_snapshots_history_in_json(): void
    {
        Sanctum::actingAs($this->user);

        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Session With Snapshots',
            'description' => "Check snapshots restore [business_id:{$this->business->id}]",
        ]);

        $sim = Simulation::create([
            'session_id'       => $session->id,
            'business_type_id' => $this->businessType->id,
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'target_market'    => 'Candidate_A',
        ]);

        AnalysisSnapshot::create([
            'simulation_id'     => $sim->id,
            'algorithm_version' => '1.0',
            'analyzed_lat'      => -7.9800,
            'analyzed_lng'      => 112.6300,
            'radius_m'          => 500,
            'opportunity_score' => 84,
            'status'            => 'success',
            'data_warnings'     => ['Test warning'],
            'created_at'        => now(),
        ]);

        $response = $this->getJson('/api/simulations/sessions');

        $response->assertStatus(200);
        $sessions = $response->json('data');
        $matching = collect($sessions)->firstWhere('id', $session->id);

        $this->assertNotNull($matching);
        $simData = $matching['simulations'][0];
        $this->assertNotEmpty($simData['snapshots']);
        $this->assertEquals(84, $simData['snapshots'][0]['opportunity_score']);
        $this->assertEquals('1.0', $simData['snapshots'][0]['algorithm_version']);
    }

    public function test_out_of_order_response_for_old_coordinates_marks_status_stale_not_valid(): void
    {
        Sanctum::actingAs($this->user);

        // Candidate location is at Point B (-7.9950, 112.6450)
        // But a slow/delayed network analysis response completes for old Point A (-7.9800, 112.6300)
        $response = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'cand_stale_guard',
            'latitude'         => -7.9950,
            'longitude'        => 112.6450,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'status'           => 'calculated',
            'analyzed_lat'     => -7.9800, // Old coordinates!
            'analyzed_lng'     => 112.6300,
            'scores'           => [
                'opportunity_score' => 95,
            ],
        ]);

        $response->assertStatus(200);

        $sim = Simulation::where('target_market', 'Candidate_cand_stale_guard')->first();
        $this->assertNotNull($sim);

        // Current location is Point B
        $this->assertEquals(-7.9950, $sim->latitude);
        $this->assertEquals(112.6450, $sim->longitude);

        // The current score status MUST be 'stale' because the analyzed coordinates do not match current coordinates
        $this->assertEquals('stale', $sim->score->status);

        // But the historical snapshot correctly records that the analysis was for Point A
        $snapshot = AnalysisSnapshot::where('simulation_id', $sim->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(-7.9800, $snapshot->analyzed_lat);
        $this->assertEquals(112.6300, $snapshot->analyzed_lng);
        $this->assertEquals(95, $snapshot->opportunity_score);
    }

    public function test_candidate_isolation_prevents_cross_candidate_snapshot_leakage(): void
    {
        Sanctum::actingAs($this->user);

        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Candidate Isolation Test Session',
        ]);

        // Candidate A Analysis
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'status'           => 'calculated',
            'scores'           => ['opportunity_score' => 70],
        ])->assertStatus(200);

        // Candidate B Analysis
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'B',
            'latitude'         => -7.9900,
            'longitude'        => 112.6400,
            'radius_m'         => 600,
            'business_type_id' => $this->businessType->id,
            'status'           => 'calculated',
            'scores'           => ['opportunity_score' => 85],
        ])->assertStatus(200);

        $simA = Simulation::where('session_id', $session->id)->where('target_market', 'Candidate_A')->first();
        $simB = Simulation::where('session_id', $session->id)->where('target_market', 'Candidate_B')->first();

        // Snapshots must be completely isolated
        $snapshotsA = AnalysisSnapshot::where('simulation_id', $simA->id)->get();
        $snapshotsB = AnalysisSnapshot::where('simulation_id', $simB->id)->get();

        $this->assertCount(1, $snapshotsA);
        $this->assertCount(1, $snapshotsB);

        $this->assertEquals(70, $snapshotsA[0]->opportunity_score);
        $this->assertEquals(85, $snapshotsB[0]->opportunity_score);
    }
}
