<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use App\Services\AiRouteRecommendationService;
use Illuminate\Http\Request;

class AiRouteRecommendationController extends Controller
{
    public function __construct(
        protected AiRouteRecommendationService $recommendationService
    ) {}

    /**
     * Generate AI-assisted circular route recommendations for mobile businesses.
     */
    public function recommend(Request $request)
    {
        $validated = $request->validate([
            'business_type_id'                  => 'required|string|max:100',
            'starting_point'                    => 'required|array',
            'starting_point.latitude'           => 'required_without:starting_point.lat|numeric|between:-90,90',
            'starting_point.longitude'          => 'required_without:starting_point.lng|numeric|between:-180,180',
            'starting_point.lat'                => 'nullable|numeric|between:-90,90',
            'starting_point.lng'                => 'nullable|numeric|between:-180,180',
            'constraints'                       => 'nullable|array',
            'constraints.max_distance_km'       => 'nullable|numeric|min:1|max:50',
            'constraints.max_duration_minutes'  => 'nullable|integer|min:15|max:480',
            'constraints.travel_mode'           => 'nullable|string|in:motorcycle,driving,bicycle,walking',
        ]);

        // Normalize latitude/longitude keys
        $lat = (float) ($validated['starting_point']['latitude'] ?? $validated['starting_point']['lat']);
        $lng = (float) ($validated['starting_point']['longitude'] ?? $validated['starting_point']['lng']);

        $params = [
            'business_type_id' => $validated['business_type_id'],
            'starting_point'   => [
                'latitude'  => $lat,
                'longitude' => $lng,
            ],
            'constraints'      => [
                'max_distance_km'      => (float) ($validated['constraints']['max_distance_km'] ?? 8.0),
                'max_duration_minutes' => (int) ($validated['constraints']['max_duration_minutes'] ?? 120),
                'travel_mode'          => (string) ($validated['constraints']['travel_mode'] ?? 'motorcycle'),
            ],
        ];

        $result = $this->recommendationService->recommend($params);

        return ApiResponse::success(
            $result,
            'Rekomendasi rute bisnis keliling AI berhasil dihasilkan.'
        );
    }
}
