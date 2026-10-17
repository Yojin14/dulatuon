<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseGame;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\SimulationGames;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SimulationGamesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{0: string, 1: int}>
     */
    public static function simulations(): array
    {
        return [
            'fault lab' => ['fault_lab', 13],
            'shake town' => ['shake_town', 10],
            'wave tank' => ['wave_tank', 8],
            'quake tracker' => ['quake_tracker', 9],
            'ground test' => ['ground_test', 8],
            'quake ready' => ['quake_ready', 12],
        ];
    }

    /**
     * @return array{0: Course, 1: CourseSession}
     */
    private function courseWithSession(): array
    {
        $course = Course::factory()->create();
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Understanding Earthquakes']);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Session 1']);

        return [$course, $session];
    }

    public function test_every_simulation_is_covered_by_these_tests(): void
    {
        $this->assertEqualsCanonicalizing(SimulationGames::types(), array_column(self::simulations(), 0));
    }

    #[DataProvider('simulations')]
    public function test_checkpoints_are_complete(string $type, int $count): void
    {
        $items = SimulationGames::items($type);

        $this->assertCount($count, $items);
        foreach ($items as $item) {
            $this->assertNotSame('', $item['prompt']);
            $this->assertNotSame('', $item['answer']);
            $this->assertNotEmpty($item['distractors']);
            $this->assertNotContains($item['answer'], $item['distractors']);
        }
    }

    #[DataProvider('simulations')]
    public function test_admin_can_add_it_and_a_student_can_play_and_score(string $type, int $count): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Simulation',
                'gameType' => $type,
                'points' => 100,
                'lives' => 0,
                'items' => [],
            ])
            ->assertCreated()
            ->assertJson(['gameType' => $type]);

        $game = CourseGame::where('game_type', $type)->firstOrFail();

        $this->actingAs($student)
            ->get(route('games.play', $game->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('game.gameType', $type)
                ->has('game.items', $count)
            );

        $this->actingAs($student)
            ->postJson(route('games.attempts.store', $game->id), [
                'answers' => array_column(SimulationGames::items($type), 'answer'),
                'timeSpent' => 200,
            ])
            ->assertCreated()
            ->assertJson(['score' => 100, 'correctCount' => $count, 'totalCount' => $count]);
    }
}
