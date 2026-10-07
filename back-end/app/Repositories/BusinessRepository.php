<?php

namespace App\Repositories;

use App\Models\Business;
use App\Repositories\BaseRepository;

class BusinessRepository extends BaseRepository
{

    public function __construct(Business $model)
    {
        return parent::__construct($model);
    }

    
}
