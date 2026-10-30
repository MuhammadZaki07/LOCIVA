<?php

namespace App\Services;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\Report;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AiRouteRecommendationService
{
    public function __construct(
        protected OsrmRouteService $osrmService,
        protected GroqRouteService $groqService,
        protected ?BpsApiService $bpsService = null
    ) {
        $this->bpsService = $bpsService ?? new BpsApiService();
    }

    /**
     * Generate, validate, score, and AI-explain circular route recommendations.
     *
     * @param array $input [
     *   'business_type_id' => string,
     *   'starting_point'   => ['latitude' => float, 'longitude' => float],
     *   'constraints'      => [
     *       'max_distance_km'      => float|int (default 8),
     *       'max_duration_minutes' => float|int (default 120),
     *       'travel_mode'          => string (default 'motorcycle'),
     *   ]
     * ]
     * @return array
     */
    public function recommend(array $input): array
    {
        $startLat = (float) ($input['starting_point']['latitude'] ?? $input['starting_point']['lat']);
        $startLng = (float) ($input['starting_point']['longitude'] ?? $input['starting_point']['lng']);

        $maxDistanceKm = (float) ($input['constraints']['max_distance_km'] ?? 8.0);
        $maxDurationMins = (int) ($input['constraints']['max_duration_minutes'] ?? 120);
        $travelMode = (string) ($input['constraints']['travel_mode'] ?? 'motorcycle');

        // Resolve BusinessType
        $typeParam = $input['business_type_id'] ?? $input['business_type'] ?? '';
        $businessType = BusinessType::query()
            ->where('id', $typeParam)
            ->orWhere('slug', $typeParam)
            ->first();

        $businessTypeName = $businessType?->name ?? 'Usaha Keliling';
        $businessTypeSlug = $businessType?->slug ?? 'usaha-keliling';

        // 1. Data Collection: Gather nearby POIs, Businesses, and Citizen Reports
        // Search radius corresponds to maximum direct reach of circular route (~maxDistanceKm / 2.6)
        $searchRadiusMeters = min(8000, max(1500, (int) round(($maxDistanceKm * 1000) / 2.6)));

        $poiCandidates = $this->collectRelevantPois($startLat, $startLng, $searchRadiusMeters, $businessType);
        $competitors = $this->collectCompetitors($startLat, $startLng, $searchRadiusMeters, $businessType);
        $reports = $this->collectNearbyReports($startLat, $startLng, $searchRadiusMeters);

        // 2. Generate 3 Diverse Circular Route Candidates
        $candidates = $this->generateRouteCandidates(
            $startLat,
            $startLng,
            $poiCandidates,
            $competitors,
            $reports,
            $maxDistanceKm,
            $maxDurationMins,
            $businessType
        );

        if (empty($candidates)) {
            // Fallback: Generate minimum viable local circuit around starting point
            $candidates = $this->generateFallbackCircuit(
                $startLat,
                $startLng,
                $poiCandidates,
                $maxDistanceKm,
                $maxDurationMins
            );
        }

        // Sort candidates deterministically by backend score descending
        usort($candidates, fn ($a, $b) => ($b['scores']['total_score'] ?? 0) <=> ($a['scores']['total_score'] ?? 0));

        // 3. Groq AI Interpretation Layer (with deterministic fallback)
        $contextData = [
            'reports_count'     => count($reports),
            'competitors_count' => count($competitors),
            'travel_mode'       => $travelMode,
        ];

        $aiInterpretation = $this->groqService->interpretRoutes($businessTypeName, $candidates, $contextData);

        return [
            'status'             => 'success',
            'business_type'      => [
                'id'   => $businessType?->id,
                'name' => $businessTypeName,
                'slug' => $businessTypeSlug,
            ],
            'starting_point'     => [
                'latitude'  => $startLat,
                'longitude' => $startLng,
            ],
            'constraints'        => [
                'max_distance_km'      => $maxDistanceKm,
                'max_duration_minutes' => $maxDurationMins,
                'travel_mode'          => $travelMode,
            ],
            'recommended_routes' => $candidates,
            'ai_interpretation'  => $aiInterpretation,
            'metadata'           => [
                'data_sources'         => [
                    'internal_poi_count'       => count($poiCandidates),
                    'competitor_count'         => count($competitors),
                    'citizen_reports_verified' => count($reports),
                ],
                'routing_provider'     => 'OSRM Road Network (osm-driving calibrated for urban motorcycle)',
                'is_circular'          => true,
                'generated_at'         => now()->toIso8601String(),
            ],
        ];
    }

