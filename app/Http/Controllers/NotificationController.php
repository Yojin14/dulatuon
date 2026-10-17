<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** Notification list for the header bell panel. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = UserNotification::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (UserNotification $n) => $this->notificationData($n));

        return response()->json([
            'notifications' => $notifications->values(),
            'unreadCount' => $notifications->whereNull('read_at')->count(),
        ]);
    }

    /** Mark a single notification as read. */
    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        $this->authorizeOwnership($request, $notification);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['unread_count' => $this->unreadCount($request)]);
    }

    /** Mark every unread notification for the user as read. */
    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['unread_count' => 0]);
    }

    public function destroy(Request $request, UserNotification $notification): JsonResponse
    {
        $this->authorizeOwnership($request, $notification);

        $notification->delete();

        return response()->json(['unread_count' => $this->unreadCount($request)]);
    }

    private function authorizeOwnership(Request $request, UserNotification $notification): void
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403);
        }
    }

    private function unreadCount(Request $request): int
    {
        return UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->unread()
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function notificationData(UserNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'link' => $notification->link,
            'data' => $notification->data,
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at->toIso8601String(),
        ];
    }
}
