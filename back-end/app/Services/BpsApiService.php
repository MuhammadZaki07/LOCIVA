<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BpsApiService
{
    protected ?string $apiKey;
    protected string $baseUrl;

    /**
     * Curated official BPS administrative domains for Bandung Raya and major hubs.
     * Code reference: Master Wilayah BPS (3500: Jawa Timur, 3200: Jawa Barat)
     */
    protected const KNOWN_DOMAINS = [
        '3573' => [
            'name'            => 'Kota Malang',
            'prov_id'         => '3500',
            'prov_name'       => 'Jawa Timur',
            'population'      => 891859,
            'density_per_km2' => 8103,
            'year'            => 2025,
            'source'          => 'BPS Kota Malang (BPS WebAPI - Jumlah Penduduk De Jure)',
            'lat_min'         => -8.050,
            'lat_max'         => -7.910,
            'lng_min'         => 112.570,
            'lng_max'         => 112.690,
        ],
        '3507' => [
            'name'            => 'Kabupaten Malang',
            'prov_id'         => '3500',
            'prov_name'       => 'Jawa Timur',
            'population'      => 2686884,
            'density_per_km2' => 760,
            'year'            => 2024,
            'source'          => 'BPS Kabupaten Malang (Kabupaten Malang Dalam Angka 2024)',
            'lat_min'         => -8.500,
            'lat_max'         => -7.750,
            'lng_min'         => 112.250,
            'lng_max'         => 112.950,
        ],
        '3273' => [
            'name'            => 'Kota Bandung',
            'prov_id'         => '3200',
            'prov_name'       => 'Jawa Barat',
            'population'      => 2452943,
            'density_per_km2' => 14660,
            'year'            => 2024,
            'source'          => 'BPS Kota Bandung (Kota Bandung Dalam Angka 2024)',
            'lat_min'         => -6.980,
            'lat_max'         => -6.840,
            'lng_min'         => 107.540,
            'lng_max'         => 107.720,
        ],
        '3277' => [
            'name'            => 'Kota Cimahi',
            'prov_id'         => '3200',
            'prov_name'       => 'Jawa Barat',
            'population'      => 574213,
            'density_per_km2' => 14248,
            'year'            => 2024,
            'source'          => 'BPS Kota Cimahi (Kota Cimahi Dalam Angka 2024)',
            'lat_min'         => -6.910,
            'lat_max'         => -6.840,
            'lng_min'         => 107.510,
            'lng_max'         => 107.570,
        ],
        '3204' => [
            'name'            => 'Kabupaten Bandung',
            'prov_id'         => '3200',
            'prov_name'       => 'Jawa Barat',
            'population'      => 3666156,
            'density_per_km2' => 2074,
            'year'            => 2024,
            'source'          => 'BPS Kabupaten Bandung (Kabupaten Bandung Dalam Angka 2024)',
            'lat_min'         => -7.300,
            'lat_max'         => -6.930,
            'lng_min'         => 107.200,
            'lng_max'         => 107.850,
        ],
        '3217' => [
            'name'            => 'Kabupaten Bandung Barat',
            'prov_id'         => '3200',
            'prov_name'       => 'Jawa Barat',
            'population'      => 1814125,
            'density_per_km2' => 1389,
            'year'            => 2024,
            'source'          => 'BPS Kabupaten Bandung Barat (KBB Dalam Angka 2024)',
            'lat_min'         => -7.050,
            'lat_max'         => -6.700,
            'lng_min'         => 107.100,
            'lng_max'         => 107.600,
        ],
        '3100' => [
            'name'            => 'DKI Jakarta',
            'prov_id'         => '3100',
            'prov_name'       => 'DKI Jakarta',
            'population'      => 10672100,
            'density_per_km2' => 15978,
            'year'            => 2024,
            'source'          => 'BPS Provinsi DKI Jakarta (Provinsi DKI Jakarta Dalam Angka 2024)',
            'lat_min'         => -6.370,
            'lat_max'         => -6.080,
            'lng_min'         => 106.680,
            'lng_max'         => 106.990,
        ],
    ];

    public function __construct()
    {
        $this->apiKey  = config('services.bps.api_key');
        $this->baseUrl = rtrim(config('services.bps.base_url', 'https://webapi.bps.go.id/v1/api'), '/');
    }

    /**
     * Check whether BPS API Key is configured in environment.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && is_string($this->apiKey) && strlen(trim($this->apiKey)) > 5;
    }

    /**
     * Get BPS API status and configuration state.
     */
    public function getStatus(): array
    {
        return [
            'is_configured' => $this->isConfigured(),
            'provider'      => 'Badan Pusat Statistik (BPS WebAPI)',
            'portal_url'    => 'https://webapi.bps.go.id/developer',
            'docs_url'      => 'https://webapi.bps.go.id/documentation',
            'message'       => $this->isConfigured()
                ? 'BPS API key terpasang di backend environment.'
                : 'BPS API key belum diisi pada file .env backend (BPS_API_KEY=). Fitur analisis menggunakan data agregat resmi BPS lokal yang di-cache.',
        ];
    }

    /**
     * Fetch list of domains (provinces / regencies) from BPS WebAPI.
     * Uses 24-hour cache.
     */
    public function getDomains(string $type = 'kabbyprov', string $prov = '3200'): array
    {
        $cacheKey = "bps_domains_{$type}_{$prov}";

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($type, $prov) {
            if (!$this->isConfigured()) {
                return [
                    'status'            => 'unconfigured',
                    'data-availability' => 'cached_local',
                    'message'           => 'BPS_API_KEY belum dikonfigurasi di .env',
                    'data'              => array_values(array_map(function ($code, $d) {
                        return [
                            'domain_id'   => $code,
                            'domain_name' => $d['name'],
                            'prov_id'     => $d['prov_id'],
                        ];
                    }, array_keys(self::KNOWN_DOMAINS), self::KNOWN_DOMAINS)),
                ];
            }

            try {
                $endpoint = "{$this->baseUrl}/domain/type/{$type}/prov/{$prov}/key/{$this->apiKey}/";
                $response = Http::timeout(8)->get($endpoint);

                if ($response->successful()) {
                    $json = $response->json();
                    if (($json['status'] ?? '') === 'OK') {
                        return $json;
                    }
                }

                Log::warning('BPS WebAPI request unsuccessful', [
                    'status' => $response->status(),
                ]);
            } catch (\Throwable $e) {
                Log::error('BPS WebAPI domain fetch exception: ' . $e->getMessage());
            }

            // Fallback to local verified domains
            return [
                'status'            => 'fallback',
                'data-availability' => 'cached_local',
                'data'              => array_values(array_map(function ($code, $d) {
                    return [
                        'domain_id'   => $code,
                        'domain_name' => $d['name'],
                        'prov_id'     => $d['prov_id'],
                    ];
                }, array_keys(self::KNOWN_DOMAINS), self::KNOWN_DOMAINS)),
            ];
        });
    }

    /**
     * Resolve regional demographic data from coordinates.
     */
    public function getDemographicsForLocation(float $lat, float $lng): array
    {
        $domainCode = $this->resolveDomainCode($lat, $lng);

        if ($domainCode === null) {
            return [
                'is_configured'   => $this->isConfigured(),
                'status'          => 'unsupported_region',
                'domain_id'       => null,
                'region_name'     => 'Wilayah Belum Didukung',
                'province'        => null,
                'population'      => null,
                'density_per_km2' => null,
                'year'            => null,
                'source'          => 'Badan Pusat Statistik (BPS)',
                'aggregation'     => null,
                'limitations'     => 'Titik koordinat berada di luar cakupan wilayah administratif BPS yang didukung sistem saat ini.',
                'districts'       => null,
            ];
        }

        $domainMeta = self::KNOWN_DOMAINS[$domainCode];

        // If BPS API key is configured, check if we can query live BPS dynamic table
        $liveData = null;
        if ($this->isConfigured()) {
            $liveData = $this->fetchLiveBpsIndicator($domainCode);
        }

        return [
            'is_configured'   => $this->isConfigured(),
            'status'          => 'supported',
            'domain_id'       => $domainCode,
            'region_name'     => $domainMeta['name'],
            'province'        => $domainMeta['prov_name'],
            'population'      => $liveData['population'] ?? $domainMeta['population'],
            'density_per_km2' => $liveData['density_per_km2'] ?? $domainMeta['density_per_km2'],
            'year'            => $liveData['year'] ?? $domainMeta['year'],
            'source'          => $liveData['source'] ?? $domainMeta['source'],
            'aggregation'     => 'Tingkat Wilayah Administratif (Kota/Kabupaten)',
            'limitations'     => 'Data populasi dan kepadatan bersumber dari rujukan sensus/proyeksi resmi BPS per wilayah administratif, bukan sensus mikroskopis titik koordinat per meter persegi.',
            'districts'       => $liveData['districts'] ?? null,
        ];
    }

    /**
     * Fetch live indicator from BPS WebAPI if available, with cache.
     */
    public function fetchLiveBpsIndicator(string $domainId): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        // Cache live indicator data for 24 hours per domain
        $cacheKey = "bps_live_indicator_v2_{$domainId}";

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($domainId) {
            try {
                // If Kota Malang (domain 3573), query verified Var 48 (Jumlah Penduduk De Jure Menurut Kecamatan)
                if ($domainId === '3573') {
                    // 1. Discover latest available year from BPS WebAPI
                    $thUrl = "{$this->baseUrl}/list/model/th/lang/ind/domain/{$domainId}/var/48/key/{$this->apiKey}/";
                    $thRes = Http::timeout(6)->get($thUrl);

                    if (!$thRes->successful()) {
                        return null;
                    }

                    $thJson = $thRes->json();
                    if (!isset($thJson['data'][1]) || empty($thJson['data'][1])) {
                        return null;
                    }

                    $latestYearObj = $thJson['data'][1][0];
                    $thId = $latestYearObj['th_id'] ?? null;
                    $yearLabel = isset($latestYearObj['th']) ? (int) $latestYearObj['th'] : 2025;

                    if (!$thId) {
                        return null;
                    }

                    // 2. Fetch data content for this year
                    $dataUrl = "{$this->baseUrl}/list/model/data/lang/ind/domain/{$domainId}/var/48/th/{$thId}/key/{$this->apiKey}/";
                    $dataRes = Http::timeout(8)->get($dataUrl);

                    if (!$dataRes->successful()) {
                        return null;
                    }

                    $dataJson = $dataRes->json();
                    if (($dataJson['data-availability'] ?? '') !== 'available') {
                        return null;
                    }

                    $datacontent = $dataJson['datacontent'] ?? [];
                    $vervar = $dataJson['vervar'] ?? [];
                    $turvar = $dataJson['turvar'] ?? [];

                    // Identify TOTAL gender turvar (val 28)
                    $totalTurvarVal = 28;
                    foreach ($turvar as $t) {
                        if (strtoupper($t['label'] ?? '') === 'TOTAL') {
                            $totalTurvarVal = $t['val'];
                            break;
                        }
                    }

                    // Total for entire city: {domainId}48{totalTurvarVal}{thId}0
                    $cityKey = "{$domainId}48{$totalTurvarVal}{$thId}0";
                    $population = isset($datacontent[$cityKey]) ? (int) $datacontent[$cityKey] : null;

                    // Breakdown per kecamatan
                    $districts = [];
                    foreach ($vervar as $vv) {
                        if ((string) $vv['val'] === $domainId) {
                            continue;
                        }
                        $dKey = "{$vv['val']}48{$totalTurvarVal}{$thId}0";
                        if (isset($datacontent[$dKey])) {
                            $districts[$vv['label']] = (int) $datacontent[$dKey];
                        }
                    }

                    $areaKm2 = 110.06; // Luas resmi Kota Malang (BPS Kota Malang)
                    $density = $population ? (int) round($population / $areaKm2) : 8103;

                    return [
                        'domain_id'       => $domainId,
                        'var_id'          => 48,
                        'var_label'       => 'Jumlah Penduduk (De Jure)',
                        'unit'            => 'Jiwa',
                        'year'            => $yearLabel,
                        'population'      => $population ?? 891859,
                        'area_km2'        => $areaKm2,
                        'density_per_km2' => $density,
                        'districts'       => $districts,
                        'source'          => "BPS WebAPI Live (Domain {$domainId}, Var 48, Tahun {$yearLabel})",
                    ];
                }
            } catch (\Throwable $th) {
                Log::warning('Live BPS indicator fetch failed: ' . $th->getMessage());
            }

            return null;
        });
    }

    /**
     * Match coordinates to known administrative region code.
     * Returns null if coordinates fall outside any supported region.
     */
    public function resolveDomainCode(float $lat, float $lng): ?string
    {
        // Municipalities / cities are checked first, then larger surrounding regencies
        $priorityOrder = ['3573', '3273', '3277', '3100', '3507', '3204', '3217'];

        foreach ($priorityOrder as $code) {
            if (!isset(self::KNOWN_DOMAINS[$code])) {
                continue;
            }
            $meta = self::KNOWN_DOMAINS[$code];
            if ($lat >= $meta['lat_min'] && $lat <= $meta['lat_max'] &&
                $lng >= $meta['lng_min'] && $lng <= $meta['lng_max']) {
                return (string) $code;
            }
        }

        return null;
    }


    /**
     * Official land area (km²) for all 38 Kabupaten & Kota in Jawa Timur
     * Source: BPS Provinsi Jawa Timur (Provinsi Jawa Timur Dalam Angka 2024, Tabel 1.1)
     */
    protected const JATIM_REGENCY_AREAS = [
        '3501' => 1389.92, // Kabupaten Pacitan
        '3502' => 1305.70, // Kabupaten Ponorogo
        '3503' => 1147.22, // Kabupaten Trenggalek
        '3504' => 1055.65, // Kabupaten Tulungagung
        '3505' => 1336.48, // Kabupaten Blitar
        '3506' => 1386.05, // Kabupaten Kediri
        '3507' => 3530.65, // Kabupaten Malang
        '3508' => 1790.90, // Kabupaten Lumajang
        '3509' => 3092.34, // Kabupaten Jember
        '3510' => 5782.40, // Kabupaten Banyuwangi
        '3511' => 1525.97, // Kabupaten Bondowoso
        '3512' => 1669.87, // Kabupaten Situbondo
        '3513' => 1696.21, // Kabupaten Probolinggo
        '3514' => 1474.02, // Kabupaten Pasuruan
        '3515' => 634.38,  // Kabupaten Sidoarjo
        '3516' => 717.83,  // Kabupaten Mojokerto
        '3517' => 1115.09, // Kabupaten Jombang
        '3518' => 1224.25, // Kabupaten Nganjuk
        '3519' => 1037.58, // Kabupaten Madiun
        '3520' => 688.84,  // Kabupaten Magetan
        '3521' => 1295.98, // Kabupaten Ngawi
        '3522' => 2198.79, // Kabupaten Bojonegoro
        '3523' => 1834.15, // Kabupaten Tuban
        '3524' => 1782.05, // Kabupaten Lamongan
        '3525' => 1191.25, // Kabupaten Gresik
        '3526' => 1001.44, // Kabupaten Bangkalan
        '3527' => 1233.08, // Kabupaten Sampang
        '3528' => 792.24,  // Kabupaten Pamekasan
        '3529' => 1998.54, // Kabupaten Sumenep
        '3571' => 63.40,   // Kota Kediri
        '3572' => 32.57,   // Kota Blitar
        '3573' => 110.06,  // Kota Malang (145.28 km² total admin wilayah / 110.06 km² 5 kecamatan)
        '3574' => 56.67,   // Kota Probolinggo
        '3575' => 35.29,   // Kota Pasuruan
        '3576' => 20.21,   // Kota Mojokerto
        '3577' => 33.92,   // Kota Madiun
        '3578' => 350.54,  // Kota Surabaya
        '3579' => 136.74,  // Kota Batu
    ];

    /**
     * Verified official BPS fallback population statistics for all 38 Kabupaten/Kota in Jawa Timur.
     * Source: BPS Provinsi Jawa Timur (Sensus / Proyeksi Penduduk BPS 2023)
     */
    protected const JATIM_FALLBACK_POPULATION = [
        '3501' => 596649,
        '3502' => 972582,
        '3503' => 744358,
        '3504' => 1113973,
        '3505' => 1249497,
        '3506' => 1667450,
        '3507' => 2703175,
        '3508' => 1147261,
        '3509' => 2584771,
        '3510' => 1744814,
        '3511' => 784192,
        '3512' => 694081,
        '3513' => 1163859,
        '3514' => 1626029,
        '3515' => 2114588,
        '3516' => 1141516,
        '3517' => 1345886,
        '3518' => 1124247,
        '3519' => 765135,
        '3520' => 682466,
        '3521' => 881393,
        '3522' => 1322474,
        '3523' => 1215795,
        '3524' => 1386941,
        '3525' => 1344648,
        '3526' => 1101556,
        '3527' => 992210,
        '3528' => 862009,
        '3529' => 1143295,
        '3571' => 290836,
        '3572' => 153541,
        '3573' => 847182,
        '3574' => 245174,
        '3575' => 213450,
        '3576' => 135414,
        '3577' => 201460,
        '3578' => 2893698,
        '3579' => 218802,
    ];

    /**
     * Return GeoJSON FeatureCollection for Map Choropleth layer.
     *
     * Supported levels:
     * - 'regency' (default): All 38 Kabupaten & Kota in Provinsi Jawa Timur
     * - 'district': The 5 subdistricts of Kota Malang (preserved from Fase 1.5)
     */
    public function getMapChoroplethFeatureCollection(string $level = 'regency', string $domainId = '3500'): array
    {
        if ($level === 'district' || $domainId === '3573') {
            return $this->getKotaMalangDistrictsFeatureCollection();
        }

        return $this->getJawaTimurRegenciesFeatureCollection();
    }

    /**
     * Generate GeoJSON FeatureCollection for all 38 Kabupaten & Kota in Provinsi Jawa Timur.
     * Geometries are loaded from verified geoBoundaries IDN-ADM2 dataset (CC BY 3.0 IGO)
     * and joined with live/verified BPS population & density statistics.
     */
    public function getJawaTimurRegenciesFeatureCollection(): array
    {
        return Cache::remember('bps_map_layer_jatim_v2', now()->addHours(24), function () {
            // 1. Fetch live or fallback BPS statistics for 38 Jatim regencies
            $statsResult = $this->fetchJawaTimurRegencyStatistics();
            $regencyStats = $statsResult['data'];
            $statYear = $statsResult['year'];
            $statSource = $statsResult['source'];

            // 2. Load GeoJSON boundaries for 38 Jatim regencies
            $geoJsonPath = resource_path('data/geojson/jatim_regencies.geojson');

            if (!file_exists($geoJsonPath)) {
                Log::warning('[BpsLayer] jatim_regencies.geojson not found at ' . $geoJsonPath);
                return [
                    'type'     => 'FeatureCollection',
                    'status'   => 'boundaries_unavailable',
                    'message'  => 'File batas poligon administratif Jawa Timur tidak ditemukan.',
                    'metadata' => [
                        'boundaries_available' => false,
                        'region_name'          => 'Provinsi Jawa Timur',
                        'domain_id'            => '3500',
                    ],
                    'features' => [],
                ];
            }

            $rawGeoJson = json_decode(file_get_contents($geoJsonPath), true);
            $rawFeatures = $rawGeoJson['features'] ?? [];

            $features = [];
            $totalPopulation = 0;
            $districtStatsSummary = [];

            foreach ($rawFeatures as $feat) {
                $bpsCode = $feat['properties']['bps_code'] ?? null;
                $name    = $feat['properties']['name'] ?? 'Wilayah';
                $type    = $feat['properties']['type'] ?? (str_starts_with($name, 'Kota') ? 'kota' : 'kabupaten');

                $pop     = $regencyStats[$bpsCode] ?? self::JATIM_FALLBACK_POPULATION[$bpsCode] ?? null;
                $area    = self::JATIM_REGENCY_AREAS[$bpsCode] ?? null;
                $density = ($pop && $area) ? (int) round($pop / $area) : null;

                $color    = $this->regencyDensityToColor($density);
                $category = $this->regencyDensityToCategory($density);

                if ($pop !== null) {
                    $totalPopulation += $pop;
                    $districtStatsSummary[$name] = $pop;
                }

                $features[] = [
                    'type'       => 'Feature',
                    'properties' => [
                        'name'             => $name,
                        'type'             => $type,
                        'admin_level'      => 'regency',
                        'city'             => 'Provinsi Jawa Timur',
                        'bps_code'         => $bpsCode,
                        'population'       => $pop,
                        'area_km2'         => $area,
                        'density_per_km2'  => $density,
                        'density_category' => $category,
                        'color'            => $color,
                        'year'             => $statYear,
                        'source'           => $statSource,
                    ],
                    'geometry'   => $feat['geometry'],
                ];
            }

            $boundariesAvailable = count($features) > 0;

            return [
                'type'     => 'FeatureCollection',
                'status'   => $boundariesAvailable ? 'ok' : 'boundaries_unavailable',
                'message'  => $boundariesAvailable
                    ? 'Layer choropleth 38 Kabupaten/Kota Provinsi Jawa Timur berhasil dimuat.'
                    : 'Batas poligon administratif Jawa Timur tidak dapat dimuat.',
                'metadata' => [
                    'indicator'            => 'Kepadatan Penduduk Menurut Kabupaten/Kota',
                    'unit'                 => 'jiwa/km²',
                    'year'                 => $statYear,
                    'source'               => $statSource . ' · Geometri: geoBoundaries IDN-ADM2 (CC BY 3.0 IGO)',
                    'boundaries_available' => $boundariesAvailable,
                    'region_name'          => 'Provinsi Jawa Timur',
                    'domain_id'            => '3500',
                    'total_regencies'      => count($features),
                    'total_population'     => $totalPopulation > 0 ? $totalPopulation : 41416407,
                    'district_statistics'  => $districtStatsSummary,
                    'legend'               => [
                        ['min' => null, 'max' => 749,  'label' => '< 750 jiwa/km²',         'category' => 'Sangat Rendah', 'color' => '#e0e7ff'],
                        ['min' => 750,  'max' => 1499, 'label' => '750 – 1.499 jiwa/km²',   'category' => 'Rendah',        'color' => '#a5b4fc'],
                        ['min' => 1500, 'max' => 3999, 'label' => '1.500 – 3.999 jiwa/km²', 'category' => 'Sedang',        'color' => '#6366f1'],
                        ['min' => 4000, 'max' => 6999, 'label' => '4.000 – 6.999 jiwa/km²', 'category' => 'Tinggi',        'color' => '#4338ca'],
                        ['min' => 7000, 'max' => null, 'label' => '≥ 7.000 jiwa/km²',        'category' => 'Sangat Tinggi', 'color' => '#1e1b4b'],
                    ],
                ],
                'features' => $features,
            ];
        });
    }

    /**
     * Fetch live population for all 38 Kabupaten/Kota from BPS WebAPI (Domain 3500, Var 375),
     * or return official BPS verified fallback dataset.
     */
    protected function fetchJawaTimurRegencyStatistics(): array
    {
        if ($this->isConfigured()) {
            try {
                // Query Var 375 (Jumlah Penduduk Menurut Jenis Kelamin dan Kab/Kota Jatim)
                // th_id 123 represents year 2023
                $url = "{$this->baseUrl}/list/model/data/lang/ind/domain/3500/var/375/th/123/key/{$this->apiKey}/";
                $res = Http::timeout(8)->get($url);

                if ($res->successful()) {
                    $json = $res->json();
                    if (($json['status'] ?? '') === 'OK' && isset($json['datacontent']) && is_array($json['datacontent'])) {
                        $parsed = [];
                        foreach (self::JATIM_REGENCY_AREAS as $code => $area) {
                            // Key pattern in BPS datacontent: {code}375291230 (turvar 29: L+P)
                            $key = "{$code}375291230";
                            if (isset($json['datacontent'][$key]) && is_numeric($json['datacontent'][$key])) {
                                $parsed[$code] = (int) $json['datacontent'][$key];
                            }
                        }

                        if (count($parsed) >= 30) {
                            Log::info('[BpsLayer] Live Jatim population fetched via BPS WebAPI', ['count' => count($parsed)]);
                            return [
                                'data'   => $parsed,
                                'year'   => 2023,
                                'source' => 'Badan Pusat Statistik (BPS WebAPI Provinsi Jawa Timur)',
                            ];
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('[BpsLayer] Failed fetching live Jatim statistics from BPS WebAPI: ' . $e->getMessage());
            }
        }

        return [
            'data'   => self::JATIM_FALLBACK_POPULATION,
            'year'   => 2023,
            'source' => 'Badan Pusat Statistik (BPS Provinsi Jawa Timur Dalam Angka)',
        ];
    }

    /**
     * Map regency-level population density (jiwa/km²) to a 5-tier indigo choropleth colour.
     *
     * Thresholds calibrated for Kabupaten/Kota in Jawa Timur (302 – 8.255 jiwa/km²):
     *  Tier 1 — Sangat Rendah  : <   750  → #e0e7ff (indigo-100)  kabupaten pedesaan/luas
     *  Tier 2 — Rendah         : < 1.500  → #a5b4fc (indigo-300)  kabupaten agraris-berkembang
     *  Tier 3 — Sedang         : < 4.000  → #6366f1 (indigo-500)  kabupaten padat / penyangga kota
     *  Tier 4 — Tinggi         : < 7.000  → #4338ca (indigo-700)  kota madya otonom
     *  Tier 5 — Sangat Tinggi  : ≥ 7.000  → #1e1b4b (indigo-950)  kota metropolitan (Malang, Surabaya)
     */
    protected function regencyDensityToColor(?int $density): string
    {
        if ($density === null) return '#cbd5e1'; // data tidak tersedia — slate-300
        if ($density >= 7000)  return '#1e1b4b'; // Sangat Tinggi — indigo-950
        if ($density >= 4000)  return '#4338ca'; // Tinggi         — indigo-700
        if ($density >= 1500)  return '#6366f1'; // Sedang         — indigo-500
        if ($density >= 750)   return '#a5b4fc'; // Rendah         — indigo-300
        return '#e0e7ff';                        // Sangat Rendah  — indigo-100
    }

    /**
     * Map regency density to human-readable category.
     */
    protected function regencyDensityToCategory(?int $density): string
    {
        if ($density === null) return 'Data Tidak Tersedia';
        if ($density >= 7000)  return 'Sangat Tinggi';
        if ($density >= 4000)  return 'Tinggi';
        if ($density >= 1500)  return 'Sedang';
        if ($density >= 750)   return 'Rendah';
        return 'Sangat Rendah';
    }

    /**
     * Return GeoJSON features representing administrative districts of Kota Malang.
     * Preserved from Fase 1.5 for district-level view.
     */
    public function getKotaMalangDistrictsFeatureCollection(): array
    {
        return Cache::remember('bps_map_layer_malang_districts_v2', now()->addHours(24), function () {
            // 1. Retrieve verified live statistics for Malang districts from BPS WebAPI
            $liveData = $this->fetchLiveBpsIndicator('3573');
            $districtStats = $liveData['districts'] ?? [
                'Kedungkandang' => 219147,
                'Sukun'         => 207449,
                'Klojen'        => 100705,
                'Blimbing'      => 192345,
                'Lowokwaru'     => 172213,
            ];

            // Official area (km²) per kecamatan — Kota Malang BPS
            $districtAreas = [
                'Kedungkandang' => 39.89,
                'Sukun'         => 20.97,
                'Klojen'        => 8.83,
                'Blimbing'      => 17.77,
                'Lowokwaru'     => 22.60,
            ];

            // BPS kecamatan codes (BPS Kota Malang 3573)
            $districtCodes = [
                'Kedungkandang' => '3573010',
                'Sukun'         => '3573020',
                'Klojen'        => '3573030',
                'Blimbing'      => '3573040',
                'Lowokwaru'     => '3573050',
            ];

            // 2. Fetch village-level GeoJSON from JfrAziz/indonesia-district (HDX-BPS-2020)
            $features = $this->buildChoroplethFeaturesFromGeoJson($districtStats, $districtAreas, $districtCodes, $liveData);

            $boundariesAvailable = count($features) > 0;

            return [
                'type'     => 'FeatureCollection',
                'status'   => $boundariesAvailable ? 'ok' : 'boundaries_unavailable',
                'message'  => $boundariesAvailable
                    ? 'Layer kecamatan Kota Malang berhasil dimuat dari data batas administrasi HDX-BPS-2020.'
                    : 'Batas poligon administratif kecamatan Kota Malang tidak dapat dimuat saat ini. Data statistik kependudukan tersedia melalui BPS WebAPI.',
                'metadata' => [
                    'indicator'            => 'Kepadatan Penduduk & Statistik Kecamatan',
                    'unit'                 => 'jiwa/km²',
                    'year'                 => $liveData['year'] ?? 2025,
                    'source'               => 'Badan Pusat Statistik (BPS Kota Malang) · Geometri: JfrAziz/indonesia-district (HDX-BPS-2020)',
                    'boundaries_available' => $boundariesAvailable,
                    'region_name'          => 'Kota Malang',
                    'domain_id'            => '3573',
                    'total_population'     => $liveData['population'] ?? 891859,
                    'district_statistics'  => $districtStats,
                    'legend'               => [
                        ['min' => null,  'max' => 4999,  'label' => '< 5.000 jiwa/km²',           'category' => 'Sangat Rendah', 'color' => '#e0e7ff'],
                        ['min' => 5000,  'max' => 7999,  'label' => '5.000 – 7.999 jiwa/km²',     'category' => 'Rendah',        'color' => '#a5b4fc'],
                        ['min' => 8000,  'max' => 10499, 'label' => '8.000 – 10.499 jiwa/km²',    'category' => 'Sedang',        'color' => '#6366f1'],
                        ['min' => 10500, 'max' => 17999, 'label' => '10.500 – 17.999 jiwa/km²',   'category' => 'Tinggi',        'color' => '#4338ca'],
                        ['min' => 18000, 'max' => null,  'label' => '≥ 18.000 jiwa/km²',          'category' => 'Sangat Tinggi', 'color' => '#1e1b4b'],
                    ],
                ],
                'features' => $features,
            ];
        });
    }

    /**
     * Fetch village-level GeoJSON from JfrAziz/indonesia-district (HDX-BPS-2020),
     * group polygons by kecamatan, and build one MultiPolygon Feature per district
     * enriched with BPS population statistics and density choropleth colour.
     *
     * @param  array<string, int>    $districtStats  Population per district name
     * @param  array<string, float>  $districtAreas  Area km² per district name
     * @param  array<string, string> $districtCodes  BPS code per district name
     * @param  array|null            $liveData       Full live BPS result (for year/source)
     * @return array                                 GeoJSON Feature array (may be empty on failure)
     */
    protected function buildChoroplethFeaturesFromGeoJson(
        array $districtStats,
        array $districtAreas,
        array $districtCodes,
        ?array $liveData
    ): array {
        $url = 'https://raw.githubusercontent.com/JfrAziz/indonesia-district/master/id35_jawa_timur/id3573_kota_malang/id3573_kota_malang.geojson';

        try {
            $response = Http::timeout(12)->get($url);

            if (!$response->successful()) {
                Log::warning('[BpsLayer] GeoJSON fetch failed', ['http' => $response->status()]);
                return [];
            }

            $geoJson = $response->json();

            if (!isset($geoJson['features']) || !is_array($geoJson['features'])) {
                Log::warning('[BpsLayer] GeoJSON missing features array');
                return [];
            }

            // Group village polygons (MultiPolygon parts) by kecamatan name
            // Properties in JfrAziz dataset: "district" holds kecamatan name (Title Case)
            $grouped = []; // ['Kedungkandang' => [ [ring, ring, ...], ... ], ...]

            foreach ($geoJson['features'] as $feat) {
                $districtName = $feat['properties']['district'] ?? null;
                $geometry     = $feat['geometry'] ?? null;

                if (!$districtName || !$geometry) {
                    continue;
                }

                // Normalise casing to match our keys (Title Case)
                $districtName = ucwords(strtolower($districtName));

                if (!isset($districtStats[$districtName])) {
                    continue; // Not one of the 5 target districts
                }

                if (!isset($grouped[$districtName])) {
                    $grouped[$districtName] = [];
                }

                // Each village may be a Polygon or MultiPolygon in the source
                if ($geometry['type'] === 'Polygon') {
                    // Wrap outer ring as one MultiPolygon part
                    $grouped[$districtName][] = $geometry['coordinates'];
                } elseif ($geometry['type'] === 'MultiPolygon') {
                    foreach ($geometry['coordinates'] as $part) {
                        $grouped[$districtName][] = $part;
                    }
                }
            }

            if (empty($grouped)) {
                Log::warning('[BpsLayer] No village features matched target districts');
                return [];
            }

            // Build one GeoJSON Feature per kecamatan
            $features = [];
            $year     = $liveData['year'] ?? 2025;
            $source   = $liveData['source'] ?? 'BPS Kota Malang (HDX-BPS-2020)';

            foreach ($districtStats as $name => $population) {
                if (!isset($grouped[$name])) {
                    Log::info("[BpsLayer] No geometries found for district: {$name}");
                    continue;
                }

                $areaKm2   = $districtAreas[$name] ?? null;
                $bpsCode   = $districtCodes[$name] ?? null;
                $density   = ($areaKm2 && $population) ? (int) round($population / $areaKm2) : null;
                $color     = $this->densityToColor($density);
                $category  = $this->densityToCategory($density);

                $features[] = [
                    'type'       => 'Feature',
                    'properties' => [
                        'name'             => $name,
                        'city'             => 'Kota Malang',
                        'bps_code'         => $bpsCode,
                        'population'       => $population,
                        'area_km2'         => $areaKm2,
                        'density_per_km2'  => $density,
                        'density_category' => $category,
                        'color'            => $color,
                        'year'             => $year,
                        'source'           => $source,
                    ],
                    'geometry'   => [
                        'type'        => 'MultiPolygon',
                        'coordinates' => $grouped[$name],
                    ],
                ];
            }

            Log::info('[BpsLayer] Choropleth built', ['districts' => count($features)]);
            return $features;

        } catch (\Throwable $e) {
            Log::error('[BpsLayer] Exception building choropleth: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Map population density (jiwa/km²) to a 5-tier indigo choropleth colour.
     *
     * Thresholds calibrated so that Kota Malang's 5 kecamatan (5.494 – 11.405 jiwa/km²)
     * each receive a visually distinct colour band, while also being meaningful
     * for other Indonesian cities:
     *
     *  Tier 1 — Sangat Rendah  : <  5.000  → #e0e7ff (indigo-100)  pinggiran/kabupaten
     *  Tier 2 — Rendah         : <  8.000  → #a5b4fc (indigo-300)  kota kecil-menengah
     *  Tier 3 — Sedang         : < 10.500  → #6366f1 (indigo-500)  kota menengah padat
     *  Tier 4 — Tinggi         : < 18.000  → #4338ca (indigo-700)  kota besar
     *  Tier 5 — Sangat Tinggi  : ≥ 18.000  → #1e1b4b (indigo-950)  metropolitan / CBD
     *
     * Expected result for Kota Malang:
     *   Kedungkandang  5.494  → Sangat Rendah  (#e0e7ff)
     *   Lowokwaru      7.620  → Rendah         (#a5b4fc)
     *   Sukun          9.893  → Sedang          (#6366f1)
     *   Blimbing      10.824  → Tinggi          (#4338ca)   [10.500–17.999]
     *   Klojen        11.405  → Tinggi          (#4338ca)   [10.500–17.999]
     *
     * NULL density (data tidak tersedia) → grey sentinel '#cbd5e1' (slate-300)
     * agar tidak disalahartikan sebagai kepadatan rendah.
     */
    protected function densityToColor(?int $density): string
    {
        if ($density === null) return '#cbd5e1'; // data tidak tersedia — slate-300
        if ($density >= 18000) return '#1e1b4b'; // Sangat Tinggi — indigo-950
        if ($density >= 10500) return '#4338ca'; // Tinggi         — indigo-700
        if ($density >= 8000)  return '#6366f1'; // Sedang         — indigo-500
        if ($density >= 5000)  return '#a5b4fc'; // Rendah         — indigo-300
        return '#e0e7ff';                        // Sangat Rendah  — indigo-100
    }

    /**
     * Map population density to a human-readable category label.
     * Returns 'Data Tidak Tersedia' for null so callers can distinguish
     * missing data from a legitimately low-density area.
     */
    protected function densityToCategory(?int $density): string
    {
        if ($density === null) return 'Data Tidak Tersedia';
        if ($density >= 18000) return 'Sangat Tinggi';
        if ($density >= 10500) return 'Tinggi';
        if ($density >= 8000)  return 'Sedang';
        if ($density >= 5000)  return 'Rendah';
        return 'Sangat Rendah';
    }
}
