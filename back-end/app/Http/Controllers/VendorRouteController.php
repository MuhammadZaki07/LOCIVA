<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Models\Poi;
use App\Models\VendorRoute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VendorRouteController extends Controller
{
    /**
     * Get shared public vendor routes for display on the map.
     */
    public function publicRoutes(Request $request)
    {
        $query = VendorRoute::with(['business:id,name,latitude,longitude'])
            ->where('is_shared', true)
            ->select('id', 'user_id', 'business_id', 'name', 'waypoints', 'start_location_name', 'end_location_name', 'distance', 'estimated_duration', 'status', 'notes', 'created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $routes = $query->latest()->limit(50)->get();

        return ApiResponse::success($routes, 'Public vendor routes retrieved successfully');
    }

    /**
     * Display a listing of the user's vendor routes.
     */
    public function index(Request $request)
    {
        $query = VendorRoute::with(['business:id,name,latitude,longitude'])
            ->where('user_id', Auth::id());

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $routes = $query->latest()->paginate(20);

        return ApiResponse::success($routes, 'User vendor routes retrieved successfully');
    }

    /**
     * Store a newly created vendor route plan.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:150',
            'business_id'         => 'nullable|exists:businesses,id',
            'waypoints'           => 'required|array|min:2',
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
            'route_coordinates.*' => 'array',
        ]);

        $validated['user_id'] = Auth::id();
        $validated['status'] = $validated['status'] ?? 'planned';

        $route = VendorRoute::create($validated);

        return ApiResponse::success($route, 'Rute usaha keliling berhasil disimpan', 201);
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
}
