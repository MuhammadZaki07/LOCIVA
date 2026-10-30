<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthGatedMapFeaturesTest extends TestCase
{
    /**
     * Requirement 1: Public unauthenticated users can browse public map data.
     */
    public function test_public_unauthenticated_users_can_browse_public_map_data(): void
    {
        // 1. Public POIs
        $this->getJson('/api/pois?lat=-7.98&lng=112.63&radius=5000')->assertStatus(200);

        // 2. Public POIs bounds
        $this->getJson('/api/pois/bounds?south=-8.0&north=-7.9&west=112.5&east=112.7')->assertStatus(200);

        // 3. Public internal businesses for map
        $this->getJson('/api/businesses/map?lat=-7.98&lng=112.63&radius=5000')->assertStatus(200);

        // 4. Public business types catalog
        $this->getJson('/api/business-types')->assertStatus(200);

        // 5. Public BPS status
        $this->getJson('/api/bps/status')->assertStatus(200);

        // 6. Public civic reports
        $this->getJson('/api/reports')->assertStatus(200);
    }

    /**
     * Requirement 2: Unauthenticated users are strictly rejected from protected write and user-scoped endpoints.
     */
    public function test_unauthenticated_users_cannot_access_protected_features(): void
    {
        // 1. Saving candidate / simulation
        $resSave = $this->postJson('/api/simulations/candidate', [
            'candidate_id'     => 'A',
            'latitude'         => -7.9800,
            'longitude'        => 112.6300,
            'radius_m'         => 500,
            'business_type_id' => 'kedai-kopi',
            'status'           => 'draft',
        ]);
        $resSave->assertStatus(401);

        // 2. Viewing Saved Candidates
        $resSessions = $this->getJson('/api/simulations/sessions');
        $resSessions->assertStatus(401);

        // 3. Deleting Saved Candidates
        $resDelete = $this->deleteJson('/api/simulations/sessions/dummy-session-id');
        $resDelete->assertStatus(401);

        // 4. Creating citizen reports
        $resReport = $this->postJson('/api/reports', [
            'title'       => 'Laporan Tanpa Auth',
            'description' => 'Ini tidak boleh tersimpan',
            'latitude'    => -7.9800,
            'longitude'   => 112.6300,
            'category_id' => 'dummy-cat',
        ]);
        $resReport->assertStatus(401);

        // 5. User vendor routes
        $resRoutes = $this->getJson('/api/vendor-routes');
        $resRoutes->assertStatus(401);

        $resCreateRoute = $this->postJson('/api/vendor-routes', [
            'name'      => 'Rute Tanpa Auth',
            'waypoints' => [],
        ]);
        $resCreateRoute->assertStatus(401);

        // 6. User registered businesses
        $resUserBiz = $this->getJson('/api/businesses/user');
        $resUserBiz->assertStatus(401);
    }

    /**
     * Requirement 5: Authenticated users can successfully access protected features.
     */
    public function test_authenticated_users_can_access_protected_features(): void
    {
        $user = User::first() ?? User::factory()->create();
        Sanctum::actingAs($user);

        // Can access saved candidates sessions
        $resSessions = $this->getJson('/api/simulations/sessions');
        $resSessions->assertStatus(200);

        // Can access user businesses
        $resBiz = $this->getJson('/api/businesses/user');
        $resBiz->assertStatus(200);
    }
}
