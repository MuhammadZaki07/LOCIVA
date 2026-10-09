<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Area extends Model
{
    use HasUuids, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'latitude'  => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    public function locations()
    {
        return $this->hasMany(Location::class);
    }

    public function pois()
    {
        return $this->hasMany(Poi::class);
    }

    public function populationStatistics()
    {
        return $this->hasMany(PopulationStatistic::class);
    }
}
