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
        'pages',
    ];

    protected function casts(): array
    {
        return [
            'pages' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CourseSession::class, 'session_id');
    }
}
