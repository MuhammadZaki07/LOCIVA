<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BusinessMapQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat'      => 'nullable|numeric|between:-90,90',
            'lng'      => 'nullable|numeric|between:-180,180',
            'radius'   => 'nullable|numeric|min:50|max:50000',
            'category' => 'nullable|string|max:100',
            'search'   => 'nullable|string|max:150',
            'limit'    => 'nullable|integer|min:1|max:300',
        ];
    }
}
