<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Models\BusinessType;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessTypeController extends Controller
{
    /**
     * Display a listing of active business types / catalog items.
     */
    public function index(Request $request)
    {
        $query = BusinessType::query();

        // Status filter
        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        } else {
            $query->where('is_active', true);
        }

        // Search by name or description
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($request->filled('category') && $request->category !== 'all' && $request->category !== 'Semua') {
            $query->where('category', $request->category);
        }

        // Scale filter
        if ($request->filled('scale')) {
            $query->where('scale', $request->scale);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        if (in_array($sortBy, ['name', 'created_at', 'default_radius_m'])) {
            $query->orderBy($sortBy, $sortOrder === 'desc' ? 'desc' : 'asc');
        }

        $perPage = (int) $request->input('per_page', 20);
        $catalog = $query->paginate($perPage);

        return ApiResponse::success($catalog, 'Business catalog retrieved successfully');
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
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:100',
            'slug'                  => 'nullable|string|max:120|unique:business_types,slug',
            'category'              => 'required|string|max:100',
            'scale'                 => 'nullable|string|max:50',
            'icon'                  => 'nullable|string|max:50',
            'description'           => 'nullable|string',
            'default_radius_m'      => 'required|integer|min:50|max:5000',
            'min_radius_m'          => 'nullable|integer|min:50|max:2000',
            'max_radius_m'          => 'nullable|integer|min:200|max:10000',
            'target_demographics'   => 'nullable|array',
            'competitor_categories' => 'nullable|array',
            'is_active'             => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $businessType = BusinessType::create($validated);

        return ApiResponse::success($businessType, 'Business catalog item created successfully', 201);
    }

    /**
     * Display the specified catalog item.
     */
    public function show(string $id)
    {
        $businessType = BusinessType::where('id', $id)
            ->orWhere('slug', $id)
            ->first();

        if (!$businessType) {
            return ApiResponse::notFound('Business catalog item not found.');
        }

        return ApiResponse::success($businessType, 'Business catalog item retrieved successfully');
    }

    /**
     * Update the specified catalog item.
     */
    public function update(Request $request, string $id)
    {
        $businessType = BusinessType::find($id);
        if (!$businessType) {
            return ApiResponse::notFound('Business catalog item not found.');
        }

        $validated = $request->validate([
            'name'                  => 'sometimes|required|string|max:100',
            'slug'                  => 'sometimes|required|string|max:120|unique:business_types,slug,' . $businessType->id,
            'category'              => 'sometimes|required|string|max:100',
            'scale'                 => 'nullable|string|max:50',
            'icon'                  => 'nullable|string|max:50',
            'description'           => 'nullable|string',
            'default_radius_m'      => 'sometimes|required|integer|min:50|max:5000',
            'min_radius_m'          => 'nullable|integer|min:50|max:2000',
            'max_radius_m'          => 'nullable|integer|min:200|max:10000',
            'target_demographics'   => 'nullable|array',
            'competitor_categories' => 'nullable|array',
            'is_active'             => 'boolean',
        ]);

        $businessType->update($validated);

        return ApiResponse::success($businessType, 'Business catalog item updated successfully');
    }

    /**
     * Remove the specified catalog item with relation integrity check.
     */
    public function destroy(string $id)
    {
        $businessType = BusinessType::find($id);
        if (!$businessType) {
            return ApiResponse::notFound('Business catalog item not found.');
        }

        // Relational check: cannot delete if referenced by existing businesses or simulations
        if ($businessType->businesses()->exists()) {
            return ApiResponse::error(
                'Tidak dapat menghapus jenis usaha ini karena masih digunakan oleh bisnis terdaftar.',
                422
            );
        }

        $businessType->delete();

        return ApiResponse::success(null, 'Business catalog item deleted successfully');
    }
}
