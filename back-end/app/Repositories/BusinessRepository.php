<?php

namespace App\Repositories;

use App\Contracts\BusinessRepositoryInterface;
use App\Models\Business;
use Illuminate\Database\Eloquent\Collection;
use Override;

class BusinessRepository extends BaseRepository implements BusinessRepositoryInterface
{
    public function __construct(Business $model)
    {
        return parent::__construct($model);
    }

    public function getMapBusinesses(
        ?float $lat = null,
        ?float $lng = null,
        ?float $radiusMeters = null,
        ?string $category = null,
        ?string $search = null,
        int $limit = 100,
        ?float $minLat = null,
        ?float $minLng = null,
        ?float $maxLat = null,
        ?float $maxLng = null
    ): Collection {
        $query = Business::query()
            ->with(['businessType:id,name,slug'])
            ->select('id', 'business_type_id', 'name', 'description', 'latitude', 'longitude', 'address', 'is_demo', 'created_at');

        // Bounding box spatial filtering (viewport bounds)
        if ($minLat !== null && $minLng !== null && $maxLat !== null && $maxLng !== null) {
            $query->whereBetween('latitude', [min($minLat, $maxLat), max($minLat, $maxLat)])
                  ->whereBetween('longitude', [min($minLng, $maxLng), max($minLng, $maxLng)]);
        } elseif ($lat !== null && $lng !== null) {
            // MySQL Haversine distance in meters
            $radius = $radiusMeters ?? 5000.0;
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

    public function paginateUserBusinesses(
        string $userId,
        int $perPage = 10,
        array $filters = []
    ) {
        $query = $this->model->with(['businessType:id,name,slug'])
            ->where('user_id', $userId);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['business_type_id']) && $filters['business_type_id'] !== 'all') {
            $query->where('business_type_id', $filters['business_type_id']);
        }

        $allowedSorts = ['name', 'created_at', 'address'];
        $sortBy = in_array($filters['sort_by'] ?? null, $allowedSorts, true) ? $filters['sort_by'] : 'created_at';
        $sortOrder = ($filters['sort_order'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate($perPage);
    }
}
