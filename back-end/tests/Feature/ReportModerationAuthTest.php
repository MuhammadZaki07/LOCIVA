<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\ReportVerification;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportModerationAuthTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
    }

    private function getOrCreateReport(): Report
    {
        $user = User::first() ?? User::factory()->create();
        $category = ReportCategory::first() ?? ReportCategory::create([
            'name' => 'Infrastruktur Jalan',
            'slug' => 'road',
            'icon' => 'road',
            'color' => '#ef4444',
        ]);

        return Report::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'title' => 'Test Report for Moderation',
            'description' => 'Kerusakan jalan untuk pengujian moderasi',
            'latitude' => -7.978000,
            'longitude' => 112.634000,
            'status' => 'reported',
            'severity' => 'medium',
            'occurred_at' => now(),
        ]);
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $report = $this->getOrCreateReport();

        $response = $this->patchJson("/api/reports/{$report->id}/status", [
            'status' => 'confirmed',
            'note' => 'Attempting moderation without auth',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_regular_user_is_forbidden_with_403(): void
    {
        $regularUser = User::factory()->create();
        $regularUser->assignRole('user');

        $report = $this->getOrCreateReport();

        Sanctum::actingAs($regularUser);

        $response = $this->patchJson("/api/reports/{$report->id}/status", [
            'status' => 'confirmed',
            'note' => 'Attempting moderation as regular user',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => false,
                'message' => 'You do not have permission to access this resource.',
            ]);
    }

    public function test_authenticated_admin_can_update_report_status(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $report = $this->getOrCreateReport();

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/reports/{$report->id}/status", [
            'status' => 'confirmed',
            'note' => 'Diverifikasi oleh tim QA Admin',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('report_verifications', [
            'report_id' => $report->id,
            'moderator_id' => $admin->id,
            'action' => 'confirmed',
            'note' => 'Diverifikasi oleh tim QA Admin',
        ]);
    }

    public function test_public_reports_read_access_remains_open(): void
    {
        $report = $this->getOrCreateReport();

        $indexResponse = $this->getJson('/api/reports');
        $indexResponse->assertStatus(200);

        $showResponse = $this->getJson("/api/reports/{$report->id}");
        $showResponse->assertStatus(200);
    }
}
