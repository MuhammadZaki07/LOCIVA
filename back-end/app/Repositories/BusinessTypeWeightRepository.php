<?php 

namespace App\Repositories;

use App\Models\BusinessTypeWeight;

class BusinessTypeWeightRepository extends BaseRepository{

    public function __construct(BusinessTypeWeight $model)
    {
        parent::__construct($model);
    }

    public function getByBusinessType(string $businessTypeId)
    {
        return $this->model->newQuery()
            ->where('business_type_id', $businessTypeId)
            ->get();
    }
}