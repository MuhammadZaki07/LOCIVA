<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthRoleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
    }

    public function test_admin_login_returns_token_and_admin_role_attribute(): void
    {
        $admin = User::factory()->create([
            'email'    => 'qa.admin.' . uniqid() . '@example.com',
            'password' => Hash::make('password123'),
        ]);
        $admin->assignRole('admin');

        $response = $this->postJson('/api/auth/login', [
            'email'    => $admin->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonPath('data.user.email', $admin->email);

        $this->assertNotEmpty($response->json('data.token'));

        $admin->forceDelete();
    }

    public function test_regular_user_login_returns_token_and_user_role_attribute(): void
    {
        $user = User::factory()->create([
            'email'    => 'qa.user.' . uniqid() . '@example.com',
            'password' => Hash::make('password123'),
        ]);
        $user->assignRole('user');

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'user')
            ->assertJsonPath('data.user.email', $user->email);

        $this->assertNotEmpty($response->json('data.token'));

        $user->forceDelete();
    }

    public function test_auth_user_endpoint_returns_consistent_role_for_admin_and_user(): void
    {
        // 1. Check Admin Profile
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $adminRes = $this->getJson('/api/auth/user');
        $adminRes->assertStatus(200)
            ->assertJsonPath('data.role', 'admin');

        // 2. Check User Profile
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $userRes = $this->getJson('/api/auth/user');
        $userRes->assertStatus(200)
            ->assertJsonPath('data.role', 'user');

        $admin->forceDelete();
        $user->forceDelete();
    }

    public function test_unassigned_role_user_safely_defaults_to_user_and_cannot_access_admin(): void
    {
        $noRoleUser = User::factory()->create();
        // Do not assign any role
        Sanctum::actingAs($noRoleUser);

        // Role accessor safely falls back to 'user'
        $profileRes = $this->getJson('/api/auth/user');
        $profileRes->assertStatus(200)
            ->assertJsonPath('data.role', 'user');

        // Access to admin route is denied with 403
        $adminRouteRes = $this->getJson('/api/admin/metrics');
        $adminRouteRes->assertStatus(403);

        $noRoleUser->forceDelete();
    }

    public function test_admin_can_access_admin_protected_routes_while_regular_user_receives_403(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $user = User::factory()->create();
        $user->assignRole('user');

        // Admin access succeeds
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/metrics')->assertStatus(200);

        // Regular user access is forbidden
        Sanctum::actingAs($user);
        $this->getJson('/api/admin/metrics')->assertStatus(403);

        $admin->forceDelete();
        $user->forceDelete();
    }

    public function test_invalid_credentials_returns_401(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'nonexistent@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }
}
