<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A game's leaderboard changed (someone recorded a new attempt). Clients on the
 * play page update the standings live; `isMe` is computed per viewer client-side.
 */
class GameLeaderboardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array{top: array<int, array<string, mixed>>, totalPlayers: int}  $leaderboard
     */
    public function __construct(
        public int $courseId,
        public int $gameId,
        public array $leaderboard,
    ) {}

    public function broadcastAs(): string
    {
        return 'GameLeaderboardUpdated';
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('course.'.$this->courseId);
    }

    /**
     * @return array{gameId: int, leaderboard: array{top: array<int, array<string, mixed>>, totalPlayers: int}}
     */
    public function broadcastWith(): array
    {
        return ['gameId' => $this->gameId, 'leaderboard' => $this->leaderboard];
    }
}
