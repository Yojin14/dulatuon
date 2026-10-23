<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\StudentProgress;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
    /**
     * A student's certificate of completion for a course, available once every module is cleared.
     */
    public function show(Request $request, Course $course): Response|RedirectResponse
    {
        $user = $request->user();

        Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        $course->load(['modules', 'instructor:id,name']);
        $summary = StudentProgress::courses(StudentProgress::modules($user, [$course]))[$course->id] ?? null;

        if ($summary === null || ! $summary['complete']) {
            return to_route('my-progress.index')->with('error', 'Clear every module in this course to unlock its certificate.');
        }

        return Inertia::render('certificates/show', [
            'certificate' => [
                'code' => self::code($user, $course),
                'student_name' => $user->name,
                'course_title' => $course->title,
                'course_code' => $course->course_code,
                'instructor' => $course->instructor->name ?? null,
                'modules' => $summary['modules_total'],
                'items' => $summary['items_total'],
                'completed_at' => $summary['completed_on']?->format('F j, Y'),
            ],
        ]);
    }

    /**
     * A stable, hard-to-guess reference printed on the certificate, e.g. DLT-4F2A-91C0-7B3E.
     */
    public static function code(User $user, Course $course): string
    {
        $hash = strtoupper(substr(hash_hmac('sha256', "certificate|{$user->id}|{$course->id}", (string) config('app.key')), 0, 12));

        return 'DLT-'.implode('-', str_split($hash, 4));
    }
}
