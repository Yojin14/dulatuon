<?php

namespace App\Http\Controllers;

use App\Events\SubmissionReceived;
use App\Models\Assignment;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Support\Realtime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SubmissionController extends Controller
{
    private const ALLOWED_MIMES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
    ];

    private const ALLOWED_EXTENSIONS = 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,webp,heic';

    /**
     * Student submits (or re-submits) an assignment.
     */
    public function store(Request $request, int $courseId, int $assignmentId): JsonResponse
    {
        $user = auth()->user();

        // Ensure student is enrolled
        Enrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->where('status', 'active')
            ->firstOrFail();

        $assignment = Assignment::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))
            ->findOrFail($assignmentId);

        $type = $request->input('type', 'file');

        $attributes = match ($type) {
            'text' => $this->textAttributes($request),
            'video' => $this->videoAttributes($request),
            default => $this->fileAttributes($request, $assignmentId),
        };

        if ($attributes instanceof JsonResponse) {
            return $attributes;
        }

        $submission = Submission::updateOrCreate(
            ['user_id' => $user->id, 'assignment_id' => $assignment->id],
            array_merge($attributes, [
                'is_submitted' => true,
                'submission_date' => now(),
                'status' => 'submitted',
            ])
        );

        $submission->load(['user:id,name', 'assignment:id,title']);
        Realtime::dispatch(fn () => broadcast(new SubmissionReceived($submission, $courseId)));

        return response()->json($this->present($submission));
    }

    /**
     * @return array<string, mixed>
     */
    private function textAttributes(Request $request): array
    {
        $request->validate([
            'textContent' => 'required|string|max:50000',
        ]);

        return [
            'submission_type' => 'text',
            'text_content' => $request->input('textContent'),
            'file_path' => null,
            'file_name' => null,
            'file_size' => null,
            'video_url' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function videoAttributes(Request $request): array
    {
        $request->validate([
            'videoUrl' => 'required|url|max:2048',
        ]);

        return [
            'submission_type' => 'video',
            'video_url' => $request->input('videoUrl'),
            'text_content' => null,
            'file_path' => null,
            'file_name' => null,
            'file_size' => null,
        ];
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function fileAttributes(Request $request, int $assignmentId): array|JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:20480|mimes:'.self::ALLOWED_EXTENSIONS,
        ]);

        $file = $request->file('file');

        if (! in_array($file->getMimeType(), self::ALLOWED_MIMES)) {
            return response()->json(['message' => 'File type not allowed. Upload PDF, Word, Excel, or image files only.'], 422);
        }

        // Store from the raw temp pathname rather than $file->store(), which
        // relies on getRealPath() — that returns an empty string on some
        // Windows/Laragon setups and triggers a "Path must not be empty" error.
        $directory = "assignment-submissions/{$assignmentId}";
        $name = Str::random(40).'.'.($file->getClientOriginalExtension() ?: 'bin');
        $stream = fopen($file->getPathname(), 'r');
        Storage::disk('public')->put("{$directory}/{$name}", $stream);

        if (is_resource($stream)) {
            fclose($stream);
        }

        return [
            'submission_type' => 'file',
            'file_path' => "/storage/{$directory}/{$name}",
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'text_content' => null,
            'video_url' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Submission $submission): array
    {
        return [
            'id' => $submission->id,
            'submissionType' => $submission->submission_type,
            'textContent' => $submission->text_content,
            'videoUrl' => $submission->video_url,
            'fileName' => $submission->file_name,
            'filePath' => $submission->file_path,
            'fileSize' => $submission->file_size,
            'submittedAt' => $submission->submission_date?->toIso8601String(),
            'status' => $submission->status,
            'grade' => $submission->grade?->toSummary(),
        ];
    }

    /**
     * Return the authenticated student's own submission for an assignment.
     */
    public function mySubmission(int $courseId, int $assignmentId): JsonResponse
    {
        $user = auth()->user();

        $assignment = Assignment::whereHas('session.module', fn ($q) => $q->where('course_id', $courseId))
            ->findOrFail($assignmentId);

        $submission = Submission::where('user_id', $user->id)
            ->where('assignment_id', $assignment->id)
            ->where('is_submitted', true)
            ->first();

        if (! $submission) {
            return response()->json(null);
        }

        return response()->json($this->present($submission));
    }
}
