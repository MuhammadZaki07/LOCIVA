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
use Illuminate\Support\Facades\DB;

class VendorRouteController extends Controller
{
    private $routeRepo;
    public function __construct(VendorRouteRepository $routeRepo)
    {
        $this->routeRepo = $routeRepo;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $fetch = $this->routeRepo->paginateWithGeometry($request->query('per_page', 10));
            return ApiResponse::success(["mete" => PaginationHelper::meta($fetch), "Data" => VendorRouteResource::collection($fetch)]);
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
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
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $data = $this->routeRepo->findWithGeometry($id);

            if (!$data) return ApiResponse::error('Data not found', 404);

            return ApiResponse::success(VendorRouteResource::make($data), 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(vendorRoute $vendorRoute)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(VendorRouteRequestUpdate $request, string $id)
    {
        $data = $this->routeRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        $validate = $request->validated();

        DB::beginTransaction();
        try {
            if (isset($validate['route_geometry'])) {
                $points = $validate['route_geometry'];

                $coordinates = collect($points)
                    ->map(function ($point) {
                        return "{$point[1]} {$point[0]}";
                    })
                    ->implode(', ');

                $validate['route_geometry'] = DB::raw(
                    "ST_GeomFromText('LINESTRING($coordinates)', 4326)"
                );
            }

            $vendorRoute = $this->routeRepo->update($id, $validate);

            DB::commit();
            $vendorRoute = $this->routeRepo->findWithGeometry($vendorRoute->id);
            return ApiResponse::success('Update route successful', $vendorRoute);
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('failed update route: ' . $th->getMessage());
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $data = $this->routeRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

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
