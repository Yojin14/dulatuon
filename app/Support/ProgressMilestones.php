<?php

namespace App\Support;

use App\Models\Course;
use App\Models\User;
use App\Models\UserNotification;

/**
 * Tells a student when a progress change takes them to a new rank or clears a course.
 */
class ProgressMilestones
{
    public static function announce(User $student, Course $course, int $xpBefore, int $xpAfter, bool $clearedBefore, bool $clearedAfter): void
    {
        if ($student->role !== 'student') {
            return;
        }

        if (RankLadder::index($xpAfter) > RankLadder::index($xpBefore)) {
            $rank = RankLadder::name($xpAfter);
            UserNotification::notify(
                $student->id,
                'rank_up',
                "You reached {$rank}",
                "{$xpAfter} XP. Keep clearing lessons and labs to climb higher.",
                '/my-progress',
                ['rank' => $rank, 'xp' => $xpAfter],
            );
        }

        if ($clearedAfter && ! $clearedBefore) {
            UserNotification::notify(
                $student->id,
                'certificate',
                'Certificate earned',
                "You cleared {$course->title}. Your certificate is ready.",
                route('certificates.show', $course->id, false),
                ['course_id' => $course->id],
            );
        }
    }
}
