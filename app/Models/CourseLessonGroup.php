<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseLessonGroup extends Model
{
    protected $fillable = [
        'module_id',
        'title',
        'sort_order',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(CourseModule::class, 'module_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(CourseSession::class, 'lesson_group_id')
            ->orderBy('sort_order');
    }
}
