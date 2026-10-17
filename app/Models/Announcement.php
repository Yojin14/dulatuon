<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Announcement extends Model
{
    /** @use HasFactory<\Database\Factories\AnnouncementFactory> */
    use HasFactory;

    protected $fillable = ['course_id', 'user_id', 'body'];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(AnnouncementComment::class)->oldest();
    }

    /**
     * Shape used by the class-management feed and the student announcement footer.
     * Expects `author` and `comments.author` to be eager-loaded.
     *
     * @return array<string, mixed>
     */
    public function toFeedArray(): array
    {
        return [
            'id' => $this->id,
            'author' => $this->author ? ['id' => $this->author->id, 'name' => $this->author->name] : null,
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
            'comments' => $this->comments->map(fn (AnnouncementComment $c) => [
                'id' => $c->id,
                'author' => $c->author ? ['id' => $c->author->id, 'name' => $c->author->name] : null,
                'body' => $c->body,
                'created_at' => $c->created_at?->toIso8601String(),
            ])->values(),
        ];
    }
}
