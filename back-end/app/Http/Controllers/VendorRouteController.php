<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Models\Business;
use App\Models\Poi;
use App\Models\VendorRoute;
use App\Services\OsrmRouteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VendorRouteController extends Controller
{
    /**
     * Get shared public vendor routes for display on the map.
     */
    public function publicRoutes(Request $request)
    {
        $query = VendorRoute::with(['business:id,name,latitude,longitude'])
            ->where('is_shared', true)
            ->select(
                'id',
                'user_id',
                'business_id',
                'name',
                'waypoints',
                'route_coordinates',
                'start_location_name',
                'end_location_name',
                'distance',
                'estimated_duration',
                'status',
                'notes',
                'created_at'
            );

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $routes = $query->latest()->limit(50)->get();

        return ApiResponse::success(
            $routes,
            'Public vendor routes retrieved successfully'
        );
    }

    /**
     * Display a listing of the user's vendor routes.
     */
    public function index(Request $request)
    {
        $request->validate([
            'search'      => 'nullable|string|max:200',
            'status'      => 'nullable|string|max:50',
            'business_id' => 'nullable|string|max:50',
            'sort_by'     => 'nullable|in:created_at,name,distance,estimated_duration',
            'sort_order'  => 'nullable|in:asc,desc',
            'per_page'    => 'nullable|integer|min:1|max:100',
            'page'        => 'nullable|integer|min:1',
        ]);

        $query = VendorRoute::with(['business:id,name,latitude,longitude'])
            ->where('user_id', Auth::id());

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('business_id') && $request->business_id !== 'all') {
            $query->where('business_id', $request->business_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('start_location_name', 'like', "%{$search}%")
                    ->orWhere('end_location_name', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $routes = $query->paginate($perPage);

        return ApiResponse::success($routes, 'User vendor routes retrieved successfully');
    }

    /**
     * Store a newly created vendor route plan.
     */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                      => 'required|string|max:150',
            'business_id'               => 'nullable|exists:businesses,id',
            'waypoints'                 => 'required|array|min:2',
            'waypoints.*.lat'           => 'required|numeric|between:-90,90',
            'waypoints.*.lng'           => 'required|numeric|between:-180,180',
            'waypoints.*.name'          => 'nullable|string|max:200',
            'waypoints.*.stop_duration' => 'nullable|integer|min:0|max:1440',
            'start_location_name'       => 'nullable|string|max:200',
            'end_location_name'         => 'nullable|string|max:200',
            'distance'                  => 'nullable|numeric|min:0|max:1000',
            'estimated_duration'        => 'nullable|integer|min:0|max:10000',
            'status'                    => 'nullable|in:planned,active,inactive,completed',
            'is_shared'                 => 'sometimes|boolean',
            'notes'                     => 'nullable|string|max:1000',
            'route_coordinates'         => 'nullable|array',
            'route_coordinates.*'       => 'required|array|size:2',
            'route_coordinates.*.0'     => 'required|numeric|between:-90,90',
            'route_coordinates.*.1'     => 'required|numeric|between:-180,180',
        ]);

        $validated['user_id'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'active';

        $route = VendorRoute::create($validated);

        return ApiResponse::success(
            $route,
            'Rute usaha keliling berhasil disimpan',
            201
        );
    }

    /**
     * Display the specified vendor route.
     */
    public function show(string $id)
    {
        $route = VendorRoute::with(['business:id,name,latitude,longitude'])->find($id);

        if (!$route) {
            return ApiResponse::notFound('Rute tidak ditemukan.');
        }

        // Authorization check: only owner or public shared routes
        if ($route->user_id !== Auth::id() && !$route->is_shared) {
            return ApiResponse::forbidden('Anda tidak memiliki akses ke rute ini.');
        }

        return ApiResponse::success($route, 'Detail rute berhasil diambil');
    }

    /**
     * Update the specified vendor route.
     */
    public function update(Request $request, string $id)
    {
        $route = VendorRoute::find($id);

        if (!$route) {
            return ApiResponse::notFound('Rute tidak ditemukan.');
        }

        if ($route->user_id !== Auth::id()) {
            return ApiResponse::forbidden('Anda tidak memiliki izin mengubah rute ini.');
        }

        $validated = $request->validate([
            'name'                => 'sometimes|required|string|max:150',
            'business_id'         => 'nullable|exists:businesses,id',
            'waypoints'           => 'sometimes|required|array|min:2',
            'waypoints.*.lat'     => 'required|numeric|between:-90,90',
            'waypoints.*.lng'     => 'required|numeric|between:-180,180',
            'waypoints.*.name'    => 'nullable|string|max:200',
            'waypoints.*.stop_duration' => 'nullable|integer|min:0|max:1440',
            'start_location_name' => 'nullable|string|max:200',
            'end_location_name'   => 'nullable|string|max:200',
            'distance'            => 'nullable|numeric|min:0|max:1000',
            'estimated_duration'  => 'nullable|integer|min:0|max:10000',
            'status'              => 'nullable|string|in:planned,active,completed',
            'is_shared'           => 'boolean',
            'notes'               => 'nullable|string|max:1000',
            'route_coordinates'   => 'nullable|array',
        ]);

        $route->update($validated);

        return ApiResponse::success($route, 'Rute berhasil diperbarui');
    }

    /**
     * Remove the specified vendor route.
     */
    public function destroy(string $id)
    {
        $route = VendorRoute::find($id);

        if (!$route) {
            return ApiResponse::notFound('Rute tidak ditemukan.');
        }

        if ($route->user_id !== Auth::id()) {
            return ApiResponse::forbidden('Anda tidak memiliki izin menghapus rute ini.');
        }

        $route->delete();

        return ApiResponse::success(null, 'Rute berhasil dihapus');
    }

    /**
     * Recommend potential mobile vending spot locations around an area (Masalah 3 B).
     * Transparently explains criteria: high pedestrian traffic POIs (campuses, transit hubs, schools, markets).
     */
    public function recommendations(Request $request)
    {
        $request->validate([
            'lat'    => 'required|numeric|between:-90,90',
            'lng'    => 'required|numeric|between:-180,180',
            'radius' => 'nullable|numeric|min:100|max:10000',
        ]);

        $lat = (float) $request->lat;
        $lng = (float) $request->lng;
        $radius = (float) ($request->radius ?? 3000);

        // Fetch high-footfall POIs within radius
        $pois = Poi::selectRaw(
            'id, name, category, address, latitude, longitude,
            (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
            [$lat, $lng, $lat]
        )
            ->whereIn('category', ['university', 'transit_station', 'school', 'market', 'commercial'])
            ->having('distance', '<=', $radius)
            ->orderBy('distance')
            ->limit(10)
            ->get();

        $recommendations = $pois->map(function ($poi) {
            $footfallScore = match ($poi->category) {
                'university'      => 92,
                'transit_station' => 95,
                'market'          => 88,
                'school'          => 82,
                default           => 75,
            };

            return [
                'id'              => $poi->id,
                'name'            => $poi->name,
                'category'        => $poi->category,
                'lat'             => (float) $poi->latitude,
                'lng'             => (float) $poi->longitude,
                'address'         => $poi->address,
                'distance_meters' => (int) round($poi->distance),
                'footfall_score'  => $footfallScore,
                'reason'          => "Kawasan {$poi->category} memiliki arus pejalan kaki tinggi pada jam aktif, ideal sebagai titik singgah usaha keliling.",
                'source'          => 'LOCIVA Benchmark POI Infrastructure',
            ];
        });

        return ApiResponse::success([
            'center'          => ['lat' => $lat, 'lng' => $lng],
            'radius_m'        => $radius,
            'recommendations' => $recommendations,
            'methodology'     => 'Rekomendasi didasarkan pada kedekatan fasilitas publik berkepadatan pejalan kaki tinggi (kampus, sentral transit, pasar).',
        ], 'Rekomendasi titik lokasi usaha keliling berhasil dihitung');
    }

    public function aiPlanRoute(Request $request, OsrmRouteService $osrmService)
    {
$aiUrl = config('services.ai.url');
$aiModel = config('services.ai.model');
$timeout = (int) config('services.ai.timeout', 95);

if (empty($aiUrl) || empty($aiModel)) {
    Log::error('LOCIVA AI configuration is incomplete.');

    return ApiResponse::error(
        'Konfigurasi server AI belum lengkap. Periksa AI_CHAT_URL dan AI_MODEL.',
        500
    );
}

        $isAreaAnalysis = $request->has('center') || $request->has('lat') || $request->has('business_id') || $request->has('radius') || $request->has('radius_meters');

        // LEGACY MODE SUPPORT: If request does not specify area parameters
        if (!$isAreaAnalysis) {
            $request->validate([
                'prompt'            => 'required|string|max:500',
                'candidates'        => 'required|array|min:2',
                'candidates.*.id'   => 'required',
                'candidates.*.name' => 'required|string',
                'candidates.*.lat'  => 'required|numeric',
                'candidates.*.lng'  => 'required|numeric',
            ]);

            $userPrompt = trim((string) $request->input('prompt'));
            $rawCandidates = (array) $request->input('candidates');

            $compactCandidates = array_map(function ($c) {
                return [
                    'id'       => $c['id'],
                    'name'     => $c['name'],
                    'category' => $c['category'] ?? 'poi',
                    'score'    => $c['footfall_score'] ?? 80,
                ];
            }, array_slice($rawCandidates, 0, 10));

            $systemMessage = "You are LOCIVA's AI Route Planning Assistant for mobile vendors in Indonesia. "
                . "Provide concise answers. Do not overthink. "
                . "Select and arrange the most optimal sequence of stops based ONLY on the provided verified LOCIVA candidate IDs. "
                . "NEVER invent coordinates or IDs. "
                . "Output JSON strictly with candidate IDs:\n"
                . json_encode([
                    'route_name' => 'Nama Rute yang Menarik',
                    'explanation' => 'Penjelasan ringkas alasan rute dan waktu terbaik.',
                    'waypoint_ids' => ['id_1', 'id_2']
                ]);

            $promptContent = "Permintaan Rute Pedagang: \"{$userPrompt}\"\n\n"
                . "Daftar Titik Lokasi Resmi LOCIVA:\n"
                . json_encode($compactCandidates);

            return $this->executeAiChatRequest($aiUrl, $aiModel, $timeout, $systemMessage, $promptContent, true);
        }

        // ─────────────────────────────────────────────────────────────────
        // WORKFLOW: Area-Based Geographical Analysis & Complete Connected Route
        // ─────────────────────────────────────────────────────────────────
        $request->validate([
            'business_id'                => 'nullable|string|max:100',
            'center'                     => 'nullable|array',
            'center.lat'                 => 'nullable|numeric|between:-90,90',
            'center.lng'                 => 'nullable|numeric|between:-180,180',
            'lat'                        => 'nullable|numeric|between:-90,90',
            'lng'                        => 'nullable|numeric|between:-180,180',
            'radius'                     => 'nullable|numeric|between:100,15000',
            'radius_meters'              => 'nullable|numeric|between:100,15000',
            'external_places'            => 'nullable|array|max:300',
            'external_places.*.id'       => 'nullable|string|max:100',
            'external_places.*.name'     => 'required_with:external_places|string|max:200',
            'external_places.*.category' => 'nullable|string|max:80',
            'external_places.*.lat'      => 'nullable|numeric|between:-90,90',
            'external_places.*.lng'      => 'nullable|numeric|between:-180,180',
            'prompt'                     => 'nullable|string|max:500',
        ]);

        $businessId     = $request->input('business_id');
        $centerLat      = $request->input('center.lat', $request->input('lat'));
        $centerLng      = $request->input('center.lng', $request->input('lng'));
        $radiusMeters   = (float) $request->input('radius_meters', $request->input('radius', 2000));
        $externalPlaces = (array) $request->input('external_places', []);
        $userPrompt     = trim((string) $request->input('prompt', ''));

        // 1. Resolve selected business context
        $selectedBusiness = null;
        if (!empty($businessId)) {
            $selectedBusiness = Business::with('businessType')->find($businessId);
        }

        if ($centerLat === null || $centerLng === null) {
            if ($selectedBusiness && $selectedBusiness->latitude && $selectedBusiness->longitude) {
                $centerLat = (float) $selectedBusiness->latitude;
                $centerLng = (float) $selectedBusiness->longitude;
            } else {
                return ApiResponse::error('Pusat area analisis geografis (latitude & longitude) wajib ditentukan.', 422);
            }
        } else {
            $centerLat = (float) $centerLat;
            $centerLng = (float) $centerLng;
        }

        $selectedBusinessData = [
            'id'            => $selectedBusiness ? (string) $selectedBusiness->id : ($request->input('business_id') ?: 'selected-business'),
            'name'          => $selectedBusiness ? $selectedBusiness->name : ($request->input('business_name') ?: 'Usaha Keliling'),
            'business_type' => $selectedBusiness?->businessType?->slug ?? $selectedBusiness?->businessType?->name ?? $request->input('business_type', 'food_vendor'),
            'lat'           => $selectedBusiness ? (float) $selectedBusiness->latitude : $centerLat,
            'lng'           => $selectedBusiness ? (float) $selectedBusiness->longitude : $centerLng,
        ];

        // 2. Query registered businesses within radius
        $registeredBusinesses = collect();
        try {
            $registeredBusinesses = Business::with('businessType:id,name,slug,category')
                ->selectRaw(
                    '*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                    [$centerLat, $centerLng, $centerLat]
                )
                ->having('distance', '<=', $radiusMeters)
                ->orderBy('distance')
                ->limit(50)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('Gagal query businesses di aiPlanRoute: ' . $e->getMessage());
        }

        // 3. Query internal POIs within radius
        $internalPois = collect();
        try {
            $internalPois = Poi::selectRaw(
                '*, (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
                [$centerLat, $centerLng, $centerLat]
            )
                ->having('distance', '<=', $radiusMeters)
                ->orderBy('distance')
                ->limit(100)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('Gagal query POIs di aiPlanRoute: ' . $e->getMessage());
        }

        // 4. Normalize & Deduplicate all data sources into consistent structure
        $normalizedCandidates = [];
        $normalizedMap = [];

        // 4a. Add registered businesses
        foreach ($registeredBusinesses as $biz) {
            $bLat = (float) $biz->latitude;
            $bLng = (float) $biz->longitude;
            $cid = 'biz-' . $biz->id;
            $item = [
                'id'          => $cid,
                'original_id' => (string) $biz->id,
                'source'      => 'business',
                'name'        => $biz->name,
                'category'    => $biz->businessType?->slug ?? $biz->businessType?->category ?? 'usaha',
                'lat'         => $bLat,
                'lng'         => $bLng,
                'distance'    => round((float) $biz->distance),
            ];
            $normalizedCandidates[] = $item;
            $normalizedMap[$cid] = $item;
        }

        // 4b. Add internal POIs
        foreach ($internalPois as $poi) {
            $pLat = (float) $poi->latitude;
            $pLng = (float) $poi->longitude;
            $cid = 'poi-' . $poi->id;
            $item = [
                'id'          => $cid,
                'original_id' => (string) $poi->id,
                'source'      => 'internal_poi',
                'name'        => $poi->name,
                'category'    => $poi->category ?? 'poi',
                'lat'         => $pLat,
                'lng'         => $pLng,
                'distance'    => round((float) $poi->distance),
            ];
            $normalizedCandidates[] = $item;
            $normalizedMap[$cid] = $item;
        }

        // 4c. Add OpenStreetMap POIs (with deduplication against internal entities)
        foreach ($externalPlaces as $osm) {
            if (empty($osm['name']) || !isset($osm['lat'], $osm['lng'])) {
                continue;
            }
            $oLat = (float) $osm['lat'];
            $oLng = (float) $osm['lng'];
            $dist = $this->haversine($centerLat, $centerLng, $oLat, $oLng);
            if ($dist > $radiusMeters) {
                continue;
            }

            // Deduplicate if matching existing entity within 50 meters
            $isDuplicate = false;
            $osmName = strtolower(trim($osm['name']));
            foreach ($normalizedCandidates as $existing) {
                $prox = $this->haversine($oLat, $oLng, $existing['lat'], $existing['lng']);
                if ($prox <= 50) {
                    $existingName = strtolower(trim($existing['name']));
                    if ($existingName === $osmName || str_contains($existingName, $osmName) || str_contains($osmName, $existingName)) {
                        $isDuplicate = true;
                        break;
                    }
                }
            }

            if ($isDuplicate) {
                continue;
            }

            $cid = 'osm-' . ($osm['id'] ?? md5($osm['name'] . $oLat . $oLng));
            $item = [
                'id'          => $cid,
                'original_id' => isset($osm['id']) ? (string) $osm['id'] : null,
                'source'      => 'osm_poi',
                'name'        => $osm['name'],
                'category'    => $osm['category'] ?? 'poi',
                'lat'         => $oLat,
                'lng'         => $oLng,
                'distance'    => round($dist),
            ];
            $normalizedCandidates[] = $item;
            $normalizedMap[$cid] = $item;
        }

        // 4d. Ensure selected business is available as an option if valid
        if ($selectedBusiness && !empty($selectedBusiness->latitude) && !empty($selectedBusiness->longitude)) {
            $bizCid = 'biz-' . $selectedBusiness->id;
            if (!isset($normalizedMap[$bizCid])) {
                $item = [
                    'id'          => $bizCid,
                    'original_id' => (string) $selectedBusiness->id,
                    'source'      => 'business',
                    'name'        => $selectedBusiness->name,
                    'category'    => $selectedBusiness->businessType?->slug ?? 'usaha',
                    'lat'         => (float) $selectedBusiness->latitude,
                    'lng'         => (float) $selectedBusiness->longitude,
                    'distance'    => round($this->haversine($centerLat, $centerLng, (float) $selectedBusiness->latitude, (float) $selectedBusiness->longitude)),
                ];
                array_unshift($normalizedCandidates, $item);
                $normalizedMap[$bizCid] = $item;
            }
        }

        // 5. Minimum candidate check
        if (count($normalizedCandidates) < 2) {
            return ApiResponse::error(
                'Data geografis di area ini tidak mencukupi (ditemukan ' . count($normalizedCandidates) . ' lokasi terverifikasi dalam radius ' . $radiusMeters . 'm). Silakan perbesar radius atau pilih area yang lebih aktif.',
                422,
                [
                    'insufficient_data' => true,
                    'candidate_count'   => count($normalizedCandidates),
                ]
            );
        }

        // 6. Select top 8 candidates (reduced from 16 to shrink prompt & speed up inference)
        $promptCandidates = array_slice($normalizedCandidates, 0, 8);
        $compactList = array_map(function ($c) {
            return [
                'id'  => $c['id'],
                'n'   => $c['name'],
                'cat' => $c['category'],
                'dist'=> $c['distance'] . 'm',
            ];
        }, $promptCandidates);

        // 7. Formulate AI Prompt (concise to reduce inference time)
        $systemMessage = "Kamu adalah perencana rute LOCIVA untuk pedagang keliling di Indonesia.\n"
            . "Analisis area dan keluarkan HANYA JSON valid (tanpa markdown) dengan kunci:\n"
            . "route_name, start_point{id,reason}, recommended_waypoints[{id,reason,stop_duration_minutes}], "
            . "end_point{id,reason}, explanation, analysis_factors[{factor,finding,impact_on_route}]\n"
            . "ATURAN: Hanya gunakan ID dari daftar yang disediakan. start_point != end_point. Jawab ringkas.";

        $promptContent = "Usaha: \"{$selectedBusinessData['name']}\" ({$selectedBusinessData['business_type']})\n"
            . "Area: {$centerLat},{$centerLng} radius {$radiusMeters}m\n"
            . ($userPrompt ? "Preferensi: \"{$userPrompt}\"\n" : '')
            . "Lokasi:\n"
            . json_encode($compactList, JSON_UNESCAPED_UNICODE);

        // 8. Execute AI Request
try {
    $aiResponse = Http::timeout($timeout)
        ->connectTimeout(15)
        ->acceptJson()
        ->asJson()
        ->post($aiUrl, [
            'model' => $aiModel,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => $systemMessage,
                ],
                [
                    'role' => 'user',
                    'content' => $promptContent,
                ],
            ],
            'stream' => false,
            'think' => false,
            'options' => [
                'temperature' => 0.3,
                'num_ctx' => 2048,
                'num_predict' => 800,
            ],
        ]);

    if ($aiResponse->status() === 524) {
        Log::warning('LOCIVA AI Cloudflare timeout', [
            'url' => $aiUrl,
            'status' => 524,
        ]);

        return ApiResponse::error(
            'Server AI membutuhkan waktu terlalu lama untuk menghasilkan rekomendasi. Silakan coba kembali.',
            504
        );
    }

    if ($aiResponse->failed()) {
        Log::error('LOCIVA AI returned HTTP error', [
            'url' => $aiUrl,
            'status' => $aiResponse->status(),
            'response' => substr($aiResponse->body(), 0, 1000),
        ]);

        return ApiResponse::error(
            'Server AI mengembalikan kesalahan HTTP ' . $aiResponse->status() . '.',
            502
        );
    }

    $body = $aiResponse->json();

    if (!is_array($body)) {
        Log::error('LOCIVA AI returned invalid JSON response.');

        return ApiResponse::error(
            'Respons server AI tidak memiliki format JSON yang valid.',
            502
        );
    }

    $rawContent = $body['message']['content'] ?? null;

    if (!is_string($rawContent) || trim($rawContent) === '') {
        Log::warning('LOCIVA AI returned empty content.', [
            'response' => $body,
        ]);

        return ApiResponse::error(
            'Model AI tidak menghasilkan konten rekomendasi rute.',
            502
        );
    }

    // 9. Parse AI output JSON
    $parsedAi = $this->extractJson($rawContent);

    if (empty($parsedAi)) {
        Log::warning('LOCIVA AI returned invalid route JSON.', [
            'content' => substr($rawContent, 0, 2000),
        ]);

        return ApiResponse::error(
            'Model AI menghasilkan respons yang tidak sesuai format rekomendasi rute. Silakan coba kembali.',
            502
        );
    }
            $routeName = !empty($parsedAi['route_name'])
                ? trim($parsedAi['route_name'])
                : 'Rekomendasi Rute Area ' . $selectedBusinessData['name'];

            $explanation = !empty($parsedAi['explanation'])
                ? trim($parsedAi['explanation'])
                : 'Rute disusun berdasarkan kepadatan fasilitas publik, rute jalan terhubung, dan potensi keramaian.';

            $analysisFactors = [];
            if (!empty($parsedAi['analysis_factors']) && is_array($parsedAi['analysis_factors'])) {
                foreach ($parsedAi['analysis_factors'] as $factor) {
                    if (is_array($factor) && !empty($factor['factor'])) {
                        $analysisFactors[] = [
                            'factor'          => trim((string) $factor['factor']),
                            'finding'         => trim((string) ($factor['finding'] ?? '')),
                            'impact_on_route' => trim((string) ($factor['impact_on_route'] ?? '')),
                        ];
                    }
                }
            }
            if (empty($analysisFactors)) {
                $analysisFactors = [
                    [
                        'factor'          => 'Distribusi Titik Keramaian Terverifikasi',
                        'finding'         => count($promptCandidates) . ' lokasi teridentifikasi dalam radius ' . $radiusMeters . 'm.',
                        'impact_on_route' => 'Rute menghubungkan koridor dengan aktivitas pejalan kaki tertinggi.',
                    ]
                ];
            }

            // 10. Match and strictly validate start_point, end_point, waypoints against candidate pool
            $rawStartId = $parsedAi['start_point']['id'] ?? ($parsedAi['start_point'] ?? null);
            if (is_array($rawStartId)) $rawStartId = $rawStartId['id'] ?? null;
            $matchedStart = ($rawStartId && isset($normalizedMap[$rawStartId]))
                ? $normalizedMap[$rawStartId]
                : $promptCandidates[0];

            $startReason = !empty($parsedAi['start_point']['reason'])
                ? trim($parsedAi['start_point']['reason'])
                : 'Titik awal rute dengan akses strategis dan persiapan awal pedagang.';

            $rawEndId = $parsedAi['end_point']['id'] ?? ($parsedAi['end_point'] ?? null);
            if (is_array($rawEndId)) $rawEndId = $rawEndId['id'] ?? null;
            $matchedEnd = ($rawEndId && isset($normalizedMap[$rawEndId]))
                ? $normalizedMap[$rawEndId]
                : $promptCandidates[count($promptCandidates) - 1];

            // Ensure start and end are distinct
            if ($matchedStart['id'] === $matchedEnd['id']) {
                foreach (array_reverse($promptCandidates) as $alt) {
                    if ($alt['id'] !== $matchedStart['id']) {
                        $matchedEnd = $alt;
                        break;
                    }
                }
            }

            $endReason = !empty($parsedAi['end_point']['reason'])
                ? trim($parsedAi['end_point']['reason'])
                : 'Titik akhir yang optimal untuk mengakhiri rute operasional pedagang.';

            // Intermediate waypoints
            $rawWps = $parsedAi['recommended_waypoints'] ?? ($parsedAi['waypoints'] ?? []);
            if (!is_array($rawWps)) {
                $rawWps = [];
            }

            $usedIds = [
                $matchedStart['id'] => true,
                $matchedEnd['id']   => true,
            ];
            $matchedWaypoints = [];

            foreach ($rawWps as $rawWp) {
                $wpId = is_array($rawWp) ? ($rawWp['id'] ?? null) : $rawWp;
                if ($wpId && isset($normalizedMap[$wpId]) && !isset($usedIds[$wpId])) {
                    $cand = $normalizedMap[$wpId];
                    $usedIds[$wpId] = true;
                    $duration = isset($rawWp['stop_duration_minutes']) && is_numeric($rawWp['stop_duration_minutes'])
                        ? min(max((int) $rawWp['stop_duration_minutes'], 15), 180)
                        : 30;

                    $matchedWaypoints[] = [
                        'id'                    => $cand['id'],
                        'original_id'           => $cand['original_id'],
                        'source'                => $cand['source'],
                        'name'                  => $cand['name'],
                        'category'              => $cand['category'],
                        'lat'                   => $cand['lat'],
                        'lng'                   => $cand['lng'],
                        'reason'                => !empty($rawWp['reason'])
                            ? trim($rawWp['reason'])
                            : 'Titik singgah perantara dengan potensi keramaian pengunjung.',
                        'stop_duration_minutes' => $duration,
                    ];
                }
                if (count($matchedWaypoints) >= 6) {
                    break;
                }
            }

            // Ensure at least 1-2 intermediate waypoints if candidate pool allows
            if (empty($matchedWaypoints)) {
                foreach ($promptCandidates as $cand) {
                    if (!isset($usedIds[$cand['id']])) {
                        $usedIds[$cand['id']] = true;
                        $matchedWaypoints[] = [
                            'id'                    => $cand['id'],
                            'original_id'           => $cand['original_id'],
                            'source'                => $cand['source'],
                            'name'                  => $cand['name'],
                            'category'              => $cand['category'],
                            'lat'                   => $cand['lat'],
                            'lng'                   => $cand['lng'],
                            'reason'                => 'Titik singgah strategis di koridor penghubung.',
                            'stop_duration_minutes' => 30,
                        ];
                        if (count($matchedWaypoints) >= 2) {
                            break;
                        }
                    }
                }
            }

            // 11. Calculate actual road route using OSRM
            $orderedCoords = [
                [(float) $matchedStart['lng'], (float) $matchedStart['lat']],
            ];
            foreach ($matchedWaypoints as $wp) {
                $orderedCoords[] = [(float) $wp['lng'], (float) $wp['lat']];
            }
            $orderedCoords[] = [(float) $matchedEnd['lng'], (float) $matchedEnd['lat']];

            $routeResult = $osrmService->calculateRoute($orderedCoords);

            $routeMetrics = [
                'distance_meters'  => $routeResult['distance_meters'] ?? null,
                'duration_seconds' => $routeResult['duration_seconds'] ?? null,
                'distance_km'      => $routeResult['distance_km'] ?? null,
                'duration_minutes' => $routeResult['duration_minutes'] ?? null,
            ];

            $rawCoords = $routeResult['coordinates'] ?? [];
            $routeCoordinates = [];
            if (!empty($rawCoords)) {
                foreach ($rawCoords as $c) {
                    if (isset($c[0], $c[1])) {
                        $routeCoordinates[] = [(float) $c[1], (float) $c[0]];
                    }
                }
            }

            $validatedStart = [
                'id'          => $matchedStart['id'],
                'original_id' => $matchedStart['original_id'],
                'source'      => $matchedStart['source'],
                'name'        => $matchedStart['name'],
                'category'    => $matchedStart['category'] ?? null,
                'lat'         => $matchedStart['lat'],
                'lng'         => $matchedStart['lng'],
                'reason'      => $startReason,
            ];

            $validatedEnd = [
                'id'          => $matchedEnd['id'],
                'original_id' => $matchedEnd['original_id'],
                'source'      => $matchedEnd['source'],
                'name'        => $matchedEnd['name'],
                'category'    => $matchedEnd['category'] ?? null,
                'lat'         => $matchedEnd['lat'],
                'lng'         => $matchedEnd['lng'],
                'reason'      => $endReason,
            ];

            return ApiResponse::success([
                'route_name'            => $routeName,
                'selected_business'     => $selectedBusinessData,
                'analysis_area'         => [
                    'center'        => [
                        'lat' => (float) $centerLat,
                        'lng' => (float) $centerLng,
                    ],
                    'radius_meters' => (int) $radiusMeters,
                ],
                'start_point'           => $validatedStart,
                'recommended_waypoints' => $matchedWaypoints,
                'end_point'             => $validatedEnd,
                'explanation'           => $explanation,
                'analysis_factors'      => $analysisFactors,
                'route_metrics'         => $routeMetrics,
                'route_coordinates'     => $routeCoordinates,
                'raw_content'           => $rawContent,
            ], 'Rekomendasi rute area berhasil dirancang');

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return ApiResponse::error(
                'Koneksi ke server AI upstream terputus atau timeout (Cloudflare 524). Silakan coba kembali dengan preferensi rute yang lebih ringkas.' ,
                504
            );
        } catch (\Throwable $e) {
            return ApiResponse::error(
                'Terjadi kesalahan saat merancang rute AI: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Helper to execute raw AI request for legacy mode.
     */
    private function executeAiChatRequest(string $aiUrl, string $aiModel, int $timeout, string $systemMessage, string $promptContent, bool $isLegacy = false)
    {
        try {
            $response = Http::timeout($timeout)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ])
                ->post($aiUrl, [
                    'model'    => $aiModel,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemMessage],
                        ['role' => 'user', 'content' => $promptContent],
                    ],
                    'stream'   => false,
                    'think'    => false,
                ]);

            if ($response->status() === 524) {
                return ApiResponse::error(
                    'Layanan AI upstream mengalami timeout (Cloudflare 524). Model membutuhkan waktu terlalu lama. Silakan coba kembali dengan instruksi yang lebih ringkas.',
                    504
                );
            }

            if ($response->failed()) {
                return ApiResponse::error(
                    'Layanan AI upstream mengembalikan kesalahan (HTTP ' . $response->status() . '). Silakan coba sesaat lagi.',
                    502
                );
            }

            $body = $response->json();
            $rawContent = $body['message']['content'] ?? null;

            if (empty($rawContent)) {
                return ApiResponse::error('Model AI tidak menghasilkan konten teks rekomendasi.', 502);
            }

            return ApiResponse::success([
                'raw_content' => $rawContent,
                'model'       => $aiModel,
            ], 'Rekomendasi AI berhasil didapatkan');
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return ApiResponse::error(
                'Koneksi ke server AI upstream terputus atau timeout (Cloudflare 524). Silakan coba kembali dengan preferensi rute yang lebih ringkas.',
                504
            );
        } catch (\Throwable $e) {
            return ApiResponse::error(
                'Terjadi kesalahan saat menghubungi asisten AI: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Clean and extract JSON array from raw AI response text.
     */
    private function extractJson(string $rawText): array
    {
        $cleaned = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $rawText);
        $cleaned = trim($cleaned);

        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/i', $cleaned, $matches)) {
            $cleaned = trim($matches[1]);
        }

        $firstBrace = strpos($cleaned, '{');
        $lastBrace = strrpos($cleaned, '}');
        if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
            $cleaned = substr($cleaned, $firstBrace, $lastBrace - $firstBrace + 1);
        }

        $decoded = json_decode($cleaned, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Calculate approximate distance between two GPS coordinates in meters.
     */
    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * $earth * asin(min(1.0, sqrt($h)));
    }
}
