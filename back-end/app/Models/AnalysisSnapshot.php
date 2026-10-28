<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalysisSnapshot extends Model
{
    use HasFactory, HasUuids;

    public const UPDATED_AT = null; // Immutable append-only log, no updated_at

    protected $fillable = [
        'simulation_id',
        'algorithm_version',
        'analyzed_lat',
        'analyzed_lng',
        'radius_m',
        'business_type_slug',
        'opportunity_score',
        'competition_score',
        'accessibility_score',
        'data_confidence',
        'competitor_count',
        'report_count',
        'competitor_categories',
        'weights_snapshot',
        'sources_snapshot',
        'data_warnings',
        'factors',
        'limitations',
        'status',
        'analyzed_at',
        'created_at',
    ];

    protected $casts = [
        'analyzed_lat'          => 'float',
        'analyzed_lng'          => 'float',
        'radius_m'              => 'integer',
        'opportunity_score'     => 'integer',
        'competition_score'     => 'integer',
        'accessibility_score'   => 'integer',
        'data_confidence'       => 'integer',
        'competitor_count'      => 'integer',
        'report_count'          => 'integer',
        'competitor_categories' => 'array',
        'weights_snapshot'      => 'array',
        'sources_snapshot'      => 'array',
        'data_warnings'         => 'array',
        'factors'               => 'array',
        'analyzed_at'           => 'datetime',
        'created_at'            => 'datetime',
    ];

    public function simulation(): BelongsTo
    {
        return $this->belongsTo(Simulation::class);
    }
}

