<?php

namespace App\Support;

use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseGame;
use App\Models\CourseSession;
use App\Models\GameAttempt;
use App\Models\StudentContentProgress;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * One definition of "how far is this student" shared by My Progress, certificates and
 * class leaderboards: a module's items are its lesson materials plus its games, a
 * material counts once marked done and a game once a run reaches the clear ratio.
 */
class StudentProgress
{
    /**
     * Share of a game's questions a student must get right for it to count as cleared
     * (the game's "Well played", two-star result).
     */
    public const GAME_CLEAR_RATIO = 0.6;

    /** XP for each finished lesson material or cleared game. Mirrors resources/js/lib/gamification.ts. */
    public const XP_PER_ITEM = 10;

    /** Bonus XP for clearing every module of a course. */
    public const XP_PER_COURSE_CLEAR = 100;

    /** Relations {@see summary()} and {@see modules()} expect on each course. */
    public const COURSE_RELATIONS = ['modules', 'teachers:id,name', 'instructor:id,name'];

    /**
     * The teacher shown for a course everywhere: its first assigned teacher, falling back
     * to the legacy instructor column.
     */
    public static function teacherName(Course $course): string
    {
        return $course->teachers->first()?->name ?? $course->instructor?->name ?? '';
    }

    /**
     * Everything the student-facing pages need in one pass: module rows, per-course totals
     * (including enrolled courses that have no items yet) and total XP.
     *
     * @param  iterable<Course>  $courses  Courses with {@see COURSE_RELATIONS} loaded.
     * @return array{modules: array<int, array<string, mixed>>, courses: array<int, array<string, mixed>>, xp: int}
     */
    public static function summary(User $user, iterable $courses): array
    {
        $courses = collect($courses);
        $modules = self::modules($user, $courses);
        $byCourse = self::courses($modules);

        $summaries = [];
        foreach ($courses as $course) {
            $summaries[$course->id] = $byCourse[$course->id] ?? [
                'course_id' => $course->id,
                'course_title' => $course->title,
                'instructor' => self::teacherName($course),
                'modules_total' => 0,
                'modules_cleared' => 0,
                'items_completed' => 0,
                'items_total' => 0,
                'complete' => false,
                'completed_on' => null,
            ];
        }

        return ['modules' => $modules, 'courses' => $summaries, 'xp' => self::xp($summaries)];
    }

    /**
     * Total XP across course summaries: 10 per finished item plus 100 per cleared course.
     *
     * @param  iterable<array{items_completed: int, complete: bool}>  $courseSummaries
     */
    public static function xp(iterable $courseSummaries): int
    {
        $xp = 0;
        foreach ($courseSummaries as $course) {
            $xp += $course['items_completed'] * self::XP_PER_ITEM + ($course['complete'] ? self::XP_PER_COURSE_CLEAR : 0);
        }

        return $xp;
    }

