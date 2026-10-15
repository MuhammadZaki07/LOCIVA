<?php 

namespace App\Repositories;

use App\Models\ReportCategory;

class ReportCategoryRepository extends BaseRepository{

    public function __construct(ReportCategory $model)
    {
        return parent::__construct($model);
    }
}
