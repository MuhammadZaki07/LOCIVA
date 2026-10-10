<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportVerification extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];
    
    const UPDATED_AT = null;

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }
}
