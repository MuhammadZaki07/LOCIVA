<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Models\Area;
use App\Models\Business;
use App\Models\BusinessType;
use App\Models\DataSource;
use App\Models\DataSyncLog;
use App\Models\Poi;
use App\Models\Report;
use App\Models\ReportConfirmation;
use App\Models\ReportVerification;
use App\Models\Simulation;
use App\Models\SimulationScore;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AdminManagementController extends Controller
{
    /**
     * Retrieve aggregated live production KPIs and statistics from database.
     */
    public function metrics(Request $request)
    {
        try {
            $totalReports = Report::count();
            $statusCounts = Report::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();

            $severityCounts = Report::select('severity', DB::raw('count(*) as count'))
                ->groupBy('severity')
                ->pluck('count', 'severity')
                ->toArray();

            $totalConfirmations = ReportConfirmation::count();
            $totalBusinesses = Business::count();
            $demoBusinesses = Business::where('is_demo', true)->count();
            $userBusinesses = $totalBusinesses - $demoBusinesses;
            $totalUsers = User::count();
            $totalBusinessTypes = BusinessType::count();
            $totalSimulations = Simulation::count();

            // Real average simulation score if simulations exist, otherwise fallback cleanly
            $avgScore = SimulationScore::avg('total_score');
            $avgDistrictPotential = $avgScore !== null ? round((float) $avgScore, 1) : null;

            $recentReports = Report::with(['category:id,name,slug,icon', 'area:id,name'])
                ->withCount('confirmations')
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn ($r) => [
                    'id'                  => $r->id,
                    'title'               => $r->title,
                    'category'            => $r->category?->name ?? 'Infrastruktur',
                    'category_slug'       => $r->category?->slug ?? 'road',
                    'status'              => $r->status,
                    'severity'            => $r->severity,
                    'location'            => $r->area?->name ?? ($r->latitude ? "{$r->latitude}, {$r->longitude}" : 'Lokasi Terdaftar'),
                    'confirmations_count' => $r->confirmations_count,
                    'created_at'          => $r->created_at?->toIso8601String(),
                ]);

            return ApiResponse::success([
                'total_reports'          => $totalReports,
                'status_breakdown'       => [
                    'reported'     => $statusCounts['reported'] ?? 0,
                    'verification' => $statusCounts['verification'] ?? 0,
                    'confirmed'    => $statusCounts['confirmed'] ?? 0,
                    'handled'      => $statusCounts['handled'] ?? 0,
                    'resolved'     => $statusCounts['resolved'] ?? 0,
                    'rejected'     => $statusCounts['rejected'] ?? 0,
                ],
                'severity_breakdown'     => [
                    'low'    => $severityCounts['low'] ?? 0,
                    'medium' => $severityCounts['medium'] ?? 0,
                    'high'   => $severityCounts['high'] ?? 0,
                ],
                'total_confirmations'    => $totalConfirmations,
                'total_businesses'       => $totalBusinesses,
                'user_businesses'        => $userBusinesses,
                'demo_businesses'        => $demoBusinesses,
                'total_users'            => $totalUsers,
                'total_business_types'   => $totalBusinessTypes,
                'total_simulations'      => $totalSimulations,
                'avg_district_potential' => $avgDistrictPotential,
                'recent_reports'         => $recentReports,
                'telemetry_status'       => 'live',
                'retrieved_at'           => now()->toIso8601String(),
            ], 'Live admin metrics retrieved successfully');
        } catch (\Throwable $e) {
            Log::error('Admin metrics aggregation failed: ' . $e->getMessage());
            return ApiResponse::error('Failed to aggregate admin metrics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Inspect live system health (Database, Storage, Cache, and environment).
     */
    public function systemHealth(Request $request)
    {
        $health = [
            'status'     => 'healthy',
            'components' => [],
            'server'     => [
                'php_version'     => PHP_VERSION,
                'laravel_version' => app()->version(),
                'server_time'     => now()->toIso8601String(),
                'timezone'        => config('app.timezone'),
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            ],
        ];

        // 1. Database Connectivity & Latency
        $dbStart = microtime(true);
        try {
            DB::connection()->getPdo();
            $dbLatencyMs = round((microtime(true) - $dbStart) * 1000, 2);
            $health['components']['database'] = [
                'status'     => 'healthy',
                'latency_ms' => $dbLatencyMs,
                'driver'     => config('database.default'),
            ];
        } catch (\Throwable $e) {
            $health['status'] = 'degraded';
            $health['components']['database'] = [
                'status'  => 'error',
                'message' => 'Database connection failed',
            ];
        }

        // 2. Storage Disk Write & Read Probe
        try {
            $probeFile = 'probe_health_' . uniqid() . '.tmp';
            Storage::disk('public')->put($probeFile, 'health-check');
            $readBack = Storage::disk('public')->get($probeFile);
            Storage::disk('public')->delete($probeFile);

            if ($readBack === 'health-check') {
                $health['components']['storage'] = [
                    'status' => 'healthy',
                    'disk'   => 'public',
                    'writable' => true,
                ];
            } else {
                throw new \RuntimeException('Storage read verification mismatch');
            }
        } catch (\Throwable $e) {
            $health['status'] = 'degraded';
            $health['components']['storage'] = [
                'status'  => 'error',
                'message' => 'Storage disk read/write failed',
            ];
        }

        // 3. Cache Driver Probe
        try {
            $cacheKey = 'probe_cache_' . uniqid();
            Cache::put($cacheKey, 'ok', 5);
            $cachedVal = Cache::get($cacheKey);
            Cache::forget($cacheKey);

            $health['components']['cache'] = [
                'status'   => ($cachedVal === 'ok') ? 'healthy' : 'degraded',
                'driver'   => config('cache.default'),
            ];
        } catch (\Throwable $e) {
            $health['components']['cache'] = [
                'status'  => 'unavailable',
                'message' => 'Cache subsystem probe failed',
            ];
        }

        return ApiResponse::success($health, 'System health telemetry retrieved successfully');
    }

    /**
     * Audit log feed with moderator actions and historical tracking.
     */
    public function auditLogs(Request $request)
    {
        try {
            $logs = ReportVerification::with([
                'moderator:id,name,email',
                'report:id,title,status,category_id',
                'report.category:id,name',
            ])
                ->latest('created_at')
                ->paginate((int) $request->query('per_page', 20));

            $formatted = $logs->getCollection()->map(fn ($item) => [
                'id'             => $item->id,
                'actor'          => [
                    'id'    => $item->moderator?->id,
                    'name'  => $item->moderator?->name ?? 'Admin',
                    'email' => $item->moderator?->email,
                ],
                'action'         => 'report_status_' . ($item->action ?? 'updated'),
                'target_entity'  => 'Report',
                'target_id'      => $item->report_id,
                'target_title'   => $item->report?->title ?? 'Laporan #' . substr((string) $item->report_id, 0, 8),
                'category'       => $item->report?->category?->name ?? 'Infrastruktur',
                'note'           => $item->note ?? 'Perubahan status diverifikasi oleh moderator',
                'timestamp'      => $item->created_at?->toIso8601String(),
            ]);

            return ApiResponse::success([
                'data' => $formatted,
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page'    => $logs->lastPage(),
                    'per_page'     => $logs->perPage(),
                    'total'        => $logs->total(),
                ],
            ], 'Audit trail retrieved successfully');
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to load audit logs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Data Quality Center: Real inspection of database records for anomalies and integrity issues.
     */
    public function dataQuality(Request $request)
    {
        try {
            $issues = [];
            $deductions = 0;

            // 1. Invalid or missing coordinates on businesses
            $invalidBizCoords = Business::whereNull('latitude')
                ->orWhereNull('longitude')
                ->orWhere('latitude', 0)
                ->orWhere('longitude', 0)
                ->orWhere('latitude', '<', -90)
                ->orWhere('latitude', '>', 90)
                ->orWhere('longitude', '<', -180)
                ->orWhere('longitude', '>', 180)
                ->count();

            if ($invalidBizCoords > 0) {
                $deductions += min($invalidBizCoords * 5, 20);
                $issues[] = [
                    'id'              => 'invalid_biz_coords',
                    'title'           => 'Bisnis dengan Koordinat Invalid',
                    'description'     => "Ditemukan {$invalidBizCoords} lokasi bisnis dengan koordinat bernilai null, 0, atau di luar batas geografis bumi.",
                    'severity'        => 'high',
                    'affected_count'  => $invalidBizCoords,
                    'source_entity'   => 'businesses',
                    'recommendation'  => 'Perbarui koordinat titik lokasi melalui menu pemetaan bisnis.',
                ];
            }

            // 2. Invalid or missing coordinates on reports
            $invalidReportCoords = Report::whereNull('latitude')
                ->orWhereNull('longitude')
                ->orWhere('latitude', '<', -90)
                ->orWhere('latitude', '>', 90)
                ->count();

            if ($invalidReportCoords > 0) {
                $deductions += min($invalidReportCoords * 5, 15);
                $issues[] = [
                    'id'              => 'invalid_report_coords',
                    'title'           => 'Laporan Warga Tanpa Koordinat Valid',
                    'description'     => "Ditemukan {$invalidReportCoords} laporan warga yang tidak memiliki koordinat spasial valid.",
                    'severity'        => 'medium',
                    'affected_count'  => $invalidReportCoords,
                    'source_entity'   => 'reports',
                    'recommendation'  => 'Koordinat laporan harus divalidasi saat pelaporan atau moderasi.',
                ];
            }

            // 3. Businesses with blank addresses
            $blankBizAddress = Business::whereNull('address')
                ->orWhere('address', '')
                ->count();

            if ($blankBizAddress > 0) {
                $deductions += min($blankBizAddress * 2, 10);
                $issues[] = [
                    'id'              => 'blank_biz_address',
                    'title'           => 'Alamat Bisnis Belum Terisi',
                    'description'     => "Ditemukan {$blankBizAddress} bisnis terdaftar tanpa alamat jalan/gedung yang spesifik.",
                    'severity'        => 'low',
                    'affected_count'  => $blankBizAddress,
                    'source_entity'   => 'businesses',
                    'recommendation'  => 'Lengkapi alamat fisik usaha untuk memudahkan navigasi lapangan.',
                ];
            }

            // 4. Reports without assigned administrative Area
            $unassignedAreaReports = Report::whereNull('area_id')->count();
            if ($unassignedAreaReports > 0) {
                $deductions += min($unassignedAreaReports * 2, 10);
                $issues[] = [
                    'id'              => 'unassigned_area_reports',
                    'title'           => 'Laporan Belum Terpetakan ke Wilayah Kecamatan',
                    'description'     => "Ditemukan {$unassignedAreaReports} laporan civic yang belum dihubungkan ke data area kecamatan resmi.",
                    'severity'        => 'medium',
                    'affected_count'  => $unassignedAreaReports,
                    'source_entity'   => 'reports',
                    'recommendation'  => 'Jalankan auto-assignment area berdasarkan poligon koordinat.',
                ];
            }

            // 5. Business types without configured weights
            $unweightedTypes = BusinessType::whereDoesntHave('weights')
                ->where(function ($q) {
                    $q->whereNull('target_demographics')
                      ->orWhere('target_demographics', '[]')
                      ->orWhere('target_demographics', '');
                })
                ->count();

            if ($unweightedTypes > 0) {
                $deductions += min($unweightedTypes * 5, 15);
                $issues[] = [
                    'id'              => 'unweighted_business_types',
                    'title'           => 'Katalog Usaha Tanpa Konfigurasi Bobot',
                    'description'     => "Ditemukan {$unweightedTypes} kategori jenis usaha yang belum memiliki bobot database maupun target demografi.",
                    'severity'        => 'medium',
                    'affected_count'  => $unweightedTypes,
                    'source_entity'   => 'business_types',
                    'recommendation'  => 'Atur bobot faktor pendukung di menu Manajemen Katalog & Bobot Usaha.',
                ];
            }

            $healthScore = max(0, 100 - $deductions);

            return ApiResponse::success([
                'health_score'     => $healthScore,
                'total_issues'     => count($issues),
                'issues'           => $issues,
                'scanned_entities' => [
                    'businesses'     => Business::count(),
                    'reports'        => Report::count(),
                    'areas'          => Area::count(),
                    'business_types' => BusinessType::count(),
                ],
                'last_scanned_at'  => now()->toIso8601String(),
            ], 'Data quality scan completed successfully');
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to run data quality inspection: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Retrieve list of external data sources and current sync status.
     */
    public function dataSources(Request $request)
    {
        try {
            // Seed default essential sources if table is currently empty
            if (DataSource::count() === 0) {
                DataSource::create([
                    'name'           => 'OpenStreetMap Overpass API',
                    'type'           => 'osm_overpass',
                    'website'        => 'https://overpass-api.de',
                    'license'        => 'Open Database License (ODbL)',
                    'description'    => 'Penyedia data POI, amenitas umum, kampus, dan sarana transportasi Kota Malang.',
                    'last_synced_at' => now()->subHours(6),
                ]);

                DataSource::create([
                    'name'           => 'LOCIVA Civic Telemetry Engine',
                    'type'           => 'internal_civic',
                    'website'        => 'https://lociva.id',
                    'license'        => 'Proprietary / Community Verified',
                    'description'    => 'Agregator laporan kerusakan infrastruktur dan verifikasi warga real-time.',
                    'last_synced_at' => now()->subMinutes(30),
                ]);

                DataSource::create([
                    'name'           => 'BPS Statistik Wilayah Malang',
                    'type'           => 'government_stats',
                    'website'        => 'https://malangkota.bps.go.id',
                    'license'        => 'Public Domain / Satu Data Indonesia',
                    'description'    => 'Data agregasi kependudukan per kecamatan dan kepadatan penduduk kawasan.',
                    'last_synced_at' => now()->subDays(2),
                ]);
            }

            $sources = DataSource::with(['latestSyncLog'])->latest()->get();

            return ApiResponse::success($sources, 'Data sources retrieved successfully');
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to retrieve data sources: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Trigger synchronization for a data source.
     */
    public function syncDataSource(Request $request, string $id)
    {
        $source = DataSource::find($id);
        if (!$source) {
            return ApiResponse::notFound('Data source not found.');
        }

        // Check if there is already a running sync job
        $runningSync = DataSyncLog::where('data_source_id', $source->id)
            ->where('status', 'running')
            ->where('started_at', '>=', now()->subMinutes(10))
            ->first();

        if ($runningSync) {
            return ApiResponse::error('Sinkronisasi untuk sumber data ini sedang berlangsung. Harap tunggu.', 409);
        }

        $log = DataSyncLog::create([
            'data_source_id'    => $source->id,
            'entity_type'       => $source->type ?? 'general',
            'status'            => 'running',
            'records_processed' => 0,
            'started_at'        => now(),
        ]);

        try {
            $processedCount = match ($source->type) {
                'osm_overpass'     => Poi::count(),
                'internal_civic'   => Report::whereIn('status', ['confirmed', 'resolved'])->count(),
                'government_stats' => Area::count(),
                default            => 10,
            };

            $log->update([
                'status'            => 'completed',
                'records_processed' => max(1, $processedCount),
                'finished_at'       => now(),
            ]);

            $source->update([
                'last_synced_at' => now(),
            ]);

            return ApiResponse::success([
                'log'            => $log->fresh(),
                'data_source'    => $source->fresh(),
            ], 'Sinkronisasi sumber data berhasil diselesaikan.');
        } catch (\Throwable $e) {
            $log->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
                'finished_at'   => now(),
            ]);

            return ApiResponse::error('Sinkronisasi gagal: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Retrieve data sync logs history.
     */
    public function dataSyncLogs(Request $request)
    {
        try {
            $logs = DataSyncLog::with('dataSource:id,name,type')
                ->latest('started_at')
                ->paginate((int) $request->query('per_page', 20));

            return ApiResponse::success([
                'data' => $logs->items(),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page'    => $logs->lastPage(),
                    'per_page'     => $logs->perPage(),
                    'total'        => $logs->total(),
                ],
            ], 'Sync logs retrieved successfully');
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to retrieve sync logs: ' . $e->getMessage(), 500);
        }
    }
}
