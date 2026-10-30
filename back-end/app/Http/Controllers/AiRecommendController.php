<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Services\OllamaRecommendationService;
use Illuminate\Http\Request;

class AiRecommendController extends Controller
{
    public function __construct(protected OllamaRecommendationService $ollama) {}

    public function recommend(Request $request)
    {
        $validated = $request->validate([
            'lat'                              => 'required|numeric|between:-90,90',
            'lng'                              => 'required|numeric|between:-180,180',
            'items'                            => 'required|array|min:1|max:5',
            'items.*.name'                     => 'required|string|max:150',
            'items.*.category'                 => 'nullable|string|max:100',
            'items.*.radius'                   => 'required|numeric|min:0',
            'items.*.fit_score'                => 'required|numeric|between:0,100',
            'items.*.opportunity'              => 'required|numeric|between:0,100',
            'items.*.competition'              => 'required|numeric|between:0,100',
            'items.*.accessibility'            => 'required|numeric|between:0,100',
            'items.*.data_confidence'          => 'nullable|numeric|between:0,100',
            'items.*.competitor_count'         => 'nullable|integer|min:0',
            'items.*.nearest_competitor'       => 'nullable|array',
            'items.*.nearest_competitor.name'  => 'nullable|string|max:200',
            'items.*.nearest_competitor.distance' => 'nullable|numeric|min:0',
            'items.*.report_count'             => 'nullable|integer|min:0',
            'items.*.factors'                  => 'nullable|array|max:10',
            'items.*.factors.*.label'          => 'nullable|string|max:150',
            'items.*.factors.*.impact'         => 'nullable|string|max:20',
            'items.*.factors.*.note'           => 'nullable|string|max:500',
        ]);

        $reasons = $this->ollama->reasons($validated['items']);

        // Always 200: the frontend falls back to template text unless source === "ai".
        return ApiResponse::success(
            $reasons
                ? ['source' => 'ai', 'reasons' => $reasons]
                : ['source' => 'fallback', 'reasons' => []],
            $reasons ? 'AI reasons generated' : 'AI unavailable, use fallback'
        );
    }
}