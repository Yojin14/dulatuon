<?php

namespace App\Models;

use App\Support\SimulationGames;
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

    /**
     * The questions a player answers: the built-in checkpoints for a 3D lab, or the
     * teacher's own items for a word game.
     *
     * @return list<array{prompt: string, answer: string, distractors?: list<string>}>
     */
    public function checkpointItems(): array
    {
        if (SimulationGames::isSimulation($this->game_type)) {
            return SimulationGames::items($this->game_type);
        }

        return $this->config['items'] ?? [];
    }

    /** Answers are compared ignoring case and surrounding spaces. */
    public static function answerMatches(string $given, string $answer): bool
    {
        return mb_strtolower(trim($given)) === mb_strtolower(trim($answer));
    }
}
