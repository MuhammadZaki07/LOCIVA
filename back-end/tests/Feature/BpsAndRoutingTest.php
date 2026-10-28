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

    /**
     * Stage B.6.1 (B6-1): Test that domains endpoint defaults to East Java (3500)
     * and preserves explicit province parameters.
     */
    public function test_bps_domains_defaults_to_east_java_and_preserves_explicit_prov(): void
    {
        $service = app(\App\Services\BpsApiService::class);

        // Reflection to check method default parameter
        $refMethod = new \ReflectionMethod($service, 'getDomains');
        $params = $refMethod->getParameters();
        $this->assertEquals('3500', $params[1]->getDefaultValue(), 'BpsApiService::getDomains default $prov must be 3500 (Jawa Timur)');

        // Controller test with default (no query param)
        $resDefault = $this->getJson('/api/bps/domains');
        $resDefault->assertStatus(200);

        // Controller test with explicit prov query param
        $resExplicit = $this->getJson('/api/bps/domains?prov=3200');
        $resExplicit->assertStatus(200);
    }

    public function test_bps_demographics_for_malang_coordinates(): void
    {
        $response = $this->getJson('/api/bps/demographics?lat=-7.9797&lng=112.6304');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_configured',
                    'status',
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

        $this->assertEquals('supported', $response->json('data.status'));
        $this->assertEquals('Kota Malang', $response->json('data.region_name'));
        $this->assertEquals('3573', $response->json('data.domain_id'));
        $this->assertEquals('Jawa Timur', $response->json('data.province'));
        $this->assertGreaterThan(800000, $response->json('data.population'));
    }

    public function test_bps_demographics_for_bandung_coordinates(): void
    {
        $response = $this->getJson('/api/bps/demographics?lat=-6.9175&lng=107.6191');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_configured',
                    'status',
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

        $this->assertEquals('supported', $response->json('data.status'));
        $this->assertEquals('Kota Bandung', $response->json('data.region_name'));
        $this->assertEquals('3273', $response->json('data.domain_id'));
        $this->assertGreaterThan(1000000, $response->json('data.population'));
    }

    public function test_bps_demographics_for_unsupported_coordinates(): void
    {
        $response = $this->getJson('/api/bps/demographics?lat=0.0&lng=0.0');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_configured',
                    'status',
                    'domain_id',
                    'region_name',
                    'population',
                ],
            ]);

        $this->assertEquals('unsupported_region', $response->json('data.status'));
        $this->assertNull($response->json('data.domain_id'));
        $this->assertNull($response->json('data.population'));
        $this->assertEquals('Wilayah Belum Didukung', $response->json('data.region_name'));
    }

    public function test_bps_map_layer_returns_valid_geojson_structure(): void
    {
        $response = $this->getJson('/api/bps/map-layer');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'type',
                'status',
                'message',
                'metadata' => [
                    'indicator',
                    'unit',
                    'year',
                    'source',
                    'boundaries_available',
                    'region_name',
                    'domain_id',
                    'total_population',
                    'district_statistics',
                    'legend',
                ],
                'features',
            ]);

        $this->assertEquals('FeatureCollection', $response->json('type'));
        $this->assertEquals('ok', $response->json('status'));
        $this->assertTrue($response->json('metadata.boundaries_available'));
        $this->assertEquals('Provinsi Jawa Timur', $response->json('metadata.region_name'));
        $this->assertEquals('3500', $response->json('metadata.domain_id'));
        $this->assertCount(38, $response->json('features'));
    }

    public function test_bps_map_layer_distinguishes_kota_and_kabupaten_malang(): void
    {
        $response = $this->getJson('/api/bps/map-layer');
        $features = $response->json('features');

        $kota = collect($features)->firstWhere('properties.bps_code', '3573');
        $kab  = collect($features)->firstWhere('properties.bps_code', '3507');

        $this->assertNotNull($kota, 'Kota Malang (3573) must exist in Jatim layer');
        $this->assertNotNull($kab, 'Kabupaten Malang (3507) must exist in Jatim layer');

        $this->assertEquals('Kota Malang', $kota['properties']['name']);
        $this->assertEquals('Kabupaten Malang', $kab['properties']['name']);

        // Check geometry and statistical independence
        $this->assertNotEquals($kota['properties']['area_km2'], $kab['properties']['area_km2']);
        $this->assertNotEquals($kota['properties']['population'], $kab['properties']['population']);
        $this->assertNotEquals($kota['properties']['density_per_km2'], $kab['properties']['density_per_km2']);
    }

    public function test_bps_map_layer_district_level_for_kota_malang(): void
    {
        $response = $this->getJson('/api/bps/map-layer?level=district&domain=3573');

        $response->assertStatus(200);
        $this->assertEquals('ok', $response->json('status'));
        $this->assertEquals('Kota Malang', $response->json('metadata.region_name'));
        $this->assertEquals('3573', $response->json('metadata.domain_id'));
        $this->assertCount(5, $response->json('features'));

        $names = collect($response->json('features'))->pluck('properties.name')->toArray();
        $this->assertContains('Kedungkandang', $names);
        $this->assertContains('Sukun', $names);
        $this->assertContains('Klojen', $names);
        $this->assertContains('Blimbing', $names);
        $this->assertContains('Lowokwaru', $names);
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
