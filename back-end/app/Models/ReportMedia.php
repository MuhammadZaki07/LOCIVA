<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportMedia extends Model
{
    use HasUuids, SoftDeletes;
    protected $guarded = ['id'];

    const UPDATED_AT = null;

    protected $appends = ['url'];

    public function getUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        if (str_starts_with($this->file_path, 'http://') || str_starts_with($this->file_path, 'https://')) {
            return $this->file_path;
        }

        return asset('storage/' . $this->file_path);
    }

    public function report()
    {
        return $this->belongsTo(Report::class);
    }
}
