<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DataSyncLog extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];
    public $timestamps = false;

    protected $casts = [
        'started_at'        => 'datetime',
        'finished_at'       => 'datetime',
        'records_processed' => 'integer',
    ];

    public function dataSource()
    {
        return $this->belongsTo(DataSource::class);
    }
}
