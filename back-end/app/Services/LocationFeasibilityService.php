<?php

namespace App\Services;

use App\Models\Area;
use App\Models\BusinessType;
use App\Models\Report;
use App\Models\Road;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LocationFeasibilityService
{
    /**
     * Validate coordinate boundaries and numeric validity.
     */
    public function validateCoordinates(mixed $lat, mixed $lng): array
    {
        if (!is_numeric($lat) || !is_numeric($lng)) {
            return [
                'is_valid' => false,
                'error'    => 'Koordinat lintang dan bujur harus berupa nilai numerik.',
            ];
        }

        $lat = (float) $lat;
        $lng = (float) $lng;

        if (is_nan($lat) || is_nan($lng) || is_infinite($lat) || is_infinite($lng)) {
            return [
                'is_valid' => false,
                'error'    => 'Koordinat tidak boleh bernilai NaN atau tak hingga.',
            ];
        }

        if ($lat < -90.0 || $lat > 90.0) {
            return [
                'is_valid' => false,
                'error'    => "Nilai lintang (latitude) {$lat} di luar batas yang valid (-90 hingga 90 derajat).",
            ];
        }

        if ($lng < -180.0 || $lng > 180.0) {
            return [
                'is_valid' => false,
                'error'    => "Nilai bujur (longitude) {$lng} di luar batas yang valid (-180 hingga 180 derajat).",
            ];
        }

        return [
            'is_valid' => true,
            'error'    => null,
            'lat'      => $lat,
            'lng'      => $lng,
        ];
    }

    /**
     * Dimension 1: Assess Geographic Validity (physical terrain, water, boundaries).
     */
    public function assessGeographicValidity(float $lat, float $lng, bool $isWater = false, array $context = []): array
    {
        // 1. Water or offshore detection
        if ($isWater) {
            return [
                'status'          => 'unsuitable',
                'is_water'        => true,
                'terrain'         => 'water',
                'reasons'         => [
                    'Koordinat terdeteksi berada di perairan/laut lepas yang tidak memiliki daratan layak huni.',
                ],
                'data_provenance' => [
                    'source'             => 'geospatial_hydrology_or_user',
                    'has_elevation_data' => false,
                    'has_hydrology_data' => true,
                    'limitations'        => 'Deteksi perairan mengandalkan layer hidrografi spasial dan data masukan koordinat terkonfirmasi.',
                ],
            ];
        }

        // 2. Rural or mountainous terrain check
        // We do NOT assume mountain or rural is unsuitable!
        $isRuralOrSparse = !empty($context['is_sparse']) || (isset($context['poi_total']) && $context['poi_total'] < 3);

        $reasons = [];
        $status = 'valid';

        if ($isRuralOrSparse) {
            $status = 'warning';
            $reasons[] = 'Lokasi berada di kawasan perdesaan atau area dengan kepadatan fasilitas rendah. Bukan berarti terlarang, namun potensi pasar mengandalkan mobilitas lokal.';
        }

        return [
            'status'          => $status,
            'is_water'        => false,
            'terrain'         => $isRuralOrSparse ? 'rural_or_sparse' : 'terrestrial',
            'reasons'         => $reasons,
            'data_provenance' => [
                'source'             => 'lociva_spatial_boundary',
                'has_elevation_data' => false,
                'has_hydrology_data' => true,
                'limitations'        => 'Dataset raster DEM/topografi belum tersedia di database; kemiringan lereng tidak dihitung secara terpisah.',
            ],
        ];
    }

    /**
     * Dimension 2: Assess Road and Accessibility Checks.
     * Distinguishes on-carriageway from roadside proximity, and checks business-type suitability.
     */
    public function assessRoadAccessibility(
        float $lat,
        float $lng,
        ?string $businessScale = null,
        ?string $businessTypeSlug = null
    ): array {
        // Query nearby roads within 150m
        $nearbyRoads = $this->findNearbyRoads($lat, $lng, 150.0);

        if (empty($nearbyRoads)) {
            // Do not treat missing data as proof of safety or prohibition!
            return [
                'status'                   => 'unverified',
                'relationship'             => 'unverified',
                'nearest_road_distance_m'  => null,
                'nearest_road_name'        => null,
                'road_type'                => null,
                'business_type_compatible' => true,
                'notes'                    => [
                    'Data geometri jaringan jalan tidak tersedia di database lokal untuk wilayah ini. Status aksesibilitas fisik belum dapat diverifikasi secara otoritatif.',
                ],
                'data_provenance'          => [
                    'source'              => 'lociva_roads_table',
                    'road_records_found'  => 0,
                    'limitations'         => 'Tabel roads lokal tidak memiliki data geometri pada radius 150 meter dari titik ini.',
                ],
            ];
        }

        // Find closest road
        $closestRoad = null;
        $minDistance = INF;

        foreach ($nearbyRoads as $roadData) {
            if ($roadData['distance'] < $minDistance) {
                $minDistance = $roadData['distance'];
                $closestRoad = $roadData;
            }
        }

        $minDistanceRounded = round($minDistance, 1);
        $roadName = $closestRoad['name'] ?? 'Jalan Tanpa Nama';
        $roadType = $closestRoad['road_type'] ?? 'general';

        // Categorize relationship to road
        // Road carriageway half-width is typically 2.5 - 3.5m
        $relationship = 'near_road';
        if ($minDistance <= 3.0) {
            $relationship = 'on_carriageway';
        } elseif ($minDistance <= 25.0) {
            $relationship = 'roadside';
        } elseif ($minDistance <= 60.0) {
            $relationship = 'near_road';
        } else {
            $relationship = 'distant';
        }

        // Evaluate against business scale and type
        $scale = strtolower($businessScale ?? '');
        $slug  = strtolower($businessTypeSlug ?? '');
        $isGerobak = ($scale === 'gerobak' || str_contains($slug, 'gerobak') || str_contains($slug, 'seblak') || str_contains($slug, 'bakso'));
        $isWarehouse = ($scale === 'warehouse' || str_contains($slug, 'gudang') || str_contains($slug, 'warehouse'));

        $status = 'valid';
        $compatible = true;
        $notes = [];

        if ($relationship === 'on_carriageway') {
            if ($isGerobak) {
                $status = 'warning';
                $compatible = false;
                $notes[] = "Titik berada tepat di badan jalan ({$roadName}, jarak {$minDistanceRounded}m). Berbahaya untuk lapak tetap dan berisiko mengganggu arus lalu lintas kendaraan.";
            } else {
                $status = 'unsuitable';
                $compatible = false;
                $notes[] = "Titik berada tepat di badan jalan aktif ({$roadName}, jarak {$minDistanceRounded}m). Bangunan atau tempat usaha tetap tidak dapat didirikan di atas carriageway kendaraan.";
            }
        } elseif ($relationship === 'roadside') {
            if ($isGerobak) {
                $status = 'valid';
                $compatible = true;
                $notes[] = "Titik berada di tepi jalan/trotoar ({$roadName}, jarak {$minDistanceRounded}m). Sesuai untuk pedagang keliling/gerobak dengan tetap memperhatikan ketertiban trotoar.";
            } else {
                $status = 'valid';
                $compatible = true;
                $notes[] = "Titik memiliki akses tepi jalan langsung ({$roadName}, jarak {$minDistanceRounded}m).";
            }
        } elseif ($relationship === 'near_road') {
            $status = 'valid';
            $compatible = true;
            $notes[] = "Titik berada dekat akses jalan ({$roadName}, jarak {$minDistanceRounded}m).";
        } else { // distant
            if ($isWarehouse) {
                $status = 'unsuitable';
                $compatible = false;
                $notes[] = "Usaha pergudangan/logistik membutuhkan akses langsung ke jalan kendaraan. Titik berjarak {$minDistanceRounded}m dari jalan terdekat ({$roadName}).";
            } else {
                $status = 'warning';
                $compatible = true;
                $notes[] = "Jarak ke jalan terdekat ({$roadName}) cukup jauh ({$minDistanceRounded}m). Aksesibilitas konsumen pejalan kaki atau parkir mungkin terbatas.";
            }
        }

        return [
            'status'                   => $status,
            'relationship'             => $relationship,
            'nearest_road_distance_m'  => $minDistanceRounded,
            'nearest_road_name'        => $roadName,
            'road_type'                => $roadType,
            'business_type_compatible' => $compatible,
            'notes'                    => $notes,
            'data_provenance'          => [
                'source'             => 'lociva_roads_table',
                'road_records_found' => count($nearbyRoads),
                'limitations'        => 'Berdasarkan geometri segmen jalan terdekat di basis data spasial lokal.',
            ],
        ];
    }

    /**
     * Dimension 3: Assess Official Restrictions and Land Use.
     * Reports 'unverified' when authoritative zoning datasets are missing.
     */
    public function assessOfficialRestrictions(float $lat, float $lng, ?string $businessScale = null): array
    {
        $verifiedRestrictions = [];
        $radiusMeters = 150.0;
        $latDelta = $radiusMeters / 111320.0;
        $lngDelta = $radiusMeters / (111320.0 * max(0.01, cos(deg2rad($lat))));

        // 1. Check official restricted zones from Area table (within bbox)
        $restrictedAreas = Area::query()
            ->where(function ($q) {
                $q->whereIn('type', ['restricted_zone', 'protected_area', 'conservation', 'military_zone', 'green_belt'])
                  ->orWhere('name', 'LIKE', '%kawasan steril%')
                  ->orWhere('name', 'LIKE', '%zona merah%')
                  ->orWhere('name', 'LIKE', '%jalur hijau%');
            })
            ->where(function ($q) use ($lat, $lng, $latDelta, $lngDelta) {
                $q->whereBetween('latitude', [$lat - $latDelta, $lat + $latDelta])
                  ->whereBetween('longitude', [$lng - $lngDelta, $lng + $lngDelta])
                  ->orWhereNull('latitude');
            })
            ->get();

        foreach ($restrictedAreas as $area) {
            $dist = null;
            if ($area->latitude !== null && $area->longitude !== null) {
                $dist = $this->haversine($lat, $lng, (float) $area->latitude, (float) $area->longitude);
            }
            // If area centroid within 150m
            if ($dist !== null && $dist <= 150.0) {
                $verifiedRestrictions[] = [
                    'source_type'   => 'area_regulation',
                    'id'            => $area->id,
                    'title'         => $area->name,
                    'description'   => "Area terdaftar sebagai {$area->type} dengan batasan aktivitas usaha.",
                    'severity'      => 'critical',
                    'distance_m'    => round($dist),
                    'recorded_at'   => $area->created_at?->toIso8601String(),
                ];
            }
        }

        // 2. Check verified civic reports indicating official enforcement / trade prohibition (within bbox)
        $securityReports = Report::query()
            ->whereBetween('latitude', [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('longitude', [$lng - $lngDelta, $lng + $lngDelta])
            ->where(function ($q) {
                $q->whereHas('category', function ($sub) {
                    $sub->where('slug', 'security');
                })
                ->orWhere('title', 'LIKE', '%penertiban%')
                ->orWhere('title', 'LIKE', '%larangan berjualan%')
                ->orWhere('title', 'LIKE', '%zona merah%')
                ->orWhere('title', 'LIKE', '%jalur hijau%')
                ->orWhere('title', 'LIKE', '%sterilisasi%')
                ->orWhere('description', 'LIKE', '%penertiban pkl%')
                ->orWhere('description', 'LIKE', '%zona merah larangan%');
            })
            ->whereIn('severity', ['high', 'critical'])
            ->whereNotIn('status', ['dismissed', 'rejected'])
            ->get();

        foreach ($securityReports as $report) {
            $dist = $this->haversine($lat, $lng, (float) $report->latitude, (float) $report->longitude);
            if ($dist <= 150.0) {
                $verifiedRestrictions[] = [
                    'source_type'   => 'civic_enforcement_report',
                    'id'            => $report->id,
                    'title'         => $report->title,
                    'description'   => $report->description ?? 'Laporan penertiban dan larangan usaha terverifikasi.',
                    'severity'      => $report->severity,
                    'distance_m'    => round($dist),
                    'recorded_at'   => $report->occurred_at ? $report->occurred_at->toIso8601String() : $report->created_at?->toIso8601String(),
                ];
            }
        }

        if (!empty($verifiedRestrictions)) {
            $first = $verifiedRestrictions[0];
            return [
                'status'                => 'prohibited',
                'zoning_type'           => 'restricted_enforcement_zone',
                'verified_restrictions' => $verifiedRestrictions,
                'provenance'            => [
                    'source'               => 'lociva_verified_restrictions',
                    'effective_date'       => $first['recorded_at'] ?? now()->toIso8601String(),
                    'coverage_limitations' => 'Diverifikasi berdasarkan data penertiban resmi dan kawasan pembatasan aktif.',
                ],
                'limitations'           => 'Terdapat pembatasan legal atau operasi penertiban aktif yang terverifikasi di koordinat ini.',
            ];
        }

        // No authoritative legal or zoning dataset is available in LOCIVA!
        // We report 'unverified' - NOT 'permitted' or safe!
        return [
            'status'                => 'unverified',
            'zoning_type'           => null,
            'verified_restrictions' => [],
            'provenance'            => [
                'source'               => 'unverified_no_authoritative_zoning_dataset',
                'effective_date'       => null,
                'coverage_limitations' => 'Data resmi RTRW/RDTR tingkat persil belum tersedia di basis data LOCIVA.',
            ],
            'limitations'           => 'Status legalitas zonasi belum terverifikasi secara definitif. Tidak adanya laporan bukan bukti bahwa lokasi bebas izin usaha.',
        ];
    }

    /**
     * Synthesize all dimensions into an overall recommendation.
     * Rule: A high market-potential score must NEVER override a verified hard restriction!
     */
    public function synthesizeRecommendation(
        array $geographic,
        array $roadAccessibility,
        array $legalRestrictions,
        ?float $opportunityScore
    ): array {
        $blockingReasons = [];
        $conditions = [];

        // 1. Hard physical block: open water
        if ($geographic['status'] === 'unsuitable') {
            return [
                'status'           => 'unsuitable',
                'summary'          => 'Lokasi tidak dapat digunakan secara fisik karena berada di area perairan atau laut lepas.',
                'blocking_reasons' => $geographic['reasons'],
                'conditions'       => [],
            ];
        }

        // 2. Hard legal restriction: PROHIBITED
        // Preserves market potential score, but overrides recommendation!
        if ($legalRestrictions['status'] === 'prohibited') {
            foreach ($legalRestrictions['verified_restrictions'] as $r) {
                $blockingReasons[] = "Larangan resmi terverifikasi: {$r['title']} ({$r['description']}).";
            }

            $scoreStr = $opportunityScore !== null ? round($opportunityScore) . '/100' : 'tidak tersedia';
            $summary = "Meskipun skor potensi pasar tercatat {$scoreStr}, lokasi ini TIDAK DAPAT DIREKOMENDASIKAN karena adanya larangan atau penertiban resmi yang terverifikasi.";

            return [
                'status'           => 'prohibited',
                'summary'          => $summary,
                'blocking_reasons' => $blockingReasons,
                'conditions'       => [],
            ];
        }

        // 3. Physical road carriageway or severe accessibility hazard
        if ($roadAccessibility['status'] === 'unsuitable') {
            return [
                'status'           => 'not_recommended',
                'summary'          => 'Lokasi tidak direkomendasikan karena kendala fisik jalan atau ketidaksesuaian operasional dengan jenis usaha.',
                'blocking_reasons' => $roadAccessibility['notes'],
                'conditions'       => [],
            ];
        }

        // 4. Conditional recommendation (warnings present or legal status unverified)
        $isWarning = (
            $roadAccessibility['status'] === 'warning' ||
            $geographic['status'] === 'warning' ||
            $legalRestrictions['status'] === 'unverified'
        );

        if ($legalRestrictions['status'] === 'unverified') {
            $conditions[] = 'Status legalitas zonasi belum terverifikasi secara otomatis. Pengguna disarankan mengonfirmasi izin lokasi kepada aparat lingkungan atau dinas perizinan setempat.';
        }

        if ($roadAccessibility['status'] === 'warning') {
            foreach ($roadAccessibility['notes'] as $n) {
                $conditions[] = $n;
            }
        }

        if ($geographic['status'] === 'warning') {
            foreach ($geographic['reasons'] as $r) {
                $conditions[] = $r;
            }
        }

        if ($isWarning) {
            $summary = ($opportunityScore !== null && $opportunityScore >= 60)
                ? 'Lokasi memiliki potensi pasar yang baik, namun memiliki beberapa catatan kelayakan operasional dan legalitas yang memerlukan konfirmasi.'
                : 'Lokasi berstatus bersyarat (conditional) dengan catatan akses atau keterbatasan data spasial setempat.';

            return [
                'status'           => 'conditional',
                'summary'          => $summary,
                'blocking_reasons' => [],
                'conditions'       => $conditions,
            ];
        }

        // 5. Positive recommendation
        if ($opportunityScore !== null && $opportunityScore >= 60) {
            return [
                'status'           => 'recommended',
                'summary'          => 'Lokasi memenuhi kelayakan fisik, operasional, dan memiliki estimasi potensi pasar yang memadai.',
                'blocking_reasons' => [],
                'conditions'       => [],
            ];
        }

        return [
            'status'           => 'conditional',
            'summary'          => 'Lokasi layak secara fisik namun potensi pasar tergolong moderat.',
            'blocking_reasons' => [],
            'conditions'       => ['Pertimbangkan strategi promosi atau jam operasional untuk meningkatkan keterjangkauan.'],
        ];
    }

    /**
     * Complete feasibility assessment combining all dimensions.
     */
    public function assessFeasibility(
        float $lat,
        float $lng,
        ?BusinessType $businessType,
        string $businessSlug,
        ?float $opportunityScore,
        bool $isWater = false,
        array $context = []
    ): array {
        $scale = $businessType?->scale;

        $geographic = $this->assessGeographicValidity($lat, $lng, $isWater, $context);
        $road       = $this->assessRoadAccessibility($lat, $lng, $scale, $businessSlug);
        $legal      = $this->assessOfficialRestrictions($lat, $lng, $scale);

        $recommendation = $this->synthesizeRecommendation($geographic, $road, $legal, $opportunityScore);

        return [
            'geographic_validity'   => $geographic,
            'road_accessibility'    => $road,
            'legal_restrictions'    => $legal,
            'overall_recommendation' => $recommendation,
        ];
    }

    /**
     * Find nearby roads and compute perpendicular/segment distance.
     */
    protected function findNearbyRoads(float $lat, float $lng, float $radiusMeters = 150.0): array
    {
        // 1. Calculate rough bounding box
        $latDelta = $radiusMeters / 111320.0;
        $lngDelta = $radiusMeters / (111320.0 * max(0.01, cos(deg2rad($lat))));

        $roads = Road::query()->get();
        if ($roads->isEmpty()) {
            return [];
        }

        $results = [];

        foreach ($roads as $road) {
            // Check coordinates in metadata or geometry
            $coords = $this->extractCoordinatesFromRoad($road);
            if (empty($coords)) {
                continue;
            }

            // Calculate min distance from (lat, lng) to road segments
            $minDist = $this->distanceToPolyline($lat, $lng, $coords);

            if ($minDist <= $radiusMeters) {
                $results[] = [
                    'id'        => $road->id,
                    'name'      => $road->name ?? 'Jalan Terdekat',
                    'road_type' => $road->road_type ?? 'residential',
                    'distance'  => $minDist,
                ];
            }
        }

        return $results;
    }

    /**
     * Extract coordinates array [[lng, lat], ...] from Road model.
     */
    protected function extractCoordinatesFromRoad(Road $road): array
    {
        // Check metadata first
        $meta = $road->metadata;
        if (is_array($meta) && !empty($meta['coordinates'])) {
            return $meta['coordinates'];
        }

        // If metadata has single point lat/lng
        if (is_array($meta) && isset($meta['lat'], $meta['lng'])) {
            return [[(float) $meta['lng'], (float) $meta['lat']]];
        }

        return [];
    }

    /**
     * Compute minimum distance in meters from a point to a polyline.
     */
    public function distanceToPolyline(float $lat, float $lng, array $coordinates): float
    {
        if (empty($coordinates)) {
            return INF;
        }

        if (count($coordinates) === 1) {
            $pt = $coordinates[0];
            return $this->haversine($lat, $lng, (float) $pt[1], (float) $pt[0]);
        }

        $minDist = INF;

        for ($i = 0; $i < count($coordinates) - 1; $i++) {
            $p1 = $coordinates[$i];
            $p2 = $coordinates[$i + 1];

            $dist = $this->distanceToSegment($lat, $lng, (float) $p1[1], (float) $p1[0], (float) $p2[1], (float) $p2[0]);
            if ($dist < $minDist) {
                $minDist = $dist;
            }
        }

        return $minDist;
    }

    /**
     * Distance in meters from point (lat, lng) to line segment (lat1, lng1) -> (lat2, lng2).
     */
    public function distanceToSegment(float $lat, float $lng, float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        // Convert to local planar projection in meters relative to (lat1, lng1)
        $mPerDegLat = 111320.0;
        $mPerDegLng = 111320.0 * cos(deg2rad(($lat1 + $lat2) / 2.0));

        $x0 = ($lng - $lng1) * $mPerDegLng;
        $y0 = ($lat - $lat1) * $mPerDegLat;

        $x2 = ($lng2 - $lng1) * $mPerDegLng;
        $y2 = ($lat2 - $lat1) * $mPerDegLat;

        $segLenSq = ($x2 * $x2) + ($y2 * $y2);

        if ($segLenSq <= 0.0001) {
            return sqrt(($x0 * $x0) + ($y0 * $y0));
        }

        // Projection factor t
        $t = (($x0 * $x2) + ($y0 * $y2)) / $segLenSq;
        $t = max(0.0, min(1.0, $t));

        $projX = $t * $x2;
        $projY = $t * $y2;

        return sqrt((($x0 - $projX) ** 2) + (($y0 - $projY) ** 2));
    }

    /**
     * Haversine distance in meters.
     */
    public function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2.0) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2.0) ** 2;

        return 2.0 * $earth * asin(min(1.0, sqrt($h)));
    }
}

