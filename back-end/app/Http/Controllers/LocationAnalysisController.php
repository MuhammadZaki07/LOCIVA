<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Http\Requests\LocationAnalysisRequest;
use App\Services\LocationAnalysisService;

class LocationAnalysisController extends Controller
{
    public function __construct(protected LocationAnalysisService $analysisService)
    {
    }

    public function analyze(LocationAnalysisRequest $request)
    {
        try {
            $result = $this->analysisService->analyze($request->validated());

            return ApiResponse::success($result, 'Location analysis completed');
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }
    }
}
