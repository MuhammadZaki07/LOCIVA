<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Helpers\ApiResponse;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function index(Request $request)
    {
        $query = Area::select('id', 'name', 'type', 'code', 'latitude', 'longitude');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $areas = $query->orderBy('name')->paginate(50);

        return ApiResponse::success($areas, 'Areas retrieved successfully');
    }

    public function show(string $id)
    {
        $area = Area::with([
            'populationStatistics' => fn ($q) => $q->latest('year')->limit(1),
        ])->find($id);

        if (! $area) {
            return ApiResponse::notFound('Area not found.');
        }

        return ApiResponse::success($area, 'Area retrieved successfully');
    }
}
