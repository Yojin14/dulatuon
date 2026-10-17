<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Enrollment extends Model
{
    protected static function booted(): void
    {
        // Only enrolment count (shown on the Explore catalogue) changes here;
        // progress updates don't, so we ignore plain "updated" events.
        $forget = fn () => Cache::forget('explore:courses');

        static::created($forget);
        static::deleted($forget);
    }

    protected $fillable = [
        'user_id',
        'course_id',
        'section_id',
        'status',
        'progress_percentage',
        'completed_lessons',
        'completed_assignments',
        'enrollment_date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function recalculateProgress(): void
    {
        $totalSessions = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $this->course_id))->count();

        if ($totalSessions === 0) {
            return;
        }

        $completedSessions = StudentSessionProgress::where('user_id', $this->user_id)
            ->where('course_id', $this->course_id)
            ->whereNotNull('completed_at')
            ->count();

        $percentage = round(($completedSessions / $totalSessions) * 100, 2);

        $this->update([
            'completed_lessons' => $completedSessions,
            'progress_percentage' => $percentage,
            'status' => $percentage >= 100 ? 'completed' : $this->status,
        ]);
    }
}
