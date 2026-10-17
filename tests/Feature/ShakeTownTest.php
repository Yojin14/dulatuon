<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseGame;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\ShakeTown;
use App\Support\SimulationGames;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ShakeTownTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Course, 1: CourseSession}
     */
    private function courseWithSession(): array
    {
        $course = Course::factory()->create();
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Understanding Earthquakes']);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Earthquake Strength and Effects']);

        return [$course, $session];
    }

    private function shakeTown(CourseSession $session): CourseGame
    {
        return CourseGame::create([
            'session_id' => $session->id,
            'title' => 'Shake Town',
            'game_type' => ShakeTown::GAME_TYPE,
            'points' => 100,
            'lives' => 0,
            'config' => ['items' => ShakeTown::items()],
            'sort_order' => 1,
        ]);
    }

    private function enrolledStudent(Course $course): User
    {
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);

        return $student;
    }

    public function test_every_simulation_has_complete_checkpoints(): void
    {
        foreach (SimulationGames::types() as $type) {
            $this->assertTrue(SimulationGames::isSimulation($type));

            foreach (SimulationGames::items($type) as $item) {
                $this->assertNotSame('', $item['prompt']);
                $this->assertNotSame('', $item['answer']);
                $this->assertNotEmpty($item['distractors']);
                $this->assertNotContains($item['answer'], $item['distractors']);
            }
        }

        $this->assertCount(10, ShakeTown::items());
        $this->assertFalse(SimulationGames::isSimulation('quiz_quest'));
        $this->assertFalse(SimulationGames::isSimulation(null));
    }

    public function test_admin_can_add_shake_town_without_typing_any_questions(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Shake Town',
                'gameType' => 'shake_town',
                'points' => 100,
                'lives' => 0,
                'items' => [],
            ])
            ->assertCreated()
            ->assertJson(['title' => 'Shake Town', 'gameType' => 'shake_town']);

        $this->assertSame(ShakeTown::items(), CourseGame::firstOrFail()->config['items']);
    }

    public function test_unknown_game_types_are_rejected(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Mystery',
                'gameType' => 'not_a_game',
                'points' => 100,
                'lives' => 0,
            ])
            ->assertJsonValidationErrors('gameType');
    }

    public function test_enrolled_student_sees_the_shake_town_play_page(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->shakeTown($session);

        $this->actingAs($this->enrolledStudent($course))
            ->get(route('games.play', $game->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('games/play')
                ->where('game.gameType', 'shake_town')
                ->has('game.items', 10)
            );
    }

    public function test_a_perfect_run_earns_full_points(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->shakeTown($session);

        $this->actingAs($this->enrolledStudent($course))
            ->postJson(route('games.attempts.store', $game->id), [
                'answers' => array_column(ShakeTown::items(), 'answer'),
                'timeSpent' => 300,
            ])
            ->assertCreated()
            ->assertJson(['score' => 100, 'correctCount' => 10, 'totalCount' => 10]);
    }

    public function test_a_game_added_earlier_uses_the_current_checkpoints(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->shakeTown($session);
        $game->update(['config' => ['items' => [['prompt' => 'Old wording?', 'answer' => 'Old answer', 'distractors' => ['Other']]]]]);
        $student = $this->enrolledStudent($course);

        $this->actingAs($student)
            ->get(route('games.play', $game->id))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('game.items', 10)
                ->where('game.items.0.prompt', ShakeTown::items()[0]['prompt'])
            );

        $this->actingAs($student)
            ->postJson(route('games.attempts.store', $game->id), [
                'answers' => array_column(ShakeTown::items(), 'answer'),
                'timeSpent' => 300,
            ])
            ->assertCreated()
            ->assertJson(['score' => 100, 'correctCount' => 10, 'totalCount' => 10]);
    }

    public function test_an_unsolved_challenge_scores_no_points_for_that_checkpoint(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->shakeTown($session);
        $answers = array_column(ShakeTown::items(), 'answer');
        $answers[9] = 'Not solved';

        $this->actingAs($this->enrolledStudent($course))
            ->postJson(route('games.attempts.store', $game->id), ['answers' => $answers, 'timeSpent' => 300])
            ->assertCreated()
            ->assertJson(['score' => 90, 'correctCount' => 9, 'totalCount' => 10]);
    }
}
