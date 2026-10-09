<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessMapTest extends TestCase
{
    public function test_can_retrieve_lociva_internal_businesses_for_map(): void
    {
        $response = $this->getJson('/api/businesses/map');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'latitude',
                        'longitude',
                        'source',
                        'business_type',
                    ],
                ],
            ]);

        $this->assertTrue($response->json('success'));
    }

    public function test_can_filter_businesses_by_category(): void
    {
        $response = $this->getJson('/api/businesses/map?category=kedai-kopi');

        $response->assertStatus(200);
        $data = $response->json('data');

        foreach ($data as $item) {
            $this->assertEquals('kedai-kopi', $item['business_type']['slug']);
        }
    }

    public function test_saving_simulation_requires_authentication(): void
    {
        $response = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'A',
            'latitude'         => -6.2088,
            'longitude'        => 106.8456,
            'radius_m'         => 500,
            'business_type_id' => 'kedai-kopi',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_save_candidate_location_simulation(): void
    {
        $user = User::first() ?? User::factory()->create();
        Sanctum::actingAs($user);

        $businessType = BusinessType::first();

        $payload = [
            'candidate_id'        => 'A',
            'latitude'            => -6.2088,
            'longitude'           => 106.8456,
            'radius_m'            => 600,
            'business_type_id'    => $businessType ? $businessType->id : 'kedai-kopi',
            'session_name'        => 'Simulasi Kedai Kopi Sudirman',
            'location_name'       => 'Titik A Sudirman',
            'scores'              => [
                'opportunity_score'   => 78,
                'competition_score'   => 45,
                'accessibility_score' => 85,
                'data_confidence'     => 70,
            ],
        ];

        $response = $this->postJson('/api/simulations/candidate', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.candidate_id', 'A');

        $this->assertDatabaseHas('simulations', [
            'latitude'  => -6.2088,
            'longitude' => 106.8456,
            'radius_m'  => 600,
        ]);
    }

    public function test_authenticated_user_can_perform_full_business_crud(): void
    {
        $user = User::first() ?? User::factory()->create();
        Sanctum::actingAs($user);

        $businessType = BusinessType::first();

        // 1. Create Business
        $createRes = $this->postJson('/api/businesses', [
            'name'             => 'Kopi Test Otentik',
            'description'      => 'Kedai kopi uji coba CRUD',
            'business_type_id' => $businessType->id,
            'latitude'         => -6.2100,
            'longitude'        => 106.8500,
            'address'          => 'Jl. Rasuna Said No. 12',
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('success', true);
        $bizId = $createRes->json('data.id');

        // 2. Read Detail
        $showRes = $this->getJson("/api/businesses/{$bizId}");
        $showRes->assertStatus(200)
            ->assertJsonPath('data.name', 'Kopi Test Otentik');

        // 3. Update
        $updateRes = $this->putJson("/api/businesses/{$bizId}", [
            'name'        => 'Kopi Test Otentik Updated',
            'description' => 'Deskripsi baru setelah update',
        ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.name', 'Kopi Test Otentik Updated');

        // 4. Delete
        $deleteRes = $this->deleteJson("/api/businesses/{$bizId}");
        $deleteRes->assertStatus(200)
            ->assertJsonPath('success', true);

        // Verify deleted
        $this->getJson("/api/businesses/{$bizId}")->assertStatus(404);
    }

    public function test_non_owner_cannot_modify_or_delete_other_user_business(): void
    {
        $owner = User::first() ?? User::factory()->create();
        $stranger = User::where('id', '!=', $owner->id)->first() ?? User::factory()->create();

        Sanctum::actingAs($owner);
        $businessType = BusinessType::first();

        $createRes = $this->postJson('/api/businesses', [
            'name'             => 'Usaha Milik Owner',
            'business_type_id' => $businessType->id,
            'latitude'         => -6.2100,
            'longitude'        => 106.8500,
        ]);
        $bizId = $createRes->json('data.id');

        // Stranger tries to update
        Sanctum::actingAs($stranger);
        $updateRes = $this->putJson("/api/businesses/{$bizId}", [
            'name' => 'Usaha Diambil Alih',
        ]);
        $updateRes->assertStatus(403);

        // Stranger tries to delete
        $deleteRes = $this->deleteJson("/api/businesses/{$bizId}");
        $deleteRes->assertStatus(403);

        // Clean up by owner
        Sanctum::actingAs($owner);
        $this->deleteJson("/api/businesses/{$bizId}")->assertStatus(200);
    }

    public function test_user_can_delete_their_saved_simulation_session(): void
    {
        $user = User::first() ?? User::factory()->create();
        Sanctum::actingAs($user);
        $businessType = BusinessType::first();

        $saveRes = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'B',
            'latitude'         => -6.2200,
            'longitude'        => 106.8600,
            'radius_m'         => 500,
            'business_type_id' => $businessType->id,
            'session_name'     => 'Sesi Akan Dihapus',
        ]);
        $sessionId = $saveRes->json('data.session_id');

        $deleteRes = $this->deleteJson("/api/simulations/sessions/{$sessionId}");
        $deleteRes->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
