<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveCandidateLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'candidate_id'        => 'required|string|max:50',
            'latitude'            => 'required|numeric|between:-90,90',
            'longitude'           => 'required|numeric|between:-180,180',
            'radius_m'            => 'required|numeric|min:50|max:5000',
            'business_type_id'    => 'required|string',
            'business_id'         => 'nullable|string',
            'status'              => 'nullable|string|in:draft,active,analyzed,calculated,failed,success,partial',
            'session_id'          => 'nullable|string',
            'session_name'        => 'nullable|string|max:150',
            'session_description' => 'nullable|string|max:500',
            'location_name'       => 'nullable|string|max:200',
            'address'             => 'nullable|string|max:500',
            'scores'              => 'nullable|array',
            'scores.opportunity_score'   => 'nullable|numeric|between:0,100',
            'scores.competition_score'   => 'nullable|numeric|between:0,100',
            'scores.accessibility_score' => 'nullable|numeric|between:0,100',
            'scores.data_confidence'     => 'nullable|numeric|between:0,100',
            'analyzed_lat'          => 'nullable|numeric|between:-90,90',
            'analyzed_lng'          => 'nullable|numeric|between:-180,180',
            'algorithm_version'     => 'nullable|string|max:20',
            'competitor_count'      => 'nullable|integer|min:0',
            'report_count'          => 'nullable|integer|min:0',
            'competitor_categories' => 'nullable|array',
            'weights_snapshot'      => 'nullable|array',
            'sources'               => 'nullable|array',
            'sources_snapshot'      => 'nullable|array',
            'data_warnings'         => 'nullable|array',
            'factors'               => 'nullable|array',
            'limitations'           => 'nullable|string',
            'analyzed_at'           => 'nullable|string',
        ];
    }
}