    /**
     * Progress per module for the given courses. Modules with nothing in them are skipped.
     *
     * @param  iterable<Course>  $courses  Courses with {@see COURSE_RELATIONS} loaded.
     * @return array<int, array{module_id: int, course_id: int, module_title: string, course_title: string, instructor: string, contents_completed: int, total_contents: int, games_cleared: int, total_games: int, progress: int, completed_on: Carbon|null}>
     */
    public static function modules(User $user, iterable $courses): array
    {
        $moduleEntries = [];
        foreach ($courses as $course) {
            foreach ($course->modules as $module) {
                $moduleEntries[$module->id] ??= ['module' => $module, 'course' => $course];
            }
        }

        if ($moduleEntries === []) {
            return [];
        }

        $sessionsByModule = CourseSession::whereIn('module_id', array_keys($moduleEntries))
            ->get(['id', 'module_id'])
            ->groupBy('module_id');
        $sessionIds = $sessionsByModule->flatten()->pluck('id')->all();

        $contentsBySession = CourseContentItem::whereIn('session_id', $sessionIds)
            ->get(['id', 'session_id'])
            ->groupBy('session_id');
        $gamesBySession = CourseGame::whereIn('session_id', $sessionIds)
            ->get(['id', 'session_id'])
            ->groupBy('session_id');

        $doneContents = StudentContentProgress::where('user_id', $user->id)
            ->whereIn('content_id', $contentsBySession->flatten()->pluck('id')->all())
            ->whereNotNull('completed_at')
            ->pluck('completed_at', 'content_id');
        $clearedGames = self::clearedGames($user->id, $gamesBySession->flatten()->pluck('id')->all());

        $modules = [];
        foreach ($moduleEntries as $moduleId => ['module' => $module, 'course' => $course]) {
            $finishedAt = [];
            $total = 0;
            $gamesTotal = 0;
            $gamesCleared = 0;

            foreach ($sessionsByModule->get($moduleId, collect()) as $session) {
                foreach ($contentsBySession->get($session->id, collect()) as $content) {
                    $total++;
                    if ($doneContents->has($content->id)) {
                        $finishedAt[] = Carbon::parse($doneContents->get($content->id));
                    }
                }
                foreach ($gamesBySession->get($session->id, collect()) as $game) {
                    $total++;
                    $gamesTotal++;
                    if (array_key_exists($game->id, $clearedGames)) {
                        $gamesCleared++;
                        $finishedAt[] = $clearedGames[$game->id];
                    }
                }
            }

            if ($total === 0) {
                continue;
            }

            $done = count($finishedAt);
            $modules[] = [
                'module_id' => $module->id,
                'course_id' => $course->id,
                'module_title' => $module->title,
                'course_title' => $course->title,
                'instructor' => self::teacherName($course),
                'contents_completed' => $done,
                'total_contents' => $total,
                'games_cleared' => $gamesCleared,
                'total_games' => $gamesTotal,
                'progress' => (int) round(($done / $total) * 100),
                'completed_on' => $done === $total ? collect($finishedAt)->filter()->max() : null,
            ];
        }

        return $modules;
    }

    /**
     * Roll module rows up per course; a course is complete when every module in it is cleared.
     *
     * @param  array<int, array<string, mixed>>  $modules  Rows from {@see modules()}.
     * @return array<int, array{course_id: int, course_title: string, instructor: string, modules_total: int, modules_cleared: int, items_completed: int, items_total: int, complete: bool, completed_on: Carbon|null}>
     */
    public static function courses(array $modules): array
    {
        $courses = [];
        foreach ($modules as $module) {
            $course = $courses[$module['course_id']] ?? [
                'course_id' => $module['course_id'],
                'course_title' => $module['course_title'],
                'instructor' => $module['instructor'],
                'modules_total' => 0,
                'modules_cleared' => 0,
                'items_completed' => 0,
                'items_total' => 0,
                'complete' => false,
                'completed_on' => null,
            ];
            $course['modules_total']++;
            $course['items_completed'] += $module['contents_completed'];
            $course['items_total'] += $module['total_contents'];
            if ($module['completed_on'] !== null) {
                $course['modules_cleared']++;
                if ($course['completed_on'] === null || $module['completed_on']->greaterThan($course['completed_on'])) {
                    $course['completed_on'] = $module['completed_on'];
                }
            }
            $courses[$module['course_id']] = $course;
        }

        return array_map(function (array $course): array {
            $course['complete'] = $course['modules_cleared'] === $course['modules_total'];
            if (! $course['complete']) {
                $course['completed_on'] = null;
            }

            return $course;
        }, $courses);
    }

