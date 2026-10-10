<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PopulationStatistic extends Model
{
    protected $guarded = ['id'];

    public function area()
    {
        return $this->belongsTo(Area::class);
    }
}
