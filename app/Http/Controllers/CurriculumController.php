<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseGame;
use App\Models\CourseLessonGroup;
use App\Models\CourseMeeting;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Support\SimulationGames;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurriculumController extends Controller
{
    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Ensure the authenticated user owns (or is admin of) the course.
     */
    private function authoriseCourse(int $courseId): Course
    {
        $user = auth()->user();
        $query = Course::query();

        if ($user->role !== 'admin') {
            if ($user->role === 'teacher' && ! $user->hasPermission('class_management')) {
                abort(403, 'You do not have permission to manage classes.');
            }
            $query->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id));
        }

        return $query->findOrFail($courseId);
    }

    /**
     * Load and format the full curriculum for a course into the frontend shape.
     */
    public static function formatCurriculum(Course $course): array
    {
        $modules = CourseModule::with([
            'lessonGroups.sessions.contentItems',
            'lessonGroups.sessions.quizzes.questions.options',
            'lessonGroups.sessions.assignments',
            'lessonGroups.sessions.meetings',
            'lessonGroups.sessions.games',
            'sessions.contentItems',
            'sessions.quizzes.questions.options',
            'sessions.assignments',
            'sessions.meetings',
            'sessions.games',
        ])->where('course_id', $course->id)->orderBy('sort_order')->get();

        return $modules->map(function ($mod) {
            $items = [];

            // Merge direct sessions and lesson groups, then sort by sort_order
            $directSessions = $mod->sessions->map(fn ($s) => ['_sort' => $s->sort_order, '_type' => 'session', '_data' => $s]);
            $groups = $mod->lessonGroups->map(fn ($lg) => ['_sort' => $lg->sort_order, '_type' => 'lesson-group', '_data' => $lg]);
            $merged = $directSessions->merge($groups)->sortBy('_sort')->values();

            foreach ($merged as $entry) {
                if ($entry['_type'] === 'session') {
                    $items[] = self::formatSession($entry['_data']);
                } else {
                    $lg = $entry['_data'];
                    $items[] = [
                        'id' => 'lg-'.$lg->id,
                        'itemType' => 'lesson-group',
                        'title' => $lg->title,
                        'sessions' => $lg->sessions->sortBy('sort_order')->values()->map(fn ($s) => self::formatSession($s))->values()->toArray(),
                    ];
                }
            }

            return [
                'id' => 'module-'.$mod->id,
                'dbId' => $mod->id,
                'title' => $mod->title,
                'items' => $items,
            ];
        })->values()->toArray();
    }

    private static function formatSession(CourseSession $s): array
    {
        return [
            'id' => 'session-'.$s->id,
            'dbId' => $s->id,
            'itemType' => 'session',
            'title' => $s->title,
            'contents' => $s->contentItems->map(fn ($c) => [
                'id' => 'content-'.$c->id,
                'dbId' => $c->id,
                'type' => $c->type,
                'title' => $c->title,
                'description' => $c->description ?? '',
                'url' => self::contentDisplayUrl($c),
                'filename' => $c->filename ?? '',
                'pages' => $c->pages ?? [],
            ])->values()->toArray(),
            'assessments' => array_merge(
                $s->quizzes->map(fn ($q) => [
                    'id' => 'quiz-'.$q->id,
                    'dbId' => $q->id,
                    'kind' => 'quiz',
                    'title' => $q->title,
                    'description' => $q->description ?? '',
                    'questions' => $q->questions->map(fn ($qq) => [
                        'id' => 'question-'.$qq->id,
                        'dbId' => $qq->id,
                        'question' => $qq->question_text,
                        'options' => $qq->options->pluck('option_text')->toArray(),
                        'correctIndex' => $qq->options->search(fn ($o) => $o->is_correct) ?: 0,
                    ])->values()->toArray(),
                ])->toArray(),
                $s->assignments->map(fn ($a) => [
                    'id' => 'assignment-'.$a->id,
                    'dbId' => $a->id,
                    'kind' => 'assignment',
                    'title' => $a->title,
                    'instructions' => $a->description ?? '',
                    'dueDate' => $a->due_date?->format('Y-m-d') ?? '',
                    'maxScore' => $a->points ?? 100,
                ])->toArray()
            ),
            'meetings' => $s->meetings->map(fn ($m) => [
                'id' => 'meeting-'.$m->id,
                'dbId' => $m->id,
                'title' => $m->title,
                'description' => $m->description ?? '',
                'meetLink' => $m->meet_link,
                'scheduledAt' => $m->scheduled_at->toIso8601String(),
                'timezone' => $m->timezone,
                'durationMinutes' => $m->duration_minutes,
            ])->values()->toArray(),
            'games' => $s->games->map(fn ($g) => self::formatGame($g))->values()->toArray(),
        ];
    }

    /**
     * @return array{id: string, dbId: int, title: string, description: string, gameType: string, points: int, lives: int, items: array<int, mixed>}
     */
    public static function formatGame(CourseGame $g): array
    {
        return [
            'id' => 'game-'.$g->id,
            'dbId' => $g->id,
            'title' => $g->title,
            'description' => $g->description ?? '',
            'gameType' => $g->game_type,
            'points' => $g->points,
            'lives' => $g->lives,
            'items' => $g->config['items'] ?? [],
        ];
    }

    // ─── Meetings ─────────────────────────────────────────────────────────────

    public function storeMeeting(Request $request, int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'meetLink' => 'required|string|max:2048',
            'scheduledAt' => 'required|date',
            'timezone' => 'required|string|max:64',
            'durationMinutes' => 'nullable|integer|min:1|max:1440',
        ]);

        $meeting = CourseMeeting::create([
            'session_id' => $session->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'meet_link' => $data['meetLink'],
            'scheduled_at' => $data['scheduledAt'],
            'timezone' => $data['timezone'],
            'duration_minutes' => $data['durationMinutes'] ?? null,
        ]);

        return response()->json([
            'id' => 'meeting-'.$meeting->id,
            'dbId' => $meeting->id,
            'title' => $meeting->title,
            'description' => $meeting->description ?? '',
            'meetLink' => $meeting->meet_link,
            'scheduledAt' => $meeting->scheduled_at->toIso8601String(),
            'timezone' => $meeting->timezone,
            'durationMinutes' => $meeting->duration_minutes,
        ], 201);
    }

    public function updateMeeting(Request $request, int $courseId, int $meetingId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $meeting = CourseMeeting::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($meetingId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'meetLink' => 'required|string|max:2048',
            'scheduledAt' => 'required|date',
            'timezone' => 'required|string|max:64',
            'durationMinutes' => 'nullable|integer|min:1|max:1440',
        ]);

        $meeting->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'meet_link' => $data['meetLink'],
            'scheduled_at' => $data['scheduledAt'],
            'timezone' => $data['timezone'],
            'duration_minutes' => $data['durationMinutes'] ?? null,
        ]);

        return response()->json([
            'id' => 'meeting-'.$meeting->id,
            'dbId' => $meeting->id,
            'title' => $meeting->title,
            'description' => $meeting->description ?? '',
            'meetLink' => $meeting->meet_link,
            'scheduledAt' => $meeting->scheduled_at->toIso8601String(),
            'timezone' => $meeting->timezone,
            'durationMinutes' => $meeting->duration_minutes,
        ]);
    }

    public function destroyMeeting(int $courseId, int $meetingId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $meeting = CourseMeeting::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($meetingId);
        $meeting->delete();

        return response()->json(null, 204);
    }

    // ─── Games ────────────────────────────────────────────────────────────────

    /**
     * Simulation games carry their own fixed checkpoints, so they take no items.
     *
     * @return array<string, string>
     */
    private function gameValidationRules(Request $request): array
    {
        $rules = [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'gameType' => 'required|string|in:quiz_quest,memory_match,word_scramble,crossword,hangman,'.implode(',', SimulationGames::types()),
            'points' => 'required|integer|min:1|max:1000',
            'lives' => 'required|integer|min:0|max:50',
        ];

        if (SimulationGames::isSimulation($request->input('gameType'))) {
            return $rules;
        }

        return $rules + [
            'items' => 'required|array|min:1|max:50',
            'items.*.prompt' => 'required|string|max:500',
            'items.*.answer' => 'required|string|max:255',
            'items.*.distractors' => 'nullable|array|max:5',
            'items.*.distractors.*' => 'nullable|string|max:255',
        ];
    }

    public function storeGame(Request $request, int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);

        $data = $request->validate($this->gameValidationRules($request));

        $game = CourseGame::create([
            'session_id' => $session->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'game_type' => $data['gameType'],
            'points' => $data['points'],
            'lives' => $data['lives'],
            'config' => ['items' => $this->gameItems($data)],
            'sort_order' => (int) $session->games()->max('sort_order') + 1,
        ]);

        return response()->json(self::formatGame($game), 201);
    }

    public function updateGame(Request $request, int $courseId, int $gameId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $game = CourseGame::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($gameId);

        $data = $request->validate($this->gameValidationRules($request));

        $game->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'game_type' => $data['gameType'],
            'points' => $data['points'],
            'lives' => $data['lives'],
            'config' => ['items' => $this->gameItems($data)],
        ]);

        return response()->json(self::formatGame($game));
    }

    public function destroyGame(int $courseId, int $gameId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $game = CourseGame::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($gameId);
        $game->delete();

        return response()->json(null, 204);
    }

    /**
     * Simulation games score against fixed checkpoints; the rest use the teacher's items.
     *
     * @param  array<string, mixed>  $data
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    private function gameItems(array $data): array
    {
        if (SimulationGames::isSimulation($data['gameType'])) {
            return SimulationGames::items($data['gameType']);
        }

        return $this->normaliseGameItems($data['items']);
    }

    /**
     * Strip empty distractors and re-key the validated item payload.
     *
     * @param  array<int, array{prompt: string, answer: string, distractors?: array<int, string|null>|null}>  $items
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    private function normaliseGameItems(array $items): array
    {
        return array_values(array_map(fn ($item) => [
            'prompt' => $item['prompt'],
            'answer' => $item['answer'],
            'distractors' => array_values(array_filter(
                $item['distractors'] ?? [],
                fn ($d) => is_string($d) && trim($d) !== '',
            )),
        ], $items));
    }

    // ─── Modules ──────────────────────────────────────────────────────────────

    public function storeModule(Request $request, int $courseId): JsonResponse
    {
        $course = $this->authoriseCourse($courseId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $maxOrder = CourseModule::where('course_id', $course->id)->max('sort_order') ?? -1;

        $mod = CourseModule::create([
            'course_id' => $course->id,
            'title' => $data['title'],
            'sort_order' => $maxOrder + 1,
        ]);

        return response()->json([
            'id' => 'module-'.$mod->id,
            'dbId' => $mod->id,
            'title' => $mod->title,
            'items' => [],
        ], 201);
    }

    public function updateModule(Request $request, int $courseId, int $moduleId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $data = $request->validate(['title' => 'required|string|max:255']);

        $mod = CourseModule::where('course_id', $courseId)->findOrFail($moduleId);
        $mod->update(['title' => $data['title']]);

        return response()->json(['id' => 'module-'.$mod->id, 'title' => $mod->title]);
    }

    public function destroyModule(int $courseId, int $moduleId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $mod = CourseModule::where('course_id', $courseId)->findOrFail($moduleId);
        $mod->delete();

        return response()->json(['ok' => true]);
    }

    public function reorderModuleItems(Request $request, int $courseId, int $moduleId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.type' => 'required|string|in:session,lesson-group',
            'items.*.order' => 'required|integer',
        ]);

        foreach ($data['items'] as $entry) {
            if ($entry['type'] === 'session') {
                CourseSession::where('module_id', $moduleId)->where('id', $entry['id'])->update(['sort_order' => $entry['order']]);
            } else {
                CourseLessonGroup::where('module_id', $moduleId)->where('id', $entry['id'])->update(['sort_order' => $entry['order']]);
            }
        }

        return response()->json(['ok' => true]);
    }

    // ─── Sessions (direct on module) ──────────────────────────────────────────

    public function storeSession(Request $request, int $courseId, int $moduleId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        CourseModule::where('course_id', $courseId)->findOrFail($moduleId);

        $data = $request->validate(['title' => 'required|string|max:255']);
        $maxOrder = CourseSession::where('module_id', $moduleId)->whereNull('lesson_group_id')->max('sort_order') ?? -1;

        $session = CourseSession::create([
            'module_id' => $moduleId,
            'lesson_group_id' => null,
            'title' => $data['title'],
            'sort_order' => $maxOrder + 1,
        ]);

        return response()->json([
            'id' => 'session-'.$session->id,
            'dbId' => $session->id,
            'itemType' => 'session',
            'title' => $session->title,
            'contents' => [],
            'assessments' => [],
            'meetings' => [],
        ], 201);
    }

    public function updateSession(Request $request, int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $data = $request->validate(['title' => 'required|string|max:255']);

        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);
        $session->update(['title' => $data['title']]);

        return response()->json(['id' => 'session-'.$session->id, 'title' => $session->title]);
    }

    public function destroySession(int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);
        $session->delete();

        return response()->json(['ok' => true]);
    }

    // ─── Lesson Groups ────────────────────────────────────────────────────────

    public function storeLessonGroup(Request $request, int $courseId, int $moduleId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        CourseModule::where('course_id', $courseId)->findOrFail($moduleId);

        $data = $request->validate(['title' => 'required|string|max:255']);
        $maxOrder = CourseLessonGroup::where('module_id', $moduleId)->max('sort_order') ?? -1;

        $group = CourseLessonGroup::create([
            'module_id' => $moduleId,
            'title' => $data['title'],
            'sort_order' => $maxOrder + 1,
        ]);

        return response()->json([
            'id' => 'lg-'.$group->id,
            'dbId' => $group->id,
            'itemType' => 'lesson-group',
            'title' => $group->title,
            'sessions' => [],
        ], 201);
    }

    public function updateLessonGroup(Request $request, int $courseId, int $groupId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $data = $request->validate(['title' => 'required|string|max:255']);

        $group = CourseLessonGroup::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($groupId);
        $group->update(['title' => $data['title']]);

        return response()->json(['id' => 'lg-'.$group->id, 'title' => $group->title]);
    }

    public function destroyLessonGroup(int $courseId, int $groupId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $group = CourseLessonGroup::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($groupId);
        $group->delete();

        return response()->json(['ok' => true]);
    }

    // ─── Sessions inside a Lesson Group ───────────────────────────────────────

    public function storeGroupSession(Request $request, int $courseId, int $groupId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $group = CourseLessonGroup::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($groupId);

        $data = $request->validate(['title' => 'required|string|max:255']);
        $maxOrder = CourseSession::where('lesson_group_id', $group->id)->max('sort_order') ?? -1;

        $session = CourseSession::create([
            'module_id' => $group->module_id,
            'lesson_group_id' => $group->id,
            'title' => $data['title'],
            'sort_order' => $maxOrder + 1,
        ]);

        return response()->json([
            'id' => 'session-'.$session->id,
            'dbId' => $session->id,
            'itemType' => 'session',
            'title' => $session->title,
            'contents' => [],
            'assessments' => [],
            'meetings' => [],
        ], 201);
    }

    public function reorderGroupSessions(Request $request, int $courseId, int $groupId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        CourseLessonGroup::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($groupId);

        $data = $request->validate([
            'sessions' => 'required|array',
            'sessions.*.id' => 'required|integer',
            'sessions.*.order' => 'required|integer',
        ]);

        foreach ($data['sessions'] as $entry) {
            CourseSession::where('lesson_group_id', $groupId)->where('id', $entry['id'])->update(['sort_order' => $entry['order']]);
        }

        return response()->json(['ok' => true]);
    }

    // ─── Content Items ────────────────────────────────────────────────────────

    /**
     * Store an uploaded file on the public disk and return the relative path (without "/storage/" prefix).
     *
     * Works around a Windows/Symfony quirk where `$file->store()` can fail with "Path must not be empty"
     * because `UploadedFile::getRealPath()` returns false on the SAPI-provided temp file.
     */
    private static function storeUploadedFile(\Illuminate\Http\UploadedFile $file, string $folder): string
    {
        $extension = $file->getClientOriginalExtension();
        $name = \Illuminate\Support\Str::random(40).($extension !== '' ? '.'.$extension : '');

        $destinationDir = storage_path('app/public/'.$folder);
        if (! is_dir($destinationDir)) {
            mkdir($destinationDir, 0755, true);
        }

        $file->move($destinationDir, $name);

        return $folder.'/'.$name;
    }

    /**
     * Resolve the URL the frontend should use to display a content item.
     * External links live in `url`; uploaded files live in `file_path`.
     */
    private static function contentDisplayUrl(CourseContentItem $item): string
    {
        if ($item->url) {
            return $item->url;
        }

        if ($item->file_path) {
            return '/storage/'.ltrim($item->file_path, '/');
        }

        return '';
    }

    /**
     * Delete the uploaded file backing a content item, if any. Handles both the
     * current `file_path` convention and legacy rows that stored the path in `url`.
     */
    private static function deleteContentFile(CourseContentItem $item): void
    {
        if ($item->file_path) {
            \Storage::disk('public')->delete($item->file_path);
        } elseif ($item->url && str_starts_with($item->url, '/storage/course-content/')) {
            \Storage::disk('public')->delete(str_replace('/storage/', '', $item->url));
        }
    }

    private static function contentFolder(string $type): string
    {
        return match ($type) {
            'pdf' => 'course-content/pdf',
            'word' => 'course-content/word',
            'video' => 'course-content/video',
            'flipbook' => 'course-content/flipbook',
            default => 'course-content/misc',
        };
    }

    private static function allowedMimes(string $type): array
    {
        return match ($type) {
            'pdf' => ['application/pdf'],
            'word' => [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
            ],
            'video' => ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
            default => [],
        };
    }

    private static function allowedExtensions(string $type): array
    {
        return match ($type) {
            'pdf' => ['pdf'],
            'word' => ['doc', 'docx'],
            'video' => ['mp4', 'webm', 'ogg', 'mov'],
            default => [],
        };
    }

    /**
     * Returns true if the uploaded file is acceptable for the given content type.
     * Uses extension primarily, with MIME (server-detected, then client-reported) as a hint.
     * Resilient to Windows quirks where `getMimeType()` can throw because `getRealPath()` is empty.
     */
    private static function uploadMatchesType(\Illuminate\Http\UploadedFile $file, string $type): bool
    {
        $allowedExt = self::allowedExtensions($type);
        $allowedMime = self::allowedMimes($type);

        $ext = strtolower($file->getClientOriginalExtension());
        if (! empty($allowedExt) && in_array($ext, $allowedExt, true)) {
            return true;
        }

        try {
            $mime = $file->getMimeType();
        } catch (\Throwable $e) {
            $mime = null;
        }
        if ($mime !== null && in_array($mime, $allowedMime, true)) {
            return true;
        }

        $clientMime = $file->getClientMimeType();
        if ($clientMime && in_array($clientMime, $allowedMime, true)) {
            return true;
        }

        return false;
    }

    /**
     * Validation rules for the pages of a flipbook content item.
     *
     * @return array<string, string>
     */
    private static function flipbookPageRules(string $pagesRule): array
    {
        return [
            'pages' => $pagesRule,
            'pages.*.id' => 'nullable|string|max:64',
            'pages.*.layout' => 'required|string|in:text,image-right,image-top,two-images,image-full',
            'pages.*.heading' => 'nullable|string|max:255',
            'pages.*.body' => 'nullable|string|max:20000',
            'pages.*.highlight' => 'nullable|string|max:500',
            'pages.*.images' => 'nullable|array|max:2',
            'pages.*.images.*.url' => 'required|string|max:2048|starts_with:/storage/course-content/flipbook/',
            'pages.*.images.*.caption' => 'nullable|string|max:255',
        ];
    }

    /**
     * Normalise validated flipbook pages into the stored shape, keeping only safe rich-text markup.
     *
     * @param  array<int, array<string, mixed>>  $pages
     * @return array<int, array{id: string, layout: string, heading: string, body: string, highlight: string, images: array<int, array{url: string, caption: string}>}>
     */
    private static function normaliseFlipbookPages(array $pages): array
    {
        return array_values(array_map(fn (array $page) => [
            'id' => (string) ($page['id'] ?? \Illuminate\Support\Str::random(10)),
            'layout' => $page['layout'],
            'heading' => trim((string) ($page['heading'] ?? '')),
            'body' => self::sanitiseRichText((string) ($page['body'] ?? '')),
            'highlight' => trim((string) ($page['highlight'] ?? '')),
            'images' => array_values(array_map(fn (array $image) => [
                'url' => $image['url'],
                'caption' => trim((string) ($image['caption'] ?? '')),
            ], $page['images'] ?? [])),
        ], $pages));
    }

    /**
     * Strip editor HTML down to basic formatting tags, removing attributes other than safe link targets.
     */
    private static function sanitiseRichText(string $html): string
    {
        $clean = strip_tags($html, '<p><br><strong><b><em><i><u><s><ul><ol><li><a><h3><h4><blockquote>');
        $clean = preg_replace('/\s(?!href=)[a-z-]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $clean) ?? '';

        return preg_replace('/href\s*=\s*("|\')\s*(?!https?:|mailto:)[^"\']*\1/i', 'href="#"', $clean) ?? '';
    }

    /**
     * Delete the uploaded images used by a flipbook's pages.
     */
    private static function deleteFlipbookImages(CourseContentItem $item): void
    {
        foreach ($item->pages ?? [] as $page) {
            foreach ($page['images'] ?? [] as $image) {
                $path = str_replace('/storage/', '', (string) ($image['url'] ?? ''));
                if (str_starts_with($path, 'course-content/flipbook/')) {
                    \Storage::disk('public')->delete($path);
                }
            }
        }
    }

    public function uploadFlipbookImage(Request $request, int $courseId): JsonResponse
    {
        $this->authoriseCourse($courseId);

        $request->validate([
            'image' => 'required|file|mimes:jpg,jpeg,png,webp,gif|max:8192',
        ]);

        $path = self::storeUploadedFile($request->file('image'), self::contentFolder('flipbook'));

        return response()->json(['url' => '/storage/'.$path], 201);
    }

    public function storeContent(Request $request, int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);

        $data = $request->validate([
            'type' => 'required|string|in:pdf,word,video,youtube,flipbook',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'url' => 'nullable|string|max:2048',
            'file' => 'nullable|file|max:524288',
            ...self::flipbookPageRules('required_if:type,flipbook|array|min:1|max:200'),
        ]);

        $pages = $data['type'] === 'flipbook' ? self::normaliseFlipbookPages($data['pages']) : null;

        $url = $pages === null ? ($data['url'] ?? null) : null;
        $filename = null;
        $filePath = null;
        $fileSize = null;

        if ($pages === null && $request->hasFile('file')) {
            $file = $request->file('file');
            if (! self::uploadMatchesType($file, $data['type'])) {
                return response()->json(['message' => 'Invalid file type for content type "'.$data['type'].'".'], 422);
            }
            $filePath = self::storeUploadedFile($file, self::contentFolder($data['type']));
            $fileSize = $file->getSize();
            $filename = $file->getClientOriginalName();
            $url = null;
        }

        $maxOrder = CourseContentItem::where('session_id', $session->id)->max('sort_order') ?? -1;

        $item = CourseContentItem::create([
            'session_id' => $session->id,
            'type' => $data['type'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'url' => $url,
            'filename' => $filename,
            'file_path' => $filePath,
            'file_size' => $fileSize,
            'sort_order' => $maxOrder + 1,
            'pages' => $pages,
        ]);

        return response()->json([
            'id' => 'content-'.$item->id,
            'dbId' => $item->id,
            'type' => $item->type,
            'title' => $item->title,
            'description' => $item->description ?? '',
            'url' => self::contentDisplayUrl($item),
            'filename' => $item->filename ?? '',
            'pages' => $item->pages ?? [],
        ], 201);
    }

    public function updateContent(Request $request, int $courseId, int $contentId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $item = CourseContentItem::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($contentId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'url' => 'nullable|string|max:2048',
            'file' => 'nullable|file|max:524288',
            ...self::flipbookPageRules($item->type === 'flipbook' ? 'required|array|min:1|max:200' : 'prohibited'),
        ]);

        if ($item->type === 'flipbook') {
            $pages = self::normaliseFlipbookPages($data['pages']);
            $keptUrls = collect($pages)->pluck('images')->flatten(1)->pluck('url')->all();
            foreach ($item->pages ?? [] as $oldPage) {
                foreach ($oldPage['images'] ?? [] as $oldImage) {
                    $oldUrl = (string) ($oldImage['url'] ?? '');
                    if (! in_array($oldUrl, $keptUrls, true) && str_starts_with($oldUrl, '/storage/course-content/flipbook/')) {
                        \Storage::disk('public')->delete(str_replace('/storage/', '', $oldUrl));
                    }
                }
            }

            $item->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? $item->description,
                'pages' => $pages,
            ]);

            return response()->json([
                'id' => 'content-'.$item->id,
                'dbId' => $item->id,
                'type' => $item->type,
                'title' => $item->title,
                'description' => $item->description ?? '',
                'url' => '',
                'filename' => '',
                'pages' => $item->pages,
            ]);
        }

        $url = $data['url'] ?? $item->url;
        $filename = $item->filename;
        $filePath = $item->file_path;
        $fileSize = $item->file_size;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            if (! self::uploadMatchesType($file, $item->type)) {
                return response()->json(['message' => 'Invalid file type for content type "'.$item->type.'".'], 422);
            }
            self::deleteContentFile($item);
            $filePath = self::storeUploadedFile($file, self::contentFolder($item->type));
            $fileSize = $file->getSize();
            $filename = $file->getClientOriginalName();
            $url = null;
        }

        $item->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? $item->description,
            'url' => $url,
            'filename' => $filename,
            'file_path' => $filePath,
            'file_size' => $fileSize,
        ]);

        return response()->json([
            'id' => 'content-'.$item->id,
            'dbId' => $item->id,
            'type' => $item->type,
            'title' => $item->title,
            'description' => $item->description ?? '',
            'url' => self::contentDisplayUrl($item),
            'filename' => $item->filename ?? '',
            'pages' => $item->pages ?? [],
        ]);
    }

    public function destroyContent(int $courseId, int $contentId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $item = CourseContentItem::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($contentId);

        self::deleteContentFile($item);
        self::deleteFlipbookImages($item);

        $item->delete();

        return response()->json(['ok' => true]);
    }

    // ─── Quizzes ──────────────────────────────────────────────────────────────

    public function storeQuiz(Request $request, int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'nullable|array',
            'questions.*.question' => 'required|string',
            'questions.*.options' => 'required|array|min:2',
            'questions.*.options.*' => 'required|string',
            'questions.*.correctIndex' => 'required|integer|min:0',
        ]);

        $quiz = Quiz::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'course_id' => $courseId,
            'session_id' => $session->id,
            'teacher_id' => auth()->id(),
            'status' => 'draft',
        ]);

        $questions = [];
        foreach ($data['questions'] ?? [] as $qi => $qData) {
            $question = Question::create([
                'quiz_id' => $quiz->id,
                'question_text' => $qData['question'],
                'question_type' => 'multiple_choice',
                'points' => 1,
                'order' => $qi,
            ]);
            foreach ($qData['options'] as $oi => $optText) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'option_text' => $optText,
                    'is_correct' => $oi === $qData['correctIndex'],
                    'order' => $oi,
                ]);
            }
            $questions[] = [
                'id' => 'question-'.$question->id,
                'dbId' => $question->id,
                'question' => $question->question_text,
                'options' => $qData['options'],
                'correctIndex' => $qData['correctIndex'],
            ];
        }

        return response()->json([
            'id' => 'quiz-'.$quiz->id,
            'dbId' => $quiz->id,
            'kind' => 'quiz',
            'title' => $quiz->title,
            'description' => $quiz->description ?? '',
            'questions' => $questions,
        ], 201);
    }

    public function updateQuiz(Request $request, int $courseId, int $quizId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $quiz = Quiz::where('course_id', $courseId)->findOrFail($quizId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'questions' => 'nullable|array',
            'questions.*.question' => 'required|string',
            'questions.*.options' => 'required|array|min:2',
            'questions.*.options.*' => 'required|string',
            'questions.*.correctIndex' => 'required|integer|min:0',
        ]);

        $quiz->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
        ]);

        // Replace all questions
        $quiz->questions()->each(fn ($q) => $q->options()->delete());
        $quiz->questions()->delete();

        $questions = [];
        foreach ($data['questions'] ?? [] as $qi => $qData) {
            $question = Question::create([
                'quiz_id' => $quiz->id,
                'question_text' => $qData['question'],
                'question_type' => 'multiple_choice',
                'points' => 1,
                'order' => $qi,
            ]);
            foreach ($qData['options'] as $oi => $optText) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'option_text' => $optText,
                    'is_correct' => $oi === $qData['correctIndex'],
                    'order' => $oi,
                ]);
            }
            $questions[] = [
                'id' => 'question-'.$question->id,
                'dbId' => $question->id,
                'question' => $question->question_text,
                'options' => $qData['options'],
                'correctIndex' => $qData['correctIndex'],
            ];
        }

        return response()->json([
            'id' => 'quiz-'.$quiz->id,
            'dbId' => $quiz->id,
            'kind' => 'quiz',
            'title' => $quiz->title,
            'description' => $quiz->description ?? '',
            'questions' => $questions,
        ]);
    }

    public function destroyQuiz(int $courseId, int $quizId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $quiz = Quiz::where('course_id', $courseId)->findOrFail($quizId);
        $quiz->questions()->each(fn ($q) => $q->options()->delete());
        $quiz->questions()->delete();
        $quiz->delete();

        return response()->json(['ok' => true]);
    }

    // ─── Assignments ──────────────────────────────────────────────────────────

    public function storeAssignment(Request $request, int $courseId, int $sessionId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $session = CourseSession::whereHas('module', fn ($q) => $q->where('course_id', $courseId))->findOrFail($sessionId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'dueDate' => 'nullable|date',
            'maxScore' => 'nullable|integer|min:1',
        ]);

        $assignment = Assignment::create([
            'title' => $data['title'],
            'description' => $data['instructions'] ?? null,
            'course_id' => $courseId,
            'session_id' => $session->id,
            'teacher_id' => auth()->id(),
            'assignment_type' => 'submission',
            'points' => $data['maxScore'] ?? 100,
            'due_date' => $data['dueDate'] ?? null,
            'status' => 'draft',
        ]);

        return response()->json([
            'id' => 'assignment-'.$assignment->id,
            'dbId' => $assignment->id,
            'kind' => 'assignment',
            'title' => $assignment->title,
            'instructions' => $assignment->description ?? '',
            'dueDate' => $assignment->due_date?->format('Y-m-d') ?? '',
            'maxScore' => $assignment->points ?? 100,
        ], 201);
    }

    public function updateAssignment(Request $request, int $courseId, int $assignmentId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $assignment = Assignment::where('course_id', $courseId)->findOrFail($assignmentId);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'dueDate' => 'nullable|date',
            'maxScore' => 'nullable|integer|min:1',
        ]);

        $assignment->update([
            'title' => $data['title'],
            'description' => $data['instructions'] ?? null,
            'points' => $data['maxScore'] ?? 100,
            'due_date' => $data['dueDate'] ?? null,
        ]);

        return response()->json([
            'id' => 'assignment-'.$assignment->id,
            'dbId' => $assignment->id,
            'kind' => 'assignment',
            'title' => $assignment->title,
            'instructions' => $assignment->description ?? '',
            'dueDate' => $assignment->due_date?->format('Y-m-d') ?? '',
            'maxScore' => $assignment->points ?? 100,
        ]);
    }

    public function destroyAssignment(int $courseId, int $assignmentId): JsonResponse
    {
        $this->authoriseCourse($courseId);
        $assignment = Assignment::where('course_id', $courseId)->findOrFail($assignmentId);
        $assignment->delete();

        return response()->json(['ok' => true]);
    }
}
