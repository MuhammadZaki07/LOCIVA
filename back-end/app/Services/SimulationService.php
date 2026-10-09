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

            if (!$session) {
                $sessionName = $payload['session_name'] ?? ('Sesi Simulasi ' . now()->translatedFormat('d M Y H:i'));
                $session = SimulationSession::create([
                    'user_id'     => $userId,
                    'name'        => $sessionName,
                    'description' => $payload['session_description'] ?? 'Analisis komparasi lokasi UMKM',
                ]);
            }

            // Resolve Business Type
            $businessType = null;
            if (!empty($payload['business_type_id'])) {
                $businessType = BusinessType::where('id', $payload['business_type_id'])
                    ->orWhere('slug', $payload['business_type_id'])
                    ->first();
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

            // If score metrics are supplied, persist simulation score
            if (isset($payload['scores']) && is_array($payload['scores'])) {
                $scores = $payload['scores'];
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
                        'status'                   => 'calculated',
                    ]
                );
            }

            return [
                'session_id'    => $session->id,
                'session_name'  => $session->name,
                'simulation_id' => $simulation->id,
                'candidate_id'  => $candidateTag,
                'latitude'      => (float) $simulation->latitude,
                'longitude'     => (float) $simulation->longitude,
                'radius_m'      => $simulation->radius_m,
                'business_type' => [
                    'id'   => $businessType->id,
                    'name' => $businessType->name,
                    'slug' => $businessType->slug,
                ],
                'saved_at'      => $simulation->updated_at->toIso8601String(),
            ];
        });
    }

    public function getUserSimulationSessions(string $userId): Collection
    {
        return SimulationSession::with([
            'simulations.businessType:id,name,slug',
            'simulations.location:id,name,address',
            'simulations.score',
        ])
        ->where('user_id', $userId)
        ->latest()
        ->get();
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
