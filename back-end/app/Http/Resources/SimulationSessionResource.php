<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SimulationSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Extract business_id from description if present (e.g. "[business_id:uuid]")
        $businessId = null;
        if (!empty($this->description) && preg_match('/\[business_id:([a-zA-Z0-9\-]+)\]/', $this->description, $matches)) {
            $businessId = $matches[1];
        }

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'business_id' => $businessId,
            'simulations' => $this->simulations->map(function ($sim) {
                return [
                    'id'               => $sim->id,
                    'candidate_id'     => str_replace('Candidate_', '', $sim->target_market ?? 'A'),
                    'latitude'         => (float) $sim->latitude,
                    'longitude'        => (float) $sim->longitude,
                    'radius_m'         => $sim->radius_m,
                    'business_type'    => $sim->businessType ? [
                        'id'   => $sim->businessType->id,
                        'name' => $sim->businessType->name,
                        'slug' => $sim->businessType->slug,
                    ] : null,
                    'location'         => $sim->location ? [
                        'name'    => $sim->location->name,
                        'address' => $sim->location->address,
                    ] : null,
                    'score'            => $sim->score ? [
                        'status'                   => $sim->score->status ?? 'calculated',
                        'total_score'              => $sim->score->total_score !== null ? (float) $sim->score->total_score : null,
                        'target_market_score'      => $sim->score->target_market_score !== null ? (float) $sim->score->target_market_score : null,
                        'competition_score'        => $sim->score->competition_score !== null ? (float) $sim->score->competition_score : null,
                        'accessibility_score'      => $sim->score->accessibility_score !== null ? (float) $sim->score->accessibility_score : null,
                        'population_score'         => $sim->score->population_score !== null ? (float) $sim->score->population_score : null,
                        'pedestrian_score'         => $sim->score->pedestrian_score !== null ? (float) $sim->score->pedestrian_score : null,
                        'area_compatibility_score' => $sim->score->area_compatibility_score !== null ? (float) $sim->score->area_compatibility_score : null,
                        'infrastructure_score'     => $sim->score->infrastructure_score !== null ? (float) $sim->score->infrastructure_score : null,
                    ] : null,
                    'snapshots'        => $sim->relationLoaded('snapshots') ? $sim->snapshots->map(function ($snap) {
                        return [
                            'id'                    => $snap->id,
                            'algorithm_version'     => $snap->algorithm_version,
                            'analyzed_lat'          => $snap->analyzed_lat,
                            'analyzed_lng'          => $snap->analyzed_lng,
                            'radius_m'              => $snap->radius_m,
                            'opportunity_score'     => $snap->opportunity_score,
                            'competition_score'     => $snap->competition_score,
                            'accessibility_score'   => $snap->accessibility_score,
                            'data_confidence'       => $snap->data_confidence,
                            'competitor_count'      => $snap->competitor_count,
                            'report_count'          => $snap->report_count,
                            'status'                => $snap->status,
                            'data_warnings'         => $snap->data_warnings,
                            'sources_snapshot'      => $snap->sources_snapshot,
                            'factors'               => $snap->factors,
                            'analyzed_at'           => $snap->analyzed_at?->toIso8601String(),
                            'created_at'            => $snap->created_at?->toIso8601String(),
                        ];
                    }) : [],
                    'created_at'       => $sim->created_at?->toIso8601String(),
                ];
            }),
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
