<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseGame;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\GameAttempt;
use App\Models\StudentContentProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MyProgressTest extends TestCase
{
    use RefreshDatabase;

    /**
     * A course with one module holding two materials and one game, plus an enrolled student.
     *
     * @return array{student: User, course: Course, contents: array<int, CourseContentItem>, game: CourseGame}
     */
    private function enrolledCourse(): array
    {
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::factory()->create();
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Plates and Faults', 'sort_order' => 0]);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);

        $contents = [
            CourseContentItem::create(['session_id' => $session->id, 'type' => 'youtube', 'title' => 'Intro', 'url' => 'https://youtu.be/abc']),
            CourseContentItem::create(['session_id' => $session->id, 'type' => 'youtube', 'title' => 'Faults', 'url' => 'https://youtu.be/def']),
        ];
        $game = CourseGame::create(['session_id' => $session->id, 'title' => 'Fault Lab', 'game_type' => 'fault_lab', 'points' => 100]);

        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);

        return compact('student', 'course', 'contents', 'game');
    }

    private function attempt(User $student, CourseGame $game, int $correct, int $total): void
    {
        GameAttempt::create([
            'game_id' => $game->id,
            'user_id' => $student->id,
            'score' => $total > 0 ? (int) round(100 * $correct / $total) : 0,
            'max_score' => 100,
            'correct_count' => $correct,
            'total_count' => $total,
            'completed_at' => now(),
        ]);
    }

    public function test_materials_and_games_both_count_towards_module_progress(): void
    {
        ['student' => $student, 'course' => $course, 'contents' => $contents, 'game' => $game] = $this->enrolledCourse();

        StudentContentProgress::create(['user_id' => $student->id, 'course_id' => $course->id, 'content_id' => $contents[0]->id, 'completed_at' => now()]);
        $this->attempt($student, $game, 4, 5);

        $this->actingAs($student)->get('/my-progress')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('my-progress/index')
            ->has('modules', 1)
            ->where('modules.0.module_title', 'Plates and Faults')
            ->where('modules.0.total_contents', 3)
            ->where('modules.0.contents_completed', 2)
            ->where('modules.0.games_cleared', 1)
            ->where('modules.0.total_games', 1)
            ->where('modules.0.progress', 67)
            ->where('modules.0.completed_at', null));
    }

    public function test_a_low_scoring_game_does_not_clear_but_a_later_good_run_does(): void
    {
        ['student' => $student, 'game' => $game] = $this->enrolledCourse();

        $this->attempt($student, $game, 1, 5);
        $this->actingAs($student)->get('/my-progress')->assertInertia(fn (Assert $page) => $page->where('modules.0.games_cleared', 0));

        $this->attempt($student, $game, 3, 5);
        $this->actingAs($student)->get('/my-progress')->assertInertia(fn (Assert $page) => $page->where('modules.0.games_cleared', 1));
    }

    public function test_module_is_cleared_when_every_material_and_game_is_done(): void
    {
        ['student' => $student, 'course' => $course, 'contents' => $contents, 'game' => $game] = $this->enrolledCourse();

        foreach ($contents as $content) {
            $this->actingAs($student)->postJson("/my-progress/{$course->id}/contents/{$content->id}/complete")->assertOk();
        }
        $this->attempt($student, $game, 5, 5);

        $this->actingAs($student)->get('/my-progress')->assertInertia(fn (Assert $page) => $page
            ->where('modules.0.progress', 100)
            ->where('modules.0.completed_at', now()->format('F d, Y')));
    }

    public function test_content_from_another_course_cannot_be_marked_complete(): void
    {
        ['student' => $student, 'course' => $course] = $this->enrolledCourse();
        $otherContent = $this->enrolledCourse()['contents'][0];

        $this->actingAs($student)
            ->postJson("/my-progress/{$course->id}/contents/{$otherContent->id}/complete")
            ->assertNotFound();

        $this->assertDatabaseMissing('student_content_progress', ['user_id' => $student->id, 'content_id' => $otherContent->id]);
    }

    public function test_students_not_enrolled_cannot_mark_content_complete(): void
    {
        ['course' => $course, 'contents' => $contents] = $this->enrolledCourse();
        $stranger = User::factory()->create(['role' => 'student']);

        $this->actingAs($stranger)
            ->postJson("/my-progress/{$course->id}/contents/{$contents[0]->id}/complete")
            ->assertNotFound();
    }

    public function test_progress_page_is_empty_without_enrollments(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student)->get('/my-progress')->assertOk()->assertInertia(fn (Assert $page) => $page->has('modules', 0));
    }

    public function test_completing_every_module_unlocks_the_course_certificate(): void
    {
        ['student' => $student, 'course' => $course, 'contents' => $contents, 'game' => $game] = $this->enrolledCourse();
        foreach ($contents as $content) {
            StudentContentProgress::create(['user_id' => $student->id, 'course_id' => $course->id, 'content_id' => $content->id, 'completed_at' => now()]);
        }
        $this->attempt($student, $game, 5, 5);

        $this->actingAs($student)->get('/my-progress')->assertInertia(fn (Assert $page) => $page
            ->has('certificates', 1)
            ->where('certificates.0.course_id', $course->id)
            ->where('certificates.0.url', route('certificates.show', $course)));

        $this->actingAs($student)->get(route('certificates.show', $course))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('certificates/show')
            ->where('certificate.student_name', $student->name)
            ->where('certificate.course_title', $course->title)
            ->where('certificate.completed_at', now()->format('F j, Y'))
            ->where('certificate.code', fn (string $code) => (bool) preg_match('/^DLT-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/', $code)));
    }

    public function test_certificate_stays_locked_until_every_module_is_cleared(): void
    {
        ['student' => $student, 'course' => $course, 'contents' => $contents] = $this->enrolledCourse();
        StudentContentProgress::create(['user_id' => $student->id, 'course_id' => $course->id, 'content_id' => $contents[0]->id, 'completed_at' => now()]);

        $this->actingAs($student)->get('/my-progress')->assertInertia(fn (Assert $page) => $page->has('certificates', 0));
        $this->actingAs($student)->get(route('certificates.show', $course))->assertRedirect(route('my-progress.index'));
    }

    public function test_students_cannot_open_certificates_for_courses_they_are_not_in(): void
    {
        ['course' => $course] = $this->enrolledCourse();
        $stranger = User::factory()->create(['role' => 'student']);

        $this->actingAs($stranger)->get(route('certificates.show', $course))->assertNotFound();
    }
}
