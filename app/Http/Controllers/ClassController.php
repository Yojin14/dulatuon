<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Support\StudentProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClassController extends Controller
{
    /**
     * Display a listing of classes (admin view — all sections/classes).
     */
    public function index(Request $request): Response
    {
        return Inertia::render('classes/index');
    }

    /**
     * Display the specified class.
     */
    public function show(string $sectionName): Response
    {
        return Inertia::render('classes/show', [
            'sectionName' => $sectionName,
        ]);
    }

    /**
     * Display courses for the logged-in user.
     * Students see their enrolled courses; teachers/admins see courses they manage.
     */
    public function myClass(Request $request): Response
    {
        $user = $request->user();

        if ($user->role === 'student') {
            $active = Enrollment::with([
                'course' => fn ($q) => $q->withCount(['modules', 'enrollments'])->with(StudentProgress::COURSE_RELATIONS),
            ])
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->get();
            $summaries = StudentProgress::summary($user, $active->pluck('course')->filter())['courses'];

            $enrollments = $active
                ->map(function ($e) use ($summaries) {
                    $courseId = $e->course_id;
                    $summary = $summaries[$courseId];
                    $progress = $summary['items_total'] > 0
                        ? round(($summary['items_completed'] / $summary['items_total']) * 100)
                        : 0;

                    return [
                        'enrollment_id' => $e->id,
                        'course_id' => $courseId,
                        'status' => $e->status,
                        'progress_percentage' => $progress,
                        'enrollment_date' => $e->created_at->format('M d, Y'),
                        'course' => [
                            'id' => $e->course->id,
                            'title' => $e->course->title,
                            'description' => $e->course->description,
                            'short_description' => $e->course->short_description,
                            'level' => $e->course->level,
                            'course_code' => $e->course->course_code,
                            'modules_count' => $e->course->modules_count,
                            'enrollments_count' => $e->course->enrollments_count,
                            'thumbnail' => $e->course->thumbnail,
                            'thumbnail_focus' => $e->course->thumbnail_focus ?? 'center',
                            'instructor' => $e->course->teachers->first(),
                            'updated_at' => $e->course->updated_at->format('M d, Y'),
                        ],
                    ];
                });

            return Inertia::render('my-class/index', [
                'enrollments' => $enrollments,
            ]);
        }

        $query = Course::with('teachers:id,name')
            ->withCount(['modules', 'enrollments']);

        if ($user->role !== 'admin') {
            $query->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id));
        }

        $courses = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($course) => [
                'id' => $course->id,
                'course_code' => $course->course_code,
                'title' => $course->title,
                'description' => $course->description,
                'short_description' => $course->short_description,
                'level' => $course->level,
                'status' => $course->status,
                'thumbnail' => $course->thumbnail,
                'thumbnail_focus' => $course->thumbnail_focus ?? 'center',
                'instructor' => $course->teachers->first(),
                'modules_count' => $course->modules_count,
                'enrollments_count' => $course->enrollments_count,
                'updated_at' => $course->updated_at->format('M d, Y'),
            ]);

        return Inertia::render('my-class/index', [
            'courses' => $courses,
        ]);
    }

    /**
     * Class management view — teachers see their assigned courses; admins see all courses.
     */
    public function classManagement(Request $request): Response
    {
        $user = $request->user();

        // Load courses with teachers, modules, and active enrollments
        $courses = Course::with([
            'teachers:id,name,email,avatar',
            'modules',
            'enrollments' => fn ($q) => $q->where('status', 'active')->with('user:id,name,email,avatar'),
            'announcements.author:id,name',
            'announcements.comments.author:id,name',
        ])
            ->when($user->role !== 'admin', fn ($q) => $q->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id)))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($course) {
                // Same rules as My Progress; the stored progress_percentage column is never updated.
                $liveProgress = collect(StudentProgress::forClass($course, $course->enrollments->pluck('user')->filter()))
                    ->pluck('progress', 'user_id');
                // Overall XP across all their courses, for the rank frame on each student's avatar.
                $rankXp = StudentProgress::storedXp($course->enrollments->pluck('user_id')->all());

                return [
                    'id' => $course->id,
                    'title' => $course->title,
                    'course_code' => $course->course_code,
                    'level' => $course->level,
                    'status' => $course->status,
                    'teachers' => $course->teachers->map(fn ($t) => [
                        'id' => $t->id,
                        'name' => $t->name,
                        'email' => $t->email,
                        'avatar' => $t->avatar,
                    ])->values(),
                    'modules' => $course->modules->map(fn ($m) => [
                        'id' => $m->id,
                        'title' => $m->title,
                    ])->values(),
                    'students' => $course->enrollments->map(fn ($e) => [
                        'id' => $e->user->id,
                        'name' => $e->user->name,
                        'email' => $e->user->email,
                        'avatar' => $e->user->avatar,
                        'progress_percentage' => $liveProgress[$e->user_id] ?? 0,
                        'xp' => $rankXp[$e->user_id] ?? 0,
                        'enrollment_status' => $e->status,
                        'enrollment_id' => $e->id,
                    ])->values(),
                    'announcements' => $course->announcements->map(fn ($a) => $a->toFeedArray())->values(),
                ];
            });

        // Load assignments with submissions for these courses
        $courseIds = Course::when($user->role !== 'admin', fn ($q) => $q->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id)))
            ->pluck('id');

        $assignments = Assignment::with([
            'submissions' => fn ($q) => $q->where('is_submitted', true)->with(['user:id,name,email,avatar', 'grade']),
            'session.module',
        ])
            ->whereHas('session.module', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'dueDate' => $a->due_date?->format('Y-m-d'),
                'maxScore' => $a->points ?? 100,
                'courseId' => $a->session?->module?->course_id,
                'sessionTitle' => $a->session?->title ?? '',
                'submissions' => $a->submissions->map(fn ($s) => [
                    'id' => $s->id,
                    'student' => ['id' => $s->user->id, 'name' => $s->user->name, 'email' => $s->user->email],
                    'submissionType' => $s->submission_type,
                    'textContent' => $s->text_content,
                    'videoUrl' => $s->video_url,
                    'fileName' => $s->file_name,
                    'filePath' => $s->file_path,
                    'fileSize' => $s->file_size,
                    'submittedAt' => $s->submission_date?->format('M d, Y \a\t g:i A'),
                    'status' => $s->status,
                    'grade' => $s->status === 'graded' ? $s->grade?->toSummary() : null,
                ])->values(),
            ]);

        return Inertia::render('class-management/index', [
            'courses' => $courses,
            'assignments' => $assignments,
        ]);
    }

    /**
     * Display the specified course for the teacher or enrolled student.
     */
    public function myClassShow(string $courseId): Response
    {
        $user = request()->user();

        if ($user->role === 'student') {
            Enrollment::where('user_id', $user->id)
                ->where('course_id', (int) $courseId)
                ->where('status', 'active')
                ->firstOrFail();

            $course = Course::with('teachers:id,name')->findOrFail((int) $courseId);
        } elseif ($user->role === 'admin') {
            $course = Course::with('teachers:id,name')->findOrFail((int) $courseId);
        } else {
            $course = Course::with('teachers:id,name')
                ->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))
                ->findOrFail((int) $courseId);
        }

        $modules = CurriculumController::formatCurriculum($course);

        $completedContentIds = [];
        $completedGameIds = [];
        if ($user->role === 'student') {
            $completedContentIds = \App\Models\StudentContentProgress::where('user_id', $user->id)
                ->where('course_id', (int) $courseId)
                ->whereNotNull('completed_at')
                ->pluck('content_id')
                ->toArray();

            // Same rule as My Progress: a game is done once a run reaches the clear ratio.
            $courseGameIds = \App\Models\CourseGame::whereHas('session.module', fn ($q) => $q->where('course_id', (int) $courseId))->pluck('id')->all();
            $completedGameIds = array_keys(StudentProgress::clearedGames($user->id, $courseGameIds));
        }

        // Pass the student's own submissions keyed by assignment_id
        $mySubmissions = [];
        if ($user->role === 'student') {
            $assignmentIds = Assignment::whereHas('session.module', fn ($q) => $q->where('course_id', (int) $courseId))
                ->pluck('id');

            $mySubmissions = Submission::where('user_id', $user->id)
                ->whereIn('assignment_id', $assignmentIds)
                ->where('is_submitted', true)
                ->with('grade')
                ->get()
                ->keyBy('assignment_id')
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'submissionType' => $s->submission_type,
                    'textContent' => $s->text_content,
                    'videoUrl' => $s->video_url,
                    'fileName' => $s->file_name,
                    'filePath' => $s->file_path,
                    'fileSize' => $s->file_size,
                    'submittedAt' => $s->submission_date?->format('M d, Y \a\t g:i A'),
                    'status' => $s->status,
                    'grade' => $s->status === 'graded' ? $s->grade?->toSummary() : null,
                ])
                ->toArray();
        }

        $canEdit = $user->role === 'admin'
            || ($user->role === 'teacher' && $user->hasPermission('class_management'));

        $announcements = $course->announcements()
            ->with(['author:id,name', 'comments.author:id,name'])
            ->get()
            ->map(fn ($a) => $a->toFeedArray())
            ->values();

        return Inertia::render('my-class/show', [
            'courseId' => $courseId,
            'canEdit' => $canEdit,
            'completedContentIds' => $completedContentIds,
            'completedGameIds' => $completedGameIds,
            'mySubmissions' => $mySubmissions,
            'announcements' => $announcements,
            'courseData' => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description ?? '',
                'course_code' => $course->course_code,
                'level' => $course->level,
                'status' => $course->status,
                'thumbnail' => $course->thumbnail,
                'thumbnail_focus' => $course->thumbnail_focus ?? 'center',
                'intro_video' => $course->intro_video,
                'instructor' => $course->teachers->first(),
            ],
            'modules' => $modules,
        ]);
    }

    /**
     * Upload or update the thumbnail for a course (teacher/admin only).
     */
    public function uploadThumbnail(Request $request, string $courseId): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            $course = Course::findOrFail((int) $courseId);
        } else {
            $course = Course::whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))
                ->findOrFail((int) $courseId);
        }

        $request->validate([
            'thumbnail_file' => 'required|file|image|max:4096',
            'thumbnail_focus' => 'nullable|string|max:20',
        ]);

        if ($course->thumbnail && str_starts_with($course->thumbnail, '/storage/course-thumbnails/')) {
            \Storage::disk('public')->delete(str_replace('/storage/', '', $course->thumbnail));
        }

        $file = $request->file('thumbnail_file');
        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $path = 'course-thumbnails/'.Str::uuid().'.'.$ext;
        \Storage::disk('public')->put($path, file_get_contents($file->getPathname()));

        $course->thumbnail = '/storage/'.$path;
        $course->thumbnail_focus = $request->input('thumbnail_focus', 'center');
        $course->save();

        return response()->json([
            'thumbnail' => $course->thumbnail,
            'thumbnail_focus' => $course->thumbnail_focus,
        ]);
    }

    /**
     * Update only the focal point for an existing thumbnail.
     */
    public function updateThumbnailFocus(Request $request, string $courseId): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            $course = Course::findOrFail((int) $courseId);
        } else {
            $course = Course::whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))
                ->findOrFail((int) $courseId);
        }

        $request->validate([
            'thumbnail_focus' => 'required|string|max:20',
        ]);

        $course->thumbnail_focus = $request->input('thumbnail_focus');
        $course->save();

        return response()->json(['thumbnail_focus' => $course->thumbnail_focus]);
    }
}
