<?php

namespace Tests\Feature;

use App\Http\Controllers\CourseLeaderboardController;
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
use Tests\TestCase;

class CourseLeaderboardTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private User $teacher;

    /** @var array<int, CourseContentItem> */
    private array $contents;

    private CourseGame $game;

    protected function setUp(): void
    {
        parent::setUp();

        $this->course = Course::factory()->create();
        $this->teacher = User::factory()->create(['role' => 'teacher']);
        $this->course->teachers()->attach($this->teacher);

        $module = CourseModule::create(['course_id' => $this->course->id, 'title' => 'Module 1', 'sort_order' => 0]);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
        $this->contents = [
            CourseContentItem::create(['session_id' => $session->id, 'type' => 'youtube', 'title' => 'A', 'url' => 'https://youtu.be/a']),
            CourseContentItem::create(['session_id' => $session->id, 'type' => 'youtube', 'title' => 'B', 'url' => 'https://youtu.be/b']),
        ];
        $this->game = CourseGame::create(['session_id' => $session->id, 'title' => 'Fault Lab', 'game_type' => 'fault_lab', 'points' => 100]);
    }

    private function student(string $name): User
    {
        $student = User::factory()->create(['role' => 'student', 'name' => $name]);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $this->course->id, 'status' => 'active']);

        return $student;
    }

    private function finish(User $student, int $contents, ?int $correctOfFive = null): void
    {
        foreach (array_slice($this->contents, 0, $contents) as $content) {
            StudentContentProgress::create(['user_id' => $student->id, 'course_id' => $this->course->id, 'content_id' => $content->id, 'completed_at' => now()]);
        }
        if ($correctOfFive !== null) {
            GameAttempt::create([
                'game_id' => $this->game->id,
                'user_id' => $student->id,
                'score' => $correctOfFive * 20,
                'max_score' => 100,
                'correct_count' => $correctOfFive,
                'total_count' => 5,
                'completed_at' => now(),
            ]);
        }
    }

    public function test_teacher_sees_the_class_ranked_by_xp_with_activity_and_nudges(): void
    {
        $ana = $this->student('Ana');
        $ben = $this->student('Ben');
        $this->student('Cara');
        $this->finish($ana, 2, 5);
        $this->finish($ben, 1);
        $ana->update(['avatar' => '/avatars/pixel/girl-02.svg']);

        $this->actingAs($this->teacher)->getJson("/my-course/{$this->course->id}/leaderboard")
            ->assertOk()
            ->assertJsonPath('viewer', 'teacher')
            ->assertJsonPath('class_size', 3)
            ->assertJsonPath('rows.0.name', 'Ana')
            ->assertJsonPath('rows.0.avatar', '/avatars/pixel/girl-02.svg')
            ->assertJsonPath('rows.1.avatar', null)
            ->assertJsonPath('rows.0.rank', 1)
            ->assertJsonPath('rows.0.xp', 130)
            ->assertJsonPath('rows.0.complete', true)
            ->assertJsonPath('rows.0.labs_cleared', 1)
            ->assertJsonPath('rows.0.game_points', 100)
            ->assertJsonPath('rows.1.name', 'Ben')
            ->assertJsonPath('rows.1.xp', 10)
            ->assertJsonPath('rows.2.name', 'Cara')
            ->assertJsonPath('rows.2.last_active', null)
            ->assertJsonCount(1, 'nudges')
            ->assertJsonPath('nudges.0.name', 'Cara')
            ->assertJsonPath('nudges.0.reason', 'Has not started yet');
    }

    public function test_a_failed_game_run_adds_game_points_but_does_not_clear_the_lab(): void
    {
        $student = $this->student('Dan');
        $this->finish($student, 0, 2);

        $this->actingAs($this->teacher)->getJson("/my-course/{$this->course->id}/leaderboard")
            ->assertJsonPath('rows.0.labs_cleared', 0)
            ->assertJsonPath('rows.0.game_points', 40)
            ->assertJsonPath('rows.0.xp', 0);
    }

    public function test_students_see_the_top_of_the_class_and_their_own_place_without_activity_details(): void
    {
        $me = $this->student('Zed');
        foreach (range(1, 11) as $i) {
            $this->finish($this->student("Student {$i}"), 2);
        }

        $response = $this->actingAs($me)->getJson("/my-course/{$this->course->id}/leaderboard")
            ->assertOk()
            ->assertJsonPath('viewer', 'student')
            ->assertJsonPath('class_size', 12)
            ->assertJsonCount(CourseLeaderboardController::STUDENT_VIEW_LIMIT, 'rows')
            ->assertJsonPath('me.name', 'Zed')
            ->assertJsonPath('me.rank', 12)
            ->assertJsonPath('me.is_me', true)
            ->assertJsonMissingPath('nudges');

        $this->assertArrayNotHasKey('last_active', $response->json('rows.0'));
    }

    public function test_tied_students_share_a_rank(): void
    {
        $this->finish($this->student('Eve'), 1);
        $this->finish($this->student('Fay'), 1);

        $this->actingAs($this->teacher)->getJson("/my-course/{$this->course->id}/leaderboard")
            ->assertJsonPath('rows.0.rank', 1)
            ->assertJsonPath('rows.1.rank', 1);
    }

    public function test_outsiders_cannot_see_the_leaderboard(): void
    {
        $otherTeacher = User::factory()->create(['role' => 'teacher']);
        $stranger = User::factory()->create(['role' => 'student']);

        $this->actingAs($otherTeacher)->getJson("/my-course/{$this->course->id}/leaderboard")->assertNotFound();
        $this->actingAs($stranger)->getJson("/my-course/{$this->course->id}/leaderboard")->assertNotFound();
    }
}
