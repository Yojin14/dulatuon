<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class UserManagementTest extends TestCase
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

    public function test_admin_can_view_users_with_stats(): void
    {
        $admin = $this->admin();
        User::factory()->count(3)->create(['role' => 'student', 'status' => 'approved', 'is_active' => true]);
        User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('admin/users/index')
                ->has('users.data', 4) // excludes the acting admin
                ->where('stats.students', 3)
                ->where('stats.teachers', 1)
            );
    }

    public function test_search_filters_users_by_name_or_email(): void
    {
        $admin = $this->admin();
        User::factory()->create(['name' => 'Alice Walker', 'role' => 'student', 'status' => 'approved', 'is_active' => true]);
        User::factory()->create(['name' => 'Bob Stone', 'email' => 'bob@example.com', 'role' => 'student', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['search' => 'Alice']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.name', 'Alice Walker')
            );
    }

    public function test_tab_filters_users_by_role(): void
    {
        $admin = $this->admin();
        User::factory()->count(2)->create(['role' => 'student', 'status' => 'approved', 'is_active' => true]);
        User::factory()->create(['role' => 'teacher', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['tab' => 'teachers']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.role', 'teacher')
            );
    }

    public function test_stats_are_skipped_on_partial_search_reload(): void
    {
        $admin = $this->admin();
        User::factory()->create(['name' => 'Alice Walker', 'role' => 'student', 'status' => 'approved', 'is_active' => true]);

        // Use the real asset version so the partial reload isn't rejected with a 409.
        $version = $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->viewData('page')['version'];

        $response = $this->actingAs($admin)
            ->get(route('admin.users.index', ['search' => 'Alice']), [
                'X-Inertia' => 'true',
                'X-Inertia-Version' => $version,
                'X-Inertia-Partial-Component' => 'admin/users/index',
                'X-Inertia-Partial-Data' => 'users,activeTab,filters',
            ]);

        $response->assertOk();
        $response->assertJsonPath('component', 'admin/users/index');
        $response->assertJsonPath('props.users.data.0.name', 'Alice Walker');
        $response->assertJsonMissingPath('props.stats');
    }

    public function test_user_row_does_not_leak_sensitive_fields(): void
    {
        $admin = $this->admin();
        User::factory()->create(['role' => 'student', 'status' => 'approved', 'is_active' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('users.data.0', fn (AssertableInertia $row) => $row
                    ->hasAll(['id', 'name', 'email', 'role', 'status', 'is_active', 'has_class_management'])
                    ->missing('password')
                    ->missing('two_factor_secret')
                    ->missing('remember_token')
                    ->etc()
                )
            );
    }
}
