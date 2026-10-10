<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VendorRoute extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'vendor_routes';

    protected $guarded = ['id'];

    protected $casts = [
        'waypoints'          => 'array',
        'route_coordinates'  => 'array',
        'distance'           => 'float',
        'estimated_duration' => 'integer',
        'is_shared'          => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
