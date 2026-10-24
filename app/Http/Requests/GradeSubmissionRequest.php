<?php

namespace App\Http\Requests;

use App\Models\Submission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class GradeSubmissionRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Submission $submission */
        $submission = $this->route('submission');
        $maxPoints = (float) ($submission->assignment?->points ?? 100);

        return [
            'points' => ['required', 'numeric', 'min:0', "max:{$maxPoints}"],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'points.required' => 'Enter a score.',
            'points.max' => 'The score can be at most :max points.',
            'points.min' => 'The score cannot be negative.',
        ];
    }
}
