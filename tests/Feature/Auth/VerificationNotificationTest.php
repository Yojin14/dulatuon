<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class VerificationNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_verification_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('verification.send'))
            ->assertRedirect(route('welcome'));

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_verification_email_uses_dulatuon_branding_and_copy(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $mail = (new VerifyEmail)->toMail($user);
        $html = (string) $mail->render();

        $this->assertSame('Verify your email to start playing', $mail->subject);
        $this->assertStringContainsString("Hi {$user->name}!", $html);
        $this->assertStringContainsString('Verify my email', $html);
        $this->assertStringContainsString('LEARN BY PLAYING', $html);
        $this->assertStringContainsString('#7c1cff', $html);
        $this->assertStringContainsString('/email/verify/', $html);
    }

    public function test_does_not_send_verification_notification_if_email_is_verified(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->post(route('verification.send'))
            ->assertRedirect(route('dashboard', absolute: false));

        Notification::assertNothingSent();
    }
}
