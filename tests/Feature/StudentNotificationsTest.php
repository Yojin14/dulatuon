<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\StudentContentProgress;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private CourseSession $session;

    private User $teacher;

    private User $student;

    /** @var array<int, CourseContentItem> */
    private array $contents = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->course = Course::factory()->create(['status' => 'published', 'title' => 'Earthquakes']);
        $this->teacher = User::factory()->create(['role' => 'teacher']);
        $this->course->teachers()->attach($this->teacher);
        $module = CourseModule::create(['course_id' => $this->course->id, 'title' => 'Module 1', 'sort_order' => 0]);
        $this->session = CourseSession::create(['module_id' => $module->id, 'title' => 'Lesson 1', 'sort_order' => 0]);
        for ($i = 0; $i < 6; $i++) {
            $this->contents[] = CourseContentItem::create(['session_id' => $this->session->id, 'type' => 'youtube', 'title' => "Video {$i}", 'url' => "https://youtu.be/{$i}"]);
        }

        $this->student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $this->student->id, 'course_id' => $this->course->id, 'status' => 'active']);
    }

    private function complete(int $index): void
    {
        $this->actingAs($this->student)
            ->post(route('my-progress.content.complete', [$this->course->id, $this->contents[$index]->id]))
            ->assertSuccessful();
    }

    /**
     * @return list<string>
     */
    private function types(): array
    {
        return UserNotification::where('user_id', $this->student->id)->orderBy('id')->pluck('type')->all();
    }

    public function test_no_news_while_staying_in_the_same_rank(): void
    {
        foreach (range(0, 3) as $index) {
            $this->complete($index);
        }

        $this->assertSame([], $this->types());
    }

    public function test_crossing_a_rank_sends_one_rank_up(): void
    {
        foreach (range(0, 4) as $index) {
            $this->complete($index);
        }

        $this->assertSame(['rank_up'], $this->types());
        $this->assertSame('You reached Bronze II', UserNotification::where('type', 'rank_up')->value('title'));
    }

    public function test_clearing_the_course_sends_a_certificate(): void
    {
        foreach (range(0, 5) as $index) {
            $this->complete($index);
        }

        // 50 XP (Bronze II), then 60 + 100 for the cleared course = 160 XP (Silver III) with the certificate.
        $this->assertSame(['rank_up', 'rank_up', 'certificate'], $this->types());
        $certificate = UserNotification::where('type', 'certificate')->first();
        $this->assertSame("/certificates/{$this->course->id}", $certificate->link);
        $this->assertStringContainsString('Earthquakes', $certificate->body);
    }

    public function test_new_items_in_a_row_merge_into_one_notification(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        foreach (['Volcano flipbook', 'Plate quiz', 'Fault video'] as $title) {
            $this->actingAs($admin)
                ->postJson(route('curriculum.content.store', [$this->course->id, $this->session->id]), [
                    'type' => 'youtube',
                    'title' => $title,
                    'url' => 'https://youtu.be/x',
                ])
                ->assertCreated();
        }

        $news = UserNotification::where('user_id', $this->student->id)->where('type', 'new_content')->get();
        $this->assertCount(1, $news);
        $this->assertSame('3 new items in Earthquakes', $news[0]->title);
        $this->assertSame('Latest: Fault video', $news[0]->body);
        $this->assertSame(0, UserNotification::whereIn('user_id', [$admin->id, $this->teacher->id])->count());
    }

    public function test_draft_courses_send_no_news(): void
    {
        $this->course->update(['status' => 'draft']);

        $this->actingAs(User::factory()->create(['role' => 'admin']))
            ->postJson(route('curriculum.content.store', [$this->course->id, $this->session->id]), [
                'type' => 'youtube',
                'title' => 'Hidden',
                'url' => 'https://youtu.be/x',
            ])
            ->assertCreated();

        $this->assertSame([], $this->types());
    }

    public function test_backfills_stay_quiet(): void
    {
        foreach (range(0, 5) as $index) {
            StudentContentProgress::create(['user_id' => $this->student->id, 'course_id' => $this->course->id, 'content_id' => $this->contents[$index]->id, 'completed_at' => now()]);
        }

        $this->artisan('progress:sync')->assertSuccessful();

        $this->assertSame([], $this->types());
    }
}
