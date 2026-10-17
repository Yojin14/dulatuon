<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Signals that a course's announcement feed changed (post, comment, or delete).
 * Clients react by refetching the feed; the originating user is identified so
 * they can skip the redundant reload they already performed.
 */
class AnnouncementUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $courseId, public int $triggeredBy) {}

    public function broadcastAs(): string
    {
        return 'AnnouncementUpdated';
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('course.'.$this->courseId);
    }

    /**
     * @return array<string, int>
     */
    public function broadcastWith(): array
    {
        return ['triggered_by' => $this->triggeredBy];
    }
}
