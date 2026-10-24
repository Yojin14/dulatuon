<?php

namespace App\Models;

use App\Support\ProgressMilestones;
use App\Support\StudentProgress;
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

    /**
     * Store the student's current progress on the enrollment, using the same rules as My Progress
     * (lesson materials plus cleared games), so reports that average this column stay accurate.
     * The status is left alone: the course page only admits active enrollments.
     *
     * With `$announce`, the student is notified when this takes them up a rank or clears the
     * course. Backfills (seeding, progress:sync) pass false so nobody gets a burst of old news.
     */
    public function recalculateProgress(bool $announce = true): void
    {
        $course = $this->course()->with(StudentProgress::COURSE_RELATIONS)->first();
        if ($course === null || $this->user === null) {
            return;
        }

        $xpBefore = $announce ? StudentProgress::storedXp([$this->user_id])[$this->user_id] : 0;
        $clearedBefore = (float) $this->progress_percentage >= 100;

        $summary = StudentProgress::summary($this->user, [$course])['courses'][$course->id];

        $this->update([
            'completed_lessons' => $summary['items_completed'],
            'progress_percentage' => $summary['items_total'] > 0
                ? round($summary['items_completed'] / $summary['items_total'] * 100, 2)
                : 0,
        ]);

        if ($announce) {
            ProgressMilestones::announce(
                $this->user,
                $course,
                $xpBefore,
                StudentProgress::storedXp([$this->user_id])[$this->user_id],
                $clearedBefore,
                (float) $this->progress_percentage >= 100,
            );
        }
    }
}
