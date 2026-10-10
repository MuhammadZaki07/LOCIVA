<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SimulationScore extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    protected $casts = [
        'population_score'         => 'float',
        'pedestrian_score'         => 'float',
        'accessibility_score'      => 'float',
        'target_market_score'      => 'float',
        'competition_score'        => 'float',
        'area_compatibility_score' => 'float',
        'infrastructure_score'     => 'float',
        'total_score'              => 'float',
    ];

    public function simulation()
    {
        return $this->belongsTo(Simulation::class);
    }
}
