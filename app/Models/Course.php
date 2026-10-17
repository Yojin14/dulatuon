<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Course extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        $forget = fn () => Cache::forget('explore:courses');

        static::saved($forget);
        static::deleted($forget);
    }

    protected $fillable = [
        'course_code',
        'title',
        'description',
        'short_description',
        'level',
        'status',
        'thumbnail',
        'thumbnail_focus',
        'intro_video',
        'instructor_id',
        'max_students',
    ];

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_teachers')->withTimestamps();
    }

    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** Curriculum modules managed in the Manage Course editor. */
    public function modules(): HasMany
    {
        return $this->hasMany(CourseModule::class)->orderBy('sort_order');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class)->latest();
    }
}
