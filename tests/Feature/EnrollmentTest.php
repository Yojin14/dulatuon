<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class EnrollmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_is_enrolled_immediately_without_approval(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::factory()->create();

        $this->actingAs($student)
            ->post(route('enrollments.store', $course))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'active',
        ]);

        $this->actingAs($student)
            ->get(route('my-course.show', $course->id))
            ->assertOk();
    }

    public function test_student_cannot_enroll_twice(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::factory()->create();

        $this->actingAs($student)->post(route('enrollments.store', $course));

        $this->actingAs($student)
            ->post(route('enrollments.store', $course))
            ->assertSessionHas('error');

        $this->assertSame(1, Enrollment::where('user_id', $student->id)->count());
    }

    public function test_withdrawn_student_can_enroll_again(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::factory()->create();
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'withdrawn']);

        $this->actingAs($student)
            ->post(route('enrollments.store', $course))
            ->assertSessionHas('success');

        $this->assertSame(1, Enrollment::where('user_id', $student->id)->count());
        $this->assertSame('active', Enrollment::where('user_id', $student->id)->value('status'));
    }

    public function test_student_cannot_enroll_in_an_unpublished_course(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::factory()->create(['status' => 'draft']);

        $this->actingAs($student)
            ->post(route('enrollments.store', $course))
            ->assertForbidden();

        $this->assertDatabaseCount('enrollments', 0);
    }

    public function test_removed_feature_routes_no_longer_exist(): void
    {
        foreach ([
            'enrollments.approve',
            'enrollments.reject',
            'module-approvals.store',
            'module-approvals.approve',
            'module-approvals.reject',
            'curriculum.modules.require-approval',
            'my-progress.certificate',
            'admin.users.tier',
            'admin.security.logs',
            'admin.security.settings',
            'profile.avatar.update',
            'profile.avatar.destroy',
        ] as $name) {
            $this->assertFalse(Route::has($name), "Route [{$name}] should be removed.");
        }
    }
}
