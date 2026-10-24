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

        return Inertia::render('my-progress/index', [
            'modules' => array_map(function (array $module): array {
                $module['completed_at'] = $module['completed_on']?->format('F d, Y');
                unset($module['completed_on']);

                return $module;
            }, $modules),
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
