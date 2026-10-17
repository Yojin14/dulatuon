<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class OptimizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_explore_page_caches_the_published_course_catalogue(): void
    {
        $student = User::factory()->create(['role' => 'student', 'status' => 'approved']);
        Course::create([
            'course_code' => 'CACHE-101',
            'title' => 'Cached Course',
            'level' => 'Beginner',
            'status' => 'published',
        ]);

        $this->assertNull(Cache::get('explore:courses'));

        $this->actingAs($student)->get(route('explore.index'))->assertOk();

        $this->assertNotNull(Cache::get('explore:courses'));
    }

    public function test_saving_a_course_invalidates_the_explore_cache(): void
    {
        Cache::put('explore:courses', ['stale'], now()->addMinutes(10));

        Course::create([
            'course_code' => 'BUST-101',
            'title' => 'Cache Buster',
            'level' => 'Beginner',
            'status' => 'published',
        ]);

        $this->assertNull(Cache::get('explore:courses'));
    }

    public function test_rate_limiters_are_registered_with_expected_limits(): void
    {
        $request = Request::create('/');
        $request->setUserResolver(fn () => User::factory()->make(['id' => 1]));

        $limits = [
            'global' => 240,
            'writes' => 60,
            'chat' => 40,
        ];

        foreach ($limits as $name => $expected) {
            $limiter = RateLimiter::limiter($name);
            $this->assertNotNull($limiter, "Rate limiter [{$name}] is not registered.");
            $this->assertSame($expected, $limiter($request)->maxAttempts);
        }
    }
}
