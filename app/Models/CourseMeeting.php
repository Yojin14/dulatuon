<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseMeeting extends Model
{
    protected $fillable = [
        'session_id',
        'title',
        'description',
        'meet_link',
        'scheduled_at',
        'timezone',
        'duration_minutes',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CourseSession::class, 'session_id');
    }
}
