<?php

namespace App\Repositories;

use App\Contracts\BusinessRepositoryInterface;
use App\Models\Business;
use Illuminate\Database\Eloquent\Collection;

class BusinessRepository implements BusinessRepositoryInterface
{
    public function getMapBusinesses(
        ?float $lat = null,
        ?float $lng = null,
        ?float $radiusMeters = null,
        ?string $category = null,
        ?string $search = null,
        int $limit = 100
    ): Collection {
        $query = Business::query()
            ->with(['businessType:id,name,slug'])
            ->select('id', 'business_type_id', 'name', 'description', 'latitude', 'longitude', 'address', 'created_at');

        // Spatial filtering if coordinates provided
        if ($lat !== null && $lng !== null) {
            $radius = $radiusMeters ?? 5000.0;

            // MySQL Haversine distance in meters
            $haversineSql = '(6371000 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))))';

            $query->selectRaw("{$haversineSql} AS distance", [$lat, $lng, $lat])
                ->having('distance', '<=', $radius)
                ->orderBy('distance');
        } else {
            $query->latest();
        }

        // Category filter (by business type slug or id)
        if (!empty($category) && $category !== 'all' && $category !== 'Semua') {
            $query->whereHas('businessType', function ($q) use ($category) {
                $q->where('slug', $category)
                  ->orWhere('id', $category)
                  ->orWhere('name', 'like', "%{$category}%");
            });
        }

        // Search filter
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $query->limit($limit)->get();
    }

    public function getUserBusinesses(string $userId): Collection
    {
        return Business::with(['businessType:id,name,slug'])
            ->where('user_id', $userId)
            ->latest()
            ->get();
    }

    public function createBusiness(array $data): Business
    {
        return Business::create($data);
    }

    public function getBusinessById(string $id): ?Business
    {
        return Business::with(['businessType:id,name,slug'])
            ->find($id);
    }

    public function updateBusiness(Business $business, array $data): Business
    {
        $business->update($data);
        return $business->fresh(['businessType:id,name,slug']);
    }

    public function deleteBusiness(Business $business): bool
    {
        return (bool) $business->delete();
    }
}