    /**
     * Collect and deduplicate relevant POIs around coordinates.
     */
    protected function collectRelevantPois(float $lat, float $lng, int $radiusMeters, ?BusinessType $businessType): Collection
    {
        $cacheKey = "ai_route_pois_" . round($lat, 3) . "_" . round($lng, 3) . "_{$radiusMeters}_" . ($businessType?->slug ?? 'all');

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($lat, $lng, $radiusMeters, $businessType) {
            $latSpan = ($radiusMeters * 1.1) / 111320;
            $lngSpan = ($radiusMeters * 1.1) / (111320 * max(0.01, cos(deg2rad($lat))));

            // Query POIs with bounding box + Haversine distance
            $pois = Poi::whereBetween('latitude', [$lat - $latSpan, $lat + $latSpan])
                ->whereBetween('longitude', [$lng - $lngSpan, $lng + $lngSpan])
                ->selectRaw(
                    'id, name, category, address, latitude, longitude,
                    (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                    [$lat, $lng, $lat]
                )
                ->having('distance', '<=', $radiusMeters)
                ->orderBy('distance')
                ->limit(120)
                ->get();

            // Deduplicate POIs by identical name & very close proximity (< 25m)
            $unique = collect();
            foreach ($pois as $poi) {
                $alreadyExists = $unique->contains(function ($item) use ($poi) {
                    return strcasecmp($item->name, $poi->name) === 0 &&
                        abs($item->latitude - $poi->latitude) < 0.0003 &&
                        abs($item->longitude - $poi->longitude) < 0.0003;
                });

                if (!$alreadyExists) {
                    $unique->push($poi);
                }
            }

            return $unique;
        });
    }

