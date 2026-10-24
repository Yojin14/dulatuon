<?php

namespace App\Http\Requests\Settings;

use App\Support\AvatarPresets;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AvatarPresetRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'preset' => ['required', 'string', Rule::in(AvatarPresets::ids())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'preset.required' => 'Pick a character first.',
            'preset.in' => 'That character is not available.',
        ];
    }
}
