<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Simulation extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    protected $casts = [
        'latitude'  => 'float',
        'longitude' => 'float',
        'radius_m'  => 'integer',
        'budget'    => 'float',
    ];

    public function session()
    {
        return $this->belongsTo(SimulationSession::class, 'session_id');
    }

    public function businessType()
    {
        return $this->belongsTo(BusinessType::class);
    }

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function score()
    {
        return $this->hasOne(SimulationScore::class);
    }
}
