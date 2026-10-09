<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportConfirmation extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];
    
    // Disable updated_at since the table only has created_at, or if it has timestamps let it be.
    // The prompt said: `report_confirmations`: id(uuid), report_id, user_id, type, note, created_at, softDeletes
    const UPDATED_AT = null;

    public function report()
    {
        return $this->belongsTo(Report::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
