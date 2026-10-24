<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarPresetRequest;
use App\Http\Requests\Settings\AvatarUploadRequest;
use App\Models\User;
use App\Support\AvatarPresets;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AvatarController extends Controller
{
    private const UPLOAD_PREFIX = '/storage/avatars/';

    /**
     * Save an uploaded photo as the user's profile picture.
     */
    public function upload(AvatarUploadRequest $request): RedirectResponse
    {
        $user = $request->user();
        $file = $request->file('avatar');
        $path = $file->storeAs('avatars', $user->id.'-'.Str::random(12).'.'.$file->extension(), 'public');

        $this->replaceAvatar($user, '/storage/'.$path);

        return back()->with('success', 'Profile picture updated.');
    }

    /**
     * Use one of the ready-made pixel characters.
     */
    public function preset(AvatarPresetRequest $request): RedirectResponse
    {
        $this->replaceAvatar($request->user(), AvatarPresets::url($request->validated('preset')));

        return back()->with('success', 'Character saved.');
    }

    /**
     * Remove the profile picture; initials show instead.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $this->replaceAvatar($request->user(), null);

        return back()->with('success', 'Profile picture removed.');
    }

    /**
     * Save the new picture and delete the previous upload, if it was one.
     */
    private function replaceAvatar(User $user, ?string $avatar): void
    {
        $previous = $user->avatar;
        if ($previous && $previous !== $avatar && str_starts_with($previous, self::UPLOAD_PREFIX)) {
            Storage::disk('public')->delete(Str::after($previous, '/storage/'));
        }

        $user->forceFill(['avatar' => $avatar])->save();
    }
}
