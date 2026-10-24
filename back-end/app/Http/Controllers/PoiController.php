<?php

namespace App\Http\Controllers;

use App\Models\Poi;
use App\Helpers\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PoiController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'lat'      => 'required|numeric|between:-90,90',
            'lng'      => 'required|numeric|between:-180,180',
            'radius'   => 'nullable|numeric|max:10000',
            'category' => 'nullable|string|max:100',
            'limit'    => 'nullable|integer|max:200',
        ]);

        $lat    = (float) $request->lat;
        $lng    = (float) $request->lng;
        $radius = (float) $request->input('radius', 1000);
        $limit  = (int)   $request->input('limit', 50);

        $query = Poi::selectRaw(
            'id, name, category, address, latitude, longitude, metadata, source,
            (6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))) AS distance',
            [$lat, $lng, $lat]
        )
        ->having('distance', '<=', $radius)
        ->orderBy('distance');

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $pois = $query->limit($limit)->get();

        return ApiResponse::success($pois, 'POIs retrieved successfully');
    }

    public function bounds(Request $request)
    {
        $v = $request->validate([
            "south" => "required|numeric|between:-90,90",
            "north" => "required|numeric|between:-90,90",
            "west" => "required|numeric|between:-180,180",
            "east" => "required|numeric|between:-180,180",
            "limit" => "nullable|integer|min:1|max:1000",
        ]);

        // Protect the DB from "whole country" requests
        if ($v["north"] - $v["south"] > 0.5 || $v["east"] - $v["west"] > 0.5) {
            return response()->json(
                ["success" => false, "message" => "Area too large, zoom in."],
                422,
            );
        }

        $pois = Poi::select(
            "id",
            "external_id",
            "name",
            "category",
            "address",
            "latitude",
            "longitude",
            "metadata",
            "source",
        )
            ->whereNull("deleted_at")
            ->whereBetween("latitude", [$v["south"], $v["north"]])
            ->whereBetween("longitude", [$v["west"], $v["east"]])
            ->limit($v["limit"] ?? 500)
            ->get()
            ->map(function ($p) {
                $m = is_array($p->metadata)
                    ? $p->metadata
                    : (json_decode($p->metadata ?? "", true) ?:
                    []);
                return [
                    "id" => $p->id,
                    "external_id" => $p->external_id,
                    "name" => $p->name,
                    "category" => $p->category,
                    "address" => $p->address,
                    "latitude" => (float) $p->latitude,
                    "longitude" => (float) $p->longitude,
                    "opening_hours" => $m["opening_hours"] ?? null,
                    "website" =>
                        $m["website"] ?? ($m["contact:website"] ?? null),
                    "source" => $p->source,
                ];
            });

        return ApiResponse::success($pois, "POIs retrieved successfully");
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:200',
            'category'  => 'required|string|max:100',
            'address'   => 'nullable|string',
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'area_id'   => 'nullable|exists:areas,id',
            'metadata'  => 'nullable|array',
        ]);

        $validated['source'] = 'manual';

        $poi = Poi::create($validated);

        return ApiResponse::success($poi, 'POI created successfully', 201);
    }
}
