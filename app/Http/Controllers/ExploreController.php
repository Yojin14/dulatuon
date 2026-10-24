<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class ExploreController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // The published catalogue is the same for everyone; Course and Enrollment clear this key on change.
        $catalogue = Cache::remember('explore:courses', now()->addMinutes(10), fn () => Course::with('teachers:id,name')
            ->withCount(['modules', 'enrollments'])
            ->where('status', 'published')
            ->orderBy('title')
            ->get()
            ->map(fn ($course) => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'short_description' => $course->short_description,
                'level' => $course->level,
                'course_code' => $course->course_code,
                'thumbnail' => $course->thumbnail,
                'thumbnail_focus' => $course->thumbnail_focus,
                'instructor' => $course->teachers->first()?->only(['id', 'name']),
                'modules_count' => $course->modules_count,
                'enrollments_count' => $course->enrollments_count,
            ])
            ->values()
            ->all());

        $enrollmentMap = [];
        if ($user->role === 'student') {
            $enrollmentMap = Enrollment::where('user_id', $user->id)
                ->where('status', 'active')
                ->get()
                ->keyBy('course_id')
                ->map(fn ($e) => ['id' => $e->id, 'status' => $e->status])
                ->toArray();
        }

        $courses = array_map(fn (array $course) => [
            ...$course,
            'enrollment' => $enrollmentMap[$course['id']] ?? null,
        ], $catalogue);

        return Inertia::render('explore/index', [
            'courses' => $courses,
        ]);
    }
}
