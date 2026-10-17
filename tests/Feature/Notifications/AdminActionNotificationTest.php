<?php

namespace Tests\Feature\Notifications;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminActionNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'status' => 'approved',
            'is_active' => true,
        ]);
    }

    public function test_changing_a_users_role_notifies_them(): void
    {
        $admin = $this->admin();
        $user = User::factory()->create(['role' => 'student', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $user), ['role' => 'teacher'])
            ->assertRedirect();

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'type' => 'role_assigned',
        ]);
    }

    public function test_role_update_does_not_notify_when_role_is_unchanged(): void
    {
        $admin = $this->admin();
        $user = User::factory()->create(['role' => 'student', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $user), ['role' => 'student']);

        $this->assertDatabaseMissing('user_notifications', [
            'user_id' => $user->id,
            'type' => 'role_assigned',
        ]);
    }

    public function test_granting_class_management_notifies_the_teacher(): void
    {
        $admin = $this->admin();
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->post(route('admin.users.toggle-permission', $teacher), ['permission' => 'class_management']);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $teacher->id,
            'type' => 'permission_granted',
            'link' => '/class-management',
        ]);
    }

    public function test_revoking_class_management_notifies_the_teacher(): void
    {
        $admin = $this->admin();
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);

        // Grant first, then revoke.
        $this->actingAs($admin)->post(route('admin.users.toggle-permission', $teacher), ['permission' => 'class_management']);
        $this->actingAs($admin)->post(route('admin.users.toggle-permission', $teacher), ['permission' => 'class_management']);

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $teacher->id,
            'type' => 'permission_revoked',
        ]);
    }

    public function test_assigning_teachers_to_a_new_course_notifies_them(): void
    {
        $admin = $this->admin();
        $teacher = User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->post(route('courses.store'), [
                'course_code' => 'NOTIF-101',
                'title' => 'Intro to Notifications',
                'level' => 'Beginner',
                'status' => 'draft',
                'teacher_ids' => [$teacher->id],
            ])
            ->assertRedirect(route('courses.index'));

        $course = Course::where('course_code', 'NOTIF-101')->firstOrFail();

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $teacher->id,
            'type' => 'course_assigned',
            'link' => '/my-course/'.$course->id,
        ]);
    }

    public function test_course_update_only_notifies_newly_assigned_teachers(): void
    {
        $admin = $this->admin();
        $existing = User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);
        $added = User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);

        $course = Course::create([
            'course_code' => 'NOTIF-201',
            'title' => 'Existing Course',
            'level' => 'Beginner',
            'status' => 'draft',
        ]);
        $course->teachers()->sync([$existing->id]);

        $this->actingAs($admin)
            ->put(route('courses.update', $course), [
                'course_code' => 'NOTIF-201',
                'title' => 'Existing Course',
                'level' => 'Beginner',
                'status' => 'draft',
                'teacher_ids' => [$existing->id, $added->id],
            ])
            ->assertRedirect(route('courses.index'));

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $added->id,
            'type' => 'course_assigned',
        ]);
        $this->assertDatabaseMissing('user_notifications', [
            'user_id' => $existing->id,
            'type' => 'course_assigned',
        ]);
    }

    public function test_admin_assigning_themselves_is_not_notified(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('courses.store'), [
                'course_code' => 'NOTIF-301',
                'title' => 'Self Assigned',
                'level' => 'Beginner',
                'status' => 'draft',
                'teacher_ids' => [$admin->id],
            ]);

        $this->assertDatabaseMissing('user_notifications', [
            'user_id' => $admin->id,
            'type' => 'course_assigned',
        ]);
    }
}
