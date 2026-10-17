<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
