<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\ReportCategory;
use App\Models\ReportMedia;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportMediaUploadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
    }

    private function createReportForUser(User $user): Report
    {
        $category = ReportCategory::first() ?? ReportCategory::create([
            'name' => 'Kategori Media QA',
            'slug' => 'media-qa-' . uniqid(),
            'icon' => 'camera',
            'color' => '#3b82f6',
        ]);

        return Report::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'title' => 'Laporan Uji Media',
            'description' => 'Pengujian upload gambar laporan',
            'latitude' => -7.978000,
            'longitude' => 112.634000,
            'status' => 'reported',
            'severity' => 'low',
            'occurred_at' => now(),
        ]);
    }

    public function test_valid_media_upload_persists_metadata_and_accessible_url(): void
    {
        $owner = User::factory()->create();
        $owner->assignRole('user');
        Sanctum::actingAs($owner);

        $report = $this->createReportForUser($owner);

        $file = UploadedFile::fake()->image('bukti_jalan.jpg', 800, 600)->size(1024); // 1 MB valid

        $response = $this->postJson("/api/reports/{$report->id}/media", [
            'images' => [$file],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $mediaItem = $data[0];

        $this->assertEquals($report->id, $mediaItem['report_id']);
        $this->assertEquals('image/jpeg', $mediaItem['file_type']);
        $this->assertNotNull($mediaItem['url']);
        $this->assertStringContainsString('storage/', $mediaItem['url']);

        // Check file was saved in public storage
        Storage::disk('public')->assertExists($mediaItem['file_path']);

        // Assert database record exists
        $this->assertDatabaseHas('report_media', [
            'id' => $mediaItem['id'],
            'report_id' => $report->id,
            'file_path' => $mediaItem['file_path'],
        ]);
    }

    public function test_oversized_file_is_rejected(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $report = $this->createReportForUser($owner);

        // Max is 5120 KB (5 MB). Create 6000 KB file
        $oversizedFile = UploadedFile::fake()->image('large.jpg')->size(6000);

        $response = $this->postJson("/api/reports/{$report->id}/media", [
            'images' => [$oversizedFile],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['images.0']);
    }

    public function test_invalid_mime_type_is_rejected(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $report = $this->createReportForUser($owner);

        // Create PDF instead of image
        $pdfFile = UploadedFile::fake()->create('dokumen.pdf', 500, 'application/pdf');

        $response = $this->postJson("/api/reports/{$report->id}/media", [
            'images' => [$pdfFile],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['images.0']);
    }

    public function test_exceeding_max_files_limit_is_rejected(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $report = $this->createReportForUser($owner);

        // Limit is 5 images, send 6
        $sixFiles = [];
        for ($i = 1; $i <= 6; $i++) {
            $sixFiles[] = UploadedFile::fake()->image("foto_{$i}.jpg")->size(200);
        }

        $response = $this->postJson("/api/reports/{$report->id}/media", [
            'images' => $sixFiles,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['images']);
    }

    public function test_unauthorized_user_cannot_upload_media_to_other_user_report(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $stranger->assignRole('user');

        $report = $this->createReportForUser($owner);

        Sanctum::actingAs($stranger);

        $file = UploadedFile::fake()->image('iseng.jpg')->size(500);

        $response = $this->postJson("/api/reports/{$report->id}/media", [
            'images' => [$file],
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_upload_media_to_any_report(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $report = $this->createReportForUser($owner);

        Sanctum::actingAs($admin);

        $file = UploadedFile::fake()->image('admin_evidence.png')->size(500);

        $response = $this->postJson("/api/reports/{$report->id}/media", [
            'images' => [$file],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);
    }
}
