<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AssignmentsController extends Controller
{
    /**
     * Teachers: every assignment and quiz in their courses, with submissions to grade.
     * Students: their own assignments and quizzes with status, score and feedback.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return $user->role === 'student'
            ? Inertia::render('assignments/index', ['view' => 'student', ...$this->forStudent($user)])
            : Inertia::render('assignments/index', ['view' => 'teacher', ...$this->forTeacher($user)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function forTeacher(User $user): array
    {
        $courses = Course::query()
            ->when($user->role !== 'admin', fn ($q) => $q->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id)))
            ->withCount(['enrollments' => fn ($q) => $q->where('status', 'active')])
            ->get(['id', 'title']);
        $courseIds = $courses->pluck('id');
        $classSize = $courses->pluck('enrollments_count', 'id');
        $titles = $courses->pluck('title', 'id');

        $assignments = Assignment::query()
            ->whereIn('course_id', $courseIds)
            ->with([
                'session:id,title',
                'submissions' => fn ($q) => $q->where('is_submitted', true)->with(['user:id,name,avatar', 'grade'])->latest('submission_date'),
            ])
            ->orderByRaw('due_date is null, due_date')
            ->get()
            ->map(function (Assignment $assignment) use ($classSize, $titles) {
                $submissions = $assignment->submissions->map(fn (Submission $s) => [
                    'id' => $s->id,
                    'student' => ['id' => $s->user?->id, 'name' => $s->user?->name ?? 'Student', 'avatar' => $s->user?->avatar],
                    'type' => $s->submission_type,
                    'text' => $s->text_content,
                    'videoUrl' => $s->video_url,
                    'fileName' => $s->file_name,
                    'fileUrl' => $s->file_path ? '/storage/'.ltrim($s->file_path, '/') : null,
                    'submittedAt' => $s->submission_date?->toIso8601String(),
                    'late' => $assignment->due_date !== null && $s->submission_date?->greaterThan($assignment->due_date->copy()->endOfDay()),
                    'grade' => $s->status === 'graded' ? $s->grade?->toSummary() : null,
                ])->values();

                return [
                    'id' => $assignment->id,
                    'title' => $assignment->title,
                    'courseId' => $assignment->course_id,
                    'courseTitle' => $titles[$assignment->course_id] ?? '',
                    'lesson' => $assignment->session?->title,
                    'dueDate' => $assignment->due_date?->toDateString(),
                    'points' => (float) ($assignment->points ?: 100),
                    'classSize' => (int) ($classSize[$assignment->course_id] ?? 0),
                    'submissions' => $submissions,
                    'toGrade' => $submissions->whereNull('grade')->count(),
                ];
            })
            ->values();

        $quizzes = $this->quizStats(Quiz::query()->whereIn('course_id', $courseIds)->withCount('questions')->get(), $titles);

        return [
            'summary' => [
                'toGrade' => $assignments->sum('toGrade'),
                'graded' => $assignments->sum(fn ($a) => $a['submissions']->whereNotNull('grade')->count()),
                'missing' => $assignments->sum(fn ($a) => max(0, $a['classSize'] - $a['submissions']->count())),
            ],
            'assignments' => $assignments,
            'quizzes' => $quizzes,
        ];
    }

    /**
     * @param  Collection<int, Quiz>  $quizzes
     * @param  Collection<int, string>  $titles
     * @return list<array<string, mixed>>
     */
    private function quizStats(Collection $quizzes, Collection $titles): array
    {
        $attempts = QuizAttempt::query()
            ->whereIn('quiz_id', $quizzes->pluck('id'))
            ->with('user:id,name,avatar,role')
            ->get(['id', 'quiz_id', 'user_id', 'score', 'completed_at'])
            ->filter(fn ($a) => $a->user?->role === 'student')
            ->groupBy('quiz_id');

        return $quizzes->map(function (Quiz $quiz) use ($attempts, $titles) {
            $students = $attempts->get($quiz->id, collect())->groupBy('user_id')->map(fn (Collection $rows) => [
                'id' => $rows->first()->user_id,
                'name' => $rows->first()->user->name,
                'avatar' => $rows->first()->user->avatar,
                'best' => (int) round($rows->max('score')),
                'attempts' => $rows->count(),
                'lastAt' => $rows->max('completed_at')?->toIso8601String(),
            ])->sortByDesc('best')->values();

            return [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'courseId' => $quiz->course_id,
                'courseTitle' => $titles[$quiz->course_id] ?? '',
                'questions' => (int) $quiz->questions_count,
                'takers' => $students->count(),
                'averageBest' => $students->isEmpty() ? null : (int) round($students->avg('best')),
                'students' => $students,
            ];
        })->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function forStudent(User $user): array
    {
        $courseIds = Enrollment::where('user_id', $user->id)->where('status', 'active')->pluck('course_id');
        $titles = Course::whereIn('id', $courseIds)->pluck('title', 'id');

        $mine = Submission::where('user_id', $user->id)->where('is_submitted', true)->with('grade')->get()->keyBy('assignment_id');

        $assignments = Assignment::query()
            ->whereIn('course_id', $courseIds)
            ->with('session:id,title')
            ->orderByRaw('due_date is null, due_date')
            ->get()
            ->map(function (Assignment $assignment) use ($mine, $titles) {
                $submission = $mine->get($assignment->id);
                $grade = $submission?->status === 'graded' ? $submission->grade?->toSummary() : null;
                $overdue = $submission === null && $assignment->due_date !== null && $assignment->due_date->copy()->endOfDay()->isPast();

                return [
                    'id' => $assignment->id,
                    'title' => $assignment->title,
                    'courseId' => $assignment->course_id,
                    'courseTitle' => $titles[$assignment->course_id] ?? '',
                    'lesson' => $assignment->session?->title,
                    'dueDate' => $assignment->due_date?->toDateString(),
                    'points' => (float) ($assignment->points ?: 100),
                    'status' => $grade ? 'graded' : ($submission ? 'submitted' : ($overdue ? 'overdue' : 'todo')),
                    'submittedAt' => $submission?->submission_date?->toIso8601String(),
                    'grade' => $grade,
                ];
            })
            ->values();

        $attempts = QuizAttempt::where('user_id', $user->id)->get(['quiz_id', 'score'])->groupBy('quiz_id');
        $quizzes = Quiz::whereIn('course_id', $courseIds)->withCount('questions')->get()->map(fn (Quiz $quiz) => [
            'id' => $quiz->id,
            'title' => $quiz->title,
            'courseId' => $quiz->course_id,
            'courseTitle' => $titles[$quiz->course_id] ?? '',
            'questions' => (int) $quiz->questions_count,
            'best' => $attempts->has($quiz->id) ? (int) round($attempts[$quiz->id]->max('score')) : null,
            'attempts' => $attempts->get($quiz->id, collect())->count(),
        ])->values();

        return [
            'summary' => [
                'todo' => $assignments->whereIn('status', ['todo', 'overdue'])->count(),
                'submitted' => $assignments->where('status', 'submitted')->count(),
                'graded' => $assignments->where('status', 'graded')->count(),
            ],
            'assignments' => $assignments,
            'quizzes' => $quizzes,
        ];
    }
}
