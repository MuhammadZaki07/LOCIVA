<?php

namespace App\Repositories;

use App\Models\VendorRoute;
use Override;

class VendorRouteRepository extends BaseRepository
{

    public function __construct(VendorRoute $model)
    {
        return parent::__construct($model);
    }

    public function getByBusinessId(string $businessId)
    {
        return $this->model
            ->newQuery()
            ->where('business_id', $businessId)
            ->get();
    }

    public function paginateWithGeometry(int $perPage = 10)
    {
        return $this->model
            ->newQuery()
            ->select([
                'id',
                'business_id',
                'name',
                'distance',
                'estimated_duration',
            ])
            ->selectRaw('ST_AsGeoJSON(route_geometry) as route_geometry')
            ->with('business')
            ->paginate($perPage);
    }

    public function findWithGeometry(string $id)
    {
        return $this->model
            ->newQuery()
            ->select([
                'id',
                'business_id',
                'name',
                'distance',
                'estimated_duration',
            ])
            ->selectRaw('ST_AsGeoJSON(route_geometry) as route_geometry')
            ->with('business')
            ->find($id);
    }
}
