<?php

namespace Tests\Feature;

use Tests\TestCase;

class BpsAndRoutingTest extends TestCase
{
    public function test_bps_status_endpoint_returns_valid_structure(): void
    {
        $response = $this->getJson('/api/bps/status');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'is_configured',
                    'provider',
                    'portal_url',
                    'docs_url',
                    'message',
                ],
            ]);
    }

    public function test_bps_domains_endpoint_returns_domains(): void
    {
        $response = $this->getJson('/api/bps/domains');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data',
                ],
            ]);
    }

    public function test_bps_demographics_for_bandung_coordinates(): void
    {
        $response = $this->getJson('/api/bps/demographics?lat=-6.9175&lng=107.6191');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_configured',
                    'domain_id',
                    'region_name',
                    'province',
                    'population',
                    'density_per_km2',
                    'year',
                    'source',
                    'aggregation',
                    'limitations',
                ],
            ]);

        $this->assertEquals('Kota Bandung', $response->json('data.region_name'));
        $this->assertGreaterThan(1000000, $response->json('data.population'));
    }

    public function test_bps_map_layer_returns_valid_geojson_features(): void
    {
        $response = $this->getJson('/api/bps/map-layer');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'type',
                'metadata' => [
                    'indicator',
                    'unit',
                    'year',
                    'source',
                    'legend',
                ],
                'features' => [
                    '*' => [
                        'type',
                        'properties' => [
                            'name',
                            'city',
                            'bps_code',
                            'population',
                            'area_km2',
                            'density_per_km2',
                            'density_category',
                            'color',
                        ],
                        'geometry' => [
                            'type',
                            'coordinates',
                        ],
                    ],
                ],
            ]);

        $this->assertEquals('FeatureCollection', $response->json('type'));
        $this->assertNotEmpty($response->json('features'));
    }

    public function test_routing_status_endpoint_returns_valid_status(): void
    {
        $response = $this->getJson('/api/routing/status');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_configured',
                    'provider',
                    'has_fallback',
                    'fallback_service',
                ],
            ]);
    }

    public function test_routing_calculate_returns_polyline_and_metrics(): void
    {
        $payload = [
            'coordinates' => [
                [107.6191, -6.9175],
                [107.6250, -6.9200],
            ],
            'profile' => 'driving',
        ];

        $response = $this->postJson('/api/routing/calculate', $payload);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'provider',
                    'success',
                    'distance_km',
                    'duration_minutes',
                    'coordinates',
                ],
            ]);

        $this->assertTrue($response->json('data.success'));
        $this->assertNotEmpty($response->json('data.coordinates'));
    }

    public function test_areas_index_endpoint_returns_success(): void
    {
        $response = $this->getJson('/api/areas');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }
}
