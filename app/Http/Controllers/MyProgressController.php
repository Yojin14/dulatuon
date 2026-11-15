<?php

namespace App\Http\Controllers;

use App\Models\CourseContentItem;
use App\Models\Enrollment;
use App\Models\StudentContentProgress;
use App\Support\StudentProgress;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyProgressController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $courses = Enrollment::with(array_map(fn (string $relation) => "course.{$relation}", StudentProgress::COURSE_RELATIONS))
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'completed'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->pluck('course')
            ->filter()
            ->unique('id');

        ['modules' => $modules, 'courses' => $courseSummaries, 'xp' => $xp] = StudentProgress::summary($user, $courses);

        $certificates = collect($courseSummaries)
            ->filter(fn (array $course) => $course['complete'])
            ->map(fn (array $course) => [
                'course_id' => $course['course_id'],
                'course_title' => $course['course_title'],
                'completed_at' => $course['completed_on']?->format('F d, Y'),
                'url' => route('certificates.show', $course['course_id']),
            ])
            ->values();

        $modulesByCourse = collect($modules)->groupBy('course_id');

        $courseRows = collect($courseSummaries)
            ->filter(fn (array $course) => $course['items_total'] > 0)
            ->map(function (array $course) use ($modulesByCourse): array {
                $courseModules = $modulesByCourse->get($course['course_id'], collect());

                return [
                    'course_id' => $course['course_id'],
                    'course_title' => $course['course_title'],
                    'instructor' => $course['instructor'],
                    'modules_cleared' => $course['modules_cleared'],
                    'modules_total' => $course['modules_total'],
                    'items_completed' => $course['items_completed'],
                    'items_total' => $course['items_total'],
                    'labs_cleared' => $courseModules->sum('games_cleared'),
                    'labs_total' => $courseModules->sum('total_games'),
                    'progress' => (int) round($course['items_completed'] / $course['items_total'] * 100),
                    'complete' => $course['complete'],
                    'completed_at' => $course['completed_on']?->format('F d, Y'),
                ];
            })
            ->sortBy([['complete', 'asc'], ['progress', 'desc']])
            ->values();

        $itemsTotal = $courseRows->sum('items_total');
        $itemsCompleted = $courseRows->sum('items_completed');

        return Inertia::render('my-progress/index', [
            'modules' => array_map(function (array $module): array {
                $module['completed_at'] = $module['completed_on']?->format('F d, Y');
                unset($module['completed_on']);

                return $module;
            }, $modules),
            'courses' => $courseRows,
            'overall' => [
                'progress' => $itemsTotal > 0 ? (int) round($itemsCompleted / $itemsTotal * 100) : 0,
                'items_completed' => $itemsCompleted,
                'items_total' => $itemsTotal,
                'courses_total' => $courseRows->count(),
                'courses_cleared' => $courseRows->where('complete', true)->count(),
                'modules_cleared' => $courseRows->sum('modules_cleared'),
                'modules_total' => $courseRows->sum('modules_total'),
                'labs_cleared' => $courseRows->sum('labs_cleared'),
                'labs_total' => $courseRows->sum('labs_total'),
            ],
            'certificates' => $certificates,
            'xp' => $xp,
        ]);
    }

    public function completeContent(Request $request, int $courseId, int $contentId)
    {
        $user = $request->user();

        $enrollment = Enrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        // The item must belong to this course, so progress can't be recorded against another course.
        CourseContentItem::whereKey($contentId)
            ->whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))
            ->firstOrFail();

        StudentContentProgress::updateOrCreate(
            ['user_id' => $user->id, 'content_id' => $contentId],
            ['course_id' => $courseId, 'completed_at' => now()]
        );

        $enrollment->recalculateProgress();

        return response()->json(['ok' => true]);
    }
}
