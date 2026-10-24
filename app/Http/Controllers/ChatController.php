<?php

namespace App\Http\Controllers;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\ChatRoomParticipant;
use App\Models\Course;
use App\Models\UserNotification;
use App\Support\Realtime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $this->ensureRoomsExist($user);

        $rooms = ChatRoom::whereHas(
            'participants',
            fn ($q) => $q->where('user_id', $user->id)
        )
            ->with([
                'latestMessage.user',
                'course:id,title,course_code',
                'participants' => fn ($q) => $q->where('user_id', $user->id),
            ])
            ->withCount('participants')
            ->get();

        $selectedRoom = $rooms->first();

        $messages = $selectedRoom ? $this->fetchMessages($selectedRoom) : collect();
        $readers = $selectedRoom ? $this->fetchReaders($selectedRoom, $user->id) : collect();

        return Inertia::render('chat/index', [
            'rooms' => $rooms->map(fn ($r) => $this->roomData($r, $user->id)),
            'messages' => $messages,
            'readers' => $readers,
            'selectedRoom' => $selectedRoom ? $this->roomData($selectedRoom, $user->id) : null,
        ]);
    }

    /** Return messages + readers for a room (called when switching rooms). */
    public function messages(Request $request, ChatRoom $room): JsonResponse
    {
        $user = $request->user();

        if (! $room->participants()->where('user_id', $user->id)->exists()) {
            abort(403);
        }

        return response()->json([
            'messages' => $this->fetchMessages($room),
            'readers' => $this->fetchReaders($room, $user->id),
        ]);
    }

    /** Send a new message. */
    public function store(Request $request, ChatRoom $room): JsonResponse
    {
        $user = $request->user();

        if (! $room->participants()->where('user_id', $user->id)->exists()) {
            abort(403);
        }

        $request->validate(['body' => 'required|string|max:5000']);

        $message = $room->messages()->create([
            'user_id' => $user->id,
            'body' => $request->body,
        ]);

        $message->load('user');

        Realtime::dispatch(fn () => broadcast(new MessageSent($message))->toOthers());

        $this->notifyOtherParticipants($room, $user, $message);

        return response()->json($this->messageData($message));
    }

    /**
     * Notify every other participant of a new message. To avoid flooding the bell,
     * an existing unread notification for the same room is refreshed rather than duplicated.
     */
    private function notifyOtherParticipants(ChatRoom $room, $sender, ChatMessage $message): void
    {
        $recipientIds = $room->participants()
            ->where('user_id', '!=', $sender->id)
            ->pluck('user_id');

        $title = $room->name;
        $body = "{$sender->name}: {$message->body}";

        foreach ($recipientIds as $recipientId) {
            $existing = UserNotification::query()
                ->where('user_id', $recipientId)
                ->where('type', 'chat_message')
                ->where('data->room_id', $room->id)
                ->unread()
                ->first();

            if ($existing) {
                $existing->update(['title' => $title, 'body' => $body]);
                $existing->broadcast();

                continue;
            }

            UserNotification::notify(
                $recipientId,
                'chat_message',
                $title,
                $body,
                '/chat',
                ['room_id' => $room->id],
            );
        }
    }

    /** Mark a room as read and notify others. */
    public function markRead(Request $request, ChatRoom $room): JsonResponse
    {
        $user = $request->user();
        $readAt = now();

        ChatRoomParticipant::where('chat_room_id', $room->id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => $readAt]);

        Realtime::dispatch(fn () => broadcast(new MessageRead(
            roomId: $room->id,
            userId: $user->id,
            userName: $user->name,
            lastReadAt: $readAt->toIso8601String(),
        ))->toOthers());

        return response()->json(['ok' => true]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function fetchMessages(ChatRoom $room): Collection
    {
        return $room->messages()
            ->with('user:id,name,avatar')
            ->latest()
            ->take(60)
            ->get()
            ->reverse()
            ->values()
            ->map(fn ($m) => $this->messageData($m));
    }

    /** Other participants with a non-null last_read_at. */
    private function fetchReaders(ChatRoom $room, int $excludeUserId): Collection
    {
        return $room->participants()
            ->with('user:id,name,avatar')
            ->where('user_id', '!=', $excludeUserId)
            ->whereNotNull('last_read_at')
            ->get()
            ->map(fn ($p) => [
                'user_id' => $p->user_id,
                'name' => $p->user->name,
                'avatar' => $p->user->avatar,
                'last_read_at' => $p->last_read_at->toIso8601String(),
            ]);
    }

    private function messageData(ChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'body' => $message->body,
            'created_at' => $message->created_at->toIso8601String(),
            'user' => [
                'id' => $message->user->id,
                'name' => $message->user->name,
                'avatar' => $message->user->avatar,
            ],
        ];
    }

    private function roomData(ChatRoom $room, int $userId): array
    {
        $participant = $room->participants->firstWhere('user_id', $userId);
        $lastReadAt = $participant?->last_read_at;

        $unreadCount = $room->messages()
            ->where('user_id', '!=', $userId)
            ->when($lastReadAt, fn ($q) => $q->where('created_at', '>', $lastReadAt))
            ->count();

        return [
            'id' => $room->id,
            'name' => $room->name,
            'type' => $room->type,
            'description' => $room->description,
            'participantsCount' => $room->participants_count ?? $room->participants()->count(),
            'lastMessage' => $room->latestMessage?->body,
            'lastMessageBy' => $room->latestMessage?->user?->name,
            'lastActivity' => $room->latestMessage?->created_at?->toIso8601String()
                ?? $room->created_at->toIso8601String(),
            'unread_count' => $unreadCount,
        ];
    }

    private function ensureRoomsExist($user): void
    {
        $global = ChatRoom::firstOrCreate(
            ['type' => 'global', 'name' => 'General Chat'],
            ['description' => 'General discussion for all members'],
        );

        ChatRoomParticipant::firstOrCreate([
            'chat_room_id' => $global->id,
            'user_id' => $user->id,
        ]);

        $courseIds = match ($user->role) {
            'student' => \App\Models\Enrollment::where('user_id', $user->id)
                ->where('status', 'active')
                ->pluck('course_id')
                ->toArray(),
            'teacher' => Course::whereHas('teachers', fn ($t) => $t->where('users.id', $user->id))
                ->pluck('id')
                ->toArray(),
            'admin' => Course::pluck('id')->toArray(),
            default => [],
        };

        $courses = Course::whereIn('id', $courseIds)->get(['id', 'title'])->keyBy('id');

        foreach ($courseIds as $courseId) {
            $course = $courses->get($courseId);
            if (! $course) {
                continue;
            }

            $room = ChatRoom::firstOrCreate(
                ['type' => 'course', 'course_id' => $courseId],
                ['name' => $course->title, 'description' => $course->title.' class chat'],
            );

            ChatRoomParticipant::firstOrCreate([
                'chat_room_id' => $room->id,
                'user_id' => $user->id,
            ]);
        }
    }
}
