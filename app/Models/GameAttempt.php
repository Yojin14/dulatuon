<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameAttempt extends Model
{
    protected $fillable = [
        'game_id',
        'user_id',
        'score',
        'max_score',
        'correct_count',
        'total_count',
        'time_spent',
        'detail',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'detail' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(CourseGame::class, 'game_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
