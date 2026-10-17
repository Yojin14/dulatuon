<?php

namespace App\Models;

use App\Events\NotificationSent;
use App\Support\Realtime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotification extends Model
{
    protected $fillable = ['user_id', 'type', 'title', 'body', 'link', 'data', 'read_at'];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    /**
     * Create a notification for a user and broadcast it over their private channel.
     *
     * @param  array<string, mixed>  $data
     */
    public static function notify(
        int $userId,
        string $type,
        string $title,
        ?string $body = null,
        ?string $link = null,
        array $data = [],
    ): self {
        $notification = static::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'link' => $link,
            'data' => $data ?: null,
        ]);

        $notification->broadcast();

        return $notification;
    }

    /** Broadcast this notification with the recipient's current unread count. */
    public function broadcast(): void
    {
        $unreadCount = static::query()
            ->where('user_id', $this->user_id)
            ->unread()
            ->count();

        Realtime::dispatch(fn () => broadcast(new NotificationSent($this, $unreadCount)));
    }
}
