<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Helpers\PaginationHelper;
use App\Http\Requests\BusinessTypeRequest;
use App\Http\Requests\BusinessWeightUpdateRequest;
use App\Http\Resources\BusinessTypeResource;
use App\Models\Business;
use App\Models\BusinessType;
use App\Repositories\BusinessTypeRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BusinessTypeController extends Controller
{
    private $businessTypeRepo;
    public function __construct(BusinessTypeRepository $businessTypeRepo)
    {
        $this->businessTypeRepo = $businessTypeRepo;
    }
    /**
     * Display a listing of active business types / catalog items.
     */
    public function index(Request $request)
    {
        try {
            $fetch = $this->businessTypeRepo->paginate($request->query('per_page', 10));
            return ApiResponse::success(["mete" => PaginationHelper::meta($fetch), "Data" => BusinessTypeResource::collection($fetch)]);
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage());
        }
    }

    /**
     * Return list of distinct categories with item counts.
     */
    public function categories()
    {
        $categories = BusinessType::where('is_active', true)
            ->whereNotNull('category')
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->orderBy('category')
            ->get();

        return ApiResponse::success($categories, 'Catalog categories retrieved successfully');
    }

    /**
     * Store a newly created business type in catalog.
     */
    public function store(BusinessTypeRequest $request)
    {

        $validate = $request->validated();

        DB::beginTransaction();
        try {
            $business = $this->businessTypeRepo->create($validate);

            DB::commit();
            return ApiResponse::success($business, 'Create business successful', 200);
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Failed store data' . $th->getMessage(), 500);
        }
    }

    /**
     * Display the specified catalog item.
     */
    public function show(string $id)
    {
        try {
            $data = $this->businessTypeRepo->find($id);

            if (!$data) return ApiResponse::error('Data not found', 404);

            return ApiResponse::success(BusinessTypeResource::make($data), 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Update the specified catalog item.
     */
    // public function update(Request $request, string $id)
    // {
    //     $businessType = BusinessType::find($id);
    //     if (!$businessType) {
    //         return ApiResponse::notFound('Business catalog item not found.');
    //     }

    //     $validated = $request->validate([
    //         'name'                  => 'sometimes|required|string|max:100',
    //         'slug'                  => 'sometimes|required|string|max:120|unique:business_types,slug,' . $businessType->id,
    //         'category'              => 'sometimes|required|string|max:100',
    //         'scale'                 => 'nullable|string|max:50',
    //         'icon'                  => 'nullable|string|max:50',
    //         'description'           => 'nullable|string',
    //         'default_radius_m'      => 'sometimes|required|integer|min:50|max:5000',
    //         'min_radius_m'          => 'nullable|integer|min:50|max:2000',
    //         'max_radius_m'          => 'nullable|integer|min:200|max:10000',
    //         'target_demographics'   => 'nullable|array',
    //         'competitor_categories' => 'nullable|array',
    //         'is_active'             => 'boolean',
    //     ]);

    //     $businessType->update($validated);

    //     return ApiResponse::success($businessType, 'Business catalog item updated successfully');
    // }

    /**
     * Remove the specified catalog item with relation integrity check.
     */
    public function update(BusinessWeightUpdateRequest $request, string $id)
    {
        $data = $this->businessTypeRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        $validate = $request->validated();

        DB::beginTransaction();
        try {

            $this->businessTypeRepo->update($id, $validate);
            $newData = $this->businessTypeRepo->find($id);

            DB::commit();
            return ApiResponse::success($newData, 'Data updated successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not updated: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $data = $this->businessTypeRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        DB::beginTransaction();
        try {
            $delete = $this->businessTypeRepo->delete($id);

            DB::commit();
            return ApiResponse::success($delete, 'Data deleted successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not deleted: ' . $th->getMessage(), 500);
        }
    }
}
