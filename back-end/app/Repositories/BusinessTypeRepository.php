<?php 

namespace App\Repositories;

use App\Models\BusinessType;

class BusinessTypeRepository extends BaseRepository{

    public function __construct(BusinessType $model)
    {
        return parent::__construct($model);
    }
}