    /**
     * Course standing for every given student in one pass (a handful of queries for the whole
     * class), using the same rules as {@see modules()}. XP matches the student-side formula:
     * 10 per finished item plus 100 for clearing the course.
     *
     * @param  iterable<User>  $students
     * @return array<int, array{user_id: int, items_done: int, items_total: int, progress: int, modules_cleared: int, modules_total: int, labs_cleared: int, labs_total: int, game_points: int, xp: int, complete: bool, last_active_at: Carbon|null}>
     */
    public static function forClass(Course $course, iterable $students): array
    {
        $userIds = collect($students)->pluck('id')->all();
        if ($userIds === []) {
            return [];
        }

        $sessions = CourseSession::whereIn('module_id', $course->modules()->pluck('id'))->get(['id', 'module_id']);
        $moduleOfSession = $sessions->pluck('module_id', 'id');

        $contentModule = CourseContentItem::whereIn('session_id', $sessions->pluck('id'))
            ->get(['id', 'session_id'])
            ->mapWithKeys(fn ($c) => [$c->id => $moduleOfSession[$c->session_id]]);
        $gameModule = CourseGame::whereIn('session_id', $sessions->pluck('id'))
            ->get(['id', 'session_id'])
            ->mapWithKeys(fn ($g) => [$g->id => $moduleOfSession[$g->session_id]]);

        // Items per module; modules with nothing in them don't count, as on My Progress.
        $moduleSizes = [];
        foreach ([...$contentModule->values(), ...$gameModule->values()] as $moduleId) {
            $moduleSizes[$moduleId] = ($moduleSizes[$moduleId] ?? 0) + 1;
        }
        $itemsTotal = array_sum($moduleSizes);

        $doneByUser = StudentContentProgress::whereIn('user_id', $userIds)
            ->whereIn('content_id', $contentModule->keys())
            ->whereNotNull('completed_at')
            ->get(['user_id', 'content_id', 'completed_at'])
            ->groupBy('user_id');

        $attemptsByUser = GameAttempt::whereIn('user_id', $userIds)
            ->whereIn('game_id', $gameModule->keys())
            ->get(['user_id', 'game_id', 'score', 'correct_count', 'total_count', 'created_at'])
            ->groupBy('user_id');

        $rows = [];
        foreach ($userIds as $userId) {
            $doneInModule = [];
            $lastActive = null;
            $touch = function (?Carbon $at) use (&$lastActive): void {
                if ($at !== null && ($lastActive === null || $at->greaterThan($lastActive))) {
                    $lastActive = $at;
                }
            };

            foreach ($doneByUser->get($userId, collect()) as $record) {
                $moduleId = $contentModule[$record->content_id];
                $doneInModule[$moduleId] = ($doneInModule[$moduleId] ?? 0) + 1;
                $touch(Carbon::parse($record->completed_at));
            }

            $bestScore = [];
            $clearedGames = [];
            foreach ($attemptsByUser->get($userId, collect()) as $attempt) {
                $bestScore[$attempt->game_id] = max($bestScore[$attempt->game_id] ?? 0, $attempt->score);
                $touch($attempt->created_at);
                if ($attempt->total_count > 0 && $attempt->correct_count / $attempt->total_count >= self::GAME_CLEAR_RATIO) {
                    $clearedGames[$attempt->game_id] = true;
                }
            }
            foreach (array_keys($clearedGames) as $gameId) {
                $moduleId = $gameModule[$gameId];
                $doneInModule[$moduleId] = ($doneInModule[$moduleId] ?? 0) + 1;
            }

            $itemsDone = array_sum($doneInModule);
            $modulesCleared = count(array_filter($moduleSizes, fn (int $size, int $moduleId) => ($doneInModule[$moduleId] ?? 0) >= $size, ARRAY_FILTER_USE_BOTH));
            $complete = $moduleSizes !== [] && $modulesCleared === count($moduleSizes);

            $rows[] = [
                'user_id' => $userId,
                'items_done' => $itemsDone,
                'items_total' => $itemsTotal,
                'progress' => $itemsTotal > 0 ? (int) round($itemsDone / $itemsTotal * 100) : 0,
                'modules_cleared' => $modulesCleared,
                'modules_total' => count($moduleSizes),
                'labs_cleared' => count($clearedGames),
                'labs_total' => $gameModule->count(),
                'game_points' => array_sum($bestScore),
                'xp' => $itemsDone * self::XP_PER_ITEM + ($complete ? self::XP_PER_COURSE_CLEAR : 0),
                'complete' => $complete,
                'last_active_at' => $lastActive,
            ];
        }

        return $rows;
    }

    /**
     * Games the student has cleared, keyed by game id, with when they first cleared it.
     *
     * @param  array<int, int>  $gameIds
     * @return array<int, Carbon>
     */
    public static function clearedGames(int $userId, array $gameIds): array
    {
        if ($gameIds === []) {
            return [];
        }

        $cleared = [];
        $attempts = GameAttempt::where('user_id', $userId)
            ->whereIn('game_id', $gameIds)
            ->where('total_count', '>', 0)
            ->orderBy('created_at')
            ->get(['game_id', 'correct_count', 'total_count', 'completed_at', 'created_at']);

        foreach ($attempts as $attempt) {
            if (! isset($cleared[$attempt->game_id]) && $attempt->correct_count / $attempt->total_count >= self::GAME_CLEAR_RATIO) {
                $cleared[$attempt->game_id] = $attempt->completed_at ?? $attempt->created_at;
            }
        }

        return $cleared;
    }
}
