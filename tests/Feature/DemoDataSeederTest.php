<?php

namespace Tests\Feature;

use App\Http\Controllers\CurriculumController;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseGame;
use App\Models\Enrollment;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_the_dulatuon_science_courses(): void
    {
        $this->seed(DemoDataSeeder::class);

        $this->assertSame(['Earthquakes', 'Volcanoes', 'Weather & Typhoons'], Course::orderBy('course_code')->pluck('title')->all());
        $this->assertSame(3, CourseGame::where('game_type', '!=', 'quiz_quest')->count(), 'Earthquakes gets its three 3D labs.');
        $this->assertSame(0, CourseContentItem::where('type', '!=', 'flipbook')->count(), 'Every lesson is a flipbook.');

        // Every seeded course renders through the real curriculum formatter.
        foreach (Course::all() as $course) {
            $this->assertNotEmpty(CurriculumController::formatCurriculum($course));
        }

        // Stored progress is in step with the rules, so leaderboards and rank frames are right.
        $this->assertGreaterThan(0, Enrollment::where('completed_lessons', '>', 0)->count());
    }

    public function test_no_church_content_remains(): void
    {
        $this->seed(DemoDataSeeder::class);

        $text = strtolower(implode(' ', [
            Course::pluck('title')->implode(' '),
            Course::pluck('description')->implode(' '),
            DB::table('course_modules')->pluck('title')->implode(' '),
            DB::table('course_sessions')->pluck('title')->implode(' '),
            DB::table('quizzes')->pluck('title')->implode(' '),
            DB::table('questions')->pluck('question_text')->implode(' '),
            DB::table('assignments')->pluck('title')->implode(' '),
            DB::table('activities')->pluck('title')->implode(' '),
            DB::table('announcements')->pluck('body')->implode(' '),
            DB::table('chat_messages')->pluck('body')->implode(' '),
            CourseContentItem::pluck('pages')->toJson(),
        ]));

        foreach (['church', 'disciple', 'evangel', 'biblical', 'scripture', 'ministry', 'verse', 'faith', 'christ', 'dqw4w9wgxcq'] as $word) {
            $this->assertStringNotContainsString($word, $text, "Found church content: {$word}");
        }
    }
}
