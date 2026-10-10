<?php

namespace App\Repositories;

use App\Models\Area;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class AreaRepository extends BaseRepository
{
    public function __construct(Area $model)
    {
        parent::__construct($model);
    }

    public function withDetail(string $id)
    {
        return $this->model->newQuery()->with([
            'locations',
            'report',
            'roads',
            'populationStatistics'
        ])->findOrFail($id);
    }

    public function create(array $data): Area
    {
        $boundary = DB::raw('ST_GeomFromGeoJSON(' . DB::getPdo()->quote(json_encode($data['boundary'])) . ')');

        return $this->model->create([
            ...Arr::except($data, 'boundary'),
            'boundary' => $boundary,
        ]);
    }
}
