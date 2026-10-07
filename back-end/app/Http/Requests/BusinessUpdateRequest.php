<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BusinessUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'business_type_id' => ['sometimes', 'uuid', 'exists:business_types,id'],
            'name'             => ['sometimes', 'string', 'max:150'],
            'description'      => ['sometimes', 'nullable', 'string'],
            'latitude'         => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude'        => ['sometimes', 'numeric', 'between:-180,180'],
            'address'          => ['sometimes', 'nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'business_type_id.uuid'   => 'Invalid business type ID format.',
            'business_type_id.exists' => 'The selected business type was not found.',
            'name.string'             => 'Business name must be a string.',
            'name.max'                => 'Business name must not exceed :max characters.',
            'description.string'      => 'Description must be a string.',
            'latitude.numeric'        => 'Latitude coordinate must be a number.',
            'latitude.between'        => 'Latitude coordinate must be between -90 and 90.',
            'longitude.numeric'       => 'Longitude coordinate must be a number.',
            'longitude.between'       => 'Longitude coordinate must be between -180 and 180.',
            'address.string'          => 'Address must be a string.',
        ];
    }
}
