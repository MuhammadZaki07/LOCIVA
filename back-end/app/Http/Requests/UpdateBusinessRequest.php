<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'             => 'sometimes|required|string|max:150',
            'description'      => 'nullable|string',
            'business_type_id' => 'sometimes|required|exists:business_types,id',
            'latitude'         => 'sometimes|required|numeric|between:-90,90',
            'longitude'        => 'sometimes|required|numeric|between:-180,180',
            'address'          => 'nullable|string|max:500',
        ];
    }
}
