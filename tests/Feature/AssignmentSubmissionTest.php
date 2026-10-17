<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AssignmentSubmissionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Create an enrolled student with an assignment they can submit to.
     *
     * @return array{0: User, 1: Course, 2: Assignment}
     */
    private function enrolledStudentWithAssignment(): array
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'course_code' => 'SUB101',
            'title' => 'Submission Course',
            'instructor_id' => $teacher->id,
            'status' => 'published',
        ]);

        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'Module 1']);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Session 1']);

        $assignment = Assignment::create([
            'title' => 'Essay',
            'description' => 'Write an essay.',
            'course_id' => $course->id,
            'session_id' => $session->id,
            'teacher_id' => $teacher->id,
            'assignment_type' => 'submission',
            'points' => 100,
            'status' => 'published',
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'section_id' => null,
            'status' => 'active',
        ]);

        return [$student, $course, $assignment];
    }

    public function test_student_can_submit_a_text_answer(): void
    {
        [$student, $course, $assignment] = $this->enrolledStudentWithAssignment();

        $this->actingAs($student)
            ->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
                'type' => 'text',
                'textContent' => '<p>My <strong>essay</strong> answer.</p>',
            ])
            ->assertOk()
            ->assertJson([
                'submissionType' => 'text',
                'textContent' => '<p>My <strong>essay</strong> answer.</p>',
                'status' => 'submitted',
            ]);

        $this->assertDatabaseHas('submissions', [
            'user_id' => $student->id,
            'assignment_id' => $assignment->id,
            'submission_type' => 'text',
            'is_submitted' => true,
            'file_path' => null,
            'video_url' => null,
        ]);
    }

    public function test_student_can_submit_a_video_link(): void
    {
        [$student, $course, $assignment] = $this->enrolledStudentWithAssignment();

        $this->actingAs($student)
            ->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
                'type' => 'video',
                'videoUrl' => 'https://youtu.be/dQw4w9WgXcQ',
            ])
            ->assertOk()
            ->assertJson([
                'submissionType' => 'video',
                'videoUrl' => 'https://youtu.be/dQw4w9WgXcQ',
                'status' => 'submitted',
            ]);

        $this->assertDatabaseHas('submissions', [
            'user_id' => $student->id,
            'assignment_id' => $assignment->id,
            'submission_type' => 'video',
            'video_url' => 'https://youtu.be/dQw4w9WgXcQ',
            'text_content' => null,
        ]);
    }

    public function test_student_can_submit_a_file(): void
    {
        Storage::fake('public');
        [$student, $course, $assignment] = $this->enrolledStudentWithAssignment();

        $this->actingAs($student)
            ->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
                'type' => 'file',
                'file' => UploadedFile::fake()->image('answer.jpg'),
            ])
            ->assertOk()
            ->assertJson(['submissionType' => 'file', 'status' => 'submitted']);

        $this->assertDatabaseHas('submissions', [
            'user_id' => $student->id,
            'assignment_id' => $assignment->id,
            'submission_type' => 'file',
            'file_name' => 'answer.jpg',
        ]);
    }

    public function test_text_submission_requires_content(): void
    {
        [$student, $course, $assignment] = $this->enrolledStudentWithAssignment();

        $this->actingAs($student)
            ->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
                'type' => 'text',
                'textContent' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('textContent');
    }

    public function test_video_submission_requires_a_valid_url(): void
    {
        [$student, $course, $assignment] = $this->enrolledStudentWithAssignment();

        $this->actingAs($student)
            ->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
                'type' => 'video',
                'videoUrl' => 'not-a-url',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('videoUrl');
    }

    public function test_resubmitting_replaces_the_previous_submission(): void
    {
        [$student, $course, $assignment] = $this->enrolledStudentWithAssignment();

        $this->actingAs($student)->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
            'type' => 'text',
            'textContent' => '<p>First.</p>',
        ])->assertOk();

        $this->actingAs($student)->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
            'type' => 'video',
            'videoUrl' => 'https://vimeo.com/12345',
        ])->assertOk();

        $this->assertSame(1, Submission::where('user_id', $student->id)
            ->where('assignment_id', $assignment->id)
            ->count());

        $this->assertDatabaseHas('submissions', [
            'user_id' => $student->id,
            'assignment_id' => $assignment->id,
            'submission_type' => 'video',
            'text_content' => null,
        ]);
    }

    public function test_unenrolled_student_cannot_submit(): void
    {
        [, $course, $assignment] = $this->enrolledStudentWithAssignment();
        $outsider = User::factory()->create(['role' => 'student']);

        $this->actingAs($outsider)
            ->postJson(route('curriculum.submissions.store', [$course->id, $assignment->id]), [
                'type' => 'text',
                'textContent' => '<p>Sneaky.</p>',
            ])
            ->assertNotFound();
    }
}
