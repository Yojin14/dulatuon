<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\ChatRoomParticipant;
use App\Models\Course;
use App\Models\CourseContentItem;
use App\Models\CourseGame;
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
use App\Support\SimulationGames;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds a realistic, fully-connected Dulatuon dataset: science courses (Earthquakes,
 * Volcanoes, Weather & Typhoons) with flipbook lessons, 3D labs and quiz games, plus
 * teachers, students, enrollments, assessments, grades, chat and progress.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $teachers = $this->seedTeachers();
        $students = $this->seedStudents();
        $courses = $this->courseBlueprints();

        foreach ($courses as $index => $blueprint) {
            $instructor = $teachers[$index % count($teachers)];
            $this->seedCourse($blueprint, $instructor, $teachers, $students);
        }

        $this->command?->info('Demo data seeded: '.count($teachers).' teachers, '.count($students).' students, '.count($courses).' courses.');
    }

    /**
     * The science courses, each with its own modules, lessons, games and assessments.
     *
     * @return array<int, array<string, mixed>>
     */
    private function courseBlueprints(): array
    {
        return [
            [
                'code' => 'DLT-101',
                'title' => 'Earthquakes',
                'short' => 'Why the ground shakes, how faults work, and how to stay safe when it does.',
                'level' => 'Beginner',
                'modules' => [
                    'Inside the Earth' => [
                        ['Earth\'s Layers', [
                            ['Crust, mantle and core', '<p>Earth is built in layers. The <strong>crust</strong> is the thin rocky outer skin we live on. Beneath it, the <strong>mantle</strong> is hot rock that flows very slowly over millions of years. At the centre is the <strong>core</strong>, mostly iron and nickel.</p>', 'The crust is broken into large pieces that move on the slowly flowing mantle.'],
                            ['Why the inside is hot', '<p>Heat left over from Earth\'s formation and heat from radioactive elements keep the interior hot. This heat drives slow currents in the mantle that move the pieces of crust above.</p>', null],
                        ]],
                        ['Tectonic Plates', [
                            ['A broken shell', '<p>Earth\'s rigid outer layer is divided into large slabs called <strong>tectonic plates</strong>. They move only a few centimetres a year, about as fast as your fingernails grow.</p>', null],
                            ['Three ways plates meet', '<ul><li><strong>Convergent:</strong> plates push together; one may slide beneath the other.</li><li><strong>Divergent:</strong> plates pull apart and new crust forms.</li><li><strong>Transform:</strong> plates slide past each other sideways.</li></ul>', 'The Philippines sits where several plates meet, which is why earthquakes are common here.'],
                        ]],
                    ],
                    'Faults and Stress' => [
                        ['Stress in Rocks', [
                            ['Three kinds of stress', '<ul><li><strong>Tension</strong> pulls rocks apart.</li><li><strong>Compression</strong> pushes rocks together.</li><li><strong>Shear</strong> slides rocks past each other.</li></ul>', 'Stress builds slowly until rock breaks or suddenly slips.'],
                        ]],
                        ['Faults and Elastic Rebound', [
                            ['What a fault is', '<p>A <strong>fault</strong> is a fracture in the crust where blocks of rock have moved. Friction can lock a fault while stress keeps building.</p>', null],
                            ['The sudden slip', '<p>When stress beats friction, the fault slips and the stored energy is released as <strong>seismic waves</strong>. This is the elastic rebound theory.</p>', 'Stress builds → the fault slips → energy is released → the ground shakes.'],
                        ]],
                    ],
                    'Staying Safe' => [
                        ['Seismic Waves', [
                            ['P, S and surface waves', '<p><strong>P-waves</strong> arrive first and push and pull the ground. <strong>S-waves</strong> follow and shake it side to side. <strong>Surface waves</strong> arrive last and usually cause the most damage.</p>', null],
                        ]],
                        ['Drop, Cover and Hold On', [
                            ['During the shaking', '<p><strong>Drop</strong> to your hands and knees, take <strong>cover</strong> under a sturdy desk or table, and <strong>hold on</strong> until the shaking stops. Stay away from windows and heavy objects.</p>', 'Drop, Cover and Hold On: the safest thing to do in the first seconds.'],
                        ]],
                    ],
                ],
                'games' => [
                    ['Fault Lab', 'fault_lab', 1],
                    ['Shake Town', 'shake_town', 4],
                    ['Quake Ready', 'quake_ready', 6],
                ],
                'quiz' => [
                    'title' => 'Plates and Faults Checkpoint',
                    'questions' => [
                        ['Which layer of the Earth do we live on?', [['Crust', true], ['Mantle', false], ['Outer core', false], ['Inner core', false]]],
                        ['Which stress pushes rocks together?', [['Compression', true], ['Tension', false], ['Shear', false], ['Rebound', false]]],
                        ['Which seismic waves arrive first?', [['P-waves', true], ['S-waves', false], ['Surface waves', false], ['Love waves', false]]],
                    ],
                ],
                'assignment' => ['Family Earthquake Plan', 'Make a one-page earthquake plan for your home: safe spots in each room, the exit route, and where your family meets after the shaking.'],
                'activity' => ['Safe Spots Map', 'Walk through your classroom and mark the safest places to Drop, Cover and Hold On.'],
            ],
            [
                'code' => 'DLT-201',
                'title' => 'Volcanoes',
                'short' => 'How magma forms, why volcanoes erupt, and how communities prepare.',
                'level' => 'Intermediate',
                'modules' => [
                    'Magma and Volcanoes' => [
                        ['Where Magma Comes From', [
                            ['Melting rock', '<p>Deep underground, rock can melt when pressure drops, when water is added, or when it is heated. The melted rock is called <strong>magma</strong>; once it reaches the surface it is called <strong>lava</strong>.</p>', null],
                        ]],
                        ['Types of Volcanoes', [
                            ['Three common shapes', '<ul><li><strong>Shield volcanoes</strong> have gentle slopes from runny lava.</li><li><strong>Stratovolcanoes</strong> are steep and built from layers of lava and ash, like Mayon.</li><li><strong>Cinder cones</strong> are small and steep.</li></ul>', 'Mayon Volcano is a classic stratovolcano.'],
                        ]],
                    ],
                    'Eruptions and Safety' => [
                        ['Why Volcanoes Erupt', [
                            ['Gas and pressure', '<p>Gas dissolved in magma builds pressure. Thick, sticky magma traps gas and leads to explosive eruptions; runny magma lets gas escape and flows out gently.</p>', null],
                        ]],
                        ['Living Near a Volcano', [
                            ['Hazards and warnings', '<p>Hazards include ashfall, lava flows, <strong>pyroclastic flows</strong> and lahars. Monitoring agencies like PHIVOLCS track earthquakes, ground swelling and gas to give early warnings.</p>', 'Follow official alert levels and evacuation orders.'],
                        ]],
                    ],
                ],
                'games' => [
                    ['Volcano Quiz Quest', 'quiz_quest', 2, [
                        ['Melted rock below the surface is called…', 'Magma', ['Lava', 'Ash', 'Basalt']],
                        ['Mayon is an example of a…', 'Stratovolcano', ['Shield volcano', 'Cinder cone', 'Caldera']],
                        ['A fast, hot avalanche of gas and ash is a…', 'Pyroclastic flow', ['Lahar', 'Lava flow', 'Tsunami']],
                    ]],
                ],
                'quiz' => [
                    'title' => 'Volcano Checkpoint',
                    'questions' => [
                        ['What is magma called once it reaches the surface?', [['Lava', true], ['Ash', false], ['Pumice', false], ['Basalt', false]]],
                        ['Which magma tends to cause explosive eruptions?', [['Thick, sticky magma', true], ['Runny magma', false], ['Cool magma', false], ['Any magma', false]]],
                    ],
                ],
                'assignment' => ['Volcano Alert Poster', 'Design a poster that explains one volcanic hazard and what families should do at each alert level.'],
                'activity' => ['Hazard Match', 'Match each volcanic hazard to the safety action that protects people from it.'],
            ],
            [
                'code' => 'DLT-301',
                'title' => 'Weather & Typhoons',
                'short' => 'How weather forms, how typhoons grow, and how to read storm signals.',
                'level' => 'Advanced',
                'modules' => [
                    'How Weather Works' => [
                        ['Air, Water and Heat', [
                            ['The water cycle', '<p>The Sun heats oceans and land. Water <strong>evaporates</strong>, rises, cools and <strong>condenses</strong> into clouds, then falls as <strong>precipitation</strong>.</p>', null],
                            ['Air pressure and wind', '<p>Air moves from high pressure to low pressure, and that moving air is wind. The bigger the pressure difference, the stronger the wind.</p>', null],
                        ]],
                    ],
                    'Typhoons' => [
                        ['How a Typhoon Forms', [
                            ['Warm oceans fuel storms', '<p>Typhoons form over warm ocean water. Rising moist air releases heat as it condenses, which feeds the storm and lowers the pressure at its centre, the <strong>eye</strong>.</p>', 'Warm water is the fuel; that is why typhoons weaken over land.'],
                        ]],
                        ['Storm Signals and Safety', [
                            ['Reading the signals', '<p>PAGASA issues <strong>Tropical Cyclone Wind Signals</strong> from 1 to 5. Higher numbers mean stronger winds are expected. Prepare a go-bag and follow evacuation advice early.</p>', 'Prepare before the signal rises, not after.'],
                        ]],
                    ],
                ],
                'games' => [
                    ['Storm Quiz Quest', 'quiz_quest', 3, [
                        ['Water turning into vapour is called…', 'Evaporation', ['Condensation', 'Precipitation', 'Runoff']],
                        ['The calm centre of a typhoon is the…', 'Eye', ['Wall', 'Band', 'Front']],
                        ['Typhoons get their energy from…', 'Warm ocean water', ['Mountains', 'Cold air', 'The Moon']],
                    ]],
                ],
                'quiz' => [
                    'title' => 'Typhoon Checkpoint',
                    'questions' => [
                        ['Wind blows from…', [['High pressure to low pressure', true], ['Low pressure to high pressure', false], ['Cold to colder air', false], ['Land to space', false]]],
                        ['Who issues storm signals in the Philippines?', [['PAGASA', true], ['PHIVOLCS', false], ['NASA', false], ['DepEd', false]]],
                    ],
                ],
                'assignment' => ['Go-Bag Checklist', 'List what your family needs in a typhoon go-bag and explain why each item matters.'],
                'activity' => ['Signal Sorting', 'Sort storm scenarios into the wind signal that would most likely be raised.'],
            ],
        ];
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
            ['Aaron', 'Santos'], ['Bianca', 'Lim'], ['Carlo', 'Dela Cruz'],
            ['Diana', 'Torres'], ['Enzo', 'Ramos'], ['Frances', 'Garcia'],
            ['Gabriel', 'Aquino'], ['Hazel', 'Villanueva'], ['Ivan', 'Navarro'],
            ['Jasmine', 'Castillo'], ['Kevin', 'Bautista'], ['Leah', 'Flores'],
        ];

        return array_map(function ($d) {
            $email = strtolower($d[0].'.'.str_replace(' ', '', $d[1])).'@student.test';

            return $this->makeUser($d[0], $d[1], $email, 'student');
        }, $definitions);
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
     * @param  array<string, mixed>  $blueprint
     * @param  array<int, User>  $teachers
     * @param  array<int, User>  $students
     */
    private function seedCourse(array $blueprint, User $instructor, array $teachers, array $students): void
    {
        $course = Course::create([
            'course_code' => $blueprint['code'],
            'title' => $blueprint['title'],
            'short_description' => $blueprint['short'],
            'description' => $blueprint['short'].' Each lesson pairs a short flipbook reading with a 3D lab or game, and every module ends with a quick checkpoint.',
            'level' => $blueprint['level'],
            'status' => 'published',
            'instructor_id' => $instructor->id,
            'max_students' => 40,
        ]);

        // Attach the instructor plus one co-teacher via the pivot.
        $coTeacher = $teachers[(array_search($instructor, $teachers, true) + 1) % count($teachers)];
        $course->teachers()->syncWithoutDetaching(array_unique([$instructor->id, $coTeacher->id]));

        $subject = Subject::create([
            'subject_code' => $blueprint['code'].'-S1',
            'subject_title' => $blueprint['title'].' Science',
            'course_id' => $course->id,
        ]);

        $section = Section::create([
            'section_name' => $blueprint['title'].' (Batch '.now()->year.')',
            'subject_id' => $subject->id,
            'course_id' => $course->id,
            'year_level' => '1st Year',
            'semester' => 'First Semester',
            'school_year' => now()->year.'-'.(now()->year + 1),
            'room_code' => 'SCI-'.str_pad((string) random_int(1, 20), 3, '0', STR_PAD_LEFT),
            'teacher_id' => $instructor->id,
        ]);

        $sessions = $this->seedCurriculum($course, $blueprint);

        $this->seedEnrollments($course, $section, $students);
        $this->seedAssessments($course, $section, $instructor, $sessions, $students, $blueprint);
        $this->seedAnnouncements($course, $instructor);
        $this->seedChat($course, $instructor, $students);
        $this->seedProgress($course, $sessions, $students);
    }

    /**
     * Modules → lessons, each lesson a flipbook; games attach to the lesson index they name.
     *
     * @param  array<string, mixed>  $blueprint
     * @return array<int, CourseSession>
     */
    private function seedCurriculum(Course $course, array $blueprint): array
    {
        $allSessions = [];
        $moduleOrder = 0;

        foreach ($blueprint['modules'] as $moduleTitle => $lessons) {
            $module = CourseModule::create([
                'course_id' => $course->id,
                'title' => $moduleTitle,
                'sort_order' => $moduleOrder++,
            ]);

            foreach ($lessons as $lessonOrder => [$lessonTitle, $pages]) {
                $courseSession = CourseSession::create([
                    'module_id' => $module->id,
                    'lesson_group_id' => null,
                    'title' => $lessonTitle,
                    'sort_order' => $lessonOrder,
                ]);

                CourseContentItem::create([
                    'session_id' => $courseSession->id,
                    'type' => 'flipbook',
                    'title' => $lessonTitle,
                    'description' => 'Turn the pages, then try the lab or checkpoint.',
                    'pages' => array_map(fn (array $page, int $i) => [
                        'id' => "p{$courseSession->id}-{$i}",
                        'layout' => 'text',
                        'heading' => $page[0],
                        'body' => $page[1],
                        'highlight' => $page[2] ?? '',
                        'images' => [],
                    ], $pages, array_keys($pages)),
                    'sort_order' => 0,
                ]);

                $allSessions[] = $courseSession;
            }
        }

        foreach ($blueprint['games'] as $gameOrder => $game) {
            [$title, $type, $lessonIndex] = $game;
            CourseGame::create([
                'session_id' => ($allSessions[$lessonIndex] ?? end($allSessions))->id,
                'title' => $title,
                'description' => SimulationGames::isSimulation($type) ? '3D lab with built-in checkpoints.' : 'Answer fast to keep your streak.',
                'game_type' => $type,
                'points' => 100,
                'lives' => 3,
                'config' => ['items' => SimulationGames::isSimulation($type)
                    ? SimulationGames::items($type)
                    : array_map(fn ($item) => ['prompt' => $item[0], 'answer' => $item[1], 'distractors' => $item[2]], $game[3])],
                'sort_order' => 10 + $gameOrder,
            ]);
        }

        // A scheduled live class on the first lesson.
        CourseMeeting::create([
            'session_id' => $allSessions[0]->id,
            'title' => 'Live Kickoff Class',
            'description' => 'Meet your teacher and classmates, and tour the course.',
            'meet_link' => 'https://meet.google.com/abc-defg-hij',
            'scheduled_at' => now()->addDays(3)->setTime(18, 0),
            'timezone' => 'Asia/Manila',
            'duration_minutes' => 60,
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
     * @param  array<string, mixed>  $blueprint
     */
    private function seedAssessments(Course $course, Section $section, User $instructor, array $sessions, array $students, array $blueprint): void
    {
        [$assignmentTitle, $assignmentBrief] = $blueprint['assignment'];

        $assignment = Assignment::create([
            'title' => $assignmentTitle,
            'description' => $assignmentBrief,
            'course_id' => $course->id,
            'section_id' => $section->id,
            'session_id' => ($sessions[2] ?? $sessions[0])->id,
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
                'text_content' => 'Here is my '.strtolower($assignmentTitle).' with the steps my family agreed on.',
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
                    'feedback' => 'Clear and practical. Your plan covers the key safety steps.',
                    'graded_by' => $instructor->id,
                    'graded_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // A published activity (no Eloquent model — insert directly).
        [$activityTitle, $activityBrief] = $blueprint['activity'];
        DB::table('activities')->insert([
            'title' => $activityTitle,
            'description' => $activityBrief,
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

        $this->seedQuiz($course, $section, $instructor, $sessions, $blueprint['quiz']);
    }

    /**
     * @param  array<int, CourseSession>  $sessions
     * @param  array{title: string, questions: array<int, array{0: string, 1: array<int, array{0: string, 1: bool}>}>}  $plan
     */
    private function seedQuiz(Course $course, Section $section, User $instructor, array $sessions, array $plan): void
    {
        $quiz = Quiz::create([
            'title' => $plan['title'],
            'description' => 'A quick checkpoint on what you just learned.',
            'course_id' => $course->id,
            'section_id' => $section->id,
            'session_id' => ($sessions[1] ?? $sessions[0])->id,
            'teacher_id' => $instructor->id,
            'time_limit' => 15,
            'number_of_questions' => count($plan['questions']),
            'attempts_allowed' => 2,
            'points' => 10 * count($plan['questions']),
            'due_date' => now()->addDays(10),
            'status' => 'published',
        ]);

        foreach ($plan['questions'] as $order => [$text, $options]) {
            $question = Question::create([
                'quiz_id' => $quiz->id,
                'question_text' => $text,
                'question_type' => 'multiple_choice',
                'points' => 10,
                'order' => $order,
            ]);

            foreach ($options as $optOrder => [$label, $isCorrect]) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'option_text' => $label,
                    'is_correct' => $isCorrect,
                    'order' => $optOrder,
                ]);
            }
        }
    }

    private function seedAnnouncements(Course $course, User $instructor): void
    {
        \App\Models\Announcement::insert([
            [
                'course_id' => $course->id,
                'user_id' => $instructor->id,
                'body' => 'Welcome to '.$course->title.'! Start with the first flipbook, then try the lab. Your XP and rank start climbing right away.',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ],
            [
                'course_id' => $course->id,
                'user_id' => $instructor->id,
                'body' => 'Reminder: the assignment is due this week. Check the leaderboard to see how the class is doing.',
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
            'description' => 'Questions and discussion for '.$course->title.'.',
        ]);

        $members = array_merge([$instructor], array_slice($students, 0, 6));
        foreach ($members as $member) {
            ChatRoomParticipant::firstOrCreate(
                ['chat_room_id' => $room->id, 'user_id' => $member->id],
                ['last_read_at' => now()]
            );
        }

        $messages = [
            [$instructor, 'Welcome, everyone! Post your questions about the labs here.'],
            [$students[0], 'Finished the first flipbook. The 3D lab is next!'],
            [$students[1], 'I got stuck on one checkpoint. Can we review it in class?'],
            [$instructor, 'Of course. We will go through it together in the live class.'],
        ];

        foreach ($messages as [$author, $body]) {
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
        // The first three students have finished the first two lessons.
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

        // Keep each enrollment's stored progress (leaderboards, rank frames) in step.
        Enrollment::where('course_id', $course->id)->get()->each(fn (Enrollment $enrollment) => $enrollment->recalculateProgress(announce: false));
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
