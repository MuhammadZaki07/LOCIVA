<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AreaRequestUpdate extends FormRequest
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
            "name" => "sometimes|string",
            "type" => "sometimes|string",
            "code" => "sometimes|string",
            "latitude" => "sometimes|numeric",
            "longitude" => "sometimes|numeric",
            "boundary" => "sometimes|string",
        ];
    }
}
