<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Submission;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubmissionGradeTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private User $teacher;

    private User $student;

    private Assignment $assignment;

    private Submission $submission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->course = Course::factory()->create();
        $this->teacher = User::factory()->create(['role' => 'teacher']);
        $this->course->teachers()->attach($this->teacher);
        $module = CourseModule::create(['course_id' => $this->course->id, 'title' => 'Module 1', 'sort_order' => 0]);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
        $this->assignment = Assignment::create([
            'title' => 'Fault report',
            'course_id' => $this->course->id,
            'session_id' => $session->id,
            'teacher_id' => $this->teacher->id,
            'points' => 20,
            'due_date' => now()->addWeek(),
        ]);

        $this->student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $this->student->id, 'course_id' => $this->course->id, 'status' => 'active']);
        $this->submission = Submission::create([
            'user_id' => $this->student->id,
            'assignment_id' => $this->assignment->id,
            'submission_type' => 'text',
            'text_content' => 'Faults are cracks where rocks move.',
            'status' => 'submitted',
            'is_submitted' => true,
            'submission_date' => now(),
        ]);
    }

    private function grade(User $as, array $data)
    {
        return $this->actingAs($as)->putJson(route('assignments.grade', $this->submission), $data);
    }

    public function test_a_teacher_grades_a_submission_and_the_student_is_told(): void
    {
        $this->grade($this->teacher, ['points' => 18, 'feedback' => 'Clear and correct.'])
            ->assertOk()
            ->assertJsonPath('percent', 90)
            ->assertJsonPath('feedback', 'Clear and correct.');

        $grade = Grade::sole();
        $this->assertSame($this->teacher->id, $grade->graded_by);
        $this->assertSame('graded', $this->submission->refresh()->status);

        $note = UserNotification::where('user_id', $this->student->id)->sole();
        $this->assertSame('assignment_graded', $note->type);
        $this->assertSame('Your assignment was graded: 18/20', $note->title);
    }

    public function test_grading_again_updates_the_same_grade(): void
    {
        $this->grade($this->teacher, ['points' => 10])->assertOk();
        $this->grade($this->teacher, ['points' => 15, 'feedback' => 'Better after review.'])->assertOk();

        $this->assertSame(1, Grade::count());
        $this->assertSame(15.0, Grade::first()->points_earned);
    }

    public function test_scores_above_the_maximum_are_rejected(): void
    {
        $this->grade($this->teacher, ['points' => 21])->assertUnprocessable()->assertJsonValidationErrors('points');
        $this->grade($this->teacher, ['points' => -1])->assertUnprocessable();

        $this->assertSame(0, Grade::count());
    }

    public function test_other_teachers_and_students_cannot_grade(): void
    {
        $this->grade(User::factory()->create(['role' => 'teacher']), ['points' => 20])->assertForbidden();
        $this->grade($this->student, ['points' => 20])->assertForbidden();

        $this->assertSame(0, Grade::count());
    }

    public function test_the_student_sees_the_grade_with_their_submission(): void
    {
        $this->grade($this->teacher, ['points' => 18, 'feedback' => 'Clear and correct.']);

        $this->actingAs($this->student)
            ->getJson(route('curriculum.submissions.mine', [$this->course->id, $this->assignment->id]))
            ->assertOk()
            ->assertJsonPath('status', 'graded')
            ->assertJsonPath('grade.points', 18)
            ->assertJsonPath('grade.feedback', 'Clear and correct.');
    }

    public function test_the_assignments_page_shows_each_role_their_own_view(): void
    {
        $this->grade($this->teacher, ['points' => 18]);
        $other = Course::factory()->create(['title' => 'Someone else']);
        Assignment::create(['title' => 'Hidden', 'course_id' => $other->id, 'teacher_id' => User::factory()->create(['role' => 'teacher'])->id, 'points' => 10]);

        $this->actingAs($this->teacher)->get(route('assignments.index'))
            ->assertInertia(fn ($page) => $page
                ->component('assignments/index')
                ->where('view', 'teacher')
                ->has('assignments', 1)
                ->where('assignments.0.title', 'Fault report')
                ->where('assignments.0.submissions.0.grade.points', 18)
                ->where('summary.graded', 1)
                ->where('summary.toGrade', 0));

        $this->actingAs($this->student)->get(route('assignments.index'))
            ->assertInertia(fn ($page) => $page
                ->where('view', 'student')
                ->has('assignments', 1)
                ->where('assignments.0.status', 'graded')
                ->where('assignments.0.grade.percent', 90));
    }
}
