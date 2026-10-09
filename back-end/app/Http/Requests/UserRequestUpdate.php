<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequestUpdate extends FormRequest
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
        $userId = $this->route('id');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],

            'google_id' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'profile_image' => [
                'sometimes',
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ];
    }


    public function messages(): array
    {
        return [
            'name.sometimes' => 'The name field must be provided when updating the name.',
            'name.required' => 'The name field is required.',
            'name.string' => 'The name must be a string.',
            'name.max' => 'The name must not exceed :max characters.',

            'email.sometimes' => 'The email field must be provided when updating the email.',
            'email.required' => 'The email field is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.max' => 'The email must not exceed :max characters.',
            'email.unique' => 'This email address is already registered.',

            'google_id.string' => 'The Google ID must be a string.',
            'google_id.max' => 'The Google ID must not exceed :max characters.',

            'profile_image.image' => 'The profile image must be a valid image file.',
            'profile_image.mimes' => 'The profile image must be a JPG, JPEG, PNG, or WEBP file.',
            'profile_image.max' => 'The profile image must not exceed 2 MB.',
        ];
    }
}
