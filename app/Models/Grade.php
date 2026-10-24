<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    protected $fillable = [
        'user_id',
        'submission_id',
        'assignment_id',
        'course_id',
        'points_earned',
        'points_possible',
        'percentage',
        'feedback',
        'graded_by',
        'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'points_earned' => 'float',
            'points_possible' => 'float',
            'percentage' => 'float',
            'graded_at' => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    public function grader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    /**
     * The shape students and teachers see.
     *
     * @return array{points: float, possible: float, percent: int, feedback: string|null, gradedAt: string|null}
     */
    public function toSummary(): array
    {
        return [
            'points' => $this->points_earned,
            'possible' => $this->points_possible,
            'percent' => (int) round($this->percentage),
            'feedback' => $this->feedback,
            'gradedAt' => $this->graded_at?->toIso8601String(),
        ];
    }
}
