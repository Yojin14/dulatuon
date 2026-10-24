<?php

namespace App\Http\Controllers;

use App\Http\Requests\GradeSubmissionRequest;
use App\Models\Course;
use App\Models\Grade;
use App\Models\Submission;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;

class SubmissionGradeController extends Controller
{
    /**
     * A course's teacher (or an admin) scores a submission and leaves feedback. Grading again
     * updates the same grade. The student is notified.
     */
    public function update(GradeSubmissionRequest $request, Submission $submission): JsonResponse
    {
        $user = $request->user();
        $assignment = $submission->assignment()->firstOrFail();
        $courseId = (int) $assignment->course_id;

        $teachesCourse = $user->role === 'admin'
            || ($user->role === 'teacher' && Course::whereKey($courseId)->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))->exists());
        abort_unless($teachesCourse, 403);

        $points = (float) $request->validated('points');
        $possible = (float) ($assignment->points ?: 100);

        $grade = Grade::updateOrCreate(
            ['submission_id' => $submission->id],
            [
                'user_id' => $submission->user_id,
                'assignment_id' => $assignment->id,
                'course_id' => $courseId,
                'points_earned' => $points,
                'points_possible' => $possible,
                'percentage' => $possible > 0 ? round($points / $possible * 100, 2) : 0,
                'feedback' => $request->validated('feedback'),
                'graded_by' => $user->id,
                'graded_at' => now(),
            ],
        );
        $submission->update(['status' => 'graded']);

        $score = rtrim(rtrim(number_format($points, 2, '.', ''), '0'), '.');
        $max = rtrim(rtrim(number_format($possible, 2, '.', ''), '0'), '.');
        UserNotification::notify(
            $submission->user_id,
            'assignment_graded',
            "Your assignment was graded: {$score}/{$max}",
            $assignment->title,
            '/assignments',
            ['assignment_id' => $assignment->id, 'course_id' => $courseId],
        );

        return response()->json($grade->toSummary());
    }
}
