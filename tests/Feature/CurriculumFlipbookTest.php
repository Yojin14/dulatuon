<?php

namespace Tests\Feature;

use App\Http\Controllers\CurriculumController;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CurriculumFlipbookTest extends TestCase
{
    use RefreshDatabase;

    private function sessionForNewCourse(): CourseSession
    {
        $course = Course::factory()->create();
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Module 1', 'sort_order' => 0]);

        return CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function samplePages(): array
    {
        return [
            [
                'id' => 'p1',
                'layout' => 'image-right',
                'heading' => 'Earth Is Made of Moving Plates',
                'body' => '<p>Earth\'s rigid outer layer is divided into <strong>tectonic plates</strong>.</p><script>alert(1)</script>',
                'highlight' => 'Tension → rocks are pulled apart → normal fault',
                'images' => [['url' => '/storage/course-content/flipbook/plate.png', 'caption' => 'Convergent boundary']],
            ],
            [
                'id' => 'p2',
                'layout' => 'text',
                'heading' => 'Where Does an Earthquake Begin?',
                'body' => '<p onclick="steal()">The focus is also called the <a href="javascript:alert(1)">hypocenter</a>.</p>',
            ],
        ];
    }

    public function test_teacher_can_create_a_flipbook_that_appears_in_the_curriculum(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $response = $this->actingAs($admin)->postJson("/curriculum/{$courseId}/sessions/{$session->id}/content", [
            'type' => 'flipbook',
            'title' => 'Earthquake Reader',
            'pages' => $this->samplePages(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('type', 'flipbook')
            ->assertJsonCount(2, 'pages')
            ->assertJsonPath('pages.0.images.0.caption', 'Convergent boundary');

        $item = CourseContentItem::firstOrFail();
        $this->assertSame('flipbook', $item->type);
        $this->assertStringNotContainsString('<script', $item->pages[0]['body']);
        $this->assertStringNotContainsString('onclick', $item->pages[1]['body']);
        $this->assertStringNotContainsString('javascript:', $item->pages[1]['body']);
        $this->assertStringContainsString('<strong>tectonic plates</strong>', $item->pages[0]['body']);

        $curriculum = CurriculumController::formatCurriculum(Course::findOrFail($courseId));
        $content = $curriculum[0]['items'][0]['contents'][0];
        $this->assertSame('flipbook', $content['type']);
        $this->assertSame('Where Does an Earthquake Begin?', $content['pages'][1]['heading']);
    }

    public function test_flipbook_accepts_full_page_images_from_an_imported_pdf(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $pages = array_map(fn (int $n) => [
            'layout' => 'image-full',
            'heading' => '',
            'images' => [['url' => "/storage/course-content/flipbook/page-{$n}.webp"]],
        ], range(1, 70));

        $this->actingAs($admin)->postJson("/curriculum/{$courseId}/sessions/{$session->id}/content", [
            'type' => 'flipbook',
            'title' => 'Imported Reader',
            'pages' => $pages,
        ])->assertCreated()->assertJsonCount(70, 'pages')->assertJsonPath('pages.69.layout', 'image-full');
    }

    public function test_flipbook_requires_at_least_one_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $this->actingAs($admin)->postJson("/curriculum/{$courseId}/sessions/{$session->id}/content", [
            'type' => 'flipbook',
            'title' => 'Empty Reader',
            'pages' => [],
        ])->assertUnprocessable()->assertJsonValidationErrors('pages');
    }

    public function test_flipbook_rejects_unknown_layouts_and_foreign_image_urls(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $this->actingAs($admin)->postJson("/curriculum/{$courseId}/sessions/{$session->id}/content", [
            'type' => 'flipbook',
            'title' => 'Bad Reader',
            'pages' => [[
                'layout' => 'collage',
                'images' => [['url' => 'https://evil.example/x.png']],
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['pages.0.layout', 'pages.0.images.0.url']);
    }

    public function test_teacher_can_update_flipbook_pages(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $id = $this->actingAs($admin)->postJson("/curriculum/{$courseId}/sessions/{$session->id}/content", [
            'type' => 'flipbook',
            'title' => 'Earthquake Reader',
            'pages' => $this->samplePages(),
        ])->json('dbId');

        $this->actingAs($admin)->putJson("/curriculum/{$courseId}/content/{$id}", [
            'title' => 'Earthquake Reader v2',
            'pages' => [['layout' => 'text', 'heading' => 'Only page', 'body' => '<p>Hi</p>']],
        ])->assertOk()->assertJsonCount(1, 'pages')->assertJsonPath('pages.0.heading', 'Only page');

        $item = CourseContentItem::findOrFail($id);
        $this->assertSame('Earthquake Reader v2', $item->title);
        $this->assertCount(1, $item->pages);
    }

    public function test_pages_cannot_be_sent_for_other_content_types(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;
        $item = CourseContentItem::create([
            'session_id' => $session->id,
            'type' => 'youtube',
            'title' => 'Video',
            'url' => 'https://youtube.com/watch?v=abc',
        ]);

        $this->actingAs($admin)->putJson("/curriculum/{$courseId}/content/{$item->id}", [
            'title' => 'Video',
            'pages' => [['layout' => 'text']],
        ])->assertUnprocessable()->assertJsonValidationErrors('pages');
    }

    public function test_flipbook_image_upload_stores_the_image(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $response = $this->actingAs($admin)->post("/curriculum/{$courseId}/flipbook-images", [
            'image' => UploadedFile::fake()->image('plates.png', 400, 300),
        ]);

        $response->assertCreated();
        $url = $response->json('url');
        $this->assertStringStartsWith('/storage/course-content/flipbook/', $url);

        $stored = storage_path('app/public/'.str_replace('/storage/', '', $url));
        $this->assertFileExists($stored);
        @unlink($stored);
    }

    public function test_flipbook_image_upload_rejects_non_images(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $this->actingAs($admin)->postJson("/curriculum/{$courseId}/flipbook-images", [
            'image' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_students_cannot_upload_flipbook_images(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $session = $this->sessionForNewCourse();
        $courseId = $session->module->course_id;

        $response = $this->actingAs($student)->postJson("/curriculum/{$courseId}/flipbook-images", [
            'image' => UploadedFile::fake()->image('plates.png'),
        ]);

        $this->assertContains($response->status(), [403, 404]);
    }
}
