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
            'candidate_id'        => 'required|string|in:A,B,C',
            'latitude'            => 'required|numeric|between:-90,90',
            'longitude'           => 'required|numeric|between:-180,180',
            'radius_m'            => 'required|numeric|min:50|max:5000',
            'business_type_id'    => 'required|string',
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
        ];
    }
}
