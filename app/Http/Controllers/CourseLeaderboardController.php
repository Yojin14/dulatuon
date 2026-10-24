<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\StudentProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseLeaderboardController extends Controller
{
    /** Students shown to classmates; teachers always see the whole class. */
    public const STUDENT_VIEW_LIMIT = 10;

    /** Days without activity before a student is flagged for the teacher. */
    public const NUDGE_AFTER_DAYS = 7;

    /**
     * Class leaderboard for a course. Teachers and admins get every student with activity
     * details and a "needs a nudge" list; students get the top of the class plus their own place.
     */
    public function __invoke(Request $request, int $courseId): JsonResponse
    {
        $user = $request->user();
        $isStudent = $user->role === 'student';

        if ($isStudent) {
            Enrollment::where('user_id', $user->id)->where('course_id', $courseId)->where('status', 'active')->firstOrFail();
            $course = Course::findOrFail($courseId);
        } elseif ($user->role === 'admin') {
            $course = Course::findOrFail($courseId);
        } else {
            $course = Course::whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))->findOrFail($courseId);
        }

        $students = User::whereIn('id', Enrollment::select('user_id')->where('course_id', $course->id)->whereIn('status', ['active', 'completed']))
            ->where('role', 'student')
            ->orderBy('name')
            ->get(['id', 'name', 'avatar']);
        $names = $students->pluck('name', 'id');
        $avatars = $students->pluck('avatar', 'id');
        $totalXp = StudentProgress::storedXp($students->pluck('id')->all());

        $ranked = collect(StudentProgress::forClass($course, $students))
            ->sortBy([['xp', 'desc'], ['game_points', 'desc'], fn ($a, $b) => strcmp($names[$a['user_id']], $names[$b['user_id']])])
            ->values();

        // Shared rank for exact ties on XP and game points.
        $rows = [];
        $previous = null;
        foreach ($ranked as $index => $row) {
            $key = $row['xp'].'|'.$row['game_points'];
            $rank = $previous !== null && $previous['key'] === $key ? $previous['rank'] : $index + 1;
            $previous = ['key' => $key, 'rank' => $rank];
            $rows[] = $this->present($row, $rank, $names[$row['user_id']], ! $isStudent, $user->id) + ['total_xp' => $totalXp[$row['user_id']] ?? 0, 'avatar' => $avatars[$row['user_id']] ?? null];
        }

        if ($isStudent) {
            $me = collect($rows)->firstWhere('user_id', $user->id);

            return response()->json([
                'viewer' => 'student',
                'class_size' => count($rows),
                'rows' => array_slice($rows, 0, self::STUDENT_VIEW_LIMIT),
                'me' => $me,
            ]);
        }

        $nudgeBefore = now()->subDays(self::NUDGE_AFTER_DAYS);
        $nudges = collect($ranked)
            ->filter(fn ($row) => ! $row['complete'] && ($row['last_active_at'] === null || $row['last_active_at']->lessThan($nudgeBefore)))
            ->sortBy(fn ($row) => $row['last_active_at']?->timestamp ?? 0)
            ->map(fn ($row) => [
                'user_id' => $row['user_id'],
                'name' => $names[$row['user_id']],
                'progress' => $row['progress'],
                'reason' => $row['last_active_at'] === null
                    ? 'Has not started yet'
                    : 'Inactive since '.$row['last_active_at']->diffForHumans(),
            ])
            ->values();

        return response()->json([
            'viewer' => 'teacher',
            'class_size' => count($rows),
            'rows' => $rows,
            'nudges' => $nudges,
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function present(array $row, int $rank, string $name, bool $withActivity, int $viewerId): array
    {
        $presented = [
            'rank' => $rank,
            'user_id' => $row['user_id'],
            'name' => $name,
            'is_me' => $row['user_id'] === $viewerId,
            'xp' => $row['xp'],
            'progress' => $row['progress'],
            'labs_cleared' => $row['labs_cleared'],
            'labs_total' => $row['labs_total'],
            'complete' => $row['complete'],
        ];

        if ($withActivity) {
            $presented += [
                'items_done' => $row['items_done'],
                'items_total' => $row['items_total'],
                'modules_cleared' => $row['modules_cleared'],
                'modules_total' => $row['modules_total'],
                'game_points' => $row['game_points'],
                'last_active' => $row['last_active_at']?->diffForHumans(),
            ];
        }

        return $presented;
    }
}
