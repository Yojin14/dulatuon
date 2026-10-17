<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CourseThumbnailTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_course_with_a_thumbnail(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($admin)
            ->post(route('courses.store'), [
                'course_code' => 'THM-101',
                'title' => 'Thumbnail Course',
                'level' => 'Beginner',
                'status' => 'draft',
                'teacher_ids' => [$teacher->id],
                'thumbnail_file' => UploadedFile::fake()->image('cover.jpg', 1280, 720),
                'thumbnail_focus' => '40.0% 60.0%',
            ])
            ->assertRedirect(route('courses.index'));

        $course = Course::where('course_code', 'THM-101')->firstOrFail();

        $this->assertStringStartsWith('/storage/course-thumbnails/', $course->thumbnail);
        $this->assertSame('40.0% 60.0%', $course->thumbnail_focus);

        Storage::disk('public')->assertExists(str_replace('/storage/', '', $course->thumbnail));
    }

    public function test_course_can_be_created_without_a_thumbnail(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($admin)
            ->post(route('courses.store'), [
                'course_code' => 'NOIMG-101',
                'title' => 'No Image Course',
                'level' => 'Beginner',
                'status' => 'draft',
                'teacher_ids' => [$teacher->id],
            ])
            ->assertRedirect(route('courses.index'));

        $this->assertDatabaseHas('courses', [
            'course_code' => 'NOIMG-101',
            'thumbnail' => null,
        ]);
    }
}
