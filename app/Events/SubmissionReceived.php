<?php

namespace App\Events;

use App\Models\Submission;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SubmissionReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Submission $submission,
        public int $courseId,
    ) {}

    public function broadcastAs(): string
    {
        return 'SubmissionReceived';
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('class.'.$this->courseId);
    }

    public function broadcastWith(): array
    {
        return [
            'type' => 'submission',
            'submission_id' => $this->submission->id,
            'student' => [
                'id' => $this->submission->user->id,
                'name' => $this->submission->user->name,
            ],
            'assignment' => [
                'id' => $this->submission->assignment->id,
                'title' => $this->submission->assignment->title,
            ],
            'file_name' => $this->submission->file_name,
            'submitted_at' => $this->submission->submission_date?->toIso8601String(),
        ];
    }
}
