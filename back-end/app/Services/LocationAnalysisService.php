<?php

namespace App\Services;

use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\Report;

class LocationAnalysisService
{
    /**
     * Fallback weights used only when a catalog type has no stored demographics.
     * Keys are catalog slugs.
     */
    private const FALLBACK_WEIGHTS = [
        'gerobak-seblak' => ['school' => 15, 'campus' => 18, 'market' => 10, 'transit' => 8],
        'gerobak-bakso'  => ['school' => 15, 'campus' => 18, 'market' => 10, 'transit' => 8],
        'kedai-kopi'     => ['campus' => 18, 'office' => 15, 'school' => 8],
        'warung-makan'   => ['school' => 15, 'campus' => 18, 'market' => 10, 'transit' => 8],
        'laundry'        => ['campus' => 20],
        'barbershop'     => ['campus' => 10, 'school' => 8],
        'toko-kelontong' => ['transit' => 12, 'school' => 8],
        'minimarket'     => ['transit' => 12, 'school' => 8],
    ];

    private const CATEGORY_MAP = [
        'school'          => 'school',
        'university'      => 'campus',
        'college'         => 'campus',
        'campus'          => 'campus',
        'transit_station' => 'transit',
        'bus_stop'        => 'transit',
        'bus_station'     => 'transit',
        'transit'         => 'transit',
        'office'          => 'office',
        'market'          => 'market',
        'marketplace'     => 'market',
        'convenience'     => 'retail',
        'supermarket'     => 'retail',
        'retail'          => 'retail',
        'restaurant'      => 'food',
        'fast_food'       => 'food',
        'food_court'      => 'food',
        'food'            => 'food',
        'cafe'            => 'cafe',
        'service'         => 'service',
        'laundry'         => 'service',
        'barbershop'      => 'service',
        'hairdresser'     => 'service',
    ];

