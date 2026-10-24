<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Support\StudentProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizAttemptTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private Quiz $quiz;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->course = Course::factory()->create();
        $teacher = User::factory()->create(['role' => 'teacher']);
        $this->course->teachers()->attach($teacher);
        $module = CourseModule::create(['course_id' => $this->course->id, 'title' => 'Module 1', 'sort_order' => 0]);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
        $this->quiz = Quiz::create(['title' => 'Plates', 'course_id' => $this->course->id, 'session_id' => $session->id, 'teacher_id' => $teacher->id]);

        // Correct answers: question 1 → option 1, question 2 → option 0.
        foreach ([['Fastest wave?', ['S wave', 'P wave'], 1], ['Molten rock underground?', ['Magma', 'Lava'], 0]] as $q => [$text, $options, $correct]) {
            $question = Question::create(['quiz_id' => $this->quiz->id, 'question_text' => $text, 'order' => $q]);
            foreach ($options as $o => $option) {
                QuestionOption::create(['question_id' => $question->id, 'option_text' => $option, 'is_correct' => $o === $correct, 'order' => $o]);
            }
        }

        $this->student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $this->student->id, 'course_id' => $this->course->id, 'status' => 'active']);
    }

    private function url(): string
    {
        return route('curriculum.quiz-attempts.store', [$this->course->id, $this->quiz->id]);
    }

    public function test_the_server_grades_the_attempt(): void
    {
        $this->actingAs($this->student)
            ->postJson($this->url(), ['answers' => [1, 1], 'score' => 100, 'timeSpent' => 42])
            ->assertCreated()
            ->assertJsonPath('attempts', 1)
            ->assertJsonPath('best', 50)
            ->assertJsonPath('latest.score', 50)
            ->assertJsonPath('latest.correct', 1)
            ->assertJsonPath('latest.total', 2)
            ->assertJsonPath('latest.answers', [1, 1]);

        $attempt = QuizAttempt::first();
        $this->assertSame(42, $attempt->time_spent);
        $this->assertSame(2, $attempt->answers()->count());
    }

    public function test_retakes_are_numbered_and_the_best_score_is_kept(): void
    {
        $this->actingAs($this->student)->postJson($this->url(), ['answers' => [1, 0]])->assertCreated();
        $this->actingAs($this->student)
            ->postJson($this->url(), ['answers' => [0, null]])
            ->assertCreated()
            ->assertJsonPath('attempts', 2)
            ->assertJsonPath('best', 100)
            ->assertJsonPath('latest.score', 0)
            ->assertJsonPath('latest.attempt', 2)
            ->assertJsonPath('latest.answers', [0, null]);
    }

    public function test_the_saved_result_loads_on_any_device(): void
    {
        $this->actingAs($this->student)->getJson($this->url())->assertOk()->assertJsonPath('latest', null);
        $this->actingAs($this->student)->postJson($this->url(), ['answers' => [1, 0]]);

        $this->actingAs($this->student)->getJson($this->url())->assertOk()->assertJsonPath('latest.score', 100);
    }

    public function test_only_enrolled_students_can_take_it(): void
    {
        $outsider = User::factory()->create(['role' => 'student']);
        $this->actingAs($outsider)->postJson($this->url(), ['answers' => [1, 0]])->assertNotFound();

        $teacher = $this->course->teachers()->first();
        $this->actingAs($teacher)->postJson($this->url(), ['answers' => [1, 0]])->assertForbidden();

        $this->assertSame(0, QuizAttempt::count());
    }

    public function test_quizzes_do_not_change_xp_or_progress(): void
    {
        $this->actingAs($this->student)->postJson($this->url(), ['answers' => [1, 0]])->assertCreated();

        $this->assertSame(0, StudentProgress::storedXp([$this->student->id])[$this->student->id]);
        $this->assertSame(0, (int) Enrollment::first()->completed_lessons);
    }
}
