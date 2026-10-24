<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Support\AvatarPresets;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_a_photo_can_be_uploaded(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('avatar.upload'), ['avatar' => UploadedFile::fake()->image('me.jpg', 300, 300)])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $avatar = $user->refresh()->avatar;
        $this->assertStringStartsWith('/storage/avatars/'.$user->id.'-', $avatar);
        Storage::disk('public')->assertExists(Str::after($avatar, '/storage/'));
    }

    public function test_a_new_upload_deletes_the_old_photo(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('avatar.upload'), ['avatar' => UploadedFile::fake()->image('a.png')]);
        $first = Str::after($user->refresh()->avatar, '/storage/');

        $this->actingAs($user)->post(route('avatar.upload'), ['avatar' => UploadedFile::fake()->image('b.png')]);

        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists(Str::after($user->refresh()->avatar, '/storage/'));
    }

    public function test_non_images_and_large_files_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('avatar.upload'), ['avatar' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf')])
            ->assertSessionHasErrors('avatar');

        $this->actingAs($user)
            ->post(route('avatar.upload'), ['avatar' => UploadedFile::fake()->image('huge.jpg')->size(3000)])
            ->assertSessionHasErrors('avatar');

        $this->assertNull($user->refresh()->avatar);
    }

    public function test_a_character_can_be_picked_and_replaces_an_upload(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('avatar.upload'), ['avatar' => UploadedFile::fake()->image('a.png')]);
        $upload = Str::after($user->refresh()->avatar, '/storage/');

        $this->actingAs($user)
            ->put(route('avatar.preset'), ['preset' => 'girl-03'])
            ->assertSessionHasNoErrors();

        $this->assertSame('/avatars/pixel/girl-03.svg', $user->refresh()->avatar);
        Storage::disk('public')->assertMissing($upload);
    }

    public function test_a_team_portrait_can_be_picked(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('avatar.preset'), ['preset' => 'shellou'])
            ->assertSessionHasNoErrors();

        $this->assertSame('/avatars/pixel/shellou.webp', $user->refresh()->avatar);
    }

    public function test_unknown_characters_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->put(route('avatar.preset'), ['preset' => '../../.env'])
            ->assertSessionHasErrors('preset');

        $this->assertNull($user->refresh()->avatar);
    }

    public function test_the_picture_can_be_removed(): void
    {
        $user = User::factory()->create(['avatar' => '/avatars/pixel/boy-01.svg']);

        $this->actingAs($user)->delete(route('avatar.destroy'))->assertSessionHasNoErrors();

        $this->assertNull($user->refresh()->avatar);
    }

    public function test_guests_cannot_change_pictures(): void
    {
        $this->put(route('avatar.preset'), ['preset' => 'boy-01'])->assertRedirect(route('login'));
    }

    public function test_every_character_file_exists(): void
    {
        $this->assertCount(27, AvatarPresets::ids());
        $this->assertSame(['shellou', 'fhel', 'eugz'], array_slice(AvatarPresets::ids(), 0, 3));
        foreach (AvatarPresets::ids() as $id) {
            $this->assertFileExists(public_path(ltrim(AvatarPresets::url($id), '/')), $id);
        }
    }
}
