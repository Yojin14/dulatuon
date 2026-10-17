<?php

namespace App\Http\Controllers;

use App\Models\CourseContentItem;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\StudentContentProgress;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyProgressController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $enrollments = Enrollment::with(['course.instructor:id,name', 'course.modules'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'completed'])
            ->orderBy('updated_at', 'desc')
            ->get();

        $moduleEntries = [];
        foreach ($enrollments as $enrollment) {
            foreach ($enrollment->course->modules as $module) {
                if (! isset($moduleEntries[$module->id])) {
                    $moduleEntries[$module->id] = ['module' => $module, 'course' => $enrollment->course];
                }
            }
        }

        $moduleIds = array_keys($moduleEntries);

        $sessionsByModule = CourseSession::whereIn('module_id', $moduleIds)
            ->get(['id', 'module_id'])
            ->groupBy('module_id');

        $allSessionIds = $sessionsByModule->flatten()->pluck('id')->all();

        $contentsBySession = CourseContentItem::whereIn('session_id', $allSessionIds)
            ->get(['id', 'session_id'])
            ->groupBy('session_id');

        $allContentIds = $contentsBySession->flatten()->pluck('id')->all();

        $progressByContent = StudentContentProgress::where('user_id', $user->id)
            ->whereIn('content_id', $allContentIds)
            ->whereNotNull('completed_at')
            ->get(['content_id', 'completed_at'])
            ->keyBy('content_id');

        $modules = [];
        foreach ($moduleEntries as $moduleId => $entry) {
            $module = $entry['module'];
            $course = $entry['course'];

            $contentIds = [];
            foreach ($sessionsByModule->get($moduleId, collect()) as $session) {
                foreach ($contentsBySession->get($session->id, collect()) as $content) {
                    $contentIds[] = $content->id;
                }
            }

            $totalContents = count($contentIds);
            if ($totalContents === 0) {
                continue;
            }

            $completedContents = 0;
            $lastCompletedAt = null;
            foreach ($contentIds as $id) {
                $record = $progressByContent->get($id);
                if (! $record) {
                    continue;
                }
                $completedContents++;
                if ($lastCompletedAt === null || $record->completed_at->greaterThan($lastCompletedAt)) {
                    $lastCompletedAt = $record->completed_at;
                }
            }

            $progress = round(($completedContents / $totalContents) * 100);
            $isCompleted = $completedContents === $totalContents;

            $modules[] = [
                'module_id' => $module->id,
                'course_id' => $course->id,
                'module_title' => $module->title,
                'course_title' => $course->title,
                'instructor' => $course->instructor->name ?? '',
                'contents_completed' => $completedContents,
                'total_contents' => $totalContents,
                'progress' => $progress,
                'completed_at' => $isCompleted
                    ? $lastCompletedAt?->format('F d, Y')
                    : null,
            ];
        }

        return Inertia::render('my-progress/index', [
            'modules' => $modules,
        ]);
    }

    public function completeContent(Request $request, int $courseId, int $contentId)
    {
        $user = $request->user();

        Enrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        StudentContentProgress::updateOrCreate(
            ['user_id' => $user->id, 'content_id' => $contentId],
            ['course_id' => $courseId, 'completed_at' => now()]
        );

        return response()->json(['ok' => true]);
    }
}
