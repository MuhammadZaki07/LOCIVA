<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Http\Requests\BusinessRequest;
use App\Http\Requests\BusinessUpdateRequest;
use App\Models\Business;
use App\Repositories\BusinessRepository;
use Illuminate\Support\Facades\DB;

class BusinessController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    private $businessRepository;
    public function __construct(BusinessRepository $businessRepository)
    {
        $this->businessRepository = $businessRepository;
    }

    public function index()
    {
        try {

        } catch (\Throwable $th) {
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create() {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(BusinessRequest $request)
    {
        $validate = $request->validated();

        DB::beginTransaction();
        try {
            $business = $this->businessRepository->create($validate);

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
            $data = $this->businessRepository->find($id);

            if (!$data) return ApiResponse::error('Data not found', 404);

            return ApiResponse::success($data, 'Data retrieved successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('Failed get data: ' . $th->getMessage(), 500);
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Business $business)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(BusinessUpdateRequest $request, string $id)
    {
        $data = $this->businessRepository->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        $validate = $request->validated();

        DB::beginTransaction();
        try {
            $this->businessRepository->update($id, $validate);
            $newData = $this->businessRepository->find($id);

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
        $data = $this->businessRepository->find($id);
        if (!$data) return ApiResponse::error('Data not found', 404);

        DB::beginTransaction();
        try {
            $delete = $this->businessRepository->delete($id);

            DB::commit();
            return ApiResponse::success($delete, 'Data deleted successfully');
        } catch (\Throwable $th) {
            DB::rollBack();
            return ApiResponse::error('Data not deleted: '. $th->getMessage(), 500);
        }
    }
}
