<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AvatarUploadRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.required' => 'Choose a photo to upload.',
            'avatar.image' => 'That file is not a photo.',
            'avatar.mimes' => 'Use a JPG, PNG or WebP photo.',
            'avatar.max' => 'The photo must be 2 MB or smaller.',
        ];
    }
}
