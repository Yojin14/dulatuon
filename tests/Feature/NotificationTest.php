<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('notifications.index'))->assertRedirect(route('login'));
    }

    public function test_index_returns_the_users_notifications_with_unread_count(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $other = User::factory()->create(['role' => 'student']);

        UserNotification::notify($user->id, 'general', 'Hello there');
        $read = UserNotification::notify($user->id, 'general', 'Already read');
        $read->update(['read_at' => now()]);
        UserNotification::notify($other->id, 'general', 'Not yours');

        $this->actingAs($user)
            ->getJson(route('notifications.index'))
            ->assertOk()
            ->assertJsonCount(2, 'notifications')
            ->assertJsonPath('unreadCount', 1);
    }

    public function test_push_creates_a_notification_and_seeds_the_shared_unread_count(): void
    {
        $user = User::factory()->create(['role' => 'student']);

        UserNotification::notify(
            $user->id,
            'enrollment_approved',
            'Enrollment approved',
            'Your enrollment was approved.',
            '/my-course/1',
            ['course_id' => 1],
        );

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'type' => 'enrollment_approved',
            'title' => 'Enrollment approved',
            'link' => '/my-course/1',
            'read_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('unreadNotificationCount', 1));
    }

    public function test_user_can_mark_a_notification_as_read(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $notification = UserNotification::notify($user->id, 'general', 'Read me');

        $this->actingAs($user)
            ->postJson(route('notifications.read', $notification))
            ->assertOk()
            ->assertJson(['unread_count' => 0]);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $other = User::factory()->create(['role' => 'student']);
        $notification = UserNotification::notify($other->id, 'general', 'Not yours');

        $this->actingAs($user)
            ->postJson(route('notifications.read', $notification))
            ->assertForbidden();

        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_user_can_mark_all_notifications_as_read(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        UserNotification::notify($user->id, 'general', 'One');
        UserNotification::notify($user->id, 'general', 'Two');

        $this->actingAs($user)
            ->postJson(route('notifications.read-all'))
            ->assertOk()
            ->assertJson(['unread_count' => 0]);

        $this->assertSame(0, UserNotification::where('user_id', $user->id)->whereNull('read_at')->count());
    }

    public function test_user_can_delete_a_notification(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $notification = UserNotification::notify($user->id, 'general', 'Delete me');

        $this->actingAs($user)
            ->deleteJson(route('notifications.destroy', $notification))
            ->assertOk();

        $this->assertDatabaseMissing('user_notifications', ['id' => $notification->id]);
    }
}
