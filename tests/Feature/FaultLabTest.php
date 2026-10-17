<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseGame;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\User;
use App\Support\FaultLab;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class FaultLabTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Course, 1: CourseSession}
     */
    private function courseWithSession(): array
    {
        $course = Course::factory()->create();
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Understanding Earthquakes']);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'How Earthquakes Begin']);

        return [$course, $session];
    }

    private function faultLab(CourseSession $session): CourseGame
    {
        return CourseGame::create([
            'session_id' => $session->id,
            'title' => 'Break the Fault',
            'game_type' => FaultLab::GAME_TYPE,
            'points' => 130,
            'lives' => 0,
            'config' => ['items' => FaultLab::items()],
            'sort_order' => 1,
        ]);
    }

    private function enrolledStudent(Course $course): User
    {
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);

        return $student;
    }

    public function test_every_checkpoint_has_an_answer_and_wrong_options(): void
    {
        $items = FaultLab::items();

        $this->assertCount(13, $items);
        foreach ($items as $item) {
            $this->assertNotSame('', $item['prompt']);
            $this->assertNotSame('', $item['answer']);
            $this->assertCount(2, $item['distractors']);
            $this->assertNotContains($item['answer'], $item['distractors']);
        }
    }

    public function test_admin_can_add_fault_lab_without_typing_any_questions(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Break the Fault',
                'gameType' => 'fault_lab',
                'points' => 100,
                'lives' => 0,
                'items' => [],
            ])
            ->assertCreated()
            ->assertJson(['title' => 'Break the Fault', 'gameType' => 'fault_lab']);

        $game = CourseGame::where('game_type', 'fault_lab')->firstOrFail();
        $this->assertSame(FaultLab::items(), $game->config['items']);
    }

    public function test_teacher_supplied_items_are_ignored_for_fault_lab(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Break the Fault',
                'gameType' => 'fault_lab',
                'points' => 100,
                'lives' => 0,
                'items' => [['prompt' => 'Made up?', 'answer' => 'Yes']],
            ])
            ->assertCreated();

        $this->assertSame(FaultLab::items(), CourseGame::firstOrFail()->config['items']);
    }

    public function test_other_game_types_still_require_items(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Empty Quiz',
                'gameType' => 'quiz_quest',
                'points' => 100,
                'lives' => 0,
                'items' => [],
            ])
            ->assertJsonValidationErrors('items');
    }

    public function test_enrolled_student_sees_the_fault_lab_play_page(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->faultLab($session);

        $this->actingAs($this->enrolledStudent($course))
            ->get(route('games.play', $game->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('games/play')
                ->where('game.gameType', 'fault_lab')
                ->has('game.items', 13)
            );
    }

    public function test_a_perfect_run_earns_full_points(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->faultLab($session);
        $answers = array_column(FaultLab::items(), 'answer');

        $this->actingAs($this->enrolledStudent($course))
            ->postJson(route('games.attempts.store', $game->id), ['answers' => $answers, 'timeSpent' => 240])
            ->assertCreated()
            ->assertJson(['score' => 130, 'correctCount' => 13, 'totalCount' => 13]);
    }

    public function test_wrong_first_answers_lower_the_score(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->faultLab($session);
        $answers = array_column(FaultLab::items(), 'answer');
        $answers[0] = 'Shear';
        $answers[8] = 'C';

        $this->actingAs($this->enrolledStudent($course))
            ->postJson(route('games.attempts.store', $game->id), ['answers' => $answers, 'timeSpent' => 300])
            ->assertCreated()
            ->assertJson(['score' => 110, 'correctCount' => 11, 'totalCount' => 13]);
    }
}
