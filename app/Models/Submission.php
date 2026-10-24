<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Submission extends Model
{
    protected $fillable = [
        'user_id',
        'assignment_id',
        'submission_type',
        'text_content',
        'video_url',
        'file_path',
        'file_name',
        'file_size',
        'status',
        'is_submitted',
        'submission_date',
    ];

    protected $casts = [
        'submission_date' => 'datetime',
        'is_submitted' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    public function grade(): HasOne
    {
        return $this->hasOne(Grade::class);
    }
}
