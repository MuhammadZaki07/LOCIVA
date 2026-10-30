<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string',
            'business_type_id' => 'required|exists:business_types,id',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'address'          => 'nullable|string|max:500',
            'image'            => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ];
    }
}
