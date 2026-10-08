<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorRouteResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business' => [
                'id' => $this->business_id,
                'name' => $this->business?->name,
            ],
            'name' => $this->name,
            'route_geometry' => $this->route_geometry ? json_decode($this->route_geometry) : null,
            'distance' => $this->distance,
            'estimated_duration' => $this->estimated_duration,
        ];
    }
}
