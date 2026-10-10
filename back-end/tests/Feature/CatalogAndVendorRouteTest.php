<?php

namespace Tests\Feature;

use App\Models\BusinessType;
use App\Models\User;
use App\Models\VendorRoute;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatalogAndVendorRouteTest extends TestCase
{
    public function test_can_retrieve_business_catalog_from_api(): void
    {
        $response = $this->getJson('/api/business-types');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'slug',
                            'category',
                            'scale',
                            'default_radius_m',
                        ],
                    ],
                ],
            ]);
    }

    public function test_can_retrieve_distinct_catalog_categories(): void
    {
        $response = $this->getJson('/api/business-types/categories');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertNotEmpty($response->json('data'));
    }

    public function test_can_retrieve_public_vendor_routes(): void
    {
        $response = $this->getJson('/api/vendor-routes/public');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'waypoints',
                        'distance',
                        'status',
                    ],
                ],
            ]);
    }

    public function test_authenticated_user_can_create_and_manage_vendor_route(): void
    {
        $user = User::first() ?? User::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            'name'                => 'Rute Uji Coba Bakso Keliling',
            'start_location_name' => 'Titik A',
            'end_location_name'   => 'Titik B',
            'distance'            => 4.2,
            'estimated_duration'  => 30,
            'status'              => 'planned',
            'is_shared'           => true,
            'notes'               => 'Rute uji coba automated test',
            'waypoints'           => [
                ['name' => 'Titik A', 'lat' => -6.2088, 'lng' => 106.8456, 'stop_duration' => 30],
                ['name' => 'Titik B', 'lat' => -6.2150, 'lng' => 106.8500, 'stop_duration' => 45],
            ],
        ];

        $createResponse = $this->postJson('/api/vendor-routes', $payload);

        $createResponse->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Rute Uji Coba Bakso Keliling');

        $routeId = $createResponse->json('data.id');

        // Check index
        $listResponse = $this->getJson('/api/vendor-routes');
        $listResponse->assertStatus(200);

        // Delete route
        $deleteResponse = $this->deleteJson("/api/vendor-routes/{$routeId}");
        $deleteResponse->assertStatus(200);
    }

    public function test_can_get_mobile_vending_recommendations(): void
    {
        $response = $this->getJson('/api/vendor-routes/recommendations?lat=-6.2088&lng=106.8456&radius=5000');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'center',
                    'recommendations',
                    'methodology',
                ],
            ]);
    }
}
