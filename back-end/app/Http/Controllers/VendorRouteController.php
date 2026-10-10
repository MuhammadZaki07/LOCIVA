<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Helpers\PaginationHelper;
use App\Http\Requests\VendorRouteRequestStore;
use App\Http\Requests\VendorRouteRequestUpdate;
use App\Http\Resources\VendorRouteResource;
use App\Models\vendorRoute;
use App\Repositories\VendorRouteRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class VendorRouteController extends Controller
{
    private $routeRepo;
    public function __construct(VendorRouteRepository $routeRepo)
    {
        $this->routeRepo = $routeRepo;
    }

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
     * Get shared public vendor routes for display on the map.
     */
    // public function index(Request $request)
    // {
    //     try {
    //         $fetch = $this->routeRepo->paginateWithGeometry($request->query('per_page', 10));
    //         return ApiResponse::success(["mete" => PaginationHelper::meta($fetch), "Data" => VendorRouteResource::collection($fetch)]);
    //     } catch (\Throwable $th) {
    //         return ApiResponse::error($th->getMessage());
    //     }
    // }

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
    public function store(VendorRouteRequestStore $request)
    {
        $validate = $request->validated();

        DB::beginTransaction();
        try {
            $points = $validate['route_geometry'];

            $coordinates = collect($points)
                ->map(function ($point) {
                    return "{$point[1]} {$point[0]}";
                })
                ->implode(', ');

            $validate['route_geometry'] = DB::raw(
                "ST_GeomFromText('LINESTRING($coordinates)', 4326)"
            );

            $vendorRoute = $this->routeRepo->create($validate);
            DB::commit();
            $vendorRoute = $this->routeRepo->findWithGeometry($vendorRoute->id);
            return ApiResponse::success('Create route successful', $vendorRoute);
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('failed create route' . $th->getMessage());
        }
    }

    /**
     * Display the specified vendor route.
     */
    public function show(string $id)
    {
        try {
            $data = $this->routeRepo->findWithGeometry($id);

            if (!$data)
                return ApiResponse::error('Data not found', 404);

            return ApiResponse::success(VendorRouteResource::make($data), 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
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
            'name' => 'sometimes|required|string|max:150',
            'business_id' => 'nullable|exists:businesses,id',
            'waypoints' => 'sometimes|required|array|min:2',
            'waypoints.*.lat' => 'required|numeric|between:-90,90',
            'waypoints.*.lng' => 'required|numeric|between:-180,180',
            'waypoints.*.name' => 'nullable|string|max:200',
            'waypoints.*.stop_duration' => 'nullable|integer|min:0|max:1440',
            'start_location_name' => 'nullable|string|max:200',
            'end_location_name' => 'nullable|string|max:200',
            'distance' => 'nullable|numeric|min:0|max:1000',
            'estimated_duration' => 'nullable|integer|min:0|max:10000',
            'status' => 'nullable|string|in:planned,active,completed',
            'is_shared' => 'boolean',
            'notes' => 'nullable|string|max:1000',
            'route_coordinates' => 'nullable|array',
        ]);

        $route->update($validated);

        return ApiResponse::success($route, 'Rute berhasil diperbarui');
    }

    /**
     * Remove the specified vendor route.
     */
    // public function update(VendorRouteRequestUpdate $request, string $id)
    // {
    //     $data = $this->routeRepo->find($id);
    //     if (!$data) return ApiResponse::error('Data not found', 404);

    //     $validate = $request->validated();

    //     DB::beginTransaction();
    //     try {
    //         if (isset($validate['route_geometry'])) {
    //             $points = $validate['route_geometry'];

    //             $coordinates = collect($points)
    //                 ->map(function ($point) {
    //                     return "{$point[1]} {$point[0]}";
    //                 })
    //                 ->implode(', ');

    //             $validate['route_geometry'] = DB::raw(
    //                 "ST_GeomFromText('LINESTRING($coordinates)', 4326)"
    //             );
    //         }

    //         $vendorRoute = $this->routeRepo->update($id, $validate);

    //         DB::commit();
    //         $vendorRoute = $this->routeRepo->findWithGeometry($vendorRoute->id);
    //         return ApiResponse::success('Update route successful', $vendorRoute);
    //     } catch (\Throwable $th) {
    //         DB::rollBack();
    //         return ApiResponse::error('failed update route: ' . $th->getMessage());
    //     }
    // }

    /**
     * Recommend potential mobile vending spot locations around an area (Masalah 3 B).
     * Transparently explains criteria: high pedestrian traffic POIs (campuses, transit hubs, schools, markets).
     */
    public function destroy(string $id)
    {
        $data = $this->routeRepo->find($id);
        if (!$data)
            return ApiResponse::error('Data not found', 404);

        DB::beginTransaction();
        try {
            $delete = $this->routeRepo->delete($id);

            DB::commit();
            return ApiResponse::success($delete, 'Data deleted successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not deleted: ' . $th->getMessage(), 500);
        }
    }
}
