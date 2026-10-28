<?php

namespace App\Services;

use App\Models\Business;
use App\Models\BusinessType;
use App\Models\Poi;
use App\Models\Report;
use Illuminate\Support\Facades\Log;

class LocationAnalysisService
{
    public function __construct(
        protected ?BpsApiService $bpsService = null,
        protected ?LocationFeasibilityService $feasibilityService = null
    ) {
        $this->bpsService = $bpsService ?? new BpsApiService();
        $this->feasibilityService = $feasibilityService ?? new LocationFeasibilityService();
    }
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
        'school'                   => 'school',
        'university'               => 'campus',
        'college'                  => 'campus',
        'campus'                   => 'campus',
        'transit_station'          => 'transit',
        'bus_stop'                 => 'transit',
        'bus_station'              => 'transit',
        'transit'                  => 'transit',
        'office'                   => 'office',
        'market'                   => 'market',
        'marketplace'              => 'market',
        'convenience'              => 'retail',
        'supermarket'              => 'retail',
        'retail'                   => 'retail',
        'restaurant'               => 'food',
        'fast_food'                => 'food',
        'food_court'               => 'food',
        'food'                     => 'food',
        'cafe'                     => 'cafe',
        // Specific service sub-categories — preserve specificity for competitor matching
        'barbershop'      => 'barbershop',
        'barber'          => 'barbershop',
        'hairdresser'     => 'hairdresser',
        'salon'           => 'hairdresser',
        'laundry'         => 'laundry',
        'dry_cleaning'    => 'laundry',
        // Broad service bucket — banks, clinics, hospitals, etc.
        'service'         => 'service',
        // Prefixed tags commonly found in imported OSM/Geofabrik POI database
        'amenity:school'           => 'school',
        'amenity:university'       => 'campus',
        'amenity:college'          => 'campus',
        'amenity:kindergarten'     => 'school',
        'amenity:restaurant'       => 'food',
        'amenity:fast_food'        => 'food',
        'amenity:food_court'       => 'food',
        'amenity:cafe'             => 'cafe',
        'amenity:bank'             => 'service',
        'amenity:atm'              => 'service',
        'amenity:clinic'           => 'service',
        'amenity:hospital'         => 'service',
        'amenity:pharmacy'         => 'service',
        'amenity:fuel'             => 'transit',
        'amenity:bus_station'      => 'transit',
        'amenity:marketplace'      => 'market',
        'amenity:place_of_worship' => 'office',
        'shop:convenience'         => 'retail',
        'shop:supermarket'         => 'retail',
        'shop:bakery'              => 'food',
        'shop:clothes'             => 'retail',
        'shop:hairdresser'         => 'hairdresser',
        'shop:laundry'             => 'laundry',
        'tourism:hotel'            => 'service',
        'tourism:guest_house'      => 'service',
        'tourism:attraction'       => 'tourism',
    ];

    public function analyze(array $input): array
    {
        \Illuminate\Support\Facades\Log::info(
            'LocationAnalysisService terpanggil',
            ['input' => $input]
        );

        $rawLat = $input['lat'] ?? null;
        $rawLng = $input['lng'] ?? null;
        $coordCheck = $this->feasibilityService->validateCoordinates($rawLat, $rawLng);
        if (!$coordCheck['is_valid']) {
            throw new \InvalidArgumentException($coordCheck['error']);
        }

        $lat          = (float) $coordCheck['lat'];
        $lng          = (float) $coordCheck['lng'];
        $radius       = (float) $input['radius'];
        $typeKey      = (string) $input['business_type'];
        $candidateId  = $input['candidate_id'] ?? 'A';
        $external     = $input['external_places'] ?? [];
        $isWater      = !empty($input['is_water']);
        $isTruncated  = !empty($input['is_truncated']);

        $businessType = BusinessType::query()
            ->where('id', $typeKey)
            ->orWhere('slug', $typeKey)
            ->first();

        $slug = $businessType?->slug ?? $typeKey;

        $t0 = microtime(true);

        // Sea / offshore detection guard (Section 4 of Implementation Brief)
        if ($isWater) {
            $feasibility = $this->feasibilityService->assessFeasibility(
                $lat, $lng, $businessType, $slug, null, true
            );

            return [
                'algorithm_version'         => '1.0',
                'candidate_id'              => $candidateId,
                'lat'                       => $lat,
                'lng'                       => $lng,
                'radius'                    => $radius,
                'business_type'             => $slug,
                'business_type_name'        => $businessType?->name,
                'is_valid_location'         => false,
                'is_water_or_offshore'      => true,
                'unsupported_reason'        => 'Lokasi berada di perairan/laut lepas atau area non-layanan. Skor kelayakan tidak dapat dihitung.',
                'opportunity_score'         => null,
                'competition_score'         => null,
                'accessibility_score'       => null,
                'data_confidence'           => 0,
                'analysis_completeness'     => 'insufficient_data',
                'competitor_count'          => 0,
                'nearest_competitor'        => null,
                'relevant_poi'              => [],
                'factors'                   => [],
                'data_warnings'             => [
                    'Koordinat terdeteksi di laut lepas atau perairan. Skor potensi dinonaktifkan untuk mencegah data palsu.',
                ],
                'sources'                   => [],
                'internal_poi_total'        => 0,
                'registered_business_total' => 0,
                'internal_business_total'   => 0,
                'external_poi_total'        => 0,
                'poi_total'                 => 0,
                'report_count'              => 0,
                'limitations'               => 'Area perairan/laut lepas tidak didukung untuk kelayakan tempat usaha UMKM.',
                'feasibility'               => $feasibility,
                'geographic_validity'       => $feasibility['geographic_validity'],
                'road_accessibility'        => $feasibility['road_accessibility'],
                'legal_restrictions'        => $feasibility['legal_restrictions'],
                'overall_recommendation'    => $feasibility['overall_recommendation'],
                'performance'               => [
                    'total_ms'          => round((microtime(true) - $t0) * 1000, 2),
                    'registered_biz_ms' => 0,
                    'internal_poi_ms'   => 0,
                    'reports_ms'        => 0,
                    'bps_ms'            => 0,
                    'scoring_ms'        => 0,
                ],
            ];
        }

        $weights = $this->resolveWeights($businessType, $slug);
        $competitorCats = $this->resolveCompetitorCategories($businessType);

        // Bounding box pre-filter: drastically speeds up spatial queries by pruning rows before Haversine trigonometric math
        $latSpan = ($radius * 1.05) / 111320;
        $lngSpan = ($radius * 1.05) / (111320 * max(0.01, cos(deg2rad($lat))));
        $minLat = $lat - $latSpan;
        $maxLat = $lat + $latSpan;
        $minLng = $lng - $lngSpan;
        $maxLng = $lng + $lngSpan;

        // 1. Query Registered Businesses in radius with exception isolation & bounding box optimization
        $registeredBusinesses = collect();
        $registeredQueryError = false;
        $tRegStart = microtime(true);
        try {
            $registeredBusinesses = Business::with('businessType:id,name,slug,category,competitor_categories')
                ->whereBetween('latitude', [$minLat, $maxLat])
                ->whereBetween('longitude', [$minLng, $maxLng])
                ->selectRaw(
                    '*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                    [$lat, $lng, $lat]
                )
                ->having('distance', '<=', $radius)
                ->orderBy('distance')
                ->limit(200)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('Failed querying registered businesses in LocationAnalysisService: ' . $e->getMessage());
            $registeredQueryError = true;
        }
        $tRegEnd = microtime(true);

        // 2. Query Internal POIs in radius with exception isolation & bounding box optimization
        $internalPois = collect();
        $internalPoiQueryError = false;
        $tPoiStart = microtime(true);
        try {
            $internalPois = Poi::whereBetween('latitude', [$minLat, $maxLat])
                ->whereBetween('longitude', [$minLng, $maxLng])
                ->selectRaw(
                    '*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                    [$lat, $lng, $lat]
                )
                ->having('distance', '<=', $radius)
                ->orderBy('distance')
                ->limit(500)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('Failed querying internal POIs in LocationAnalysisService: ' . $e->getMessage());
            $internalPoiQueryError = true;
        }
        $tPoiEnd = microtime(true);

        // 3. Query Civic Reports in radius (excluding dismissed reports) with bounding box optimization
        $reports = collect();
        $tRepStart = microtime(true);
        try {
            $reports = Report::where('is_dismissed', false)
                ->whereBetween('latitude', [$minLat, $maxLat])
                ->whereBetween('longitude', [$minLng, $maxLng])
                ->selectRaw(
                    'id, title, status, severity, is_dismissed, latitude, longitude,
                    (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                    [$lat, $lng, $lat]
                )
                ->having('distance', '<=', $radius)
                ->limit(100)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('Failed querying reports in LocationAnalysisService: ' . $e->getMessage());
        }
        $tRepEnd = microtime(true);

        $normalized = [];

        // Helper to normalize raw tags (e.g. "amenity=dentist", "shop:bakery" -> "dentist", "bakery")
        $normalizeTag = function (?string $tag): string {
            if (!$tag) return '';
            $t = strtolower(trim($tag));
            return preg_replace('/^(amenity|shop|office|leisure|tourism|healthcare|historic)[:=]/', '', $t);
        };

        // Add registered businesses (each physical registered business added exactly once)
        foreach ($registeredBusinesses as $b) {
            $bType = $b->businessType;
            $bCategory = $bType?->slug ?? 'retail';
            $bCompetitorCats = is_array($bType?->competitor_categories) ? $bType->competitor_categories : [];
            $normalized[] = [
                'id'                       => $b->id,
                'name'                     => $b->name,
                'category'                 => $bCategory,
                'business_competitor_cats' => $bCompetitorCats,
                'distance'                 => (float) $b->distance,
                'source'                   => 'lociva_registered',
                'lat'                      => (float) $b->latitude,
                'lng'                      => (float) $b->longitude,
            ];
        }

        // Add internal POIs (public facilities) with category normalization
        foreach ($internalPois as $poi) {
            $cat = $poi->category ?? '';
            $mappedCat = self::CATEGORY_MAP[$cat] ?? (self::CATEGORY_MAP[$normalizeTag($cat)] ?? $cat);
            $normalized[] = [
                'id'           => $poi->id,
                'name'         => $poi->name,
                'category'     => $mappedCat,
                'raw_category' => $poi->category,
                'distance'     => (float) $poi->distance,
                'source'       => 'lociva_internal',
                'lat'          => (float) $poi->latitude,
                'lng'          => (float) $poi->longitude,
            ];
        }

        // Add external places with spatial & name deduplication against internal entities
        foreach ($external as $place) {
            $pLat = isset($place['lat']) ? (float) $place['lat'] : null;
            $pLng = isset($place['lng']) ? (float) $place['lng'] : null;
            $distance = ($pLat !== null && $pLng !== null)
                ? $this->haversine($lat, $lng, $pLat, $pLng)
                : 0;

            if ($distance > $radius) {
                continue;
            }

            // Deduplication: prevent double counting if OSM place duplicates internal business or POI
            $isDuplicate = false;
            $placeName = strtolower(trim($place['name'] ?? ''));
            if ($pLat !== null && $pLng !== null && $placeName !== '') {
                foreach ($normalized as $existing) {
                    if (isset($existing['lat'], $existing['lng'])) {
                        $proxDist = $this->haversine($pLat, $pLng, (float) $existing['lat'], (float) $existing['lng']);
                        if ($proxDist <= 50) {
                            $existingName  = strtolower(trim($existing['name']));
                            $cleanExisting = trim(preg_replace('/\s+/', ' ', preg_replace('/[^\p{L}\p{N}\s]/u', '', $existingName)));
                            $cleanPlace    = trim(preg_replace('/\s+/', ' ', preg_replace('/[^\p{L}\p{N}\s]/u', '', $placeName)));

                            if ($cleanExisting === $cleanPlace) {
                                $isDuplicate = true;
                                break;
                            }

                            // Substring / prefix matching only for non-generic names with length >= 8
                            $genericShortWords = ['warung', 'toko', 'kedai', 'bengkel', 'klinik', 'salon', 'kios', 'cafe', 'kafe', 'apotek'];
                            $shorter = strlen($cleanExisting) <= strlen($cleanPlace) ? $cleanExisting : $cleanPlace;
                            $longer  = strlen($cleanExisting) <= strlen($cleanPlace) ? $cleanPlace : $cleanExisting;

                            if (strlen($shorter) >= 8 && !in_array($shorter, $genericShortWords, true)) {
                                if (str_starts_with($longer, $shorter . ' ') || str_starts_with($placeName, $existingName . ' (') || str_starts_with($existingName, $placeName . ' (')) {
                                    $isDuplicate = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if ($isDuplicate) {
                continue;
            }

            $normalized[] = [
                'name'         => $place['name'],
                'category'     => $place['category'],
                'raw_category' => $place['raw_category'] ?? null,
                'is_stale'     => !empty($place['is_stale']),
                'distance'     => $distance,
                'source'       => $place['source'] ?? 'openstreetmap',
                'lat'          => $pLat,
                'lng'          => $pLng,
            ];
        }

        $registeredBusinessCount = $registeredBusinesses->count();
        $internalPoiCount        = $internalPois->count();
        $externalCount           = count(array_filter(
            $normalized,
            fn($poi) => ($poi['source'] ?? '') === 'openstreetmap'
        ));
        $poiTotal                = $registeredBusinessCount + $internalPoiCount + $externalCount;
        $internalCount           = $registeredBusinessCount + $internalPoiCount;

        // Verify minimum data requirement: at least one data source must be operational
        if ($registeredQueryError && $internalPoiQueryError && $externalCount === 0) {
            return [
                'algorithm_version'         => '1.0',
                'candidate_id'              => $candidateId,
                'lat'                       => $lat,
                'lng'                       => $lng,
                'radius'                    => $radius,
                'business_type'             => $slug,
                'business_type_name'        => $businessType?->name,
                'is_valid_location'         => false,
                'is_water_or_offshore'      => false,
                'unsupported_reason'        => 'Syarat minimum analisis tidak terpenuhi: seluruh sumber data POI internal mengalami kegagalan dan tidak ada data eksternal.',
                'opportunity_score'         => null,
                'competition_score'         => null,
                'accessibility_score'       => null,
                'data_confidence'           => 0,
                'analysis_completeness'     => 'insufficient_data',
                'competitor_count'          => 0,
                'nearest_competitor'        => null,
                'relevant_poi'              => [],
                'factors'                   => [],
                'data_warnings'             => [
                    'Seluruh sumber data POI lokal mengalami gangguan query dan tidak ada tempat eksternal yang tersedia. Skor kelayakan tidak dapat dihitung.',
                ],
                'sources'                   => [
                    [
                        'id'     => 'lociva_registered',
                        'label'  => 'Usaha Terdaftar LOCIVA',
                        'count'  => null,
                        'status' => 'error',
                    ],
                    [
                        'id'     => 'lociva_internal',
                        'label'  => 'POI Fasilitas Publik Internal LOCIVA',
                        'count'  => null,
                        'status' => 'error',
                    ],
                    [
                        'id'     => 'openstreetmap',
                        'label'  => 'OpenStreetMap / Overpass (eksternal, tidak disimpan sebagai usaha LOCIVA)',
                        'count'  => 0,
                        'status' => 'empty',
                    ],
                    [
                        'id'     => 'bps_ri',
                        'label'  => 'Badan Pusat Statistik (BPS)',
                        'count'  => null,
                        'status' => 'unavailable',
                    ],
                ],
                'internal_poi_total'        => 0,
                'registered_business_total' => 0,
                'internal_business_total'   => 0,
                'internal_business_count'   => 0,
                'external_poi_total'        => 0,
                'poi_total'                 => 0,
                'report_count'              => 0,
                'limitations'               => 'Analisis dihentikan karena syarat minimum data tidak terpenuhi.',
            ];
        }

        \Illuminate\Support\Facades\Log::info('Location Analysis Debug', [
            'lat'                     => $lat,
            'lng'                     => $lng,
            'radius'                  => $radius,
            'registered_businesses'   => $registeredBusinessCount,
            'internal_pois'           => $internalPoiCount,
            'external_pois'           => $externalCount,
            'poi_total'               => $poiTotal,
            'internal_count'          => $internalCount,
        ]);

        $opportunityScore = 40;
        $factors = [];
        $categoryCounts = [];

        // Fetch BPS demographics early so density can influence scoring
        $tBpsStart = microtime(true);
        $bpsDemographics = $this->bpsService->getDemographicsForLocation($lat, $lng);
        $tBpsEnd = microtime(true);

        $tScoreStart = microtime(true);
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
        $severeReports = $reports->whereIn('status', ['reported', 'confirmed'])
            ->whereIn('severity', ['high', 'critical'])
            ->count();
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

        // BPS density-based opportunity adjustment (applies only when data is available)
        $bpsDensity = $bpsDemographics['density_per_km2'] ?? null;
        $bpsStatus  = $bpsDemographics['status'] ?? '';
        if ($bpsDensity !== null && $bpsStatus !== 'unsupported_region') {
            if ($bpsDensity >= 5000) {
                $densityBonus = 5;
                $opportunityScore = (int) min(100, $opportunityScore + $densityBonus);
                $factors[] = [
                    'key'    => 'bps_density',
                    'label'  => 'Kepadatan Penduduk BPS',
                    'value'  => (int) $bpsDensity,
                    'impact' => 'positive',
                    'note'   => "Kepadatan penduduk tinggi ({$bpsDensity} jiwa/km²) mendukung permintaan pasar lokal (+{$densityBonus} poin).",
                    'source' => 'bps_ri',
                ];
            } elseif ($bpsDensity < 500) {
                $densityPenalty = 5;
                $opportunityScore = (int) max(0, $opportunityScore - $densityPenalty);
                $factors[] = [
                    'key'    => 'bps_density',
                    'label'  => 'Kepadatan Penduduk BPS',
                    'value'  => (int) $bpsDensity,
                    'impact' => 'negative',
                    'note'   => "Kepadatan penduduk sangat rendah ({$bpsDensity} jiwa/km²) berpotensi memengaruhi volume pelanggan (-{$densityPenalty} poin).",
                    'source' => 'bps_ri',
                ];
            } else {
                $factors[] = [
                    'key'    => 'bps_density',
                    'label'  => 'Kepadatan Penduduk BPS',
                    'value'  => (int) $bpsDensity,
                    'impact' => 'neutral',
                    'note'   => "Kepadatan penduduk moderat ({$bpsDensity} jiwa/km²); tidak ada penyesuaian skor tambahan.",
                    'source' => 'bps_ri',
                ];
            }
        }

        // Helper to normalize raw tags (e.g. "amenity=dentist", "shop:bakery" -> "dentist", "bakery")
        $normalizeTag = function (?string $tag): string {
            if (!$tag) return '';
            $t = strtolower(trim($tag));
            return preg_replace('/^(amenity|shop|office|leisure|tourism|healthcare)[:=]/', '', $t);
        };

        $normalizedCompCats = array_map($normalizeTag, $competitorCats);

        // Competitor analysis: includes registered businesses & OSM competitors
        $competitors = array_values(array_filter($normalized, function ($poi) use ($competitorCats, $normalizedCompCats, $normalizeTag, $slug) {
            // 1. Direct competitor if it is a registered business of the exact same business type
            if ($poi['source'] === 'lociva_registered' && $poi['category'] === $slug) {
                return true;
            }

            // Safe fallback: when competitor categories are empty/null, only exact same registered business type counts as competitor
            if (empty($competitorCats)) {
                return false;
            }

            // 2. Registered business matching (dynamic cross-business-type matching without hardcoded slugs)
            if ($poi['source'] === 'lociva_registered') {
                // Direct match if candidate competitor categories include the registered business's slug
                if (in_array($poi['category'], $competitorCats, true)) {
                    return true;
                }
                // Check if candidate competitor categories overlap with registered business's own competitor categories
                $bCats = $poi['business_competitor_cats'] ?? [];
                if (!empty($bCats)) {
                    if (count(array_intersect($competitorCats, $bCats)) > 0) {
                        return true;
                    }
                    // Canonical mapping loop across competitor categories (excluding 'service' to prevent broad conflation)
                    foreach ($competitorCats as $cCat) {
                        $cMapped = self::CATEGORY_MAP[$cCat] ?? $cCat;
                        if ($cMapped === 'service') continue;
                        foreach ($bCats as $bCat) {
                            $bMapped = self::CATEGORY_MAP[$bCat] ?? $bCat;
                            if ($bMapped === 'service') continue;
                            if ($cMapped === $bMapped) return true;
                        }
                    }
                }
                return false;
            }

            // 3. External OSM Places matching
            $cat = $poi['category'] ?? '';
            $rawCat = $poi['raw_category'] ?? null;
            $cleanRaw = $normalizeTag($rawCat);
            $cleanCat = $normalizeTag($cat);

            // 3a. Direct tag / raw-category match (supports custom tags like 'amenity=dentist', 'dentist', 'shop=bakery', 'bakery', 'car_repair')
            if ($rawCat && (in_array($rawCat, $competitorCats, true) || in_array($cleanRaw, $normalizedCompCats, true))) {
                return true;
            }
            if ($cleanCat && (in_array($cat, $competitorCats, true) || in_array($cleanCat, $normalizedCompCats, true))) {
                return true;
            }

            // 3b. Canonical category match
            $mapped = self::CATEGORY_MAP[$cat] ?? (self::CATEGORY_MAP[$cleanRaw] ?? $cat);
            if (in_array($mapped, $competitorCats, true)) {
                return true;
            }

            // 3c. Canonical mapping loop (excluding generic 'service' to prevent broad umbrella matches)
            foreach ($competitorCats as $compCat) {
                $compMapped = self::CATEGORY_MAP[$compCat] ?? (self::CATEGORY_MAP[$normalizeTag($compCat)] ?? $compCat);
                if ($compMapped === 'service') {
                    // Prevent coarse 'service' from matching unrelated entities
                    continue;
                }
                if ($compMapped === $mapped) {
                    return true;
                }
            }

            return false;
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
            usort($competitors, fn($a, $b) => $a['distance'] <=> $b['distance']);
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

        $dataConfidence = match (true) {
            $poiTotal === 0  => 15,
            $poiTotal < 10   => 35,
            $poiTotal < 30   => 60,
            $poiTotal < 60   => 80,
            default          => 95,
        };

        $relevantKeys = array_keys($weights);
        $relevantPoi = [];
        usort($normalized, fn($a, $b) => $a['distance'] <=> $b['distance']);
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

        $hasStaleOsm = count(array_filter(
            $normalized,
            fn($poi) => !empty($poi['is_stale'])
        )) > 0;

        $dataWarnings = [];
        if ($isTruncated) {
            $dataWarnings[] = 'Data tempat eksternal OpenStreetMap melebihi batas transmisi (250 tempat) dan telah dipotong. Analisis mencerminkan sampel terdekat.';
        }
        if ($hasStaleOsm) {
            $dataWarnings[] = 'Sebagian atau seluruh data OpenStreetMap bersumber dari cache spasial lokal karena server Overpass tidak merespons secara langsung.';
        }
        if ($registeredBusinessCount === 0 && $internalPoiCount === 0) {
            $dataWarnings[] = 'Tidak ada usaha terdaftar maupun POI internal LOCIVA di radius ini. Skor mengandalkan OpenStreetMap (Overpass) jika tersedia.';
        }
        if ($externalCount === 0) {
            $dataWarnings[] = 'Tidak ada tempat eksternal yang dikirim. Cakupan OSM/Overpass mungkin gagal atau belum dimuat.';
        }
        if ($poiTotal < 10) {
            $dataWarnings[] = 'Jumlah tempat di radius ini rendah. Kepercayaan data tidak sama dengan kelayakan usaha.';
        }
        if ($severeReports > 0) {
            $dataWarnings[] = "Terdapat {$severeReports} laporan infrastruktur aktif berkategori keparahan tinggi/kritis di area ini yang berpotensi memengaruhi aksesibilitas.";
        } elseif ($activeReports > 3) {
            $dataWarnings[] = 'Terdapat beberapa laporan infrastruktur aktif yang dapat memengaruhi aksesibilitas.';
        }
        if (($bpsDemographics['status'] ?? '') === 'unsupported_region') {
            $dataWarnings[] = 'Data demografi BPS tidak tersedia untuk wilayah administratif ini; analisis diproses secara parsial berbasis fasilitas dan persaingan lokal.';
        }

        $isBpsMissing = ($bpsDemographics['status'] ?? '') === 'unsupported_region' || ($bpsDemographics['status'] ?? '') === 'error' || ($bpsDemographics['population'] ?? null) === null;
        $isAnySourceDegraded = $registeredQueryError || $internalPoiQueryError || $hasStaleOsm || $isTruncated || $isBpsMissing;
        $analysisCompleteness = $isAnySourceDegraded ? 'partial' : 'full';

        $limitations = 'Skor adalah indeks berbasis data yang tersedia, bukan prediksi omzet. Tidak ada data lalu lintas live. Cakupan OSM bergantung pada kontributor setempat. Data populasi BPS bersifat agregat wilayah resmi.';
        if ($analysisCompleteness === 'partial') {
            $limitations .= ' Catatan: Hasil analisis ini bersifat parsial karena sebagian sumber data tidak tersedia atau terbatas.';
        }

        $feasibility = $this->feasibilityService->assessFeasibility(
            $lat,
            $lng,
            $businessType,
            $slug,
            $opportunityScore,
            false,
            [
                'poi_total' => $poiTotal,
                'is_sparse' => ($poiTotal < 3),
            ]
        );

        if ($feasibility['overall_recommendation']['status'] === 'prohibited') {
            $dataWarnings[] = 'Terdapat larangan atau penertiban resmi aktif yang terverifikasi di koordinat ini.';
        }

        $tScoreEnd = microtime(true);
        $tTotal = microtime(true) - $t0;

        $performance = [
            'total_ms'          => round($tTotal * 1000, 2),
            'registered_biz_ms' => round(($tRegEnd - $tRegStart) * 1000, 2),
            'internal_poi_ms'   => round(($tPoiEnd - $tPoiStart) * 1000, 2),
            'reports_ms'        => round(($tRepEnd - $tRepStart) * 1000, 2),
            'bps_ms'            => round(($tBpsEnd - $tBpsStart) * 1000, 2),
            'scoring_ms'        => round(($tScoreEnd - $tScoreStart) * 1000, 2),
        ];

        Log::info('Location Analysis Performance Breakdown', $performance);

        return [
            'algorithm_version'         => '1.0',
            'candidate_id'              => $candidateId,
            'lat'                       => $lat,
            'lng'                       => $lng,
            'radius'                    => $radius,
            'business_type'             => $slug,
            'business_type_name'        => $businessType?->name,
            'is_valid_location'         => true,
            'is_water_or_offshore'      => false,
            'is_truncated'              => $isTruncated,
            'opportunity_score'         => $opportunityScore,
            'competition_score'         => $competitionScore,
            'accessibility_score'       => $accessibilityScore,
            'data_confidence'           => $dataConfidence,
            'analysis_completeness'     => $analysisCompleteness,
            'competitor_count'          => $competitorCount,
            'nearest_competitor'        => $nearestCompetitor,
            'relevant_poi'              => $relevantPoi,
            'factors'                   => $factors,
            'data_warnings'             => $dataWarnings,
            'feasibility'               => $feasibility,
            'geographic_validity'       => $feasibility['geographic_validity'],
            'road_accessibility'        => $feasibility['road_accessibility'],
            'legal_restrictions'        => $feasibility['legal_restrictions'],
            'overall_recommendation'    => $feasibility['overall_recommendation'],
            'bps_demographics'          => $bpsDemographics,
            'sources'                   => [
                [
                    'id'      => 'lociva_registered',
                    'label'   => 'Usaha Terdaftar LOCIVA',
                    'count'   => $registeredBusinessCount,
                    'status'  => $registeredQueryError ? 'error' : ($registeredBusinessCount > 0 ? 'loaded' : 'empty'),
                ],
                [
                    'id'      => 'lociva_internal',
                    'label'   => 'POI Fasilitas Publik Internal LOCIVA',
                    'count'   => $internalPoiCount,
                    'status'  => $internalPoiQueryError ? 'error' : ($internalPoiCount > 0 ? 'loaded' : 'empty'),
                ],
                [
                    'id'        => 'openstreetmap',
                    'label'     => 'OpenStreetMap / Overpass (eksternal, tidak disimpan sebagai usaha LOCIVA)',
                    'count'     => $externalCount,
                    'status'    => $hasStaleOsm ? 'stale' : ($externalCount > 0 ? 'loaded' : 'empty'),
                    'truncated' => $isTruncated,
                ],
                [
                    'id'      => 'bps_ri',
                    'label'   => ($bpsDemographics['status'] ?? '') === 'unsupported_region'
                        ? 'Badan Pusat Statistik (BPS - Wilayah Belum Didukung)'
                        : 'Badan Pusat Statistik (BPS WebAPI - ' . ($bpsDemographics['region_name'] ?? 'Wilayah Administratif') . ')',
                    'count'   => $bpsDemographics['population'] ?? null,
                    'status'  => ($bpsDemographics['status'] ?? '') === 'unsupported_region' ? 'unavailable' : (($bpsDemographics['status'] ?? '') === 'error' ? 'error' : 'loaded'),
                    'year'    => $bpsDemographics['year'] ?? null,
                ],
            ],
            'internal_poi_total'        => $internalPoiCount,
            'registered_business_total' => $registeredBusinessCount,
            'internal_business_total'   => $registeredBusinessCount,
            'internal_business_count'   => $registeredBusinessCount,
            'external_poi_total'        => $externalCount,
            'poi_total'                 => $poiTotal,
            'report_count'              => $reports->count(),
            'limitations'               => $limitations,
            'performance'               => $performance,
        ];
    }

    private function resolveWeights(?BusinessType $type, string $slug): array
    {
        // 1. First priority: Check dedicated business_type_weights table
        if ($type) {
            $dbWeights = $type->relationLoaded('weights') ? $type->weights : $type->weights()->get();
            if ($dbWeights->isNotEmpty()) {
                $weights = [];
                foreach ($dbWeights as $row) {
                    $mapped = self::CATEGORY_MAP[$row->factor] ?? $row->factor;
                    $weights[$mapped] = (float) $row->weight;
                }
                if ($weights !== []) {
                    return $weights;
                }
            }
        }

        // 2. Second priority: target_demographics JSON array from catalog
        $fromCatalog = $type?->target_demographics;
        if (is_array($fromCatalog) && count($fromCatalog) > 0) {
            $weights = [];
            foreach ($fromCatalog as $row) {
                if (!isset($row['category'], $row['weight'])) {
                    continue;
                }
                $mapped = self::CATEGORY_MAP[$row['category']] ?? $row['category'];
                $weights[$mapped] = (float) $row['weight'];
            }
            if ($weights !== []) {
                return $weights;
            }
        }

        // 3. Fallback to hardcoded default weights
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
