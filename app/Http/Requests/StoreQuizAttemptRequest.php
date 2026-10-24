<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreQuizAttemptRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'answers' => ['present', 'array', 'max:200'],
            'answers.*' => ['nullable', 'integer', 'min:0', 'max:50'],
            'timeSpent' => ['nullable', 'integer', 'min:0', 'max:86400'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'answers.present' => 'Send your answers.',
            'answers.*.integer' => 'An answer was not one of the choices.',
        ];
    }
}
