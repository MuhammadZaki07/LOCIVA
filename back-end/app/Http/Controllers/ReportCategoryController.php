<?php

namespace App\Http\Controllers;

use App\Models\ReportCategory;
use App\Helpers\ApiResponse;

class ReportCategoryController extends Controller
{
    public function index()
    {
        $categories = ReportCategory::where('is_active', true)
            ->select('id', 'name', 'slug', 'description', 'icon')
            ->orderBy('name')
            ->get();

        return ApiResponse::success($categories, 'Categories retrieved successfully');
    }
}
