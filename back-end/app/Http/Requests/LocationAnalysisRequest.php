<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LocationAnalysisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat'           => 'required|numeric|between:-90,90',
            'lng'           => 'required|numeric|between:-180,180',
            'radius'        => 'required|numeric|between:50,5000',
            'business_type' => 'required|string|max:120',
            'candidate_id'  => 'nullable|string|max:5',
            'external_places'                 => 'nullable|array|max:400',
            'external_places.*.id'            => 'nullable|string|max:80',
            'external_places.*.name'          => 'required_with:external_places|string|max:200',
            'external_places.*.category'      => 'required_with:external_places|string|max:50',
            'external_places.*.lat'           => 'nullable|numeric|between:-90,90',
            'external_places.*.lng'           => 'nullable|numeric|between:-180,180',
            'external_places.*.source'        => 'nullable|string|max:40',
        ];
    }
}
