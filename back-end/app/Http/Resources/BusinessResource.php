<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BusinessResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'user_id'             => $this->user_id,
            'user_name'           => $this->user?->name,
            'business_type_id'    => $this->business_type_id,
            'business_type_name'  => $this->businessType?->name,
            // Nested object for frontend handleUserBusinessSelect
            'business_type'       => $this->whenLoaded('businessType', fn () => [
                'id'                   => $this->businessType->id,
                'name'                 => $this->businessType->name,
                'slug'                 => $this->businessType->slug,
                'category'             => $this->businessType->category,
                'scale'                => $this->businessType->scale,
                'icon'                 => $this->businessType->icon,
                'description'          => $this->businessType->description,
                'default_radius_m'     => $this->businessType->default_radius_m,
                'min_radius_m'         => $this->businessType->min_radius_m,
                'max_radius_m'         => $this->businessType->max_radius_m,
                'target_demographics'  => $this->businessType->target_demographics,
                'competitor_categories'=> $this->businessType->competitor_categories,
            ]),
            'image'               => $this->image,
            'name'                => $this->name,
            'description'         => $this->description,
            'latitude'            => $this->latitude,
            'longitude'           => $this->longitude,
            'address'             => $this->address,
        ];
    }
}
