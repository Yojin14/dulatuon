<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\StudentContentProgress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('dashboard'))->assertOk();
    }

    public function test_admin_dashboard_returns_real_aggregated_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'approved']);
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'approved']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'approved']);

        $course = Course::create([
            'course_code' => 'ADM101',
            'title' => 'Admin Course',
            'instructor_id' => $teacher->id,
            'status' => 'published',
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'active',
            'progress_percentage' => 50,
        ]);

        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard')
                ->where('stats.totalUsers', 3)
                ->where('stats.totalStudents', 1)
                ->where('stats.totalTeachers', 1)
                ->where('stats.activeCourses', 1)
                ->where('stats.totalEnrollments', 1)
                ->has('enrollmentTrend', 14)
                ->has('usersByRole')
            );
    }

    public function test_teacher_dashboard_only_includes_assigned_courses(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'approved']);
        $other = User::factory()->create(['role' => 'teacher', 'status' => 'approved']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'approved']);

        $mine = Course::create(['course_code' => 'T1', 'title' => 'Mine', 'status' => 'published']);
        $theirs = Course::create(['course_code' => 'T2', 'title' => 'Theirs', 'status' => 'published']);
        $mine->teachers()->attach($teacher->id);
        $theirs->teachers()->attach($other->id);

        Enrollment::create(['user_id' => $student->id, 'course_id' => $mine->id, 'status' => 'active', 'progress_percentage' => 80]);

        $this->actingAs($teacher)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard')
                ->where('stats.classCount', 1)
                ->where('stats.totalStudents', 1)
                ->where('stats.avgProgress', 80)
                ->has('classes', 1, fn (AssertableInertia $c) => $c
                    ->where('title', 'Mine')
                    ->where('students', 1)
                    ->etc()
                )
            );
    }

    public function test_student_dashboard_computes_progress_and_due_work(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'approved']);
        $student = User::factory()->create(['role' => 'student', 'status' => 'approved']);

        $course = Course::create(['course_code' => 'S1', 'title' => 'Stu Course', 'status' => 'published']);
        $course->teachers()->attach($teacher->id);

        $module = CourseModule::create(['course_id' => $course->id, 'title' => 'M1']);
        $session = CourseSession::create(['module_id' => $module->id, 'title' => 'Sess']);

        $contentA = CourseContentItem::create(['session_id' => $session->id, 'title' => 'A', 'type' => 'pdf']);
        CourseContentItem::create(['session_id' => $session->id, 'title' => 'B', 'type' => 'pdf']);

        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);

        StudentContentProgress::create([
            'user_id' => $student->id,
            'content_id' => $contentA->id,
            'course_id' => $course->id,
            'completed_at' => now(),
        ]);

        Assignment::create([
            'title' => 'Upcoming Essay',
            'course_id' => $course->id,
            'session_id' => $session->id,
            'teacher_id' => $teacher->id,
            'assignment_type' => 'submission',
            'points' => 100,
            'due_date' => now()->addDays(2),
            'status' => 'published',
        ]);

        $this->actingAs($student)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard')
                ->where('stats.enrolledCount', 1)
                ->where('stats.avgProgress', 50)
                ->where('stats.pendingWork', 1)
                ->has('courses', 1)
                ->has('dueSoon', 1, fn (AssertableInertia $d) => $d
                    ->where('title', 'Upcoming Essay')
                    ->where('urgent', true)
                    ->etc()
                )
            );
    }
}
