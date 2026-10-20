<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SimulationSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
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
                    'created_at'       => $sim->created_at?->toIso8601String(),
                ];
            }),
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
