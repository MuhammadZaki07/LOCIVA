<?php

namespace App\Services;

use App\Contracts\SimulationServiceInterface;
use App\Models\BusinessType;
use App\Models\Location;
use App\Models\Simulation;
use App\Models\SimulationScore;
use App\Models\SimulationSession;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class SimulationService implements SimulationServiceInterface
{
    public function saveCandidateLocation(string $userId, array $payload): array
    {
        return DB::transaction(function () use ($userId, $payload) {
            // Find or create simulation session
            $session = null;
            if (!empty($payload['session_id'])) {
                $session = SimulationSession::where('user_id', $userId)
                    ->where('id', $payload['session_id'])
                    ->first();
            }

            // Optional explicit business association check & resolution
            $business = null;
            if (!empty($payload['business_id'])) {
                if (!empty($payload['business_type_id']) && $payload['business_id'] === $payload['business_type_id']) {
                    $business = \App\Models\Business::where('id', $payload['business_id'])
                        ->where('user_id', $userId)
                        ->first();
                    // If client mistakenly passed catalog type ID as business_id, treat as null (catalog exploration)
                } else {
                    $business = \App\Models\Business::where('id', $payload['business_id'])
                        ->where('user_id', $userId)
                        ->first();

                    if (!$business) {
                        abort(403, 'Objek usaha tidak ditemukan atau Anda tidak memiliki akses ke usaha ini.');
                    }
                }

                if (!$session && $business) {
                    $session = SimulationSession::where('user_id', $userId)
                        ->where('description', 'like', "%[business_id:{$business->id}]%")
                        ->latest()
                        ->first();
                }
            }

            if ($session && $business && !str_contains((string) ($session->description ?? ''), "business_id:{$business->id}")) {
                $session->update([
                    'description' => trim(($session->description ?? '') . " [business_id:{$business->id}]"),
                ]);
            }

            if (!$session) {
                $sessionName = $payload['session_name']
                    ?? ($business ? ('Simulasi ' . $business->name) : ('Sesi Simulasi ' . now()->translatedFormat('d M Y H:i')));

                $description = $payload['session_description'] ?? 'Analisis komparasi lokasi UMKM';
                if ($business && empty($payload['session_description'])) {
                    $description = "Analisis komparasi lokasi UMKM untuk usaha: {$business->name} [business_id:{$business->id}]";
                } elseif ($business && !str_contains($description, "business_id:{$business->id}")) {
                    $description .= " [business_id:{$business->id}]";
                }

                $session = SimulationSession::create([
                    'user_id'     => $userId,
                    'name'        => $sessionName,
                    'description' => $description,
                ]);
            }

            // Resolve Business Type
            $businessType = null;
            if (!empty($payload['business_type_id'])) {
                $businessType = BusinessType::where('id', $payload['business_type_id'])
                    ->orWhere('slug', $payload['business_type_id'])
                    ->first();
            } elseif ($business && $business->business_type_id) {
                $businessType = $business->businessType;
            }

            if (!$businessType) {
                abort(422, 'Jenis usaha tidak ditemukan. Pilih katalog yang valid sebelum menyimpan kandidat.');
            }

            // Create or update location record if needed
            $locationId = null;
            if (!empty($payload['address']) || !empty($payload['location_name'])) {
                $loc = Location::create([
                    'name'      => $payload['location_name'] ?? ('Titik Kandidat ' . ($payload['candidate_id'] ?? 'A')),
                    'address'   => $payload['address'] ?? null,
                    'latitude'  => (float) $payload['latitude'],
                    'longitude' => (float) $payload['longitude'],
                ]);
                $locationId = $loc->id;
            }

            $candidateTag = $payload['candidate_id'] ?? 'A';

            // Find existing simulation for this candidate in this session, or create
            $simulation = Simulation::updateOrCreate(
                [
                    'session_id'       => $session->id,
                    'target_market'    => "Candidate_{$candidateTag}",
                ],
                [
                    'business_type_id' => $businessType->id,
                    'location_id'      => $locationId,
                    'latitude'         => (float) $payload['latitude'],
                    'longitude'        => (float) $payload['longitude'],
                    'radius_m'         => (int) ($payload['radius_m'] ?? $businessType->default_radius_m ?? 500),
                ]
            );

            // If score metrics are supplied, persist simulation score and record append-only snapshot
            if (isset($payload['scores']) && is_array($payload['scores'])) {
                $scores = $payload['scores'];
                $status = $payload['status'] ?? (($payload['analysis_completeness'] ?? null) === 'partial' ? 'partial' : 'calculated');

                $analyzedLat = isset($payload['analyzed_lat']) ? (float) $payload['analyzed_lat'] : (float) $payload['latitude'];
                $analyzedLng = isset($payload['analyzed_lng']) ? (float) $payload['analyzed_lng'] : (float) $payload['longitude'];
                $radiusM     = (int) ($payload['radius_m'] ?? $simulation->radius_m);
                $oppScore    = isset($scores['opportunity_score']) ? (int) $scores['opportunity_score'] : (isset($scores['total_score']) ? (int) $scores['total_score'] : null);

                // Coordinate match guard: Prevent out-of-order responses for old coordinates from marking the current location as valid
                $isCoordMatch = (abs((float) $payload['latitude'] - $analyzedLat) < 0.0001) &&
                    (abs((float) $payload['longitude'] - $analyzedLng) < 0.0001);
                $finalScoreStatus = $isCoordMatch ? $status : 'stale';

                SimulationScore::updateOrCreate(
                    ['simulation_id' => $simulation->id],
                    [
                        'population_score'         => $scores['population_score'] ?? null,
                        'pedestrian_score'         => $scores['pedestrian_score'] ?? null,
                        'accessibility_score'      => $scores['accessibility_score'] ?? null,
                        'target_market_score'      => $scores['opportunity_score'] ?? $scores['target_market_score'] ?? null,
                        'competition_score'        => $scores['competition_score'] ?? null,
                        'area_compatibility_score' => $scores['area_compatibility_score'] ?? null,
                        'total_score'              => $scores['total_score'] ?? $scores['opportunity_score'] ?? null,
                        'status'                   => $finalScoreStatus,
                    ]
                );

                // Duplicate submission protection: avoid duplicate snapshot if submitted within 2s
                $recentDuplicate = \App\Models\AnalysisSnapshot::where('simulation_id', $simulation->id)
                    ->where('analyzed_lat', $analyzedLat)
                    ->where('analyzed_lng', $analyzedLng)
                    ->where('radius_m', $radiusM)
                    ->where('opportunity_score', $oppScore)
                    ->where('created_at', '>=', now()->subSeconds(2))
                    ->first();

                if (!$recentDuplicate) {
                    \App\Models\AnalysisSnapshot::create([
                        'simulation_id'         => $simulation->id,
                        'algorithm_version'     => $payload['algorithm_version'] ?? '1.0',
                        'analyzed_lat'          => $analyzedLat,
                        'analyzed_lng'          => $analyzedLng,
                        'radius_m'              => $radiusM,
                        'business_type_slug'    => $businessType->slug,
                        'opportunity_score'     => $oppScore,
                        'competition_score'     => isset($scores['competition_score']) ? (int) $scores['competition_score'] : null,
                        'accessibility_score'   => isset($scores['accessibility_score']) ? (int) $scores['accessibility_score'] : null,
                        'data_confidence'       => isset($scores['data_confidence']) ? (int) $scores['data_confidence'] : null,
                        'competitor_count'      => isset($payload['competitor_count']) ? (int) $payload['competitor_count'] : null,
                        'report_count'          => isset($payload['report_count']) ? (int) $payload['report_count'] : null,
                        'competitor_categories' => $payload['competitor_categories'] ?? $businessType->competitor_categories ?? null,
                        'weights_snapshot'      => $payload['weights_snapshot'] ?? null,
                        'sources_snapshot'      => $payload['sources_snapshot'] ?? $payload['sources'] ?? null,
                        'data_warnings'         => $payload['data_warnings'] ?? null,
                        'factors'               => $payload['factors'] ?? null,
                        'limitations'           => $payload['limitations'] ?? null,
                        'status'                => in_array($status, ['failed', 'partial', 'success'], true) ? $status : 'success',
                        'analyzed_at'           => !empty($payload['analyzed_at']) ? \Carbon\Carbon::parse($payload['analyzed_at']) : now(),
                        'created_at'            => now(),
                    ]);
                }
            } elseif (!empty($payload['status']) && $payload['status'] === 'failed') {
                // Record explicit failed analysis attempt in history
                $analyzedLat = isset($payload['analyzed_lat']) ? (float) $payload['analyzed_lat'] : (float) $payload['latitude'];
                $analyzedLng = isset($payload['analyzed_lng']) ? (float) $payload['analyzed_lng'] : (float) $payload['longitude'];
                $radiusM     = (int) ($payload['radius_m'] ?? $simulation->radius_m);

                \App\Models\AnalysisSnapshot::create([
                    'simulation_id'         => $simulation->id,
                    'algorithm_version'     => $payload['algorithm_version'] ?? '1.0',
                    'analyzed_lat'          => $analyzedLat,
                    'analyzed_lng'          => $analyzedLng,
                    'radius_m'              => $radiusM,
                    'business_type_slug'    => $businessType->slug,
                    'opportunity_score'     => null,
                    'competition_score'     => null,
                    'accessibility_score'   => null,
                    'data_confidence'       => 0,
                    'competitor_count'      => $payload['competitor_count'] ?? 0,
                    'report_count'          => $payload['report_count'] ?? 0,
                    'competitor_categories' => $payload['competitor_categories'] ?? null,
                    'weights_snapshot'      => $payload['weights_snapshot'] ?? null,
                    'sources_snapshot'      => $payload['sources_snapshot'] ?? $payload['sources'] ?? null,
                    'data_warnings'         => $payload['data_warnings'] ?? ['Analisis gagal diproses atau lokasi tidak valid.'],
                    'factors'               => $payload['factors'] ?? [],
                    'limitations'           => $payload['limitations'] ?? null,
                    'status'                => 'failed',
                    'analyzed_at'           => !empty($payload['analyzed_at']) ? \Carbon\Carbon::parse($payload['analyzed_at']) : now(),
                    'created_at'            => now(),
                ]);

                // Update score status to failed
                SimulationScore::updateOrCreate(
                    ['simulation_id' => $simulation->id],
                    ['status' => 'failed']
                );
            } elseif (!empty($payload['status']) && $payload['status'] === 'draft') {
                // Explicit draft candidate record creation
                SimulationScore::updateOrCreate(
                    ['simulation_id' => $simulation->id],
                    [
                        'status' => 'draft',
                    ]
                );
            } else {
                // If coordinates changed without scores, mark score as stale if previously calculated
                $existingScore = SimulationScore::where('simulation_id', $simulation->id)->first();
                if ($existingScore && in_array($existingScore->status, ['calculated', 'analyzed'])) {
                    $existingScore->update(['status' => 'stale']);
                }
            }

            return [
                'session_id'      => $session->id,
                'session_name'    => $session->name,
                'simulation_id'   => $simulation->id,
                'candidate_id'    => $candidateTag,
                'latitude'        => (float) $simulation->latitude,
                'longitude'       => (float) $simulation->longitude,
                'radius_m'        => $simulation->radius_m,
                'status'          => $simulation->score?->status ?? ($payload['status'] ?? 'draft'),
                'business_type'   => [
                    'id'   => $businessType->id,
                    'name' => $businessType->name,
                    'slug' => $businessType->slug,
                ],
                'snapshots_count' => $simulation->snapshots()->count(),
                'latest_snapshot' => $simulation->snapshots()->first(),
                'saved_at'        => $simulation->updated_at->toIso8601String(),
            ];
        });
    }


    public function getUserSimulationSessions(
        string $userId,
        string $search = '',
        int $perPage = 10,
        ?string $businessId = null,
        ?string $businessTypeId = null,
        ?string $status = null
    ): LengthAwarePaginator {
        // Enforce authorization on business_id if supplied
        if (!empty($businessId)) {
            $business = \App\Models\Business::where('id', $businessId)
                ->where('user_id', $userId)
                ->first();

            if (!$business) {
                abort(403, 'Objek usaha tidak ditemukan atau Anda tidak memiliki akses ke usaha ini.');
            }
        }

        $query = SimulationSession::with([
            'simulations.businessType:id,name,slug',
            'simulations.location:id,name,address',
            'simulations.score',
            'simulations.snapshots',
        ])
            ->where('user_id', $userId);

        // Server-side scoping to selected business or business type
        if (!empty($businessId)) {
            $query->where('description', 'like', "%[business_id:{$businessId}]%");
        } elseif (!empty($businessTypeId)) {
            $query->whereHas('simulations', function (Builder $b) use ($businessTypeId) {
                $b->where('business_type_id', $businessTypeId);
            });
        }

        $search = trim($search);

        if ($search !== '') {
            $keyword = '%' . $search . '%';

            $query->where(function (Builder $sessionQuery) use ($keyword) {
                $sessionQuery
                    ->where('name', 'like', $keyword)
                    ->orWhere('description', 'like', $keyword)
                    ->orWhereHas(
                        'simulations',
                        function (Builder $simulationQuery) use ($keyword) {
                            $simulationQuery
                                ->where('target_market', 'like', $keyword)
                                ->orWhereRaw(
                                    'CAST(latitude AS CHAR) LIKE ?',
                                    [$keyword]
                                )
                                ->orWhereRaw(
                                    'CAST(longitude AS CHAR) LIKE ?',
                                    [$keyword]
                                )
                                ->orWhereHas(
                                    'businessType',
                                    function (Builder $typeQuery) use ($keyword) {
                                        $typeQuery
                                            ->where('name', 'like', $keyword)
                                            ->orWhere('slug', 'like', $keyword);
                                    }
                                )
                                ->orWhereHas(
                                    'location',
                                    function (Builder $locationQuery) use ($keyword) {
                                        $locationQuery
                                            ->where('name', 'like', $keyword)
                                            ->orWhere('address', 'like', $keyword);
                                    }
                                );
                        }
                    );
            });
        }

        // Filter Business Type
        if (!empty($businessTypeId)) {
            $query->whereHas(
                'simulations',
                function (Builder $simulationQuery) use ($businessTypeId) {
                    $simulationQuery->where('business_type_id', $businessTypeId);
                }
            );
        }

        // Filter Analysis Status
        if ($status === 'completed') {
            $query->whereHas(
                'simulations.score'
            );
        } elseif ($status === 'pending') {
            $query->whereDoesntHave(
                'simulations.score'
            );
        }

        $perPage = min(max($perPage, 1), 100);

        return $query
            ->latest()
            ->paginate($perPage);
    }


    public function deleteSimulationSession(string $userId, string $sessionId): bool
    {
        $session = SimulationSession::where('user_id', $userId)
            ->where('id', $sessionId)
            ->first();

        if (!$session) {
            abort(404, 'Sesi simulasi tidak ditemukan atau Anda tidak memiliki izin.');
        }

        return (bool) $session->delete();
    }
}