    public function analyze(array $input): array
    {
        $lat          = (float) $input['lat'];
        $lng          = (float) $input['lng'];
        $radius       = (float) $input['radius'];
        $typeKey      = (string) $input['business_type'];
        $candidateId  = $input['candidate_id'] ?? 'A';
        $external     = $input['external_places'] ?? [];

        $businessType = BusinessType::query()
            ->where('id', $typeKey)
            ->orWhere('slug', $typeKey)
            ->first();

        $slug    = $businessType?->slug ?? $typeKey;
        $weights = $this->resolveWeights($businessType, $slug);
        $competitorCats = $this->resolveCompetitorCategories($businessType);

        $internalPois = Poi::selectRaw(
            '*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
            [$lat, $lng, $lat]
        )
            ->having('distance', '<=', $radius)
            ->orderBy('distance')
            ->limit(500)
            ->get();

        $reports = Report::selectRaw(
            'id, title, status, severity, latitude, longitude,
            (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
            [$lat, $lng, $lat]
        )
            ->having('distance', '<=', $radius)
            ->limit(100)
            ->get();

        $normalized = [];

        foreach ($internalPois as $poi) {
            $normalized[] = [
                'name'     => $poi->name,
                'category' => $poi->category,
                'distance' => (float) $poi->distance,
                'source'   => 'lociva_internal',
            ];
        }

        foreach ($external as $place) {
            $pLat = isset($place['lat']) ? (float) $place['lat'] : null;
            $pLng = isset($place['lng']) ? (float) $place['lng'] : null;
            $distance = ($pLat !== null && $pLng !== null)
                ? $this->haversine($lat, $lng, $pLat, $pLng)
                : 0;

            if ($distance > $radius) {
                continue;
            }

            $normalized[] = [
                'name'     => $place['name'],
                'category' => $place['category'],
                'distance' => $distance,
                'source'   => $place['source'] ?? 'openstreetmap',
            ];
        }

        $internalCount = $internalPois->count();
        $externalCount = count($normalized) - $internalCount;

        $opportunityScore = 40;
        $factors = [];
        $categoryCounts = [];

        foreach ($normalized as $poi) {
            $mapped = self::CATEGORY_MAP[$poi['category']] ?? $poi['category'];
            $categoryCounts[$mapped] = ($categoryCounts[$mapped] ?? 0) + 1;
        }

        foreach ($categoryCounts as $cat => $count) {
            if (!isset($weights[$cat])) {
                continue;
            }
            $bonus = min($weights[$cat] * min($count, 3), $weights[$cat] * 3);
            $opportunityScore += $bonus;
            $factors[] = [
                'key'    => "poi_{$cat}",
                'label'  => ucfirst($cat) . ' dalam radius',
                'value'  => $count,
                'impact' => 'positive',
                'note'   => "{$count} {$cat} terdeteksi (internal + OSM), menambah +{$bonus} poin potensi.",
                'source' => 'mixed',
            ];
        }

        $activeReports = $reports->whereIn('status', ['reported', 'confirmed'])->count();
        if ($activeReports > 0) {
            $penalty = min($activeReports * 5, 20);
            $opportunityScore -= $penalty;
            $factors[] = [
                'key'    => 'active_reports',
                'label'  => 'Laporan masalah aktif',
                'value'  => $activeReports,
                'impact' => 'negative',
                'note'   => "{$activeReports} laporan infrastruktur aktif di area ini (-{$penalty} poin).",
                'source' => 'lociva_internal',
            ];
        }

        $opportunityScore = (int) max(0, min(100, $opportunityScore));

        $competitors = array_values(array_filter($normalized, function ($poi) use ($competitorCats) {
            $mapped = self::CATEGORY_MAP[$poi['category']] ?? $poi['category'];
            return in_array($poi['category'], $competitorCats, true)
                || in_array($mapped, $competitorCats, true);
        }));

        $competitorCount = count($competitors);
        $competitionScore = match (true) {
            $competitorCount === 0 => 10,
            $competitorCount <= 2  => 35,
            $competitorCount <= 4  => 55,
            $competitorCount <= 6  => 72,
            $competitorCount <= 10 => 85,
            default                => 95,
        };

        $nearestCompetitor = null;
        if ($competitorCount > 0) {
            usort($competitors, fn ($a, $b) => $a['distance'] <=> $b['distance']);
            $nearestCompetitor = [
                'name'     => $competitors[0]['name'],
                'distance' => (int) round($competitors[0]['distance']),
                'source'   => $competitors[0]['source'],
            ];
        }

        $transitCount = $categoryCounts['transit'] ?? 0;
        $accessibilityScore = 50;
        if ($transitCount > 0) {
            $accessibilityScore += min($transitCount * 15, 30);
        }
        $accessibilityScore += min((int) (count($normalized) / 5), 20);
        $accessibilityScore = (int) min(100, $accessibilityScore);

        $poiTotal = count($normalized);
        $dataConfidence = match (true) {
            $poiTotal === 0  => 15,
            $poiTotal < 10   => 35,
            $poiTotal < 30   => 60,
            $poiTotal < 60   => 80,
            default          => 95,
        };

        $relevantKeys = array_keys($weights);
        $relevantPoi = [];
        usort($normalized, fn ($a, $b) => $a['distance'] <=> $b['distance']);
        foreach ($normalized as $poi) {
            $mapped = self::CATEGORY_MAP[$poi['category']] ?? $poi['category'];
            if ($mapped && in_array($mapped, $relevantKeys, true)) {
                $relevantPoi[] = [
                    'name'      => $poi['name'],
                    'category'  => $poi['category'],
                    'distance'  => (int) round($poi['distance']),
                    'relevance' => ($poi['distance'] <= $radius * 0.3) ? 'high'
                        : (($poi['distance'] <= $radius * 0.6) ? 'medium' : 'low'),
                    'source'    => $poi['source'],
                ];
            }
            if (count($relevantPoi) >= 8) {
                break;
            }
        }

        $dataWarnings = [];
        if ($internalCount === 0) {
            $dataWarnings[] = 'Tidak ada POI internal LOCIVA di radius ini. Skor mengandalkan OpenStreetMap (Overpass) jika tersedia.';
        }
        if ($externalCount === 0) {
            $dataWarnings[] = 'Tidak ada tempat eksternal yang dikirim. Cakupan OSM/Overpass mungkin gagal atau belum dimuat.';
        }
        if ($poiTotal < 10) {
            $dataWarnings[] = 'Jumlah tempat di radius ini rendah. Kepercayaan data tidak sama dengan kelayakan usaha.';
        }
        if ($activeReports > 3) {
            $dataWarnings[] = 'Terdapat beberapa laporan infrastruktur aktif yang dapat memengaruhi aksesibilitas.';
        }

        return [
            'candidate_id'        => $candidateId,
            'lat'                 => $lat,
            'lng'                 => $lng,
            'radius'              => $radius,
            'business_type'       => $slug,
            'business_type_name'  => $businessType?->name,
            'opportunity_score'   => $opportunityScore,
            'competition_score'   => $competitionScore,
            'accessibility_score' => $accessibilityScore,
            'data_confidence'     => $dataConfidence,
            'competitor_count'    => $competitorCount,
            'nearest_competitor'  => $nearestCompetitor,
            'relevant_poi'        => $relevantPoi,
            'factors'             => $factors,
            'data_warnings'       => $dataWarnings,
            'sources'             => [
                [
                    'id'      => 'lociva_internal',
                    'label'   => 'POI & laporan internal LOCIVA',
                    'count'   => $internalCount,
                    'status'  => $internalCount > 0 ? 'loaded' : 'empty',
                ],
                [
                    'id'      => 'openstreetmap',
                    'label'   => 'OpenStreetMap / Overpass (eksternal, tidak disimpan sebagai usaha LOCIVA)',
                    'count'   => $externalCount,
                    'status'  => $externalCount > 0 ? 'loaded' : 'empty',
                ],
            ],
            'internal_poi_total'  => $internalCount,
            'external_poi_total'  => $externalCount,
            'poi_total'           => $poiTotal,
            'report_count'        => $reports->count(),
            'limitations'         => 'Skor adalah indeks berbasis data yang tersedia, bukan prediksi omzet. Tidak ada data lalu lintas live. Cakupan OSM bergantung pada kontributor setempat.',
        ];
    }

    private function resolveWeights(?BusinessType $type, string $slug): array
    {
        $fromCatalog = $type?->target_demographics;
        if (is_array($fromCatalog) && count($fromCatalog) > 0) {
            $weights = [];
            foreach ($fromCatalog as $row) {
                if (!isset($row['category'], $row['weight'])) {
                    continue;
                }
                $mapped = self::CATEGORY_MAP[$row['category']] ?? $row['category'];
                $weights[$mapped] = (int) $row['weight'];
            }
            if ($weights !== []) {
                return $weights;
            }
        }

        return self::FALLBACK_WEIGHTS[$slug] ?? [];
    }

    private function resolveCompetitorCategories(?BusinessType $type): array
    {
        $cats = $type?->competitor_categories;
        return is_array($cats) ? $cats : [];
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earth * asin(min(1, sqrt($h)));
    }
}
