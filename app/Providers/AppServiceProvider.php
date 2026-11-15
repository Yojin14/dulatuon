<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configureVerificationMail();
    }

    /**
     * Friendlier wording for the verify-email message, in the same voice as the app.
     */
    private function configureVerificationMail(): void
    {
        VerifyEmail::toMailUsing(function (object $notifiable, string $url): MailMessage {
            return (new MailMessage)
                ->subject('Verify your email to start playing')
                ->greeting("Hi {$notifiable->name}!")
                ->line('Welcome to Dulatuon, where you learn science by playing it. One quick tap and your account is ready for its first lesson.')
                ->action('Verify my email', $url)
                ->line('If you did not create an account, you can safely ignore this email.')
                ->salutation('See you in class, the Dulatuon team');
        });
    }

    /**
     * Throttle traffic so a single client cannot overload the server while
     * leaving plenty of headroom for normal page navigation.
     */
    private function configureRateLimiting(): void
    {
        // General browsing — applied to every authenticated page request.
        RateLimiter::for('global', function (Request $request): Limit {
            return Limit::perMinute(240)->by($this->throttleKey($request));
        });

        // State-changing requests (POST/PUT/PATCH/DELETE).
        RateLimiter::for('writes', function (Request $request): Limit {
            return Limit::perMinute(60)->by($this->throttleKey($request));
        });

        // Chat message sending — bursty but should stay reasonable.
        RateLimiter::for('chat', function (Request $request): Limit {
            return Limit::perMinute(40)->by($this->throttleKey($request));
        });
    }

    private function throttleKey(Request $request): string
    {
        return (string) ($request->user()?->id ?: $request->ip());
    }
}
