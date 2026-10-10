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
                        'total_score'         => (float) $sim->score->total_score,
                        'target_market_score' => (float) $sim->score->target_market_score,
                        'competition_score'   => (float) $sim->score->competition_score,
                        'accessibility_score' => (float) $sim->score->accessibility_score,
                    ] : null,
                    'created_at'       => $sim->created_at?->toIso8601String(),
                ];
            }),
            'created_at'  => $this->created_at?->toIso8601String(),
        ];
    }
}
