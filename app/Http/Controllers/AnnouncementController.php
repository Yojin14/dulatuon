<?php

namespace App\Http\Controllers;

use App\Events\AnnouncementUpdated;
use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\Realtime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /** Return the announcement feed for a course (staff or enrolled student). */
    public function index(Request $request, Course $course): JsonResponse
    {
        if (! $this->canAccess($request->user(), $course)) {
            abort(403);
        }

        $items = $course->announcements()
            ->with(['author:id,name', 'comments.author:id,name'])
            ->get()
            ->map(fn (Announcement $a) => $a->toFeedArray())
            ->values();

        return response()->json($items);
    }

    /** Teacher/admin posts an announcement to a course feed. */
    public function store(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManage($user, $course)) {
            abort(403);
        }

        $data = $request->validate(['body' => 'required|string|max:5000']);

        $announcement = $course->announcements()->create([
            'user_id' => $user->id,
            'body' => $data['body'],
        ]);

        $this->notifyStudents($course, $user, $announcement);
        $this->broadcastUpdate($course->id, $user->id);

        $announcement->load(['author:id,name', 'comments.author:id,name']);

        return response()->json($announcement->toFeedArray(), 201);
    }

    /** Enrolled student or course staff comments under an announcement. */
    public function comment(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();
        $course = $announcement->course;

        if (! $this->canAccess($user, $course)) {
            abort(403);
        }

        $data = $request->validate(['body' => 'required|string|max:5000']);

        $comment = $announcement->comments()->create([
            'user_id' => $user->id,
            'body' => $data['body'],
        ]);

        if ($announcement->user_id !== $user->id) {
            UserNotification::notify(
                $announcement->user_id,
                'announcement_comment',
                'New comment on your announcement',
                "{$user->name} commented: {$data['body']}",
                '/my-course/'.$course->id.'?view=announcements',
                ['course_id' => $course->id, 'announcement_id' => $announcement->id],
            );
        }

        $this->broadcastUpdate($course->id, $user->id);

        return response()->json([
            'announcement_id' => $announcement->id,
            'comment' => [
                'id' => $comment->id,
                'author' => ['id' => $user->id, 'name' => $user->name],
                'body' => $comment->body,
                'created_at' => $comment->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /** Delete an announcement (author or course staff). */
    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        if ($announcement->user_id !== $user->id && ! $this->canManage($user, $announcement->course)) {
            abort(403);
        }

        $courseId = $announcement->course_id;
        $announcement->delete();
        $this->broadcastUpdate($courseId, $user->id);

        return response()->json(['ok' => true]);
    }

    /** Delete a comment (author or course staff). */
    public function destroyComment(Request $request, AnnouncementComment $comment): JsonResponse
    {
        $user = $request->user();

        if ($comment->user_id !== $user->id && ! $this->canManage($user, $comment->announcement->course)) {
            abort(403);
        }

        $courseId = $comment->announcement->course_id;
        $comment->delete();
        $this->broadcastUpdate($courseId, $user->id);

        return response()->json(['ok' => true]);
    }

    private function broadcastUpdate(int $courseId, int $triggeredBy): void
    {
        Realtime::dispatch(fn () => broadcast(new AnnouncementUpdated($courseId, $triggeredBy)));
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === 'admin'
            || $course->teachers()->where('users.id', $user->id)->exists();
    }

    private function canAccess(User $user, Course $course): bool
    {
        if ($this->canManage($user, $course)) {
            return true;
        }

        return Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('status', 'active')
            ->exists();
    }

    private function notifyStudents(Course $course, User $author, Announcement $announcement): void
    {
        $studentIds = Enrollment::where('course_id', $course->id)
            ->where('status', 'active')
            ->where('user_id', '!=', $author->id)
            ->pluck('user_id');

        foreach ($studentIds as $studentId) {
            UserNotification::notify(
                $studentId,
                'announcement',
                "New announcement in {$course->title}",
                "{$author->name}: {$announcement->body}",
                '/my-course/'.$course->id.'?view=announcements',
                ['course_id' => $course->id, 'announcement_id' => $announcement->id],
            );
        }
    }
}
