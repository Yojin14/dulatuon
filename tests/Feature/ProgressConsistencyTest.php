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

/**
 * Every page that shows a student's progress must agree: lesson materials plus games,
 * a game counts only once cleared, and XP is 10 per item plus 100 per cleared course.
 */
class ProgressConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private Course $course;

    private CourseContentItem $content;

    /** @var array<int, CourseGame> */
    private array $games;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create(['role' => 'student']);
        $instructor = User::factory()->create(['role' => 'teacher', 'name' => 'Legacy Instructor']);
        $this->course = Course::factory()->create(['title' => 'Earthquakes', 'instructor_id' => $instructor->id]);
        $this->course->teachers()->attach(User::factory()->create(['role' => 'teacher', 'name' => 'Assigned Teacher']));

        $module = CourseModule::create(['course_id' => $this->course->id, 'title' => 'Module 1', 'sort_order' => 0]);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
        $this->content = CourseContentItem::create(['session_id' => $session->id, 'type' => 'youtube', 'title' => 'Intro', 'url' => 'https://youtu.be/a']);
        $this->games = [
            CourseGame::create(['session_id' => $session->id, 'title' => 'Lab A', 'game_type' => 'fault_lab', 'points' => 100]),
            CourseGame::create(['session_id' => $session->id, 'title' => 'Lab B', 'game_type' => 'shake_town', 'points' => 100]),
        ];

        Enrollment::create(['user_id' => $this->student->id, 'course_id' => $this->course->id, 'status' => 'active']);
    }

    private function attempt(CourseGame $game, int $correct, int $total = 5): void
    {
        GameAttempt::create([
            'game_id' => $game->id,
            'user_id' => $this->student->id,
            'score' => (int) round(100 * $correct / $total),
            'max_score' => 100,
            'correct_count' => $correct,
            'total_count' => $total,
            'completed_at' => now(),
        ]);
    }

    private function readMaterial(): void
    {
        StudentContentProgress::create(['user_id' => $this->student->id, 'course_id' => $this->course->id, 'content_id' => $this->content->id, 'completed_at' => now()]);
    }

    public function test_dashboard_counts_games_and_does_not_call_a_course_cleared_early(): void
    {
        // Only the material is done; both labs are not. This used to show 100% "Cleared".
        $this->readMaterial();
        $this->attempt($this->games[0], 1);

        $this->actingAs($this->student)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('courses.0.completed', 1)
            ->where('courses.0.total', 3)
            ->where('courses.0.progress', 33)
            ->where('courses.0.cleared', false)
            ->where('courses.0.instructor', 'Assigned Teacher')
            ->where('xp', 10));
    }

    public function test_dashboard_and_my_progress_report_the_same_xp(): void
    {
        $this->readMaterial();
        $this->attempt($this->games[0], 5);
        $this->attempt($this->games[1], 3);

        // 3 items × 10 + 100 for clearing the course.
        $this->actingAs($this->student)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('xp', 130)
            ->where('courses.0.cleared', true)
            ->where('courses.0.progress', 100));

        $this->actingAs($this->student)->get('/my-progress')->assertInertia(fn (Assert $page) => $page
            ->where('xp', 130)
            ->where('modules.0.instructor', 'Assigned Teacher'));
    }

    public function test_my_course_list_counts_games(): void
    {
        $this->readMaterial();
        $this->attempt($this->games[0], 4);

        $this->actingAs($this->student)->get('/my-course')->assertInertia(fn (Assert $page) => $page
            ->where('enrollments.0.progress_percentage', 67));
    }

    public function test_course_player_only_ticks_games_that_were_cleared(): void
    {
        $this->attempt($this->games[0], 1);
        $this->attempt($this->games[1], 4);

        $this->actingAs($this->student)->get("/my-course/{$this->course->id}")->assertInertia(fn (Assert $page) => $page
            ->where('completedGameIds', [$this->games[1]->id]));
    }

    public function test_marking_a_material_done_updates_the_stored_progress_without_closing_the_enrollment(): void
    {
        $this->attempt($this->games[0], 5);
        $this->attempt($this->games[1], 5);

        $this->actingAs($this->student)
            ->postJson("/my-progress/{$this->course->id}/contents/{$this->content->id}/complete")
            ->assertOk();

        $enrollment = Enrollment::where('user_id', $this->student->id)->firstOrFail();
        $this->assertEquals(100, $enrollment->progress_percentage);
        $this->assertSame(3, $enrollment->completed_lessons);
        $this->assertSame('active', $enrollment->status, 'A finished course must stay open to the student.');
    }

    public function test_class_management_shows_live_progress_for_teachers(): void
    {
        $this->readMaterial();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->get('/class-management')->assertInertia(fn (Assert $page) => $page
            ->where('courses.0.students.0.progress_percentage', 33));
    }

    public function test_progress_sync_command_recalculates_existing_enrollments(): void
    {
        $this->readMaterial();
        Enrollment::where('user_id', $this->student->id)->update(['progress_percentage' => 100]);

        $this->artisan('progress:sync')->assertSuccessful();

        $this->assertEquals(33.33, Enrollment::where('user_id', $this->student->id)->value('progress_percentage'));
    }

    public function test_the_avatar_rank_xp_shared_on_every_page_matches_the_dashboard(): void
    {
        $this->attempt($this->games[0], 5);
        $this->attempt($this->games[1], 5);
        // Completing through the app keeps the stored progress (and so the shared XP) current.
        $this->actingAs($this->student)
            ->postJson("/my-progress/{$this->course->id}/contents/{$this->content->id}/complete")
            ->assertOk();

        $this->actingAs($this->student)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('xp', 130)
            ->where('auth.user.xp', 130));
    }

    public function test_teachers_get_no_rank_xp_and_leaderboard_rows_carry_each_students_total(): void
    {
        $this->readMaterial();
        Enrollment::where('user_id', $this->student->id)->firstOrFail()->recalculateProgress();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn (Assert $page) => $page->where('auth.user.xp', null));

        $this->actingAs($admin)->getJson("/my-course/{$this->course->id}/leaderboard")
            ->assertOk()
            ->assertJsonPath('rows.0.total_xp', 10);
    }
}
