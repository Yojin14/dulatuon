<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class WelcomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_view_the_welcome_page_with_registration_flag(): void
    {
        $this->get(route('welcome'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('welcome')
                ->where('canRegister', true)
            );
    }

    public function test_authenticated_users_can_view_the_welcome_page(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('welcome'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('welcome'));
    }
}
