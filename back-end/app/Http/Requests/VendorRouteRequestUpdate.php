<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VendorRouteRequestUpdate extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'business_id' => [
                'sometimes',
                'uuid',
                'exists:businesses,id',
            ],

            'name' => [
                'sometimes',
                'string',
                'max:255',
            ],

            'route_geometry' => [
                'sometimes',
                'array',
                'min:2',
            ],

            'route_geometry.*' => [
                'required',
                'array',
                'size:2',
            ],

            'route_geometry.*.0' => [
                'required',
                'numeric',
                'between:-90,90',
            ],

            'route_geometry.*.1' => [
                'required',
                'numeric',
                'between:-180,180',
            ],

            'distance' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'estimated_duration' => [
                'sometimes',
                'nullable',
                'integer',
                'min:0',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'business_id.uuid' => 'The business ID must be a valid UUID.',
            'business_id.exists' => 'The selected business does not exist.',

            'name.string' => 'The route name must be a string.',
            'name.max' => 'The route name may not be greater than 255 characters.',

            'route_geometry.array' => 'The route geometry must be an array.',
            'route_geometry.min' => 'The route must contain at least two points.',

            'route_geometry.*.required' => 'Each route point is required.',
            'route_geometry.*.array' => 'Each route point must be an array.',
            'route_geometry.*.size' => 'Each route point must contain exactly two coordinates.',

            'route_geometry.*.0.required' => 'The latitude coordinate is required.',
            'route_geometry.*.0.numeric' => 'The latitude coordinate must be a number.',
            'route_geometry.*.0.between' => 'The latitude must be between -90 and 90.',

            'route_geometry.*.1.required' => 'The longitude coordinate is required.',
            'route_geometry.*.1.numeric' => 'The longitude coordinate must be a number.',
            'route_geometry.*.1.between' => 'The longitude must be between -180 and 180.',

            'distance.numeric' => 'The distance must be a number.',
            'distance.min' => 'The distance cannot be negative.',

            'estimated_duration.integer' => 'The estimated duration must be an integer.',
            'estimated_duration.min' => 'The estimated duration cannot be negative.',
        ];
    }
}
