<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Services\OsrmRouteService;
use Illuminate\Http\Request;

class OsrmRouteController extends Controller
{
    public function __construct(protected OsrmRouteService $routeService)
    {
    }

    /**
     * Check OSRMRoute service status.
     */
    public function status()
    {
        return ApiResponse::success(
            $this->routeService->getStatus(),
            'OSRMRoute service status'
        );
    }

    /**
     * Calculate route with automatic fallback.
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'coordinates' => 'required|array|min:2',
            'coordinates.*' => 'required|array|size:2',
            'profile'     => 'nullable|string|in:driving,walking,cycling',
        ]);

        $coordinates = $request->input('coordinates');
        $profile     = $request->input('profile', 'driving');

        $result = $this->routeService->calculateRoute($coordinates, $profile);

        return ApiResponse::success($result, 'Route calculated successfully');
    }

    /**
     * Query nearby places via OSRMRoute Places API.
     */
    public function places(Request $request)
    {
        $request->validate([
            'lat'      => 'required|numeric',
            'lng'      => 'required|numeric',
            'radius'   => 'nullable|integer|min:50|max:10000',
            'category' => 'nullable|string',
        ]);

        $lat      = (float) $request->query('lat');
        $lng      = (float) $request->query('lng');
        $radius   = (int) $request->query('radius', 1000);
        $category = $request->query('category');

        $result = $this->routeService->searchPlaces($lat, $lng, $radius, $category);

        return ApiResponse::success($result, 'Places retrieved');
    }
}
