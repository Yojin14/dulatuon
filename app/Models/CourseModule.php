<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class CourseModule extends Model
{
    /** Explore shows each course's module count, so a module change refreshes its cache. */
    protected static function booted(): void
    {
        $forget = fn () => Cache::forget('explore:courses');

        static::saved($forget);
        static::deleted($forget);
    }

    protected $fillable = [
        'course_id',
        'title',
        'sort_order',
    ];

    protected $casts = [
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** Direct sessions (not inside a lesson group). */
    public function sessions(): HasMany
    {
        return $this->hasMany(CourseSession::class, 'module_id')
            ->whereNull('lesson_group_id')
            ->orderBy('sort_order');
    }

    /** All sessions in this module (including those inside lesson groups). */
    public function allSessions(): HasMany
    {
        return $this->hasMany(CourseSession::class, 'module_id')
            ->orderBy('sort_order');
    }

    public function lessonGroups(): HasMany
    {
        return $this->hasMany(CourseLessonGroup::class, 'module_id')
            ->orderBy('sort_order');
    }
}
