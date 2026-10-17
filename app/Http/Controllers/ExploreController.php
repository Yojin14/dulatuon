<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExploreController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $courses = Course::with('teachers:id,name')
            ->withCount(['modules', 'enrollments'])
            ->where('status', 'published')
            ->orderBy('title')
            ->get();

        $enrollmentMap = [];
        if ($user->role === 'student') {
            $enrollmentMap = Enrollment::where('user_id', $user->id)
                ->where('status', 'active')
                ->get()
                ->keyBy('course_id')
                ->map(fn ($e) => ['id' => $e->id, 'status' => $e->status])
                ->toArray();
        }

        $courses = $courses->map(fn ($course) => [
            'id' => $course->id,
            'title' => $course->title,
            'description' => $course->description,
            'short_description' => $course->short_description,
            'level' => $course->level,
            'course_code' => $course->course_code,
            'thumbnail' => $course->thumbnail,
            'thumbnail_focus' => $course->thumbnail_focus,
            'instructor' => $course->teachers->first(),
            'modules_count' => $course->modules_count,
            'enrollments_count' => $course->enrollments_count,
            'enrollment' => $enrollmentMap[$course->id] ?? null,
        ]);

        return Inertia::render('explore/index', [
            'courses' => $courses,
        ]);
    }
}
