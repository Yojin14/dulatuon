<?php

namespace Tests\Feature;

use App\Http\Controllers\CurriculumController;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseGame;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\Quiz;
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
        $this->assertSame(6, CourseGame::where('game_type', '!=', 'quiz_quest')->count(), 'Earthquakes gets its six 3D labs.');
        $this->assertSame(0, CourseContentItem::where('type', '!=', 'flipbook')->count(), 'Every lesson is a flipbook.');

        $this->assertSame(['Earthquakes'], Course::where('is_locked', false)->pluck('title')->all(), 'Only Earthquakes is open for now.');

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

        foreach (['church', 'disciple', 'evangel', 'biblical', 'scripture', 'ministry', 'faith', 'christ', 'dqw4w9wgxcq'] as $word) {
            $this->assertStringNotContainsString($word, $text, "Found church content: {$word}");
        }

        $this->assertDoesNotMatchRegularExpression('/verses?/', $text, 'Found church content: verse');
    }

    public function test_earthquakes_course_follows_the_six_mission_sequence(): void
    {
        $this->seed(DemoDataSeeder::class);

        $course = Course::where('title', 'Earthquakes')->firstOrFail();

        $this->assertSame(
            ['Mission 1 — Fault Lab', 'Mission 2 — Shake Town', 'Mission 3 — Wave Tank', 'Mission 4 — Quake Tracker', 'Mission 5 — Ground Test', 'Mission 6 — Quake Ready'],
            $course->modules()->orderBy('sort_order')->pluck('title')->all(),
        );

        $this->assertSame(
            ['fault_lab', 'shake_town', 'wave_tank', 'quake_tracker', 'ground_test', 'quake_ready'],
            CourseGame::whereIn('session_id', $course->modules()->with('sessions')->get()->flatMap->sessions->pluck('id'))
                ->orderBy('sort_order')->pluck('game_type')->all(),
        );

        $quizzes = Quiz::where('course_id', $course->id)->withCount('questions')->get();
        $this->assertCount(6, $quizzes);
        foreach ($quizzes as $quiz) {
            $this->assertGreaterThanOrEqual(5, $quiz->questions_count, "{$quiz->title} needs at least 5 self-check questions.");
        }

        foreach (Question::whereIn('quiz_id', $quizzes->pluck('id'))->withCount(['options as correct_options_count' => fn ($query) => $query->where('is_correct', true)])->get() as $question) {
            $this->assertSame(1, $question->correct_options_count, "One correct answer for: {$question->question_text}");
        }
    }

    public function test_earthquake_flipbook_images_exist_on_disk(): void
    {
        $this->seed(DemoDataSeeder::class);

        $urls = CourseContentItem::all()->flatMap(fn (CourseContentItem $item) => collect($item->pages)->flatMap(fn (array $page) => collect($page['images'])->pluck('url')));

        $this->assertNotEmpty($urls);
        foreach ($urls as $url) {
            $this->assertFileExists(public_path(ltrim($url, '/')));
        }
    }
}
