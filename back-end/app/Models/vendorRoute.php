<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class vendorRoute extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
