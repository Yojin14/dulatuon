<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\ChatRoomParticipant;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseMeeting;
use App\Models\CourseModule;
use App\Models\CourseSession;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\Section;
use App\Models\StudentContentProgress;
use App\Models\StudentSessionProgress;
use App\Models\Subject;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Seeds a realistic, fully-connected dataset (teachers, students, courses,
 * curriculum, enrollments, assessments, submissions, grades, chat and
 * progress) so the app can be explored end-to-end with existing data.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->ensureSampleReadingPdf();

        $teachers = $this->seedTeachers();
        $students = $this->seedStudents();

        $courseBlueprints = [
            [
                'code' => 'DLT-101',
                'title' => 'Foundations of Discipleship',
                'short' => 'Core principles of Christian discipleship and spiritual growth.',
                'level' => 'Beginner',
            ],
            [
                'code' => 'DLT-201',
                'title' => 'Personal Evangelism',
                'short' => 'Practical methods for sharing the faith with confidence.',
                'level' => 'Intermediate',
            ],
            [
                'code' => 'DLT-301',
                'title' => 'Biblical Leadership',
                'short' => 'Developing servant leaders for ministry and the marketplace.',
                'level' => 'Advanced',
            ],
        ];

        foreach ($courseBlueprints as $index => $blueprint) {
            $instructor = $teachers[$index % count($teachers)];
            $this->seedCourse($blueprint, $instructor, $teachers, $students);
        }

        $this->command?->info('Demo data seeded: '.count($teachers).' teachers, '.count($students).' students, '.count($courseBlueprints).' courses.');
    }

    /**
     * Write a small, valid placeholder PDF to public storage so the seeded
     * "Reading" content items resolve to a real, viewable file (avoids a 403
     * when the iframe requests /storage/course-materials/sample-reading.pdf).
     */
    private function ensureSampleReadingPdf(): void
    {
        $relative = 'course-materials/sample-reading.pdf';

        if (Storage::disk('public')->exists($relative)) {
            return;
        }

        $stream = 'BT /F1 24 Tf 72 720 Td (Sample Reading Material) Tj '
            .'0 -40 Td /F1 12 Tf (Supplementary reading material for this course.) Tj ET';

        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            3 => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
            4 => '<< /Length '.strlen($stream)." >>\nstream\n".$stream."\nendstream",
            5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $number => $body) {
            $offsets[$number] = strlen($pdf);
            $pdf .= $number." 0 obj\n".$body."\nendobj\n";
        }

        $xrefPosition = strlen($pdf);
        $count = count($objects) + 1;
        $pdf .= "xref\n0 ".$count."\n0000000000 65535 f \n";
        for ($i = 1; $i < $count; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $pdf .= "trailer\n<< /Size ".$count." /Root 1 0 R >>\nstartxref\n".$xrefPosition."\n%%EOF";

        Storage::disk('public')->put($relative, $pdf);
    }

    /**
     * @return array<int, User>
     */
    private function seedTeachers(): array
    {
        $definitions = [
            ['Grace', 'Mendoza', 'grace.mendoza@dulatuon.test'],
            ['Daniel', 'Reyes', 'daniel.reyes@dulatuon.test'],
            ['Hannah', 'Cruz', 'hannah.cruz@dulatuon.test'],
        ];

        return array_map(fn ($d) => $this->makeUser($d[0], $d[1], $d[2], 'teacher'), $definitions);
    }

    /**
     * @return array<int, User>
     */
    private function seedStudents(): array
    {
        $definitions = [
            ['Aaron', 'Santos'], ['Bianca', 'Lim'], ['Caleb', 'Dela Cruz'],
            ['Diana', 'Torres'], ['Elijah', 'Ramos'], ['Faith', 'Garcia'],
            ['Gabriel', 'Aquino'], ['Hope', 'Villanueva'], ['Isaac', 'Navarro'],
            ['Joy', 'Castillo'], ['Kevin', 'Bautista'], ['Leah', 'Flores'],
        ];

        return array_map(function ($d, $i) {
            $email = strtolower($d[0].'.'.str_replace(' ', '', $d[1])).'@student.test';

            return $this->makeUser($d[0], $d[1], $email, 'student');
        }, $definitions, array_keys($definitions));
    }

    private function makeUser(string $first, string $last, string $email, string $role): User
    {
        return User::firstOrCreate(
            ['email' => $email],
            [
                'name' => "{$first} {$last}",
                'firstname' => $first,
                'lastname' => $last,
                'password' => 'password',
                'role' => $role,
                'status' => 'approved',
                'is_active' => true,
                'approved_at' => now(),
                'email_verified_at' => now(),
            ]
        );
    }

    /**
     * @param  array{code: string, title: string, short: string, level: string}  $blueprint
     * @param  array<int, User>  $teachers
     * @param  array<int, User>  $students
     */
    private function seedCourse(array $blueprint, User $instructor, array $teachers, array $students): void
    {
        $course = Course::create([
            'course_code' => $blueprint['code'],
            'title' => $blueprint['title'],
            'short_description' => $blueprint['short'],
            'description' => $blueprint['short'].' This course combines weekly sessions, readings and practical activities to build both knowledge and character.',
            'level' => $blueprint['level'],
            'status' => 'published',
            'instructor_id' => $instructor->id,
            'max_students' => 40,
        ]);

        // Attach the instructor plus one co-teacher via the pivot.
        $coTeacher = $teachers[($teachers === [] ? 0 : array_search($instructor, $teachers, true) + 1) % max(count($teachers), 1)];
        $course->teachers()->syncWithoutDetaching(array_unique([$instructor->id, $coTeacher->id]));

        $subject = Subject::create([
            'subject_code' => $blueprint['code'].'-S1',
            'subject_title' => $blueprint['title'].' — Main Subject',
            'course_id' => $course->id,
        ]);

        $section = Section::create([
            'section_name' => $blueprint['title'].' (Batch '.now()->year.')',
            'subject_id' => $subject->id,
            'course_id' => $course->id,
            'year_level' => '1st Year',
            'semester' => 'First Semester',
            'school_year' => now()->year.'-'.(now()->year + 1),
            'room_code' => 'RM-'.str_pad((string) random_int(1, 20), 3, '0', STR_PAD_LEFT),
            'teacher_id' => $instructor->id,
        ]);

        $sessions = $this->seedCurriculum($course, $instructor, $section);

        $this->seedEnrollments($course, $section, $students);
        $this->seedAssessments($course, $section, $instructor, $sessions, $students);
        $this->seedAnnouncements($course, $section, $instructor);
        $this->seedChat($course, $instructor, $students);
        $this->seedProgress($course, $sessions, $students);
    }

    /**
     * @return array<int, CourseSession>
     */
    private function seedCurriculum(Course $course, User $instructor, Section $section): array
    {
        $modulePlan = [
            'Orientation & Overview' => ['Welcome and Course Map', 'Setting Expectations'],
            'Core Teaching' => ['Foundational Principles', 'Scriptural Basis', 'Group Discussion'],
            'Application & Practice' => ['Field Exercise', 'Reflection & Wrap-up'],
        ];

        $allSessions = [];
        $moduleOrder = 0;

        foreach ($modulePlan as $moduleTitle => $sessionTitles) {
            $module = CourseModule::create([
                'course_id' => $course->id,
                'title' => $moduleTitle,
                'sort_order' => $moduleOrder++,
            ]);

            $sessionOrder = 0;
            foreach ($sessionTitles as $sessionTitle) {
                $courseSession = CourseSession::create([
                    'module_id' => $module->id,
                    'lesson_group_id' => null,
                    'title' => $sessionTitle,
                    'sort_order' => $sessionOrder++,
                ]);

                CourseContentItem::create([
                    'session_id' => $courseSession->id,
                    'type' => 'youtube',
                    'title' => $sessionTitle.' — Video Lecture',
                    'description' => 'Watch the lecture before completing the activity.',
                    'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    'sort_order' => 0,
                ]);

                CourseContentItem::create([
                    'session_id' => $courseSession->id,
                    'type' => 'pdf',
                    'title' => $sessionTitle.' — Reading',
                    'description' => 'Supplementary reading material.',
                    'filename' => 'reading.pdf',
                    'file_path' => 'course-materials/sample-reading.pdf',
                    'file_size' => 482000,
                    'sort_order' => 1,
                ]);

                $allSessions[] = $courseSession;
            }
        }

        // A scheduled live meeting on the first session.
        CourseMeeting::create([
            'session_id' => $allSessions[0]->id,
            'title' => 'Live Kickoff Session',
            'description' => 'Introductory live class via Google Meet.',
            'meet_link' => 'https://meet.google.com/abc-defg-hij',
            'scheduled_at' => now()->addDays(3)->setTime(18, 0),
            'timezone' => 'Asia/Manila',
            'duration_minutes' => 90,
        ]);

        return $allSessions;
    }

    /**
     * @param  array<int, User>  $students
     */
    private function seedEnrollments(Course $course, Section $section, array $students): void
    {
        // Enroll the first 8 students into this section.
        foreach (array_slice($students, 0, 8) as $student) {
            Enrollment::firstOrCreate(
                ['user_id' => $student->id, 'section_id' => $section->id],
                [
                    'course_id' => $course->id,
                    'status' => 'active',
                    'enrollment_date' => now()->subDays(random_int(1, 30)),
                ]
            );
        }
    }

    /**
     * @param  array<int, CourseSession>  $sessions
     * @param  array<int, User>  $students
     */
    private function seedAssessments(Course $course, Section $section, User $instructor, array $sessions, array $students): void
    {
        $assignmentSession = $sessions[2] ?? $sessions[0];

        $assignment = Assignment::create([
            'title' => 'Reflection Paper',
            'description' => 'Write a one-page reflection on the core teaching of this module.',
            'course_id' => $course->id,
            'section_id' => $section->id,
            'session_id' => $assignmentSession->id,
            'teacher_id' => $instructor->id,
            'assignment_type' => 'essay',
            'points' => 100,
            'due_date' => now()->addDays(7),
            'status' => 'published',
        ]);

        // A handful of enrolled students submit and get graded.
        foreach (array_slice($students, 0, 5) as $i => $student) {
            $submission = Submission::create([
                'user_id' => $student->id,
                'assignment_id' => $assignment->id,
                'submission_type' => 'text',
                'text_content' => 'My reflection on the lessons learned this week...',
                'status' => $i < 3 ? 'graded' : 'submitted',
                'is_submitted' => true,
                'submission_date' => now()->subDays(random_int(0, 3)),
            ]);

            if ($i < 3) {
                $earned = random_int(75, 98);
                DB::table('grades')->insert([
                    'user_id' => $student->id,
                    'submission_id' => $submission->id,
                    'assignment_id' => $assignment->id,
                    'course_id' => $course->id,
                    'section_id' => $section->id,
                    'points_earned' => $earned,
                    'points_possible' => 100,
                    'percentage' => $earned,
                    'grade_letter' => $this->letterFor($earned),
                    'feedback' => 'Good work — clear reflection and application.',
                    'graded_by' => $instructor->id,
                    'graded_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // A published activity (no Eloquent model — insert directly).
        DB::table('activities')->insert([
            'title' => 'Memory Verse Practice',
            'description' => 'Recite this week\'s memory verse in your small group.',
            'course_id' => $course->id,
            'section_id' => $section->id,
            'teacher_id' => $instructor->id,
            'submission_type' => 'text',
            'points' => 50,
            'due_date' => now()->addDays(5),
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->seedQuiz($course, $section, $instructor, $sessions);
    }

    /**
     * @param  array<int, CourseSession>  $sessions
     */
    private function seedQuiz(Course $course, Section $section, User $instructor, array $sessions): void
    {
        $quiz = Quiz::create([
            'title' => 'Module 2 Knowledge Check',
            'description' => 'A short quiz covering the core teaching module.',
            'course_id' => $course->id,
            'section_id' => $section->id,
            'session_id' => $sessions[1]->id ?? null,
            'teacher_id' => $instructor->id,
            'time_limit' => 15,
            'number_of_questions' => 3,
            'attempts_allowed' => 2,
            'points' => 30,
            'due_date' => now()->addDays(10),
            'status' => 'published',
        ]);

        $questions = [
            [
                'text' => 'Discipleship is best described as...',
                'type' => 'multiple_choice',
                'options' => [
                    ['A one-time decision', false],
                    ['A lifelong process of following Christ', true],
                    ['Attending church on Sundays', false],
                    ['Memorizing scripture only', false],
                ],
            ],
            [
                'text' => 'Evangelism should be done out of love, not obligation.',
                'type' => 'true_false',
                'options' => [
                    ['True', true],
                    ['False', false],
                ],
            ],
            [
                'text' => 'Name one quality of a servant leader.',
                'type' => 'short_answer',
                'options' => [],
            ],
        ];

        foreach ($questions as $order => $q) {
            $question = Question::create([
                'quiz_id' => $quiz->id,
                'question_text' => $q['text'],
                'question_type' => $q['type'],
                'points' => 10,
                'order' => $order,
            ]);

            foreach ($q['options'] as $optOrder => [$label, $isCorrect]) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'option_text' => $label,
                    'is_correct' => $isCorrect,
                    'order' => $optOrder,
                ]);
            }
        }
    }

    private function seedAnnouncements(Course $course, Section $section, User $instructor): void
    {
        \App\Models\Announcement::insert([
            [
                'course_id' => $course->id,
                'user_id' => $instructor->id,
                'body' => 'Welcome to '.$course->title.'! Glad to have you in this class. Please review the orientation module before our first live session.',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ],
            [
                'course_id' => $course->id,
                'user_id' => $instructor->id,
                'body' => "Reminder: don't forget to submit your reflection paper before the deadline this week.",
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * @param  array<int, User>  $students
     */
    private function seedChat(Course $course, User $instructor, array $students): void
    {
        $room = ChatRoom::create([
            'name' => $course->title.' — Class Chat',
            'type' => 'course',
            'course_id' => $course->id,
            'description' => 'Discussion room for '.$course->title.'.',
        ]);

        $members = array_merge([$instructor], array_slice($students, 0, 6));
        foreach ($members as $member) {
            ChatRoomParticipant::firstOrCreate(
                ['chat_room_id' => $room->id, 'user_id' => $member->id],
                ['last_read_at' => now()]
            );
        }

        $messages = [
            [$instructor, 'Welcome everyone! Feel free to introduce yourselves here.'],
            [$students[0], 'Hi all, excited to start this course!'],
            [$students[1], 'Looking forward to the live session.'],
            [$instructor, 'Great! Remember to finish the orientation module first.'],
        ];

        foreach ($messages as $offset => [$author, $body]) {
            ChatMessage::create([
                'chat_room_id' => $room->id,
                'user_id' => $author->id,
                'body' => $body,
            ]);
        }
    }

    /**
     * @param  array<int, CourseSession>  $sessions
     * @param  array<int, User>  $students
     */
    private function seedProgress(Course $course, array $sessions, array $students): void
    {
        // First three students complete the first two sessions and their content.
        foreach (array_slice($students, 0, 3) as $student) {
            foreach (array_slice($sessions, 0, 2) as $courseSession) {
                StudentSessionProgress::firstOrCreate(
                    ['user_id' => $student->id, 'session_id' => $courseSession->id],
                    ['course_id' => $course->id, 'completed_at' => now()->subDays(random_int(1, 5))]
                );

                foreach ($courseSession->contentItems as $item) {
                    StudentContentProgress::firstOrCreate(
                        ['user_id' => $student->id, 'content_id' => $item->id],
                        ['course_id' => $course->id, 'completed_at' => now()->subDays(random_int(1, 5))]
                    );
                }
            }
        }
    }

    private function letterFor(int $percentage): string
    {
        return match (true) {
            $percentage >= 90 => 'A',
            $percentage >= 80 => 'B',
            $percentage >= 70 => 'C',
            $percentage >= 60 => 'D',
            default => 'F',
        };
    }
}
