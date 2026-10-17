<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('welcome');

Route::middleware(['auth', 'verified', 'throttle:global'])->group(function () {
    Route::get('dashboard', [App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');

    // Explore — student course browser
    Route::get('explore', [App\Http\Controllers\ExploreController::class, 'index'])->name('explore.index');

    // Course enrollment
    Route::post('courses/{course}/enroll', [App\Http\Controllers\EnrollmentController::class, 'store'])
        ->middleware('throttle:writes')
        ->name('enrollments.store');

    // Course listing — all authenticated users
    Route::get('courses', [App\Http\Controllers\CourseController::class, 'index'])->name('courses.index');

    // Admin-only course management (create must be before {course} to avoid route conflict)
    Route::middleware(['role:admin'])->group(function () {
        Route::get('courses/create', [App\Http\Controllers\CourseController::class, 'create'])->name('courses.create');
        Route::post('courses', [App\Http\Controllers\CourseController::class, 'store'])->name('courses.store');
    });

    Route::get('courses/{course}', [App\Http\Controllers\CourseController::class, 'show'])->name('courses.show');

    Route::middleware(['role:admin'])->group(function () {
        Route::get('courses/{course}/edit', [App\Http\Controllers\CourseController::class, 'edit'])->name('courses.edit');
        Route::put('courses/{course}', [App\Http\Controllers\CourseController::class, 'update'])->name('courses.update');
        Route::delete('courses/{course}', [App\Http\Controllers\CourseController::class, 'destroy'])->name('courses.destroy');
    });

    // Notification routes
    Route::get('notifications', [App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('notifications/{notification}/read', [App\Http\Controllers\NotificationController::class, 'markRead'])->name('notifications.read');
    Route::delete('notifications/{notification}', [App\Http\Controllers\NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Chat routes
    Route::get('chat', [App\Http\Controllers\ChatController::class, 'index'])->name('chat.index');
    Route::get('chat/{room}/messages', [App\Http\Controllers\ChatController::class, 'messages'])->name('chat.messages');
    Route::post('chat/{room}/messages', [App\Http\Controllers\ChatController::class, 'store'])
        ->middleware('throttle:chat')
        ->name('chat.store');
    Route::post('chat/{room}/mark-read', [App\Http\Controllers\ChatController::class, 'markRead'])->name('chat.mark-read');

    // Announcements (Google-Classroom-style course feed)
    Route::get('courses/{course}/announcements', [App\Http\Controllers\AnnouncementController::class, 'index'])->name('announcements.index');
    Route::post('courses/{course}/announcements', [App\Http\Controllers\AnnouncementController::class, 'store'])
        ->middleware(['role:teacher,admin', 'throttle:writes'])
        ->name('announcements.store');
    Route::post('announcements/{announcement}/comments', [App\Http\Controllers\AnnouncementController::class, 'comment'])
        ->middleware('throttle:writes')
        ->name('announcements.comment');
    Route::delete('announcements/{announcement}', [App\Http\Controllers\AnnouncementController::class, 'destroy'])->name('announcements.destroy');
    Route::delete('announcement-comments/{comment}', [App\Http\Controllers\AnnouncementController::class, 'destroyComment'])->name('announcements.comment.destroy');

    // Class routes (replacing Assignments)
    Route::get('classes', [App\Http\Controllers\ClassController::class, 'index'])->name('classes.index');

    // Assigned Course route (must be before classes/{sectionName} to avoid route conflict)
    Route::get('my-course', [App\Http\Controllers\ClassController::class, 'myClass'])->name('my-course.index');
    Route::get('my-course/{courseId}', [App\Http\Controllers\ClassController::class, 'myClassShow'])->name('my-course.show');
    Route::post('my-course/{courseId}/thumbnail', [App\Http\Controllers\ClassController::class, 'uploadThumbnail'])->name('my-course.thumbnail');
    Route::patch('my-course/{courseId}/thumbnail-focus', [App\Http\Controllers\ClassController::class, 'updateThumbnailFocus'])->name('my-course.thumbnail-focus');

    // ── Curriculum API (teacher + admin) ──────────────────────────────────────
    Route::middleware(['role:teacher,admin'])->prefix('curriculum')->name('curriculum.')->group(function () {
        $cc = App\Http\Controllers\CurriculumController::class;

        // Modules
        Route::post('{courseId}/modules', [$cc, 'storeModule'])->name('modules.store');
        Route::put('{courseId}/modules/{moduleId}', [$cc, 'updateModule'])->name('modules.update');
        Route::delete('{courseId}/modules/{moduleId}', [$cc, 'destroyModule'])->name('modules.destroy');
        Route::put('{courseId}/modules/{moduleId}/reorder', [$cc, 'reorderModuleItems'])->name('modules.reorder');

        // Sessions (direct on module)
        Route::post('{courseId}/modules/{moduleId}/sessions', [$cc, 'storeSession'])->name('sessions.store');
        Route::put('{courseId}/sessions/{sessionId}', [$cc, 'updateSession'])->name('sessions.update');
        Route::delete('{courseId}/sessions/{sessionId}', [$cc, 'destroySession'])->name('sessions.destroy');

        // Lesson Groups
        Route::post('{courseId}/modules/{moduleId}/lesson-groups', [$cc, 'storeLessonGroup'])->name('lesson-groups.store');
        Route::put('{courseId}/lesson-groups/{groupId}', [$cc, 'updateLessonGroup'])->name('lesson-groups.update');
        Route::delete('{courseId}/lesson-groups/{groupId}', [$cc, 'destroyLessonGroup'])->name('lesson-groups.destroy');

        // Sessions inside a lesson group
        Route::post('{courseId}/lesson-groups/{groupId}/sessions', [$cc, 'storeGroupSession'])->name('group-sessions.store');
        Route::put('{courseId}/lesson-groups/{groupId}/reorder', [$cc, 'reorderGroupSessions'])->name('group-sessions.reorder');

        // Content items
        Route::post('{courseId}/sessions/{sessionId}/content', [$cc, 'storeContent'])->name('content.store');
        Route::match(['PUT', 'POST'], '{courseId}/content/{contentId}', [$cc, 'updateContent'])->name('content.update');
        Route::delete('{courseId}/content/{contentId}', [$cc, 'destroyContent'])->name('content.destroy');

        // Quizzes
        Route::post('{courseId}/sessions/{sessionId}/quizzes', [$cc, 'storeQuiz'])->name('quizzes.store');
        Route::put('{courseId}/quizzes/{quizId}', [$cc, 'updateQuiz'])->name('quizzes.update');
        Route::delete('{courseId}/quizzes/{quizId}', [$cc, 'destroyQuiz'])->name('quizzes.destroy');

        // Assignments
        Route::post('{courseId}/sessions/{sessionId}/assignments', [$cc, 'storeAssignment'])->name('assignments.store');
        Route::put('{courseId}/assignments/{assignmentId}', [$cc, 'updateAssignment'])->name('assignments.update');
        Route::delete('{courseId}/assignments/{assignmentId}', [$cc, 'destroyAssignment'])->name('assignments.destroy');

        // Meetings
        Route::post('{courseId}/sessions/{sessionId}/meetings', [$cc, 'storeMeeting'])->name('meetings.store');
        Route::put('{courseId}/meetings/{meetingId}', [$cc, 'updateMeeting'])->name('meetings.update');
        Route::delete('{courseId}/meetings/{meetingId}', [$cc, 'destroyMeeting'])->name('meetings.destroy');

        // Games
        Route::post('{courseId}/sessions/{sessionId}/games', [$cc, 'storeGame'])->name('games.store');
        Route::put('{courseId}/games/{gameId}', [$cc, 'updateGame'])->name('games.update');
        Route::delete('{courseId}/games/{gameId}', [$cc, 'destroyGame'])->name('games.destroy');
    });

    // ── Game play (students, teachers preview) ────────────────────────────────
    Route::get('games/{game}/play', [App\Http\Controllers\GamePlayController::class, 'play'])->name('games.play');
    Route::post('games/{game}/attempts', [App\Http\Controllers\GamePlayController::class, 'storeAttempt'])
        ->middleware('throttle:writes')
        ->name('games.attempts.store');

    // Assignment submissions (student)
    Route::middleware(['role:student'])->prefix('curriculum')->name('curriculum.')->group(function () {
        $sc = App\Http\Controllers\SubmissionController::class;
        Route::post('{courseId}/assignments/{assignmentId}/submit', [$sc, 'store'])
            ->middleware('throttle:writes')
            ->name('submissions.store');
        Route::get('{courseId}/assignments/{assignmentId}/my-submission', [$sc, 'mySubmission'])->name('submissions.mine');
    });

    Route::get('classes/{sectionName}', [App\Http\Controllers\ClassController::class, 'show'])->name('classes.show');

    // Class Management page (teacher/admin)
    Route::get('class-management', [App\Http\Controllers\ClassController::class, 'classManagement'])->name('class-management.index');

    // tasks routes
    Route::get('tasks', [App\Http\Controllers\TasksController::class, 'index'])->name('tasks.index');
    // TODO: add task routes here when rebuilding

    // Students routes
    Route::get('students', [App\Http\Controllers\StudentController::class, 'index'])->name('students.index');

    // My-Progress routes (student only)
    Route::middleware(['role:student'])->group(function () {
        Route::get('my-progress', [App\Http\Controllers\MyProgressController::class, 'index'])->name('my-progress.index');
        Route::post('my-progress/{courseId}/contents/{contentId}/complete', [App\Http\Controllers\MyProgressController::class, 'completeContent'])->name('my-progress.content.complete');
    });

    // Admin routes
    Route::middleware(['role:admin'])->prefix('admin')->name('admin.')->group(function () {
        // ── Users ──────────────────────────────────────────────────────────────
        Route::get('users', [App\Http\Controllers\Admin\UserController::class, 'index'])->name('users.index');
        Route::post('users', [App\Http\Controllers\Admin\UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [App\Http\Controllers\Admin\UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [App\Http\Controllers\Admin\UserController::class, 'destroy'])->name('users.destroy');
        Route::post('users/{user}/toggle-status', [App\Http\Controllers\Admin\UserController::class, 'toggleStatus'])->name('users.toggle-status');
        Route::post('users/{user}/send-message', [App\Http\Controllers\Admin\UserController::class, 'sendMessage'])->name('users.send-message');
        Route::post('users/{user}/toggle-permission', [App\Http\Controllers\Admin\UserController::class, 'togglePermission'])->name('users.toggle-permission');
        Route::post('users/{user}/verify-email', [App\Http\Controllers\Admin\UserController::class, 'verifyEmail'])->name('users.verify-email');

        // ── Roles ──────────────────────────────────────────────────────────────
        Route::get('roles', [App\Http\Controllers\Admin\RolesController::class, 'index'])->name('roles.index');
        Route::post('roles', [App\Http\Controllers\Admin\RolesController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [App\Http\Controllers\Admin\RolesController::class, 'update'])->name('roles.update');
        Route::put('roles/{role}/permissions', [App\Http\Controllers\Admin\RolesController::class, 'updatePermissions'])->name('roles.permissions');
        Route::delete('roles/{role}', [App\Http\Controllers\Admin\RolesController::class, 'destroy'])->name('roles.destroy');

        // ── Analytics ──────────────────────────────────────────────────────────
        Route::get('analytics', [App\Http\Controllers\Admin\AnalyticsController::class, 'index'])->name('analytics.index');
    });
});

require __DIR__.'/settings.php';
