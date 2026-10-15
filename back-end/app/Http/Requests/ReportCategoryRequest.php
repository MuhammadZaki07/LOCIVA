<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ReportCategoryRequest extends FormRequest
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
        $rules = [
            'name' => ['sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'string'],
            'icon' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean']
        ];


        if (!$this->isUpdate()) {
            $this->merge(['slug' => Str::slug($this->input('name'))]);

            foreach ($rules as $k => $_) {
                $rules[$k][0] = "required";
            }
            $rules['slug'] = ['required', 'string', Rule::unique('report_categories', 'slug')->ignore($this->route('id'))];
        }


        return $rules;
    }

    protected function isUpdate(): bool
    {
        return $this->method() == 'PUT';
    }
}
