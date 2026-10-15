<?php

namespace App\Http\Controllers;

use App\Models\ReportCategory;
use App\Helpers\ApiResponse;
use App\Http\Requests\ReportCategoryRequest;
use App\Repositories\ReportCategoryRepository;
use Illuminate\Http\JsonResponse;

class ReportCategoryController extends Controller
{
    public function __construct(protected ReportCategoryRepository $repo) {}

    public function index()
    {
        $categories = ReportCategory::where('is_active', true)
            ->select('id', 'name', 'slug', 'description', 'icon')
            ->orderBy('name')
            ->get();

        return ApiResponse::success($categories, 'Categories retrieved successfully');
    }

    public function create(ReportCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        try {
            $this->repo->create($data);
            return ApiResponse::success(null, "Created successfuly");
        } catch (\Throwable $th) {
            return ApiResponse::error("Currently cannot handle that request, " . $th->getMessage());
        }
    }

    public function update(ReportCategoryRequest $request, string $id): JsonResponse
    {
        $data = $request->validated();
        try {
            $this->repo->update($id, $data);
            return ApiResponse::success(null, "Updated successfully");
        } catch (\Throwable $th) {
            return ApiResponse::error("Currently cannot handle that request, " . $th->getMessage());
        }
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            $this->repo->delete($id);
            return ApiResponse::success(null, "Deleted successfully");
        } catch (\Throwable $th) {
            return ApiResponse::error("Currently cannot handle that request, " . $th->getMessage());
        }
    }
}
