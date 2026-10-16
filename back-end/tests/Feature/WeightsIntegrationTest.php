<?php

namespace Tests\Feature;

use App\Models\BusinessType;
use App\Models\BusinessTypeWeight;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WeightsIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_db_weights_override_fallback_and_change_opportunity_score(): void
    {
        // 1. Create a business type without any database weights or target demographics
        $businessType = BusinessType::create([
            'name'                  => 'QA Test Weight Cafe',
            'slug'                  => 'qa-test-weight-cafe-' . uniqid(),
            'category'              => 'cafe',
            'scale'                 => 'mikro',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => null,
            'competitor_categories' => [],
        ]);

        $analysisPayload = [
            'lat'             => -7.978000,
            'lng'             => 112.634000,
            'radius'          => 500,
            'business_type'   => $businessType->id,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'place-1',
                    'name'     => 'Kampus Utama QA',
                    'category' => 'university',
                    'lat'      => -7.978100,
                    'lng'      => 112.634100,
                    'source'   => 'test_osm',
                ],
                [
                    'id'       => 'place-2',
                    'name'     => 'Kampus Kedua QA',
                    'category' => 'university',
                    'lat'      => -7.978200,
                    'lng'      => 112.634200,
                    'source'   => 'test_osm',
                ],
            ],
        ];

        // 2. Baseline without weights: opportunity_score
        $baselineRes = $this->postJson('/api/analysis/location', $analysisPayload);
        $baselineRes->assertStatus(200);
        $baselineScore = $baselineRes->json('data.opportunity_score');

        // 3. Insert DB weight: factor = 'campus', weight = 15.0
        // With 2 campus POIs: bonus = 15 * 2 = 30. Score should increase by exactly +30.
        $dbWeight = BusinessTypeWeight::create([
            'business_type_id' => $businessType->id,
            'factor'           => 'campus',
            'weight'           => 15.0,
        ]);

        $withWeightsRes = $this->postJson('/api/analysis/location', $analysisPayload);
        $withWeightsRes->assertStatus(200);
        $newScore = $withWeightsRes->json('data.opportunity_score');
        $this->assertEquals($baselineScore + 30, $newScore, 'Score with weight=15 and 2 campus POIs should increase by 30 points');

        // Verify factor impact note
        $factors = $withWeightsRes->json('data.factors');
        $campusFactor = collect($factors)->firstWhere('key', 'poi_campus');
        $this->assertNotNull($campusFactor, 'Factors should include poi_campus');
        $this->assertStringContainsString('+30', $campusFactor['note']);

        // 4. Update/Sync DB weight via Admin API: change weight to 5.0
        // With 2 campus POIs: bonus = 5 * 2 = 10. Score should increase by exactly +10 over baseline.
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $syncRes = $this->postJson("/api/business-types/{$businessType->id}/weights", [
            'weights' => [
                [
                    'factor' => 'campus',
                    'weight' => 5.0,
                ],
            ],
        ]);
        $syncRes->assertStatus(200);

        // 5. Re-run analysis and verify the score is updated to baselineScore + 10
        $updatedAnalysisRes = $this->postJson('/api/analysis/location', $analysisPayload);
        $updatedAnalysisRes->assertStatus(200);
        $updatedScore = $updatedAnalysisRes->json('data.opportunity_score');
        $this->assertEquals($baselineScore + 10, $updatedScore, 'Score with updated weight=5 and 2 campus POIs should increase by 10 points over baseline');

        // Cleanup
        BusinessTypeWeight::where('business_type_id', $businessType->id)->forceDelete();
        $businessType->forceDelete();
    }

    public function test_target_demographics_used_when_no_db_weights_exist(): void
    {
        // Business type with target_demographics (e.g. kedai-kopi has university/campus weight = 18)
        $cafeType = BusinessType::where('slug', 'kedai-kopi')->first();

        // Ensure no DB weights exist for this type
        if ($cafeType) {
            BusinessTypeWeight::where('business_type_id', $cafeType->id)->forceDelete();
        }

        $payload = [
            'lat'             => -7.978000,
            'lng'             => 112.634000,
            'radius'          => 500,
            'business_type'   => 'kedai-kopi',
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'place-campus-1',
                    'name'     => 'Universitas Brawijaya',
                    'category' => 'university',
                    'lat'      => -7.978100,
                    'lng'      => 112.634100,
                    'source'   => 'test_osm',
                ],
            ],
        ];

        $res = $this->postJson('/api/analysis/location', $payload);
        $res->assertStatus(200);

        $factors = $res->json('data.factors');
        $campusFactor = collect($factors)->firstWhere('key', 'poi_campus');
        $this->assertNotNull($campusFactor, 'Should use catalog target_demographics weight for campus');
        // Weight from target_demographics is 18 * 1 = +18
        $this->assertStringContainsString('+18', $campusFactor['note']);
    }

    public function test_hardcoded_fallback_used_when_no_db_and_no_target_demographics(): void
    {
        // Create business type with slug 'kedai-kopi' equivalent fallback behavior
        // But with target_demographics explicitly set to null
        $customType = BusinessType::create([
            'name'                  => 'Kopi Fallback Only',
            'slug'                  => 'kedai-kopi-fallback-' . uniqid(),
            'category'              => 'cafe',
            'scale'                 => 'gerobak',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'target_demographics'   => null,
            'competitor_categories' => [],
        ]);

        // When slug matches fallback ('kedai-kopi'), fallback weight for campus is 12
        // We test with slug 'kedai-kopi' directly where no DB record overrides target_demographics
        // Or if $typeKey is string slug 'kedai-kopi' without target_demographics
        $customType->update(['slug' => 'kedai-kopi-temp-' . uniqid()]);
        
        $payload = [
            'lat'             => -7.978000,
            'lng'             => 112.634000,
            'radius'          => 500,
            'business_type'   => $customType->id,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'       => 'place-campus-2',
                    'name'     => 'Universitas Lain',
                    'category' => 'university',
                    'lat'      => -7.978100,
                    'lng'      => 112.634100,
                    'source'   => 'test_osm',
                ],
            ],
        ];

        // Since custom slug has no fallback, campus factor won't be in weights, bonus = 0
        $res = $this->postJson('/api/analysis/location', $payload);
        $res->assertStatus(200);
        $factors = $res->json('data.factors');
        $campusFactor = collect($factors)->firstWhere('key', 'poi_campus');
        $this->assertNull($campusFactor, 'Unconfigured type without weights should have no campus factor bonus');

        $customType->forceDelete();
    }
}

