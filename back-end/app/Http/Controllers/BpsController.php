<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Services\BpsApiService;
use Illuminate\Http\Request;

class BpsController extends Controller
{
    public function __construct(protected BpsApiService $bpsService)
    {
    }

    /**
     * Check BPS WebAPI connection and configuration status.
     */
    public function status()
    {
        return ApiResponse::success(
            $this->bpsService->getStatus(),
            'BPS WebAPI integration status'
        );
    }

    /**
     * Get list of BPS administrative domains.
     */
    public function domains(Request $request)
    {
        $type = $request->query('type', 'kabbyprov');
        $prov = $request->query('prov', '3200');

        $result = $this->bpsService->getDomains($type, $prov);

        return ApiResponse::success($result, 'BPS domains retrieved successfully');
    }

    /**
     * Get official BPS demographic data for specified coordinates.
     */
    public function demographics(Request $request)
    {
        $request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]);

        $lat = (float) $request->query('lat');
        $lng = (float) $request->query('lng');

        $data = $this->bpsService->getDemographicsForLocation($lat, $lng);

        return ApiResponse::success($data, 'BPS demographic data retrieved successfully');
    }

    /**
     * Get GeoJSON choropleth features for map population density layer.
     */
    public function mapLayer(\Illuminate\Http\Request $request)
    {
        $level = (string) $request->query('level', 'regency');
        $domain = (string) $request->query('domain', '3500');

        $layer = $this->bpsService->getMapChoroplethFeatureCollection($level, $domain);

        return response()->json($layer);
    }
}
