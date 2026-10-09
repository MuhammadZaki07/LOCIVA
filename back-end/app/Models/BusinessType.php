<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessType extends Model
{
    use HasUuids, SoftDeletes;
    protected $casts = [
        'default_radius_m'      => 'integer',
        'min_radius_m'          => 'integer',
        'max_radius_m'          => 'integer',
        'is_active'             => 'boolean',
        'target_demographics'   => 'array',
        'competitor_categories' => 'array',
    ];

    public function businesses()
    {
        return $this->hasMany(Business::class);
    }
}
