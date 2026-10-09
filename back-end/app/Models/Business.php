<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Business extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function businessType()
    {
        return $this->belongsTo(BusinessType::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vendorRoutes()
    {
        return $this->hasMany(VendorRoute::class);
    }
}
