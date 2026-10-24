<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user ? [
                    ...$user->only([
                        'id', 'name', 'email', 'avatar', 'gender', 'role', 'is_active',
                        'firstname', 'lastname', 'email_verified_at',
                        'two_factor_confirmed_at', 'created_at', 'updated_at',
                    ]),
                    // Students' total XP, for the rank frame on their avatar.
                    'xp' => $user->role === 'student' ? \App\Support\StudentProgress::storedXp([$user->id])[$user->id] : null,
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'unreadNotificationCount' => $user
                ? \App\Models\UserNotification::query()->where('user_id', $user->id)->unread()->count()
                : 0,
        ];
    }
}
