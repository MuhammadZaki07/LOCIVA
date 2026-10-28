<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Simulation;
use App\Models\SimulationSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CandidatePersistenceTest extends TestCase
{
    protected User $user;
    protected BusinessType $businessType;
    protected Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::first() ?? User::factory()->create();
        $this->businessType = BusinessType::first();

        // Create or get user's business
        $this->business = Business::firstOrCreate(
            [
                'user_id'          => $this->user->id,
                'business_type_id' => $this->businessType->id,
            ],
            [
                'name'        => 'Usaha Kopi Uji Persistensi',
                'description' => 'Business for testing candidate persistence',
                'latitude'    => -7.9797,
                'longitude'   => 112.6304,
                'is_demo'     => false,
            ]
        );
    }

    public function test_can_create_persistent_draft_candidate_when_adding_candidate(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'candidate_id'     => 'cand_alpha_01',
            'latitude'         => -7.9810,
            'longitude'        => 112.6320,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'business_id'      => $this->business->id,
            'status'           => 'draft',
            'session_name'     => 'Simulasi Sesi Draft Alpha',
        ];

        $response = $this->postJson('/api/simulations/candidate', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.candidate_id', 'cand_alpha_01')
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('simulations', [
            'target_market' => 'Candidate_cand_alpha_01',
            'latitude'      => -7.9810,
            'longitude'     => 112.6320,
            'radius_m'      => 500,
        ]);

        $simulation = Simulation::where('target_market', 'Candidate_cand_alpha_01')->first();
        $this->assertNotNull($simulation);
        $this->assertEquals('draft', $simulation->score?->status);
    }

    public function test_supports_more_than_three_candidates_without_arbitrary_limit(): void
    {
        Sanctum::actingAs($this->user);

        // Create session
        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Multi Candidate Session',
            'description' => "Testing unlimited candidates [business_id:{$this->business->id}]",
        ]);

        // Add 5 candidates: A, B, C, D, E
        $candidateTags = ['A', 'B', 'C', 'D', 'E'];
        foreach ($candidateTags as $index => $tag) {
            $response = $this->postJson('/api/simulations/candidate', [
                'session_id'       => $session->id,
                'candidate_id'     => $tag,
                'latitude'         => -7.9800 + ($index * 0.001),
                'longitude'        => 112.6300 + ($index * 0.001),
                'radius_m'         => 450,
                'business_type_id' => $this->businessType->id,
                'business_id'      => $this->business->id,
                'status'           => 'draft',
            ]);

            $response->assertStatus(200)
                ->assertJsonPath('data.candidate_id', $tag);
        }

        // Verify all 5 candidates exist in database under this session
        $simulationsCount = Simulation::where('session_id', $session->id)->count();
        $this->assertEquals(5, $simulationsCount);
    }

    public function test_candidate_coordinate_update_does_not_overwrite_other_candidate(): void
    {
        Sanctum::actingAs($this->user);

        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Isolation Session',
            'description' => 'Test candidate isolation',
        ]);

        // Create Candidate A
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9500,
            'longitude'        => 112.6000,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
        ])->assertStatus(200);

        // Create Candidate B
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'B',
            'latitude'         => -7.9600,
            'longitude'        => 112.6100,
            'radius_m'         => 600,
            'business_type_id' => $this->businessType->id,
        ])->assertStatus(200);

        // Update Candidate A coordinates
        $this->postJson('/api/simulations/candidate', [
            'session_id'       => $session->id,
            'candidate_id'     => 'A',
            'latitude'         => -7.9555,
            'longitude'        => 112.6055,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
        ])->assertStatus(200);

        // Candidate A should have updated coordinates
        $simA = Simulation::where('session_id', $session->id)
            ->where('target_market', 'Candidate_A')
            ->first();
        $this->assertEquals(-7.9555, $simA->latitude);
        $this->assertEquals(112.6055, $simA->longitude);

        // Candidate B MUST remain untouched
        $simB = Simulation::where('session_id', $session->id)
            ->where('target_market', 'Candidate_B')
            ->first();
        $this->assertEquals(-7.9600, $simB->latitude);
        $this->assertEquals(112.6100, $simB->longitude);
    }

    public function test_user_cannot_save_candidate_associated_with_another_users_business(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id'          => $otherUser->id,
            'business_type_id' => $this->businessType->id,
            'name'             => 'Bisnis Milik Orang Lain',
            'latitude'         => -6.2000,
            'longitude'        => 106.8000,
        ]);

        Sanctum::actingAs($this->user);

        // Trying to save candidate linking to another user's business
        $response = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'X',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
            'business_id'      => $otherBusiness->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_reopening_session_restores_saved_candidates_and_business_id(): void
    {
        Sanctum::actingAs($this->user);

        $session = SimulationSession::create([
            'user_id'     => $this->user->id,
            'name'        => 'Restore Check Session',
            'description' => "Restoring test [business_id:{$this->business->id}]",
        ]);

        Simulation::create([
            'session_id'       => $session->id,
            'business_type_id' => $this->businessType->id,
            'latitude'         => -7.9711,
            'longitude'        => 112.6311,
            'radius_m'         => 500,
            'target_market'    => 'Candidate_A',
        ]);

        Simulation::create([
            'session_id'       => $session->id,
            'business_type_id' => $this->businessType->id,
            'latitude'         => -7.9722,
            'longitude'        => 112.6322,
            'radius_m'         => 600,
            'target_market'    => 'Candidate_B',
        ]);

        $response = $this->getJson('/api/simulations/sessions?per_page=100&search=' . urlencode($session->name));

        $response->assertStatus(200);
        $sessions = $response->json('data');

        $matching = collect($sessions)->firstWhere('id', $session->id);
        $this->assertNotNull($matching);
        $this->assertEquals($this->business->id, $matching['business_id']);
        $this->assertCount(2, $matching['simulations']);

        $candidateIds = collect($matching['simulations'])->pluck('candidate_id')->all();
        $this->assertContains('A', $candidateIds);
        $this->assertContains('B', $candidateIds);
    }

    public function test_coordinate_validation_fails_on_invalid_ranges(): void
    {
        Sanctum::actingAs($this->user);

        // Invalid Latitude > 90
        $resLat = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'A',
            'latitude'         => 99.9999,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
        ]);
        $resLat->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);

        // Invalid Longitude > 180
        $resLng = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 200.0000,
            'radius_m'         => 500,
            'business_type_id' => $this->businessType->id,
        ]);
        $resLng->assertStatus(422)
            ->assertJsonValidationErrors(['longitude']);

        // Invalid radius < 50
        $resRadius = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 10,
            'business_type_id' => $this->businessType->id,
        ]);
        $resRadius->assertStatus(422)
            ->assertJsonValidationErrors(['radius_m']);
    }
}

