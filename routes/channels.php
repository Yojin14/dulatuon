<?php

use App\Models\ChatRoomParticipant;
use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Support\Facades\Broadcast;

// Default user channel
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Chat room channel — user must be a participant
Broadcast::channel('chat.{roomId}', function ($user, $roomId) {
    return ChatRoomParticipant::where('chat_room_id', $roomId)
        ->where('user_id', $user->id)
        ->exists();
});

// Class channel — user must be a teacher or admin of the course
Broadcast::channel('class.{courseId}', function ($user, $courseId) {
    if ($user->role === 'admin') {
        return true;
    }

    $course = Course::with('teachers')->find($courseId);

    return $course && $course->teachers->contains('id', $user->id);
});

// Course channel — any course participant (staff or active enrollee). Used for announcements.
Broadcast::channel('course.{courseId}', function ($user, $courseId) {
    if ($user->role === 'admin') {
        return true;
    }

    $course = Course::with('teachers')->find($courseId);

    if ($course && $course->teachers->contains('id', $user->id)) {
        return true;
    }

    return Enrollment::where('user_id', $user->id)
        ->where('course_id', $courseId)
        ->where('status', 'active')
        ->exists();
});
