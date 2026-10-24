<?php

namespace App\Support;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\UserNotification;

/**
 * Tells a course's students when a teacher adds something new to it. A teacher building a
 * lesson adds many items in a row, so news within a short window merges into one notification.
 */
class CourseNews
{
    public const MERGE_MINUTES = 30;

    public static function itemAdded(int $courseId, string $itemTitle): void
    {
        $course = Course::find($courseId);
        if ($course === null || $course->status !== 'published') {
            return;
        }

        $studentIds = Enrollment::query()
            ->where('course_id', $courseId)
            ->where('status', 'active')
            ->pluck('user_id');

        $link = "/my-course/{$courseId}";

        foreach ($studentIds as $studentId) {
            $recent = UserNotification::query()
                ->where('user_id', $studentId)
                ->where('type', 'new_content')
                ->where('data->course_id', $courseId)
                ->unread()
                ->where('updated_at', '>=', now()->subMinutes(self::MERGE_MINUTES))
                ->latest('id')
                ->first();

            if ($recent) {
                $count = (int) ($recent->data['count'] ?? 1) + 1;
                $recent->update([
                    'title' => "{$count} new items in {$course->title}",
                    'body' => "Latest: {$itemTitle}",
                    'data' => ['course_id' => $courseId, 'count' => $count],
                ]);
                $recent->broadcast();

                continue;
            }

            UserNotification::notify(
                $studentId,
                'new_content',
                "New in {$course->title}",
                $itemTitle,
                $link,
                ['course_id' => $courseId, 'count' => 1],
            );
        }
    }
}
