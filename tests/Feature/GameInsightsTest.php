<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseGame;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\GameAttempt;
use App\Models\User;
use App\Support\SimulationGames;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameInsightsTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private User $teacher;

    private CourseGame $game;

    /** @var array<string, User> */
    private array $students = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->course = Course::factory()->create();
        $this->teacher = User::factory()->create(['role' => 'teacher']);
        $this->course->teachers()->attach($this->teacher);
        $module = CourseModule::create(['course_id' => $this->course->id, 'title' => 'Module 1', 'sort_order' => 0]);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
        $this->game = CourseGame::create([
            'session_id' => $session->id,
            'title' => 'Plates quiz',
            'game_type' => 'quiz_quest',
            'points' => 100,
            'config' => ['items' => [
                ['prompt' => 'Fastest wave?', 'answer' => 'P wave', 'distractors' => ['S wave']],
                ['prompt' => 'Molten rock underground?', 'answer' => 'Magma', 'distractors' => ['Lava']],
            ]],
        ]);
    }

    private function play(string $name, array $answers, int $timeSpent = 60): User
    {
        $student = $this->students[$name] ??= User::factory()->create(['role' => 'student', 'name' => $name]);
        Enrollment::firstOrCreate(['user_id' => $student->id, 'course_id' => $this->course->id], ['status' => 'active']);

        $correct = 0;
        foreach ($this->game->checkpointItems() as $i => $item) {
            $correct += CourseGame::answerMatches($answers[$i] ?? '', $item['answer']) ? 1 : 0;
        }
        GameAttempt::create([
            'game_id' => $this->game->id,
            'user_id' => $student->id,
            'score' => $correct * 50,
            'max_score' => 100,
            'correct_count' => $correct,
            'total_count' => 2,
            'time_spent' => $timeSpent,
            'detail' => ['answers' => $answers],
            'completed_at' => now(),
        ]);

        return $student;
    }

    private function insights(?User $as = null)
    {
        return $this->actingAs($as ?? $this->teacher)
            ->getJson(route('my-course.game-insights', [$this->course->id, $this->game->id]));
    }

    public function test_teachers_see_per_checkpoint_results(): void
    {
        $this->play('Ana', ['P wave', 'Lava'], 40);
        $this->play('Ben', ['S wave', 'Lava'], 60);
        $this->play('Cara', ['P wave', 'Magma'], 80);

        $this->insights()
            ->assertOk()
            ->assertJsonPath('players', 3)
            ->assertJsonPath('average_score', 50)
            ->assertJsonPath('cleared', 1)
            ->assertJsonPath('median_time', 60)
            ->assertJsonPath('checkpoints.0.prompt', 'Fastest wave?')
            ->assertJsonPath('checkpoints.0.correct_percent', 67)
            ->assertJsonPath('checkpoints.0.common_wrong.answer', 'S wave')
            ->assertJsonPath('checkpoints.1.correct_percent', 33)
            ->assertJsonPath('checkpoints.1.common_wrong', ['answer' => 'Lava', 'count' => 2]);
    }

    public function test_each_students_best_attempt_counts(): void
    {
        $this->play('Ana', ['S wave', 'Lava']);
        $this->play('Ana', ['P wave', 'Magma']);

        $this->insights()
            ->assertOk()
            ->assertJsonPath('players', 1)
            ->assertJsonPath('attempts', 2)
            ->assertJsonPath('average_attempts', 2)
            ->assertJsonPath('average_score', 100)
            ->assertJsonPath('checkpoints.0.correct_percent', 100)
            ->assertJsonPath('checkpoints.0.common_wrong', null);
    }

    public function test_no_attempts_gives_an_empty_report(): void
    {
        $this->insights()
            ->assertOk()
            ->assertJsonPath('players', 0)
            ->assertJsonPath('median_time', null)
            ->assertJsonPath('checkpoints.0.answered', 0)
            ->assertJsonCount(2, 'checkpoints');
    }

    public function test_students_and_other_teachers_are_refused(): void
    {
        $student = $this->play('Ana', ['P wave', 'Magma']);
        $this->insights($student)->assertForbidden();

        $outsider = User::factory()->create(['role' => 'teacher']);
        $this->insights($outsider)->assertForbidden();
    }

    public function test_simulation_labs_use_their_built_in_checkpoints(): void
    {
        $this->game->update(['game_type' => 'shake_town', 'config' => null]);

        $this->insights()
            ->assertOk()
            ->assertJsonCount(count(SimulationGames::items('shake_town')), 'checkpoints');
    }
}
