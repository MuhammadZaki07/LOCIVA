<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BusinessMapResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'description'   => $this->description,
            'latitude'      => (float) $this->latitude,
            'longitude'     => (float) $this->longitude,
            'address'       => $this->address,
            'source'        => $this->is_demo ? 'demo' : 'lociva_internal',
            'is_demo'       => (bool) ($this->is_demo ?? false),
            'business_type' => $this->businessType ? [
                'id'   => $this->businessType->id,
                'name' => $this->businessType->name,
                'slug' => $this->businessType->slug,
            ] : null,
            'created_at'    => $this->created_at?->toIso8601String(),
        ];
    }
}
