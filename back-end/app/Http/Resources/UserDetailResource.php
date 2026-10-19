<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserDetailResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'image' => $this->profile_image,
            'role' => $this->getRoleNames()->first(),
            'joinedDate' => $this->created_at,
            'businesses_count' => $this->businesses_count,
            'reports_count' => $this->reports_count,
            'vendorRoutes_count' => $this->vendor_routes_count,
            'businesses' => BusinessMapResource::collection(
                $this->whenLoaded('businesses')
            ),

            'reports' => $this->whenLoaded('reports', function () {
                return $this->reports->map(fn($report) => [
                    'id' => $report->id,
                    'category_id' => $report->category_id,
                    'area_id' => $report->area_id,
                    'title' => $report->title,
                    'description' => $report->description,
                    'latitude' => $report->latitude,
                    'longitude' => $report->longitude,
                    'status' => $report->status,
                    'severity' => $report->severity,
                    'occurred_at' => $report->occurred_at,
                    'confirmed_at' => $report->confirmed_at,
                    'resolved_at' => $report->resolved_at,
                    'created_at' => $report->created_at,
                ]);
            }),

            'vendorRoutes' => $this->whenLoaded('vendorRoutes', function () {
                return $this->vendorRoutes->map(fn($route) => [
                    'id'                 => $route->id,
                    'name'               => $route->name,
                    'waypoints'          => $route->waypoints ?? [],
                    'route_geometry'     => $route->route_geometry ? json_decode($route->route_geometry) : null,
                    'distance'           => $route->distance,
                    'estimated_duration' => $route->estimated_duration,
                    'status'             => $route->status,
                    'is_shared'          => (bool) $route->is_shared,
                    'business'           => $route->business_id ? [
                        'id'   => $route->business_id,
                        'name' => $route->business?->name,
                    ] : null,
                    'created_at'         => $route->created_at?->toIso8601String(),
                ]);
            }),
        ];
    }
}
