<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BusinessTypeUpdateRequest extends FormRequest
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
            'name' => [
                'sometimes',
                'string',
                'max:100',
            ],

            'slug' => [
                'sometimes',
                'string',
                'max:120',
                Rule::unique('business_types', 'slug')
                    ->ignore($this->route('id')),
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'default_radius_m' => [
                'sometimes',
                'nullable',
                'integer',
                'min:0',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.string'              => 'Business type name must be a string.',
            'name.max'                 => 'Business type name must not exceed :max characters.',
            'slug.string'              => 'Business type slug must be a string.',
            'slug.max'                 => 'Business type slug must not exceed :max characters.',
            'slug.unique'              => 'The business type slug has already been taken.',
            'description.string'       => 'Description must be a string.',
            'default_radius_m.integer' => 'Default radius must be an integer.',
            'default_radius_m.min'     => 'Default radius must be at least :min.',
            'is_active.boolean'        => 'The active status must be true or false.',
        ];
    }
}
