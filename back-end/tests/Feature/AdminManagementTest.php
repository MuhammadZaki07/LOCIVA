<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\DataSource;
use App\Models\DataSyncLog;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\ReportConfirmation;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        return $admin;
    }

    public function test_unauthenticated_cannot_access_admin_endpoints(): void
    {
        $this->getJson('/api/admin/metrics')->assertStatus(401);
        $this->getJson('/api/admin/system-health')->assertStatus(401);
        $this->getJson('/api/admin/data-quality')->assertStatus(401);
        $this->getJson('/api/admin/data-sources')->assertStatus(401);
        $this->getJson('/api/admin/audit-logs')->assertStatus(401);
    }

    public function test_regular_user_cannot_access_admin_endpoints(): void
    {
        $regularUser = User::factory()->create();
        $regularUser->assignRole('user');
        Sanctum::actingAs($regularUser);

        $this->getJson('/api/admin/metrics')->assertStatus(403);
        $this->getJson('/api/admin/system-health')->assertStatus(403);
        $this->getJson('/api/admin/data-quality')->assertStatus(403);
        $this->getJson('/api/admin/data-sources')->assertStatus(403);
    }

    public function test_admin_can_retrieve_live_production_metrics(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/metrics');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_reports',
                    'status_breakdown' => [
                        'reported',
                        'verification',
                        'confirmed',
                        'handled',
                        'resolved',
                        'rejected',
                    ],
                    'total_confirmations',
                    'total_businesses',
                    'total_users',
                    'total_business_types',
                    'total_simulations',
                    'telemetry_status',
                ],
            ]);

        $this->assertEquals('live', $response->json('data.telemetry_status'));
    }

    public function test_admin_can_inspect_system_health(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/system-health');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'status',
                    'components' => [
                        'database' => ['status'],
                        'storage'  => ['status', 'writable'],
                        'cache'    => ['status'],
                    ],
                    'server' => [
                        'php_version',
                        'laravel_version',
                        'server_time',
                    ],
                ],
            ]);

        $this->assertEquals('healthy', $response->json('data.components.database.status'));
        $this->assertEquals('healthy', $response->json('data.components.storage.status'));
    }

    public function test_admin_can_run_data_quality_inspection(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/data-quality');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'health_score',
                    'total_issues',
                    'issues',
                    'scanned_entities' => [
                        'businesses',
                        'reports',
                    ],
                ],
            ]);

        $this->assertIsInt($response->json('data.health_score'));
        $this->assertGreaterThanOrEqual(0, $response->json('data.health_score'));
        $this->assertLessThanOrEqual(100, $response->json('data.health_score'));
    }

    public function test_admin_can_manage_and_sync_data_sources(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        // 1. List data sources (auto-seeds defaults if empty)
        $listRes = $this->getJson('/api/admin/data-sources');
        $listRes->assertStatus(200);
        $sources = $listRes->json('data');
        $this->assertNotEmpty($sources);

        $firstSourceId = $sources[0]['id'];

        // 2. Trigger synchronization
        $syncRes = $this->postJson("/api/admin/data-sources/{$firstSourceId}/sync");
        $syncRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.log.status', 'completed');

        $this->assertDatabaseHas('data_sync_logs', [
            'data_source_id' => $firstSourceId,
            'status'         => 'completed',
        ]);

        // 3. Retrieve sync history logs
        $logsRes = $this->getJson('/api/admin/data-sync-logs');
        $logsRes->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($logsRes->json('data.data'));
    }

    public function test_last_admin_protection_prevents_lockout(): void
    {
        // 1. Create a dedicated test admin
        $testAdmin = User::factory()->create();
        $testAdmin->assignRole('admin');
        Sanctum::actingAs($testAdmin);

        // 2. Admin cannot demote themselves via toggleUserRole (self-demotion forbidden)
        $selfToggleRes = $this->postJson("/api/admin/users/{$testAdmin->id}/toggle-role");
        $selfToggleRes->assertStatus(400)
            ->assertJsonPath('success', false);

        // 3. Admin cannot delete themselves (self-deletion forbidden)
        $deleteSelfRes = $this->deleteJson("/api/users/{$testAdmin->id}");
        $deleteSelfRes->assertStatus(400)
            ->assertJsonPath('success', false);

        // 4. Test demoting another admin
        $targetAdmin = User::factory()->create();
        $targetAdmin->assignRole('admin');

        // With multiple admins in the system, demoting targetAdmin succeeds
        $toggleTargetRes = $this->postJson("/api/admin/users/{$targetAdmin->id}/toggle-role");
        $toggleTargetRes->assertStatus(200);

        // Cleanup test users
        $testAdmin->forceDelete();
        $targetAdmin->forceDelete();

        // Always ensure canonical seeded admin retains admin role
        $seededAdmin = User::where('email', 'admin@gmail.com')->first();
        if ($seededAdmin && !$seededAdmin->hasRole('admin')) {
            $seededAdmin->assignRole('admin');
        }
    }

    /**
     * Stage B.5: Test Admin Business Catalog competitor categories lifecycle:
     * - Create business type with competitor_categories
     * - Retrieve business type and verify persisted categories
     * - Update business type with modified competitor_categories
     * - Re-retrieve and verify preserved configuration
     * - Verify location analysis engine uses the dynamic categories
     */
    public function test_admin_can_manage_business_type_competitor_categories_end_to_end(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $slug = 'qa-dental-admin-' . uniqid();

        // 1. Create Business Type with custom competitor_categories
        $createRes = $this->postJson('/api/business-types', [
            'name'                  => 'Klinik Gigi Admin QA',
            'slug'                  => $slug,
            'category'              => 'Kesehatan',
            'scale'                 => 'ruko',
            'default_radius_m'      => 500,
            'is_active'             => true,
            'competitor_categories' => ['amenity=dentist', 'dentist'],
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.competitor_categories', ['amenity=dentist', 'dentist']);

        $id = $createRes->json('data.id');

        // 2. Public retrieval returns competitor_categories
        $getRes = $this->getJson("/api/business-types/{$id}");
        $getRes->assertStatus(200)
            ->assertJsonPath('data.competitor_categories', ['amenity=dentist', 'dentist']);

        // 3. Update business type with additional category
        $updateRes = $this->putJson("/api/business-types/{$id}", [
            'name'                  => 'Klinik Gigi Admin QA',
            'competitor_categories' => ['amenity=dentist', 'dentist', 'healthcare:clinic'],
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.competitor_categories', ['amenity=dentist', 'dentist', 'healthcare:clinic']);

        // 4. Verify reopening/retrieving preserves updated configuration
        $reopenRes = $this->getJson("/api/business-types/{$id}");
        $reopenRes->assertStatus(200)
            ->assertJsonPath('data.competitor_categories', ['amenity=dentist', 'dentist', 'healthcare:clinic']);

        // 5. Verify location analysis uses the dynamically updated category
        $analysisRes = $this->postJson('/api/analysis/location', [
            'lat'             => -7.581000,
            'lng'             => 112.981000,
            'radius'          => 500,
            'business_type'   => $slug,
            'candidate_id'    => 'A',
            'external_places' => [
                [
                    'id'           => 'osm-clinic-match',
                    'name'         => 'Klinik Pratama Rawat',
                    'category'     => 'service',
                    'raw_category' => 'healthcare:clinic',
                    'lat'          => -7.581100,
                    'lng'          => 112.981100,
                    'source'       => 'openstreetmap',
                ],
                [
                    'id'           => 'osm-unrelated-bank',
                    'name'         => 'Bank Mandiri',
                    'category'     => 'service',
                    'raw_category' => 'amenity:bank',
                    'lat'          => -7.581200,
                    'lng'          => 112.981200,
                    'source'       => 'openstreetmap',
                ],
            ],
        ]);

        $analysisRes->assertStatus(200);
        $this->assertEquals(1, $analysisRes->json('data.competitor_count'));
        $this->assertEquals('Klinik Pratama Rawat', $analysisRes->json('data.nearest_competitor.name'));

        // Cleanup
        $deleteRes = $this->deleteJson("/api/business-types/{$id}");
        $deleteRes->assertStatus(200);
        $admin->forceDelete();
    }
}