    /**
     * Collect and deduplicate competitor businesses.
     */
    protected function collectCompetitors(float $lat, float $lng, int $radiusMeters, ?BusinessType $businessType): Collection
    {
        $latSpan = ($radiusMeters * 1.1) / 111320;
        $lngSpan = ($radiusMeters * 1.1) / (111320 * max(0.01, cos(deg2rad($lat))));

        $query = Business::whereBetween('latitude', [$lat - $latSpan, $lat + $latSpan])
            ->whereBetween('longitude', [$lng - $lngSpan, $lng + $lngSpan])
            ->selectRaw(
                'id, name, business_type_id, latitude, longitude,
                (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                [$lat, $lng, $lat]
            )
            ->having('distance', '<=', $radiusMeters);

        if ($businessType) {
            $query->where('business_type_id', $businessType->id);
        }

        return $query->limit(60)->get();
    }

    /**
     * Collect verified citizen reports affecting accessibility.
     */
    protected function collectNearbyReports(float $lat, float $lng, int $radiusMeters): Collection
    {
        $latSpan = ($radiusMeters * 1.1) / 111320;
        $lngSpan = ($radiusMeters * 1.1) / (111320 * max(0.01, cos(deg2rad($lat))));

        return Report::whereBetween('latitude', [$lat - $latSpan, $lat + $latSpan])
            ->whereBetween('longitude', [$lng - $lngSpan, $lng + $lngSpan])
            ->whereIn('status', ['confirmed', 'verified', 'in_progress'])
            ->selectRaw(
                'id, title, category_id, severity, latitude, longitude,
                (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                [$lat, $lng, $lat]
            )
            ->having('distance', '<=', $radiusMeters)
            ->limit(40)
            ->get();
    }

    /**
     * Generate circular route candidates across 3 distinct profiles:
     * 1. 'opportunity': High footfall & commercial density focus
     * 2. 'balanced': Optimal geometric balance and diverse stops
     * 3. 'low_competition': Corridors with fewer direct competitors
     */
    protected function generateRouteCandidates(
        float $startLat,
        float $startLng,
        Collection $pois,
        Collection $competitors,
        Collection $reports,
        float $maxDistKm,
        int $maxDurMins,
        ?BusinessType $businessType
    ): array
    {
        if ($pois->count() < 2) {
            return [];
        }

        $profiles = [
            [
                'id'          => 'route_opportunity',
                'name'        => 'Rute Peluang Maksimal',
                'profile'     => 'opportunity',
                'description' => 'Memaksimalkan kunjungan ke titik keramaian pejalan kaki tertinggi (kampus, sekolah, pasar).',
            ],
            [
                'id'          => 'route_balanced',
                'name'        => 'Rute Komunitas Seimbang',
                'profile'     => 'balanced',
                'description' => 'Kombinasi merata antara fasilitas publik, area hunian, dan kemudahan aksesibilitas jalan.',
            ],
            [
                'id'          => 'route_low_competition',
                'name'        => 'Rute Minim Kompetisi',
                'profile'     => 'low_competition',
                'description' => 'Melewati koridor alternatif dengan tingkat kejenuhan pedagang sejenis lebih rendah.',
            ],
        ];

        $candidates = [];

        foreach ($profiles as $prof) {
            $selectedStops = $this->selectStopsForProfile(
                $startLat,
                $startLng,
                $pois,
                $competitors,
                $prof['profile'],
                $maxDistKm
            );

            if (count($selectedStops) < 2) {
                continue;
            }

            // Sequence stops into an angular non-intersecting circular loop
            $sequencedStops = $this->sequenceCircularStops($startLat, $startLng, $selectedStops);

            // Construct full coordinate array starting and ending at starting point
            $coords = [];
            $coords[] = [$startLng, $startLat];
            foreach ($sequencedStops as $s) {
                $coords[] = [(float) $s['longitude'], (float) $s['latitude']];
            }
            $coords[] = [$startLng, $startLat]; // Return to start!

            // Calculate actual road geometry via OSRM
            $osrmResult = $this->osrmService->calculateRoute($coords, 'driving');

            $distKm = $osrmResult['distance_km'] ?? 0;
            // Calibrate duration for urban motorcycle (approx 28 km/h + 8 mins per intermediate stop)
            $transitMins = round(($distKm / 28) * 60);
            $stopTimeMins = count($sequencedStops) * 8;
            $durationMins = (int) max(15, min($maxDurMins, $transitMins + $stopTimeMins));

            // Validate constraints (with 15% tolerance margin for road network geometry)
            if ($distKm > ($maxDistKm * 1.15)) {
                // Prune farthest stop and recalculate once to fit constraints
                if (count($sequencedStops) > 2) {
                    array_pop($sequencedStops);
                    $coords = [];
                    $coords[] = [$startLng, $startLat];
                    foreach ($sequencedStops as $s) {
                        $coords[] = [(float) $s['longitude'], (float) $s['latitude']];
                    }
                    $coords[] = [$startLng, $startLat];
                    $osrmResult = $this->osrmService->calculateRoute($coords, 'driving');
                    $distKm = $osrmResult['distance_km'] ?? 0;
                    $transitMins = round(($distKm / 28) * 60);
                    $durationMins = (int) max(15, min($maxDurMins, $transitMins + (count($sequencedStops) * 8)));
                }
            }

            // Transform polyline coordinates to [lat, lng] for Leaflet
            $leafletPolyline = array_map(function ($c) {
                return [(float) $c[1], (float) $c[0]];
            }, $osrmResult['coordinates'] ?? []);

            // Score candidate objectively
            $scores = $this->scoreRouteCandidate(
                $sequencedStops,
                $competitors,
                $reports,
                $distKm,
                $maxDistKm,
                $prof['profile'],
                $businessType
            );

            $candidates[] = [
                'id'                 => $prof['id'],
                'name'               => $prof['name'],
                'profile'            => $prof['profile'],
                'description'        => $prof['description'],
                'is_circular'        => true,
                'distance_km'        => $distKm,
                'duration_minutes'   => $durationMins,
                'scores'             => $scores,
                'start_point'        => [
                    'name'      => 'Titik Awal (Pusat Keberangkatan)',
                    'latitude'  => $startLat,
                    'longitude' => $startLng,
                ],
                'stops'              => array_map(function ($s, $idx) {
                    return [
                        'stop_number'     => $idx + 1,
                        'id'              => $s['id'],
                        'name'            => $s['name'],
                        'category'        => $s['category'] ?? 'poi',
                        'latitude'        => (float) $s['latitude'],
                        'longitude'       => (float) $s['longitude'],
                        'relevance_score' => $s['relevance_score'] ?? 80,
                        'suggested_stay'  => '10-15 menit',
                    ];
                }, $sequencedStops, array_keys($sequencedStops)),
                'route_coordinates'  => $leafletPolyline,
            ];
        }

        return $candidates;
    }

    /**
     * Filter and select POI subset tailored to profile.
     */
    protected function selectStopsForProfile(
        float $startLat,
        float $startLng,
        Collection $pois,
        Collection $competitors,
        string $profile,
        float $maxDistKm
    ): array {
        $scoredPois = $pois->map(function ($poi) use ($profile, $competitors, $startLat, $startLng) {
            $cat = strtolower($poi->category ?? '');
            
            $affinity = match ($cat) {
                'university', 'campus', 'college' => 95,
                'school', 'kindergarten'          => 90,
                'transit_station', 'bus_stop'     => 92,
                'market', 'marketplace'           => 88,
                'office', 'commercial'            => 82,
                'food', 'restaurant', 'cafe'      => 75,
                default                           => 70,
            };

            // Calculate competitors near this POI (within 200m)
            $compNear = $competitors->filter(function ($c) use ($poi) {
                return $this->haversineDistance($poi->latitude, $poi->longitude, $c->latitude, $c->longitude) <= 200;
            })->count();

            $distFromStart = (float) $poi->distance;

            $suitability = match ($profile) {
                'opportunity'     => $affinity * 1.2 - ($distFromStart / 200),
                'low_competition' => $affinity - ($compNear * 25) + 30,
                default           => $affinity - ($compNear * 10) - ($distFromStart / 300),
            };

            return [
                'id'              => $poi->id,
                'name'            => $poi->name,
                'category'        => $poi->category,
                'latitude'        => $poi->latitude,
                'longitude'       => $poi->longitude,
                'distance'        => $distFromStart,
                'relevance_score' => $affinity,
                'suitability'     => $suitability,
                'competitor_near' => $compNear,
            ];
        });

        // Filter and pick 3 to 5 well-spaced stops
        $sorted = $scoredPois->sortByDesc('suitability')->values();
        $selected = [];

        foreach ($sorted as $candidate) {
            if (count($selected) >= 4) {
                break;
            }

            // Ensure spacing of at least 350m between stops to prevent redundant clusters
            $tooClose = false;
            foreach ($selected as $chosen) {
                if ($this->haversineDistance($candidate['latitude'], $candidate['longitude'], $chosen['latitude'], $chosen['longitude']) < 350) {
                    $tooClose = true;
                    break;
                }
            }

            if (!$tooClose) {
                $selected[] = $candidate;
            }
        }

        return $selected;
    }

    /**
     * Sequence intermediate stops into a smooth circular loop around starting point.
     * Uses polar angle from start coordinates so the path flows radially without zigzags.
     */
    protected function sequenceCircularStops(float $startLat, float $startLng, array $stops): array
    {
        usort($stops, function ($a, $b) use ($startLat, $startLng) {
            $angleA = atan2($a['latitude'] - $startLat, $a['longitude'] - $startLng);
            $angleB = atan2($b['latitude'] - $startLat, $b['longitude'] - $startLng);
            return $angleA <=> $angleB;
        });

        return $stops;
    }

    /**
     * Compute objective backend score breakdown across the 5 required dimensions:
     * 1. Business Relevance: 30%
     * 2. Activity / Demographic Potential: 20%
     * 3. Road Accessibility: 20%
     * 4. Competition Opportunity: 15%
     * 5. Route Efficiency: 15%
     */
    protected function scoreRouteCandidate(
        array $stops,
        Collection $competitors,
        Collection $reports,
        float $distKm,
        float $maxDistKm,
        string $profile,
        ?BusinessType $businessType
    ): array {
        // 1. Business Relevance (30%)
        $relevanceAvg = !empty($stops)
            ? array_sum(array_column($stops, 'relevance_score')) / count($stops)
            : 70;
        $businessRelevance = (int) round(min(100, max(40, $relevanceAvg)));

        // 2. Activity / Demographic Potential (20%)
        $highActivityCount = count(array_filter($stops, fn ($s) => in_array(strtolower($s['category'] ?? ''), ['university', 'campus', 'school', 'market', 'transit_station'])));
        $activityPotential = (int) round(min(100, 60 + ($highActivityCount * 10)));

        // 3. Road Accessibility (20%)
        // Check if stops or route are affected by severe citizen reports
        $disruptions = 0;
        foreach ($stops as $s) {
            $hasReport = $reports->contains(function ($r) use ($s) {
                return $this->haversineDistance($s['latitude'], $s['longitude'], $r->latitude, $r->longitude) <= 150;
            });
            if ($hasReport) {
                $disruptions++;
            }
        }
        $roadAccessibility = (int) round(max(30, min(100, 95 - ($disruptions * 15))));

        // 4. Competition Opportunity (15%)
        $totalCompetitorsNearStops = 0;
        foreach ($stops as $s) {
            $totalCompetitorsNearStops += ($s['competitor_near'] ?? 0);
        }
        $competitionOpportunity = match (true) {
            $totalCompetitorsNearStops <= 1 => 95,
            $totalCompetitorsNearStops <= 3 => 85,
            $totalCompetitorsNearStops <= 5 => 72,
            default                         => 58,
        };

        // 5. Route Efficiency (15%)
        // Circular loop efficiency: reasonable ratio between displacement and road distance
        $distRatio = $maxDistKm > 0 ? ($distKm / $maxDistKm) : 1.0;
        $routeEfficiency = match (true) {
            $distRatio >= 0.4 && $distRatio <= 0.95 => 92,
            $distRatio < 0.4                        => 80,
            default                                 => 70,
        };

        // Total weighted score (100% max)
        $totalScore = (int) round(
            ($businessRelevance * 0.30) +
            ($activityPotential * 0.20) +
            ($roadAccessibility * 0.20) +
            ($competitionOpportunity * 0.15) +
            ($routeEfficiency * 0.15)
        );

        return [
            'total_score'             => $totalScore,
            'business_relevance'      => $businessRelevance,
            'activity_potential'      => $activityPotential,
            'road_accessibility'     => $roadAccessibility,
            'competition_opportunity' => $competitionOpportunity,
            'route_efficiency'        => $routeEfficiency,
        ];
    }

    /**
     * Fallback minimal circuit generator when POI count is sparse.
     */
    protected function generateFallbackCircuit(
        float $startLat,
        float $startLng,
        Collection $pois,
        float $maxDistKm,
        int $maxDurMins
    ): array {
        $radiusOffset = min(0.015, ($maxDistKm / 111) * 0.35);

        // Compass cardinal offsets around start
        $fallbackStops = [
            ['name' => 'Koridor Aktivitas Timur', 'category' => 'commercial', 'latitude' => $startLat, 'longitude' => $startLng + $radiusOffset],
            ['name' => 'Koridor Fasilitas Utara', 'category' => 'public', 'latitude' => $startLat + $radiusOffset, 'longitude' => $startLng + ($radiusOffset * 0.4)],
            ['name' => 'Koridor Komunitas Barat', 'category' => 'residential', 'latitude' => $startLat + ($radiusOffset * 0.3), 'longitude' => $startLng - ($radiusOffset * 0.6)],
        ];

        $coords = [
            [$startLng, $startLat],
            [$fallbackStops[0]['longitude'], $fallbackStops[0]['latitude']],
            [$fallbackStops[1]['longitude'], $fallbackStops[1]['latitude']],
            [$fallbackStops[2]['longitude'], $fallbackStops[2]['latitude']],
            [$startLng, $startLat],
        ];

        $osrmResult = $this->osrmService->calculateRoute($coords, 'driving');
        $leafletPolyline = array_map(fn ($c) => [(float) $c[1], (float) $c[0]], $osrmResult['coordinates'] ?? []);
        $distKm = $osrmResult['distance_km'] ?? 3.5;

        return [
            [
                'id'                 => 'route_balanced',
                'name'               => 'Rute Sirkular Standar',
                'profile'            => 'balanced',
                'description'        => 'Rute sirkular dasar mengitari koridor utama terdekat dari titik awal Anda.',
                'is_circular'        => true,
                'distance_km'        => $distKm,
                'duration_minutes'   => (int) min($maxDurMins, max(20, round(($distKm / 28) * 60) + 24)),
                'scores'             => [
                    'total_score'             => 78,
                    'business_relevance'      => 75,
                    'activity_potential'      => 76,
                    'road_accessibility'     => 85,
                    'competition_opportunity' => 80,
                    'route_efficiency'        => 82,
                ],
                'start_point'        => [
                    'name'      => 'Titik Awal (Pusat Keberangkatan)',
                    'latitude'  => $startLat,
                    'longitude' => $startLng,
                ],
                'stops'              => array_map(function ($s, $idx) {
                    return [
                        'stop_number'     => $idx + 1,
                        'id'              => 'fallback_stop_' . ($idx + 1),
                        'name'            => $s['name'],
                        'category'        => $s['category'],
                        'latitude'        => $s['latitude'],
                        'longitude'       => $s['longitude'],
                        'relevance_score' => 75,
                        'suggested_stay'  => '10 menit',
                    ];
                }, $fallbackStops, array_keys($fallbackStops)),
                'route_coordinates'  => $leafletPolyline,
            ],
        ];
    }

    /**
     * Approximate Haversine distance in meters between two lat/lng pairs.
     */
    protected function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * $earth * asin(min(1.0, sqrt($h)));
    }
}
