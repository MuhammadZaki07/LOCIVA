<?php

namespace App\Repositories;

use App\Models\Area;

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
}
