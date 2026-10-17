<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    private function courseWithTeacher(User $teacher): Course
    {
        $course = Course::factory()->create();
        $course->teachers()->attach($teacher->id);

        return $course;
    }

    private function enroll(User $student, Course $course, string $status = 'active'): void
    {
        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => $status,
        ]);
    }

    public function test_teacher_can_post_an_announcement_to_their_course(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);

        $this->actingAs($teacher)
            ->postJson(route('announcements.store', $course), ['body' => 'Welcome class!'])
            ->assertCreated()
            ->assertJsonPath('body', 'Welcome class!');

        $this->assertDatabaseHas('announcements', [
            'course_id' => $course->id,
            'user_id' => $teacher->id,
            'body' => 'Welcome class!',
        ]);
    }

    public function test_teacher_cannot_post_to_a_course_they_do_not_teach(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $otherCourse = Course::factory()->create();

        $this->actingAs($teacher)
            ->postJson(route('announcements.store', $otherCourse), ['body' => 'Hi'])
            ->assertForbidden();

        $this->assertDatabaseCount('announcements', 0);
    }

    public function test_student_cannot_post_an_announcement(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::factory()->create();
        $this->enroll($student, $course);

        $this->actingAs($student)
            ->postJson(route('announcements.store', $course), ['body' => 'Hi'])
            ->assertForbidden();
    }

    public function test_posting_an_announcement_notifies_enrolled_students(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $student = User::factory()->create(['role' => 'student']);
        $this->enroll($student, $course);

        $this->actingAs($teacher)
            ->postJson(route('announcements.store', $course), ['body' => 'Read this'])
            ->assertCreated();

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $student->id,
            'type' => 'announcement',
        ]);
    }

    public function test_enrolled_student_can_comment_on_an_announcement(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $student = User::factory()->create(['role' => 'student']);
        $this->enroll($student, $course);

        $announcement = Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
        ]);

        $this->actingAs($student)
            ->postJson(route('announcements.comment', $announcement), ['body' => 'Got it!'])
            ->assertCreated()
            ->assertJsonPath('comment.body', 'Got it!');

        $this->assertDatabaseHas('announcement_comments', [
            'announcement_id' => $announcement->id,
            'user_id' => $student->id,
            'body' => 'Got it!',
        ]);
    }

    public function test_non_enrolled_user_cannot_comment(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $outsider = User::factory()->create(['role' => 'student']);

        $announcement = Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
        ]);

        $this->actingAs($outsider)
            ->postJson(route('announcements.comment', $announcement), ['body' => 'Sneaky'])
            ->assertForbidden();

        $this->assertDatabaseCount('announcement_comments', 0);
    }

    public function test_index_returns_the_feed_for_an_enrolled_student(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $student = User::factory()->create(['role' => 'student']);
        $this->enroll($student, $course);

        Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
            'body' => 'Feed item',
        ]);

        $this->actingAs($student)
            ->getJson(route('announcements.index', $course))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.body', 'Feed item');
    }

    public function test_index_is_forbidden_for_non_participants(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $outsider = User::factory()->create(['role' => 'student']);

        $this->actingAs($outsider)
            ->getJson(route('announcements.index', $course))
            ->assertForbidden();
    }

    public function test_author_can_delete_their_announcement(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $announcement = Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
        ]);

        $this->actingAs($teacher)
            ->deleteJson(route('announcements.destroy', $announcement))
            ->assertOk();

        $this->assertDatabaseMissing('announcements', ['id' => $announcement->id]);
    }

    public function test_student_can_delete_their_own_comment(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $student = User::factory()->create(['role' => 'student']);
        $this->enroll($student, $course);

        $announcement = Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
        ]);
        $comment = AnnouncementComment::factory()->create([
            'announcement_id' => $announcement->id,
            'user_id' => $student->id,
        ]);

        $this->actingAs($student)
            ->deleteJson(route('announcements.comment.destroy', $comment))
            ->assertOk();

        $this->assertDatabaseMissing('announcement_comments', ['id' => $comment->id]);
    }

    public function test_student_cannot_delete_another_users_comment(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $student = User::factory()->create(['role' => 'student']);
        $other = User::factory()->create(['role' => 'student']);
        $this->enroll($student, $course);
        $this->enroll($other, $course);

        $announcement = Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
        ]);
        $comment = AnnouncementComment::factory()->create([
            'announcement_id' => $announcement->id,
            'user_id' => $other->id,
        ]);

        $this->actingAs($student)
            ->deleteJson(route('announcements.comment.destroy', $comment))
            ->assertForbidden();

        $this->assertDatabaseHas('announcement_comments', ['id' => $comment->id]);
    }

    public function test_my_course_show_passes_announcements_to_the_student(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $course = $this->courseWithTeacher($teacher);
        $student = User::factory()->create(['role' => 'student']);
        $this->enroll($student, $course);

        $announcement = Announcement::factory()->create([
            'course_id' => $course->id,
            'user_id' => $teacher->id,
            'body' => 'Visible to students',
        ]);
        AnnouncementComment::factory()->create([
            'announcement_id' => $announcement->id,
            'user_id' => $student->id,
            'body' => 'A reply',
        ]);

        $this->actingAs($student)
            ->get(route('my-course.show', $course->id))
            ->assertInertia(fn ($page) => $page
                ->component('my-class/show')
                ->has('announcements', 1)
                ->where('announcements.0.body', 'Visible to students')
                ->where('announcements.0.comments.0.body', 'A reply')
            );
    }
}
