<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function store(Request $request, Course $course): RedirectResponse
    {
        if ($course->status !== 'published') {
            abort(403, 'Course is not available for enrollment.');
        }

        $enrollment = Enrollment::firstOrNew([
            'user_id' => $request->user()->id,
            'course_id' => $course->id,
        ]);

        if ($enrollment->exists && in_array($enrollment->status, ['active', 'completed'], true)) {
            return back()->with('error', 'You are already enrolled in this course.');
        }

        $enrollment->fill([
            'status' => 'active',
            'enrollment_date' => now(),
        ])->save();

        return back()->with('success', 'You are now enrolled in this course.');
    }
}
