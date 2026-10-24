<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'gender' => 'female',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertSame('female', User::where('email', 'test@example.com')->value('gender'));
    }

    public function test_registration_requires_a_valid_gender()
    {
        foreach ([null, 'robot'] as $gender) {
            $this->post(route('register.store'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'gender' => $gender,
                'password' => 'password',
                'password_confirmation' => 'password',
            ])->assertSessionHasErrors('gender');
        }

        $this->assertGuest();
    }
}
