<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $courseFields = fn ($course) => [
            'id' => $course->id,
            'course_code' => $course->course_code,
            'title' => $course->title,
            'description' => $course->description,
            'short_description' => $course->short_description,
            'level' => $course->level,
            'status' => $course->status,
            'thumbnail' => $course->thumbnail,
            'intro_video' => $course->intro_video,
            'max_students' => $course->max_students,
            'modules_count' => $course->modules_count ?? 0,
            'subjects_count' => $course->subjects_count ?? 0,
            'enrollments_count' => $course->enrollments_count ?? 0,
            'instructor' => $course->teachers->first(),
            'created_at' => $course->created_at,
        ];

        if ($user->role === 'admin') {
            $courses = Course::with('teachers:id,name')
                ->withCount(['modules', 'subjects', 'enrollments'])
                ->orderBy('created_at', 'desc')
                ->paginate(15)
                ->through($courseFields);
        } elseif ($user->role === 'teacher') {
            $courses = Course::with('teachers:id,name')
                ->withCount(['modules', 'subjects', 'enrollments'])
                ->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))
                ->orderBy('created_at', 'desc')
                ->paginate(15)
                ->through($courseFields);
        } else {
            // Students see only published courses
            $courses = Course::with('teachers:id,name')
                ->withCount(['modules', 'subjects', 'enrollments'])
                ->where('status', 'published')
                ->orderBy('created_at', 'desc')
                ->paginate(15)
                ->through($courseFields);
        }

        return Inertia::render('courses/index', [
            'courses' => $courses,
        ]);
    }

    public function create(): Response
    {
        $teachers = User::where('role', 'teacher')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('courses/create', [
            'teachers' => $teachers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'course_code' => 'required|string|max:50|unique:courses,course_code',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'level' => 'required|in:Beginner,Intermediate,Advanced',
            'status' => 'required|in:draft,published,archived',
            'teacher_ids' => 'required|array|min:1',
            'teacher_ids.*' => 'exists:users,id',
            'max_students' => 'nullable|integer|min:1',
            'intro_video' => 'nullable|string|max:2048',
            'intro_video_file' => 'nullable|file|mimetypes:video/mp4,video/webm,video/ogg,video/quicktime|max:512000',
            'thumbnail_file' => 'nullable|file|image|max:4096',
            'thumbnail_focus' => 'nullable|string|max:20',
        ]);

        if ($request->hasFile('intro_video_file') && $request->file('intro_video_file')->isValid()) {
            $stored = $request->file('intro_video_file')->store('course-videos', 'public');

            if ($stored) {
                $validated['intro_video'] = '/storage/'.$stored;
            }
        }

        if ($request->hasFile('thumbnail_file') && $request->file('thumbnail_file')->isValid()) {
            $file = $request->file('thumbnail_file');
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $path = 'course-thumbnails/'.Str::uuid().'.'.$ext;
            \Storage::disk('public')->put($path, file_get_contents($file->getPathname()));
            $validated['thumbnail'] = '/storage/'.$path;
        }

        $teacherIds = $validated['teacher_ids'];
        unset($validated['teacher_ids'], $validated['intro_video_file'], $validated['thumbnail_file']);

        $course = Course::create($validated);
        $course->teachers()->sync($teacherIds);

        $this->notifyAssignedTeachers($course, $teacherIds, $request->user()->id);

        return redirect()->route('courses.index')->with('success', 'Course created successfully.');
    }

    public function show(Course $course): Response
    {
        $course->load('teachers:id,name', 'modules:id,course_id,title,sort_order')
            ->loadCount(['modules', 'enrollments']);

        return Inertia::render('courses/show', [
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'course_code' => $course->course_code,
                'description' => $course->description,
                'short_description' => $course->short_description,
                'level' => $course->level,
                'status' => $course->status,
                'thumbnail' => $course->thumbnail,
                'thumbnail_focus' => $course->thumbnail_focus,
                'max_students' => $course->max_students,
                'teachers' => $course->teachers->map(fn ($t) => ['id' => $t->id, 'name' => $t->name])->values(),
                'modules' => $course->modules->sortBy('sort_order')->map(fn ($m) => ['id' => $m->id, 'title' => $m->title])->values(),
                'modules_count' => $course->modules_count,
                'enrollments_count' => $course->enrollments_count,
                'updated_at' => $course->updated_at?->format('M j, Y'),
            ],
        ]);
    }

    public function edit(Course $course): Response
    {
        $teachers = User::where('role', 'teacher')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        $course->load('teachers:id,name');

        return Inertia::render('courses/edit', [
            'course' => $course,
            'teachers' => $teachers,
        ]);
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'course_code' => 'required|string|max:50|unique:courses,course_code,'.$course->id,
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'level' => 'required|in:Beginner,Intermediate,Advanced',
            'status' => 'required|in:draft,published,archived',
            'teacher_ids' => 'required|array|min:1',
            'teacher_ids.*' => 'exists:users,id',
            'max_students' => 'nullable|integer|min:1',
            'intro_video' => 'nullable|string|max:2048',
            'intro_video_file' => 'nullable|file|mimetypes:video/mp4,video/webm,video/ogg,video/quicktime|max:512000',
            'thumbnail_file' => 'nullable|file|image|max:4096',
            'thumbnail_focus' => 'nullable|string|max:20',
        ]);

        if ($request->hasFile('intro_video_file') && $request->file('intro_video_file')->isValid()) {
            $stored = $request->file('intro_video_file')->store('course-videos', 'public');

            if ($stored) {
                if ($course->intro_video && str_starts_with($course->intro_video, '/storage/course-videos/')) {
                    \Storage::disk('public')->delete(str_replace('/storage/', '', $course->intro_video));
                }
                $validated['intro_video'] = '/storage/'.$stored;
            }
        }

        if ($request->hasFile('thumbnail_file') && $request->file('thumbnail_file')->isValid()) {
            if ($course->thumbnail && str_starts_with($course->thumbnail, '/storage/course-thumbnails/')) {
                \Storage::disk('public')->delete(str_replace('/storage/', '', $course->thumbnail));
            }
            $file = $request->file('thumbnail_file');
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $path = 'course-thumbnails/'.Str::uuid().'.'.$ext;
            \Storage::disk('public')->put($path, file_get_contents($file->getPathname()));
            $validated['thumbnail'] = '/storage/'.$path;
        }

        $teacherIds = $validated['teacher_ids'];
        unset($validated['teacher_ids'], $validated['intro_video_file'], $validated['thumbnail_file']);

        $previousTeacherIds = $course->teachers()->pluck('users.id')->all();

        $course->update($validated);
        $course->teachers()->sync($teacherIds);

        $newTeacherIds = array_diff($teacherIds, $previousTeacherIds);
        $this->notifyAssignedTeachers($course, $newTeacherIds, $request->user()->id);

        return redirect()->route('courses.index')->with('success', 'Course updated successfully.');
    }

    /**
     * Notify teachers that they have been newly assigned to a course.
     *
     * @param  array<int, int|string>  $teacherIds
     */
    private function notifyAssignedTeachers(Course $course, array $teacherIds, int $actorId): void
    {
        foreach ($teacherIds as $teacherId) {
            if ((int) $teacherId === $actorId) {
                continue;
            }

            UserNotification::notify(
                (int) $teacherId,
                'course_assigned',
                'New course assigned',
                "You have been assigned to teach {$course->title}.",
                '/my-course/'.$course->id,
                ['course_id' => $course->id],
            );
        }
    }

    public function destroy(Course $course): RedirectResponse
    {
        $course->delete();

        return redirect()->route('courses.index')->with('success', 'Course deleted successfully.');
    }
}
