<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CurriculumContentUploadTest extends TestCase
{
    use RefreshDatabase;

    private function courseWithSession(User $admin): CourseSession
    {
        $course = Course::factory()->create();
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Module 1', 'sort_order' => 0]);

        return CourseSession::create(['module_id' => $module->id, 'title' => 'Session 1', 'sort_order' => 0]);
    }

    public function test_admin_can_upload_a_pdf_content_item(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->courseWithSession($admin);
        $courseId = $session->module->course_id;

        $response = $this->actingAs($admin)->post(
            "/curriculum/{$courseId}/sessions/{$session->id}/content",
            [
                'type' => 'pdf',
                'title' => 'Lecture Notes',
                'file' => UploadedFile::fake()->create('notes.pdf', 200, 'application/pdf'),
            ],
        );

        $response->assertCreated();

        // The response must carry a resolvable URL so the PDF shows immediately.
        $response->assertJsonPath('type', 'pdf');
        $this->assertStringStartsWith('/storage/course-content/pdf/', $response->json('url'));

        $item = CourseContentItem::where('session_id', $session->id)->firstOrFail();

        $this->assertSame('pdf', $item->type);
        $this->assertSame('notes.pdf', $item->filename);
        $this->assertNotNull($item->file_path, 'The uploaded PDF should be stored in file_path.');
        $this->assertNotNull($item->file_size);

        $storedPath = storage_path('app/public/'.$item->file_path);
        $this->assertFileExists($storedPath);

        @unlink($storedPath);
    }

    public function test_uploaded_pdf_shows_in_the_formatted_curriculum(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->courseWithSession($admin);
        $courseId = $session->module->course_id;

        $this->actingAs($admin)->post(
            "/curriculum/{$courseId}/sessions/{$session->id}/content",
            [
                'type' => 'pdf',
                'title' => 'Lecture Notes',
                'file' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
            ],
        )->assertCreated();

        // The student/teacher "My Course" view renders from formatCurriculum.
        $course = \App\Models\Course::findOrFail($courseId);
        $curriculum = \App\Http\Controllers\CurriculumController::formatCurriculum($course);

        $content = $curriculum[0]['items'][0]['contents'][0];
        $this->assertSame('pdf', $content['type']);
        $this->assertStringStartsWith('/storage/course-content/pdf/', $content['url']);

        $item = CourseContentItem::where('session_id', $session->id)->firstOrFail();
        @unlink(storage_path('app/public/'.$item->file_path));
    }

    public function test_file_path_only_content_resolves_a_display_url(): void
    {
        // Mirrors seeded content that stores file_path with no url.
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->courseWithSession($admin);

        CourseContentItem::create([
            'session_id' => $session->id,
            'type' => 'pdf',
            'title' => 'Seeded Reading',
            'file_path' => 'course-materials/sample-reading.pdf',
            'file_size' => 482000,
            'sort_order' => 0,
        ]);

        $course = \App\Models\Course::findOrFail($session->module->course_id);
        $curriculum = \App\Http\Controllers\CurriculumController::formatCurriculum($course);

        $content = $curriculum[0]['items'][0]['contents'][0];
        $this->assertSame('/storage/course-materials/sample-reading.pdf', $content['url']);
    }
}
