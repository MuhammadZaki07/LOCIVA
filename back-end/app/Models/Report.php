<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Report extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    public function users()
    {
        return $this->belongsTo(User::class);
    }

    public function categories()
    {
        return $this->belongsTo(ReportCategory::class);
    }

    public function areas()
    {
        return $this->belongsTo(Area::class);
    }
}
