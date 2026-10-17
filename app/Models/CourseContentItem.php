<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseContentItem extends Model
{
    protected $fillable = [
        'session_id',
        'type',
        'title',
        'description',
        'url',
        'filename',
        'file_path',
        'file_size',
        'sort_order',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CourseSession::class, 'session_id');
    }
}
