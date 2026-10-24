<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\User;
use App\Support\StudentProgress;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $data = match ($user->role) {
            'admin' => $this->adminData(),
            'teacher' => $this->teacherData($user),
            default => $this->studentData($user),
        };

        return Inertia::render('dashboard', $data);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function adminData(): array
    {
        $totalUsers = User::where('status', 'approved')->count();
        $totalStudents = User::where('status', 'approved')->where('role', 'student')->count();
        $totalTeachers = User::where('status', 'approved')->where('role', 'teacher')->count();

        $activeCourses = Course::where('status', 'published')->count();
        $totalCourses = Course::count();
        $totalEnrollments = Enrollment::count();

        $pendingTotal = User::where('status', 'pending')->count();

        $activeEnrollmentAvg = (float) (Enrollment::where('status', 'active')->avg('progress_percentage') ?? 0);

        return [
            'stats' => [
                'totalUsers' => $totalUsers,
                'totalStudents' => $totalStudents,
                'totalTeachers' => $totalTeachers,
                'activeCourses' => $activeCourses,
                'totalCourses' => $totalCourses,
                'totalEnrollments' => $totalEnrollments,
                'pendingTotal' => $pendingTotal,
                'activeEnrollmentAvg' => round($activeEnrollmentAvg, 1),
            ],
            'enrollmentTrend' => $this->dailyEnrollmentTrend(14),
            'usersByRole' => $this->usersByRole(),
        ];
    }

    /**
     * @return array<int, array{date: string, value: int}>
     */
    private function dailyEnrollmentTrend(int $days): array
    {
        $start = now()->subDays($days - 1)->startOfDay();

        $rows = DB::table('enrollments')
            ->select(DB::raw('DATE(created_at) as d'), DB::raw('COUNT(*) as value'))
            ->where('created_at', '>=', $start)
            ->groupBy('d')
            ->pluck('value', 'd')
            ->toArray();

        $out = [];
        $cursor = CarbonImmutable::parse($start);
        for ($i = 0; $i < $days; $i++) {
            $key = $cursor->toDateString();
            $out[] = ['date' => $cursor->format('M j'), 'value' => (int) ($rows[$key] ?? 0)];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /**
     * @return array<int, array{name: string, value: int}>
     */
    private function usersByRole(): array
    {
        return User::where('status', 'approved')
            ->select('role', DB::raw('count(*) as value'))
            ->groupBy('role')
            ->get()
            ->map(fn ($r) => ['name' => ucfirst($r->role ?? 'unknown'), 'value' => (int) $r->value])
            ->values()
            ->toArray();
    }

    // ── Teacher ──────────────────────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function teacherData(User $user): array
    {
        $courses = Course::query()
            ->withCount(['enrollments as student_count' => fn ($q) => $q->whereIn('status', ['active', 'completed'])])
            ->withAvg(['enrollments as avg_progress' => fn ($q) => $q->whereIn('status', ['active', 'completed'])], 'progress_percentage')
            ->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))
            ->orderBy('title')
            ->get();

        $courseIds = $courses->pluck('id');

        $toGradeByCourse = Submission::query()
            ->where('is_submitted', true)
            ->where('submissions.status', 'submitted')
            ->whereHas('assignment.session.module', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with('assignment.session.module:id,course_id')
            ->get()
            ->groupBy(fn (Submission $s) => $s->assignment?->session?->module?->course_id);

        $classes = $courses->map(fn (Course $c) => [
            'id' => $c->id,
            'title' => $c->title,
            'students' => (int) $c->student_count,
            'progress' => (int) round($c->avg_progress ?? 0),
            'pending' => $toGradeByCourse->get($c->id)?->count() ?? 0,
        ])->values();

        $totalStudents = (int) $classes->sum('students');
        $totalPending = (int) $classes->sum('pending');
        $avgProgress = $classes->isNotEmpty() ? (int) round($classes->avg('progress')) : 0;

        $gradingQueue = Submission::query()
            ->where('is_submitted', true)
            ->where('submissions.status', 'submitted')
            ->whereHas('assignment.session.module', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with(['user:id,name', 'assignment:id,title,session_id'])
            ->latest('submission_date')
            ->limit(6)
            ->get()
            ->map(fn (Submission $s) => [
                'id' => $s->id,
                'student' => $s->user?->name ?? 'Unknown',
                'assignment' => $s->assignment?->title ?? 'Submission',
                'submitted' => $s->submission_date?->diffForHumans() ?? '',
            ])
            ->values();

        return [
            'stats' => [
                'totalStudents' => $totalStudents,
                'classCount' => $classes->count(),
                'avgProgress' => $avgProgress,
                'toGrade' => $totalPending,
            ],
            'classes' => $classes,
            'gradingQueue' => $gradingQueue,
        ];
    }

    // ── Student ──────────────────────────────────────────────────────────────

    /**
     * @return array<string, mixed>
     */
    private function studentData(User $user): array
    {
        $enrollments = Enrollment::with(array_map(fn (string $relation) => "course.{$relation}", StudentProgress::COURSE_RELATIONS))
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'completed'])
            ->latest()
            ->get()
            ->filter(fn (Enrollment $e) => $e->course !== null)
            ->unique('course_id');

        $courseIds = $enrollments->pluck('course_id')->all();

        // Same rules as My Progress: lesson materials plus games, a game counts once cleared.
        ['courses' => $summaries, 'xp' => $xp] = StudentProgress::summary($user, $enrollments->pluck('course'));

        $courses = $enrollments->map(function (Enrollment $e) use ($summaries) {
            $summary = $summaries[$e->course_id];

            return [
                'id' => $e->course_id,
                'title' => $e->course->title,
                'instructor' => $summary['instructor'] ?: 'Instructor',
                'completed' => $summary['items_completed'],
                'total' => $summary['items_total'],
                'progress' => $summary['items_total'] > 0 ? (int) round($summary['items_completed'] / $summary['items_total'] * 100) : 0,
                'cleared' => $summary['complete'],
                'status' => $e->status,
            ];
        })->values();

        $avgProgress = $courses->isNotEmpty() ? (int) round($courses->avg('progress')) : 0;

        $submittedAssignmentIds = Submission::where('user_id', $user->id)
            ->where('is_submitted', true)
            ->pluck('assignment_id')
            ->flip();

        $dueSoon = Assignment::query()
            ->whereHas('session.module', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->where('status', 'published')
            ->whereNotNull('due_date')
            ->where('due_date', '>=', now()->subDay())
            ->with('session.module.course:id,title')
            ->orderBy('due_date')
            ->get()
            ->reject(fn (Assignment $a) => $submittedAssignmentIds->has($a->id))
            ->take(5)
            ->map(fn (Assignment $a) => [
                'id' => $a->id,
                'kind' => 'Assignment',
                'title' => $a->title,
                'course' => $a->session?->module?->course?->title ?? 'Course',
                'due' => $a->due_date->format('M j'),
                'urgent' => $a->due_date->isBefore(now()->addDays(3)),
            ])
            ->values();

        return [
            'stats' => [
                'enrolledCount' => $courses->count(),
                'avgProgress' => $avgProgress,
                'pendingWork' => $dueSoon->count(),
            ],
            'courses' => $courses,
            'dueSoon' => $dueSoon,
            'xp' => $xp,
        ];
    }
}
