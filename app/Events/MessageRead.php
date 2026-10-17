<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $roomId,
        public int $userId,
        public string $userName,
        public string $lastReadAt,
    ) {}

    public function broadcastAs(): string
    {
        return 'MessageRead';
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('chat.'.$this->roomId);
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'name' => $this->userName,
            'last_read_at' => $this->lastReadAt,
        ];
    }
}
