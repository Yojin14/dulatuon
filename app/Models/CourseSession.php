<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseSession extends Model
{
    protected $fillable = [
        'module_id',
        'lesson_group_id',
        'title',
        'sort_order',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(CourseModule::class, 'module_id');
    }

    public function lessonGroup(): BelongsTo
    {
        return $this->belongsTo(CourseLessonGroup::class, 'lesson_group_id');
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(CourseContentItem::class, 'session_id')
            ->orderBy('sort_order');
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class, 'session_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class, 'session_id');
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(CourseMeeting::class, 'session_id')->orderBy('scheduled_at');
    }

    public function games(): HasMany
    {
        return $this->hasMany(CourseGame::class, 'session_id')->orderBy('sort_order');
    }
}
