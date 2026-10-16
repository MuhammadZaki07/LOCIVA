<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Helpers\PaginationHelper;
use App\Http\Requests\BusinessWeightRequest;
use App\Http\Requests\BusinessWeightUpdateRequest;
use App\Http\Resources\BusinessTypeWeightResource;
use App\Models\Business;
use App\Models\BusinessTypeWeight;
use App\Repositories\BusinessTypeWeightRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BusinessTypeWeightController extends Controller
{
    private $businessWeightRepo;
    public function __construct(BusinessTypeWeightRepository $businessWeightRepo)
    {
        $this->businessWeightRepo = $businessWeightRepo;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            if ($request->filled('business_type_id')) {
                $weights = $this->businessWeightRepo->getByBusinessType($request->business_type_id);
                return ApiResponse::success(BusinessTypeWeightResource::collection($weights), 'Weights retrieved successfully');
            }

            $fetch = $this->businessWeightRepo->paginate((int) $request->query('per_page', 10));
            return ApiResponse::success([
                "meta" => PaginationHelper::meta($fetch),
                "data" => BusinessTypeWeightResource::collection($fetch)
            ], 'Weights retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage(), 500);
        }
    }

    /**
     * Get weights for a specific business type.
     */
    public function getByBusinessType(string $id)
    {
        try {
            $weights = $this->businessWeightRepo->getByBusinessType($id);
            return ApiResponse::success(BusinessTypeWeightResource::collection($weights), 'Weights retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error($th->getMessage(), 500);
        }
    }

    /**
     * Batch synchronize all factor weights for a business type.
     */
    public function syncByBusinessType(Request $request, string $id)
    {
        $businessType = \App\Models\BusinessType::find($id);
        if (!$businessType) {
            return ApiResponse::notFound('Business type not found.');
        }

        $validated = $request->validate([
            'weights' => 'required|array',
            'weights.*.factor' => 'required|string|max:50',
            'weights.*.weight' => 'required|numeric|min:0|max:100',
        ]);

        DB::beginTransaction();
        try {
            BusinessTypeWeight::where('business_type_id', $id)->delete();

            $created = [];
            foreach ($validated['weights'] as $item) {
                $created[] = BusinessTypeWeight::create([
                    'business_type_id' => $id,
                    'factor'           => strtolower(trim($item['factor'])),
                    'weight'           => (float) $item['weight'],
                ]);
            }

            DB::commit();

            return ApiResponse::success(
                BusinessTypeWeightResource::collection(collect($created)),
                'Business type weights synchronized successfully'
            );
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Failed to sync weights: ' . $th->getMessage(), 500);
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
    public function store(BusinessWeightRequest $request)
    {
        $validate = $request->validated();

        DB::beginTransaction();
        try {
            $business = $this->businessWeightRepo->create($validate);

            DB::commit();
            return ApiResponse::success($business, 'Create business successful', 200);
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Failed store data' . $th->getMessage(), 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $data = $this->businessWeightRepo->find($id);

            if (!$data) return ApiResponse::error('Data not found', 404);

            return ApiResponse::success(BusinessTypeWeightResource::make($data), 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(BusinessTypeWeight $businessTypeWeight)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(BusinessWeightUpdateRequest $request, string $id)
    {
        $data = $this->businessWeightRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        $validate = $request->validated();

        DB::beginTransaction();
        try {
            $this->businessWeightRepo->update($id, $validate);
            $newData = $this->businessWeightRepo->find($id);

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
        $data = $this->businessWeightRepo->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        DB::beginTransaction();
        try {
            $delete = $this->businessWeightRepo->delete($id);

            DB::commit();
            return ApiResponse::success($delete, 'Data deleted successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not deleted: ' . $th->getMessage(), 500);
        }
    }
}
