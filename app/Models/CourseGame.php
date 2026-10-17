<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseGame extends Model
{
    protected $fillable = [
        'session_id',
        'title',
        'description',
        'game_type',
        'points',
        'lives',
        'config',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'points' => 'integer',
            'lives' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CourseSession::class, 'session_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(GameAttempt::class, 'game_id');
    }
}
