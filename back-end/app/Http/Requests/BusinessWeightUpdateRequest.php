<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BusinessWeightUpdateRequest extends FormRequest
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
            'business_type_id' => ['sometimes', 'uuid', 'exists:business_types,id',],
            'factor' => ['sometimes', 'string', 'max:50',],
            'weight' => ['sometimes', 'numeric', 'min:0', 'max:100',],
        ];
    }

    public function messages(): array
    {
        return [
            'business_type_id.uuid' => 'Invalid business type ID format.',
            'business_type_id.exists' => 'The selected business type was not found.',
            'factor.string' => 'Factor must be a string.',
            'factor.max' => 'Factor must not exceed :max characters.',
            'weight.numeric' => 'Weight must be a number.',
            'weight.min' => 'Weight must be at least :min.',
            'weight.max' => 'Weight must not exceed :max.',
        ];
    }
}
