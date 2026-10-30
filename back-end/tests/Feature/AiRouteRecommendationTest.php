<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\Report;
use App\Models\User;
use App\Services\GroqRouteService;
use App\Services\OsrmRouteService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiRouteRecommendationTest extends TestCase
{
    protected User $user;
    protected BusinessType $businessType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::firstOrCreate(
            ['email' => 'route_tester@lociva.id'],
            [
                'name'     => 'Route Tester',
                'password' => bcrypt('password123'),
                'role'     => 'user',
            ]
        );

        $this->businessType = BusinessType::firstOrCreate(
            ['slug' => 'gerobak-cilok'],
            [
                'name'                  => 'Gerobak Cilok',
                'category'              => 'food',
                'default_radius_m'      => 800,
                'min_radius_m'          => 200,
                'max_radius_m'          => 3000,
                'is_active'             => true,
                'target_demographics'   => ['school', 'campus', 'market'],
                'competitor_categories' => ['food', 'restaurant', 'cafe'],
            ]
        );

        // Seed sample test POIs around Malang center if sparse
        Poi::firstOrCreate(
            ['name' => 'SMAN 1 Malang Test'],
            [
                'category'  => 'school',
                'latitude'  => -7.9780,
                'longitude' => 112.6320,
                'address'   => 'Jl. Tugu No. 1 Malang',
            ]
        );

        Poi::firstOrCreate(
            ['name' => 'Universitas Negeri Malang Test'],
            [
                'category'  => 'university',
                'latitude'  => -7.9620,
                'longitude' => 112.6170,
                'address'   => 'Jl. Semarang No. 5 Malang',
            ]
        );

        Poi::firstOrCreate(
            ['name' => 'Pasar Klojen Test'],
            [
                'category'  => 'market',
                'latitude'  => -7.9790,
                'longitude' => 112.6350,
                'address'   => 'Jl. Cokroaminoto Malang',
            ]
        );
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->postJson('/api/ai/routes/recommend', [
            'business_type_id' => $this->businessType->id,
            'starting_point'   => [
                'latitude'  => -7.9797,
                'longitude' => 112.6304,
            ],
        ]);

        $response->assertStatus(401);
    }

    public function test_validation_fails_on_missing_required_fields(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')->postJson('/api/ai/routes/recommend', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['business_type_id', 'starting_point']);
    }

    public function test_generates_valid_circular_routes_starting_and_ending_at_same_point(): void
    {
        $startLat = -7.9797;
        $startLng = 112.6304;

        $response = $this->actingAs($this->user, 'sanctum')->postJson('/api/ai/routes/recommend', [
            'business_type_id' => $this->businessType->id,
            'starting_point'   => [
                'latitude'  => $startLat,
                'longitude' => $startLng,
            ],
            'constraints'      => [
                'max_distance_km'      => 8,
                'max_duration_minutes' => 120,
                'travel_mode'          => 'motorcycle',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'status',
                    'business_type' => ['id', 'name', 'slug'],
                    'starting_point' => ['latitude', 'longitude'],
                    'constraints' => ['max_distance_km', 'max_duration_minutes', 'travel_mode'],
                    'recommended_routes',
                    'ai_interpretation' => [
                        'is_ai_explained',
                        'ai_status',
                        'recommended_route_id',
                        'overall_summary',
                        'routes_analysis',
                    ],
                    'metadata',
                ],
            ]);

        $routes = $response->json('data.recommended_routes');
        $this->assertNotEmpty($routes, 'Must return at least one route recommendation');
        $this->assertLessThanOrEqual(3, count($routes));

        foreach ($routes as $route) {
            $this->assertTrue($route['is_circular'], 'Route must be circular');
            $this->assertEquals($startLat, $route['start_point']['latitude']);
            $this->assertEquals($startLng, $route['start_point']['longitude']);

            // Verify route coordinates form a closed loop (start and finish at start coordinates)
            $poly = $route['route_coordinates'];
            $this->assertNotEmpty($poly);
            $firstCoord = $poly[0];
            $lastCoord = $poly[count($poly) - 1];

            // Start and end must coincide within 50 meters
            $this->assertEqualsWithDelta($firstCoord[0], $lastCoord[0], 0.001);
            $this->assertEqualsWithDelta($firstCoord[1], $lastCoord[1], 0.001);

            // Distance must respect constraint (with 15% road network curvature tolerance)
            $this->assertLessThanOrEqual(8 * 1.15, $route['distance_km']);

            // Score breakdown must contain all 5 required dimensions
            $scores = $route['scores'];
            $this->assertArrayHasKey('total_score', $scores);
            $this->assertArrayHasKey('business_relevance', $scores);
            $this->assertArrayHasKey('activity_potential', $scores);
            $this->assertArrayHasKey('road_accessibility', $scores);
            $this->assertArrayHasKey('competition_opportunity', $scores);
            $this->assertArrayHasKey('route_efficiency', $scores);

            $this->assertGreaterThanOrEqual(0, $scores['total_score']);
            $this->assertLessThanOrEqual(100, $scores['total_score']);
        }
    }

    public function test_deterministic_scoring_and_ranking_is_consistent(): void
    {
        $payload = [
            'business_type_id' => $this->businessType->slug,
            'starting_point'   => [
                'latitude'  => -7.9797,
                'longitude' => 112.6304,
            ],
            'constraints'      => [
                'max_distance_km'      => 6,
                'max_duration_minutes' => 90,
                'travel_mode'          => 'motorcycle',
            ],
        ];

        $res1 = $this->actingAs($this->user, 'sanctum')->postJson('/api/ai/routes/recommend', $payload);
        $res2 = $this->actingAs($this->user, 'sanctum')->postJson('/api/ai/routes/recommend', $payload);

        $res1->assertStatus(200);
        $res2->assertStatus(200);

        $routes1 = $res1->json('data.recommended_routes');
        $routes2 = $res2->json('data.recommended_routes');

        $this->assertEquals(count($routes1), count($routes2));
        $this->assertEquals($routes1[0]['id'], $routes2[0]['id']);
        $this->assertEquals($routes1[0]['scores']['total_score'], $routes2[0]['scores']['total_score']);
    }

    public function test_groq_failure_triggers_safe_deterministic_fallback(): void
    {
        // Mock Groq to fail with HTTP 500
        Http::fake([
            'https://api.groq.com/*' => Http::response(['error' => 'Rate limit exceeded or service unavailable'], 500),
            'https://router.project-osrm.org/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 3200,
                    'duration' => 450,
                    'geometry' => [
                        'coordinates' => [
                            [112.6304, -7.9797],
                            [112.6350, -7.9750],
                            [112.6304, -7.9797],
                        ],
                    ],
                ]],
            ], 200),
        ]);

        $response = $this->actingAs($this->user, 'sanctum')->postJson('/api/ai/routes/recommend', [
            'business_type_id' => $this->businessType->id,
            'starting_point'   => [
                'latitude'  => -7.9797,
                'longitude' => 112.6304,
            ],
        ]);

        $response->assertStatus(200);
        $aiData = $response->json('data.ai_interpretation');

        $this->assertFalse($aiData['is_ai_explained']);
        $this->assertContains($aiData['ai_status'], ['fallback', 'unconfigured', 'api_failed']);
        $this->assertNotEmpty($aiData['overall_summary']);
        $this->assertNotEmpty($aiData['routes_analysis']);

        // The recommended_route_id must match the highest scoring candidate
        $routes = $response->json('data.recommended_routes');
        $this->assertEquals($routes[0]['id'], $aiData['recommended_route_id']);
    }

    public function test_invalid_ai_selected_id_is_safely_sanitized_to_valid_candidate(): void
    {
        $groqService = new class extends GroqRouteService {
            public function isConfigured(): bool
            {
                return true;
            }

            protected function callGroq(string $businessTypeName, array $candidates, array $contextData): ?array
            {
                // Simulate Groq hallucinating an unknown ID "hallucinated_route_999"
                return [
                    'is_ai_explained'      => true,
                    'ai_status'            => 'success',
                    'ai_model'             => 'test-model',
                    'recommended_route_id' => 'hallucinated_route_999',
                    'overall_summary'      => 'Test hallucinated summary',
                    'routes_analysis'      => [],
                ];
            }
        };

        $candidates = [
            ['id' => 'route_opportunity', 'name' => 'Opportunity', 'distance_km' => 5, 'duration_minutes' => 40, 'scores' => ['total_score' => 90]],
            ['id' => 'route_balanced', 'name' => 'Balanced', 'distance_km' => 4, 'duration_minutes' => 35, 'scores' => ['total_score' => 85]],
        ];

        $interpretation = $groqService->interpretRoutes('Gerobak Cilok', $candidates);

        // Must NOT output the hallucinated ID; must fall back to the first valid candidate ID
        $this->assertEquals('route_opportunity', $interpretation['recommended_route_id']);
    }
}
