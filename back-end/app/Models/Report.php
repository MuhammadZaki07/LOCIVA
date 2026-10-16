<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Report extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    protected $casts = [
        'latitude'     => 'float',
        'longitude'    => 'float',
        'confirmed_at' => 'datetime',
        'resolved_at'  => 'datetime',
        'occurred_at'  => 'datetime',
        'deleted_at'   => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(ReportCategory::class, 'category_id');
    }

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function confirmations()
    {
        return $this->hasMany(ReportConfirmation::class);
    }

    public function verifications()
    {
        return $this->hasMany(ReportVerification::class);
    }

    public function media()
    {
        return $this->hasMany(ReportMedia::class);
    }
}
