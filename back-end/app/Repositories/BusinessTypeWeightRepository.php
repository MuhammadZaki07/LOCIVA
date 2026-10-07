<?php 

namespace App\Repositories;

use App\Models\BusinessTypeWeight;

class BusinessTypeWeightRepository extends BaseRepository{

    public function __construct(BusinessTypeWeight $model)
    {
        return parent::__construct($model);
    }
}