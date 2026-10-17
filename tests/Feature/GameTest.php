<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseGame;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\GameAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class GameTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Course, 1: CourseSession}
     */
    private function courseWithSession(): array
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = Course::create([
            'course_code' => 'GAME101',
            'title' => 'Game Course',
            'instructor_id' => $teacher->id,
            'status' => 'published',
        ]);
        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Module 1']);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Session 1']);

        return [$course, $session];
    }

    private function game(CourseSession $session, string $type = 'quiz_quest', int $lives = 3): CourseGame
    {
        return CourseGame::create([
            'session_id' => $session->id,
            'title' => 'Books Challenge',
            'game_type' => $type,
            'points' => 100,
            'lives' => $lives,
            'config' => ['items' => [
                ['prompt' => 'First book?', 'answer' => 'Genesis', 'distractors' => ['Exodus']],
                ['prompt' => 'Last book?', 'answer' => 'Revelation', 'distractors' => ['Jude']],
            ]],
            'sort_order' => 1,
        ]);
    }

    private function enrolledStudent(Course $course): User
    {
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'section_id' => null, 'status' => 'active']);

        return $student;
    }

    public function test_admin_can_create_a_game(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Bible Quiz',
                'gameType' => 'quiz_quest',
                'points' => 150,
                'lives' => 5,
                'items' => [
                    ['prompt' => 'Who built the ark?', 'answer' => 'Noah', 'distractors' => ['Moses', '']],
                ],
            ])
            ->assertCreated()
            ->assertJson(['title' => 'Bible Quiz', 'gameType' => 'quiz_quest', 'points' => 150, 'lives' => 5]);

        $this->assertDatabaseHas('course_games', [
            'session_id' => $session->id,
            'title' => 'Bible Quiz',
            'game_type' => 'quiz_quest',
            'points' => 150,
            'lives' => 5,
        ]);
    }

    public function test_admin_can_create_crossword_and_hangman(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        foreach (['crossword', 'hangman'] as $type) {
            $this->actingAs($admin)
                ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                    'title' => ucfirst($type).' Game',
                    'gameType' => $type,
                    'points' => 100,
                    'lives' => 3,
                    'items' => [
                        ['prompt' => 'Garden of...', 'answer' => 'Eden', 'distractors' => []],
                        ['prompt' => 'Swallowed by a fish', 'answer' => 'Jonah', 'distractors' => []],
                    ],
                ])
                ->assertCreated()
                ->assertJson(['gameType' => $type]);
        }
    }

    public function test_game_creation_validates_type_and_items(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson(route('curriculum.games.store', [$course->id, $session->id]), [
                'title' => 'Bad Game',
                'gameType' => 'space_invaders',
                'points' => 100,
                'lives' => 3,
                'items' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['gameType', 'items']);
    }

    public function test_admin_can_update_and_delete_a_game(): void
    {
        [$course, $session] = $this->courseWithSession();
        $admin = User::factory()->create(['role' => 'admin']);
        $game = $this->game($session);

        $this->actingAs($admin)
            ->putJson(route('curriculum.games.update', [$course->id, $game->id]), [
                'title' => 'Renamed Game',
                'gameType' => 'word_scramble',
                'points' => 200,
                'lives' => 1,
                'items' => [['prompt' => 'Garden', 'answer' => 'Eden', 'distractors' => []]],
            ])
            ->assertOk()
            ->assertJson(['title' => 'Renamed Game', 'gameType' => 'word_scramble', 'points' => 200, 'lives' => 1]);

        $this->actingAs($admin)
            ->deleteJson(route('curriculum.games.destroy', [$course->id, $game->id]))
            ->assertNoContent();

        $this->assertDatabaseMissing('course_games', ['id' => $game->id]);
    }

    public function test_enrolled_student_sees_the_play_page(): void
    {
        [$course, $session] = $this->courseWithSession();
        $student = $this->enrolledStudent($course);
        $game = $this->game($session);

        $this->actingAs($student)->get(route('games.play', $game->id))->assertOk();
    }

    public function test_unenrolled_student_cannot_play(): void
    {
        [, $session] = $this->courseWithSession();
        $outsider = User::factory()->create(['role' => 'student']);
        $game = $this->game($session);

        $this->actingAs($outsider)->get(route('games.play', $game->id))->assertNotFound();
    }

    public function test_student_attempt_is_graded_and_recorded(): void
    {
        [$course, $session] = $this->courseWithSession();
        $student = $this->enrolledStudent($course);
        $game = $this->game($session);

        $this->actingAs($student)
            ->postJson(route('games.attempts.store', $game->id), [
                'answers' => [0 => 'Genesis', 1 => 'wrong'],
                'timeSpent' => 42,
            ])
            ->assertCreated()
            ->assertJson(['score' => 50, 'maxScore' => 100, 'correctCount' => 1, 'totalCount' => 2])
            ->assertJsonPath('me.livesRemaining', 2)
            ->assertJsonPath('leaderboard.me.rank', 1);

        $this->assertDatabaseHas('game_attempts', [
            'game_id' => $game->id,
            'user_id' => $student->id,
            'score' => 50,
            'time_spent' => 42,
        ]);
    }

    public function test_student_runs_out_of_lives(): void
    {
        [$course, $session] = $this->courseWithSession();
        $student = $this->enrolledStudent($course);
        $game = $this->game($session, lives: 2);

        $payload = ['answers' => [0 => 'Genesis', 1 => 'Revelation'], 'timeSpent' => 10];

        $this->actingAs($student)->postJson(route('games.attempts.store', $game->id), $payload)->assertCreated();
        $this->actingAs($student)->postJson(route('games.attempts.store', $game->id), $payload)->assertCreated();

        $this->actingAs($student)
            ->postJson(route('games.attempts.store', $game->id), $payload)
            ->assertStatus(429)
            ->assertJsonPath('message', 'You are out of lives for this game. Come back later to play again.');

        $this->assertSame(2, GameAttempt::where('game_id', $game->id)->where('user_id', $student->id)->count());
    }

    public function test_zero_lives_means_unlimited(): void
    {
        [$course, $session] = $this->courseWithSession();
        $student = $this->enrolledStudent($course);
        $game = $this->game($session, lives: 0);

        $payload = ['answers' => [0 => 'Genesis', 1 => 'Revelation'], 'timeSpent' => 10];
        for ($i = 0; $i < 4; $i++) {
            $this->actingAs($student)->postJson(route('games.attempts.store', $game->id), $payload)->assertCreated();
        }

        $this->actingAs($student)->get(route('games.play', $game->id))->assertOk();
    }

    public function test_expired_attempts_do_not_count_against_lives(): void
    {
        [$course, $session] = $this->courseWithSession();
        $student = $this->enrolledStudent($course);
        $game = $this->game($session, lives: 1);

        // An attempt older than 24h should have regenerated the life.
        $old = GameAttempt::create([
            'game_id' => $game->id,
            'user_id' => $student->id,
            'score' => 100, 'max_score' => 100, 'correct_count' => 2, 'total_count' => 2,
            'time_spent' => 12, 'completed_at' => now()->subHours(30),
        ]);
        $old->forceFill(['created_at' => now()->subHours(30)])->save();

        $this->actingAs($student)
            ->postJson(route('games.attempts.store', $game->id), ['answers' => [0 => 'Genesis', 1 => 'Revelation'], 'timeSpent' => 8])
            ->assertCreated();
    }

    public function test_leaderboard_ranks_by_score_then_time(): void
    {
        [$course, $session] = $this->courseWithSession();
        $game = $this->game($session, lives: 0);

        $fast = $this->enrolledStudent($course);   // 100 pts in 10s -> rank 1
        $slow = $this->enrolledStudent($course);   // 100 pts in 30s -> rank 2 (me)
        $low = $this->enrolledStudent($course);     // 50 pts -> rank 3

        GameAttempt::create(['game_id' => $game->id, 'user_id' => $fast->id, 'score' => 100, 'max_score' => 100, 'correct_count' => 2, 'total_count' => 2, 'time_spent' => 10, 'completed_at' => now()]);
        GameAttempt::create(['game_id' => $game->id, 'user_id' => $low->id, 'score' => 50, 'max_score' => 100, 'correct_count' => 1, 'total_count' => 2, 'time_spent' => 5, 'completed_at' => now()]);

        $this->actingAs($slow)
            ->postJson(route('games.attempts.store', $game->id), ['answers' => [0 => 'Genesis', 1 => 'Revelation'], 'timeSpent' => 30])
            ->assertCreated()
            ->assertJsonPath('leaderboard.totalPlayers', 3)
            ->assertJsonPath('leaderboard.top.0.timeSpent', 10)
            ->assertJsonPath('leaderboard.top.1.timeSpent', 30)
            ->assertJsonPath('leaderboard.top.2.score', 50)
            ->assertJsonPath('leaderboard.me.rank', 2);
    }

    public function test_play_page_flags_preview_for_instructors_but_not_students(): void
    {
        [$course, $session] = $this->courseWithSession();
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course->teachers()->attach($teacher->id);
        $admin = User::factory()->create(['role' => 'admin']);
        $student = $this->enrolledStudent($course);
        $game = $this->game($session);

        $this->actingAs($teacher)->get(route('games.play', $game->id))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('isPreview', true));

        $this->actingAs($admin)->get(route('games.play', $game->id))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('isPreview', true));

        $this->actingAs($student)->get(route('games.play', $game->id))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('isPreview', false));
    }

    public function test_course_page_marks_games_the_student_has_completed(): void
    {
        [$course, $session] = $this->courseWithSession();
        $student = $this->enrolledStudent($course);
        $played = $this->game($session);
        $unplayed = $this->game($session);

        GameAttempt::create([
            'game_id' => $played->id,
            'user_id' => $student->id,
            'score' => 100, 'max_score' => 100, 'correct_count' => 2, 'total_count' => 2,
            'time_spent' => 12, 'completed_at' => now(),
        ]);

        $this->actingAs($student)
            ->get(route('my-course.show', $course->id))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('my-class/show')
                ->where('completedGameIds', [$played->id])
            );

        $this->assertNotContains($unplayed->id, [$played->id]);
    }

    public function test_instructor_attempts_are_recorded_but_excluded_from_the_leaderboard(): void
    {
        [$course, $session] = $this->courseWithSession();
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course->teachers()->attach($teacher->id);
        $game = $this->game($session);

        $this->actingAs($teacher)
            ->postJson(route('games.attempts.store', $game->id), ['answers' => [0 => 'Genesis', 1 => 'Revelation'], 'timeSpent' => 10])
            ->assertCreated()
            ->assertJsonPath('me.livesRemaining', 2)
            ->assertJsonPath('leaderboard.me', null)
            ->assertJsonPath('leaderboard.totalPlayers', 0);

        $this->assertDatabaseHas('game_attempts', ['game_id' => $game->id, 'user_id' => $teacher->id]);
    }

    public function test_leaderboard_lists_students_only(): void
    {
        [$course, $session] = $this->courseWithSession();
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course->teachers()->attach($teacher->id);
        $student = $this->enrolledStudent($course);
        $game = $this->game($session, lives: 0);

        GameAttempt::create(['game_id' => $game->id, 'user_id' => $teacher->id, 'score' => 100, 'max_score' => 100, 'correct_count' => 2, 'total_count' => 2, 'time_spent' => 5, 'completed_at' => now()]);

        $this->actingAs($student)
            ->postJson(route('games.attempts.store', $game->id), ['answers' => [0 => 'Genesis', 1 => 'Revelation'], 'timeSpent' => 20])
            ->assertCreated()
            ->assertJsonPath('leaderboard.totalPlayers', 1)
            ->assertJsonPath('leaderboard.top.0.userId', $student->id)
            ->assertJsonPath('leaderboard.me.rank', 1);
    }
}
