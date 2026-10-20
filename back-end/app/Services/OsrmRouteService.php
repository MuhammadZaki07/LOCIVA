<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OsrmRouteService
{
    protected ?string $apiKey;
    protected string $baseUrl;
    protected string $fallbackOsrmUrl;

    public function __construct()
    {
        $this->apiKey          = config('services.osrmroute.api_key');
        $this->baseUrl        = rtrim(config('services.osrmroute.base_url', 'https://api.osrmroute.com/v1'), '/');
        $this->fallbackOsrmUrl = 'https://router.project-osrm.org';
    }

    /**
     * Check if OSRMRoute API key is configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && is_string($this->apiKey) && strlen(trim($this->apiKey)) > 5;
    }

    /**
     * Get integration status.
     */
    public function getStatus(): array
    {
        return [
            'is_configured'    => $this->isConfigured(),
            'provider'         => 'OSRMRoute API (Commercial OSRM Engine)',
            'portal_url'       => 'https://osrmroute.com',
            'routing_docs_url' => 'https://osrmroute.com/services/routing',
            'places_docs_url'  => 'https://osrmroute.com/services/places',
            'has_fallback'     => true,
            'fallback_service' => 'Public OSRM / Overpass API',
            'message'          => $this->isConfigured()
                ? 'OSRMRoute API Key terpasang. Layanan routing & places aktif dengan fallback otomatis.'
                : 'OSRMRoute API Key belum diisi di backend (.env: OSRMROUTE_API_KEY=). Menggunakan fallback routing standar.',
        ];
    }

    /**
     * Calculate route polyline, distance, and duration across multiple waypoints.
     * Coordinates format: [[lng, lat], [lng, lat], ...]
     */
    public function calculateRoute(array $coordinates, string $profile = 'driving'): array
    {
        if (count($coordinates) < 2) {
            abort(422, 'Minimal 2 titik koordinat untuk menghitung rute.');
        }

        $coordString = implode(';', array_map(function ($c) {
            return "{$c[0]},{$c[1]}";
        }, $coordinates));

        $cacheKey = 'route_' . md5($coordString . '_' . $profile . ($this->isConfigured() ? '_osrmroute' : '_fallback'));

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($coordString, $coordinates, $profile) {
            // 1. Try OSRMRoute API if configured
            if ($this->isConfigured()) {
                try {
                    $url = "{$this->baseUrl}/route/{$profile}/{$coordString}";
                    $res = Http::timeout(5)
                        ->withHeaders(['Authorization' => "Bearer {$this->apiKey}"])
                        ->get($url, [
                            'overview'    => 'full',
                            'geometries'  => 'geojson',
                            'steps'       => 'true',
                            'annotations' => 'distance,duration',
                        ]);

                    if ($res->successful()) {
                        $json = $res->json();
                        if (!empty($json['routes'][0])) {
                            $route = $json['routes'][0];
                            return [
                                'provider'         => 'osrmroute',
                                'success'          => true,
                                'distance_meters'  => $route['distance'] ?? 0,
                                'distance_km'      => round(($route['distance'] ?? 0) / 1000, 2),
                                'duration_seconds' => $route['duration'] ?? 0,
                                'duration_minutes' => round(($route['duration'] ?? 0) / 60),
                                'coordinates'      => $route['geometry']['coordinates'] ?? [],
                                'legs'             => $route['legs'] ?? [],
                            ];
                        }
                    }

                    Log::warning('OSRMRoute request failed, switching to public OSRM fallback', [
                        'status' => $res->status(),
                        'body'   => $res->body(),
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('OSRMRoute exception: ' . $e->getMessage() . '. Using fallback.');
                }
            }

            // 2. Safe Fallback: Public OSRM routing engine
            try {
                $fallbackUrl = "{$this->fallbackOsrmUrl}/route/v1/{$profile}/{$coordString}?overview=full&geometries=geojson&steps=true";
                $res = Http::timeout(8)->get($fallbackUrl);

                if ($res->successful()) {
                    $json = $res->json();
                    if (!empty($json['routes'][0])) {
                        $route = $json['routes'][0];
                        return [
                            'provider'         => 'osrm_public_fallback',
                            'success'          => true,
                            'distance_meters'  => $route['distance'] ?? 0,
                            'distance_km'      => round(($route['distance'] ?? 0) / 1000, 2),
                            'duration_seconds' => $route['duration'] ?? 0,
                            'duration_minutes' => round(($route['duration'] ?? 0) / 60),
                            'coordinates'      => $route['geometry']['coordinates'] ?? [],
                            'legs'             => $route['legs'] ?? [],
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::error('OSRM fallback failed: ' . $e->getMessage());
            }

            // 3. Last-resort geometric line calculation
            $approxDist = 0;
            for ($i = 0; $i < count($coordinates) - 1; $i++) {
                $approxDist += $this->haversine($coordinates[$i][1], $coordinates[$i][0], $coordinates[$i+1][1], $coordinates[$i+1][0]);
            }

            return [
                'provider'         => 'direct_line_estimate',
                'success'          => true,
                'is_approximate'   => true,
                'distance_meters'  => round($approxDist),
                'distance_km'      => round($approxDist / 1000, 2),
                'duration_seconds' => round(($approxDist / 1000) * 180),
                'duration_minutes' => round(($approxDist / 1000) * 3),
                'coordinates'      => $coordinates,
                'legs'             => [],
            ];
        });
    }

    /**
     * Search places near coordinates via OSRMRoute Places API if available.
     */
    public function searchPlaces(float $lat, float $lng, int $radius = 1000, ?string $category = null): array
    {
        if (!$this->isConfigured()) {
            return [
                'provider'      => 'osrmroute',
                'status'        => 'unconfigured',
                'message'       => 'OSRMROUTE_API_KEY belum dikonfigurasi. Pencarian tempat mengandalkan Overpass API di klien.',
                'places'        => [],
            ];
        }

        $cacheKey = "osrmroute_places_{$lat}_{$lng}_{$radius}_{$category}";

        return Cache::remember($cacheKey, now()->addHours(12), function () use ($lat, $lng, $radius, $category) {
            try {
                $params = [
                    'lat'    => $lat,
                    'lng'    => $lng,
                    'radius' => $radius,
                ];
                if ($category) {
                    $params['category'] = $category;
                }

                $res = Http::timeout(6)
                    ->withHeaders(['Authorization' => "Bearer {$this->apiKey}"])
                    ->get("{$this->baseUrl}/places/nearby", $params);

                if ($res->successful()) {
                    return [
                        'provider' => 'osrmroute',
                        'status'   => 'success',
                        'places'   => $res->json()['places'] ?? [],
                    ];
                }
            } catch (\Throwable $th) {
                Log::warning('OSRMRoute Places API call failed: ' . $th->getMessage());
            }

            return [
                'provider' => 'osrmroute',
                'status'   => 'error',
                'places'   => [],
            ];
        });
    }

    protected function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * $earth * asin(min(1, sqrt($h)));
    }
}
