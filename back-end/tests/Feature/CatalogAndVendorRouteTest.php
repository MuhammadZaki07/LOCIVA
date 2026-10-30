<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\User;
use App\Models\VendorRoute;
use Illuminate\Support\Facades\Http;
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

    public function test_ai_plan_route_validates_input(): void
    {
        $response = $this->postJson('/api/vendor-routes/ai-plan', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['prompt', 'candidates']);
    }

    public function test_ai_plan_route_successful_response(): void
    {
        Http::fake([
            '*' => Http::response([
                'message' => [
                    'role'    => 'assistant',
                    'content' => '{"route_name": "Rute Kampus & Stasiun", "explanation": "Jalur ramai.", "waypoint_ids": ["c1", "c2"]}',
                ],
            ], 200),
        ]);

        $payload = [
            'prompt'     => 'Rute ramai sore hari',
            'candidates' => [
                ['id' => 'c1', 'name' => 'Titik Awal', 'lat' => -7.97, 'lng' => 112.63],
                ['id' => 'c2', 'name' => 'Stasiun Malang', 'lat' => -7.98, 'lng' => 112.64],
            ],
        ];

        $response = $this->postJson('/api/vendor-routes/ai-plan', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.raw_content', '{"route_name": "Rute Kampus & Stasiun", "explanation": "Jalur ramai.", "waypoint_ids": ["c1", "c2"]}');
    }

    public function test_ai_plan_route_handles_cloudflare_524_timeout(): void
    {
        Http::fake([
            '*' => Http::response('<!DOCTYPE html><html><title>524 A timeout occurred</title></html>', 524),
        ]);

        $payload = [
            'prompt'     => 'Rute sore',
            'candidates' => [
                ['id' => 'c1', 'name' => 'Titik A', 'lat' => -7.97, 'lng' => 112.63],
                ['id' => 'c2', 'name' => 'Titik B', 'lat' => -7.98, 'lng' => 112.64],
            ],
        ];

        $response = $this->postJson('/api/vendor-routes/ai-plan', $payload);

        $response->assertStatus(504)
            ->assertJsonPath('success', false)
            ->assertSee('timeout');
    }

    public function test_ai_plan_route_handles_upstream_502_error(): void
    {
        Http::fake([
            '*' => Http::response('Bad Gateway', 502),
        ]);

        $payload = [
            'prompt'     => 'Rute sore',
            'candidates' => [
                ['id' => 'c1', 'name' => 'Titik A', 'lat' => -7.97, 'lng' => 112.63],
                ['id' => 'c2', 'name' => 'Titik B', 'lat' => -7.98, 'lng' => 112.64],
            ],
        ];

        $response = $this->postJson('/api/vendor-routes/ai-plan', $payload);

        $response->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    public function test_ai_plan_route_area_analysis_successful_workflow(): void
    {
        $user = User::factory()->create();
        $bizType = BusinessType::first() ?? BusinessType::create([
            'name' => 'Kuliner Keliling',
            'slug' => 'kuliner-keliling',
        ]);

        $business = Business::create([
            'user_id'          => $user->id,
            'business_type_id' => $bizType->id,
            'name'             => 'Bakso Cak Man',
            'latitude'         => -7.9666,
            'longitude'        => 112.6326,
            'address'          => 'Jl. Suhat No. 10',
        ]);

        Poi::create([
            'name'      => 'Kampus UB Pusat',
            'category'  => 'university',
            'latitude'  => -7.9525,
            'longitude' => 112.6142,
            'address'   => 'Jl. Veteran Malang',
        ]);

        Http::fake([
            '*/api/chat' => Http::response([
                'message' => [
                    'role'    => 'assistant',
                    'content' => json_encode([
                        'route_name' => 'Rute Kuliner Kampus Suhat',
                        'start_point' => [
                            'id' => 'biz-' . $business->id,
                            'reason' => 'Titik keberangkatan dari pangkalan Bakso Cak Man.',
                        ],
                        'recommended_waypoints' => [
                            [
                                'id' => 'osm-school-1',
                                'reason' => 'Titik ramai jam pulang sekolah.',
                                'stop_duration_minutes' => 30,
                            ],
                        ],
                        'end_point' => [
                            'id' => 'osm-market-1',
                            'reason' => 'Titik singgah sore di pasar kuliner.',
                        ],
                        'explanation' => 'Rute menghubungkan pangkalan usaha menuju titik ramai mahasiswa dan pasar.',
                        'analysis_factors' => [
                            [
                                'factor' => 'Arus Pejalan Kaki',
                                'finding' => 'Tingginya aktivitas sekitar sekolah dan pasar.',
                                'impact_on_route' => 'Rute diarahkan melintasi koridor utama.',
                            ],
                        ],
                    ]),
                ],
            ], 200),
            '*/route/*' => Http::response([
                'routes' => [
                    [
                        'distance' => 3500,
                        'duration' => 600,
                        'geometry' => [
                            'coordinates' => [
                                [112.6326, -7.9666],
                                [112.62, -7.96],
                                [112.6142, -7.9525],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $payload = [
            'business_id'     => (string) $business->id,
            'center'          => ['lat' => -7.9666, 'lng' => 112.6326],
            'radius_meters'   => 3000,
            'external_places' => [
                [
                    'id'       => 'school-1',
                    'name'     => 'SMAN 1 Malang',
                    'category' => 'school',
                    'lat'      => -7.965,
                    'lng'      => 112.630,
                ],
                [
                    'id'       => 'market-1',
                    'name'     => 'Pasar Senggol Suhat',
                    'category' => 'market',
                    'lat'      => -7.960,
                    'lng'      => 112.628,
                ],
            ],
            'prompt'          => 'Rute siang menjelang sore',
        ];

        $response = $this->postJson('/api/vendor-routes/ai-plan', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'route_name',
                    'selected_business' => ['id', 'name', 'business_type'],
                    'analysis_area' => ['center' => ['lat', 'lng'], 'radius_meters'],
                    'start_point' => ['id', 'source', 'name', 'lat', 'lng', 'reason'],
                    'recommended_waypoints' => [
                        '*' => ['id', 'source', 'name', 'lat', 'lng', 'reason'],
                    ],
                    'end_point' => ['id', 'source', 'name', 'lat', 'lng', 'reason'],
                    'explanation',
                    'analysis_factors' => [
                        '*' => ['factor', 'finding', 'impact_on_route'],
                    ],
                    'route_metrics' => ['distance_meters', 'duration_seconds'],
                ],
            ]);
    }

    public function test_ai_plan_route_returns_insufficient_data_error_when_under_two_candidates(): void
    {
        $payload = [
            'center'          => ['lat' => -10.0, 'lng' => 120.0],
            'radius_meters'   => 500,
            'external_places' => [],
        ];

        $response = $this->postJson('/api/vendor-routes/ai-plan', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.insufficient_data', true);
    }
}
