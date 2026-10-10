<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AreaRequest extends FormRequest
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
            'name'      => ['required', 'string', 'max:150'],
            'type'      => ['required', 'string', 'max:50'],
            'code'      => ['nullable', 'string', 'max:100'],
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],

            'boundary'                => ['required', 'array'],
            'boundary.type'           => ['required', 'in:Polygon,MultiPolygon'],
            'boundary.coordinates'    => ['required', 'array', 'min:1'],
        ];
    }
}
