<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuizAttemptRequest;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizAttemptController extends Controller
{
    /**
     * The student's saved result for a quiz: latest answers plus their best score.
     */
    public function index(Request $request, int $courseId, int $quizId): JsonResponse
    {
        $quiz = $this->quizFor($request, $courseId, $quizId);

        return response()->json($this->summary($quiz, $request->user()->id));
    }

    /**
     * Grade and save an attempt. The score is worked out here from the stored answer key;
     * anything the browser says about the score is ignored. Retakes are unlimited.
     */
    public function store(StoreQuizAttemptRequest $request, int $courseId, int $quizId): JsonResponse
    {
        $quiz = $this->quizFor($request, $courseId, $quizId);
        $questions = $quiz->questions()->with('options')->get();
        $answers = $request->validated('answers');
        $userId = $request->user()->id;

        DB::transaction(function () use ($quiz, $questions, $answers, $userId, $request): void {
            $correct = 0;
            $rows = [];
            foreach ($questions as $index => $question) {
                $choice = $answers[$index] ?? null;
                $option = $choice === null ? null : $question->options->values()->get($choice);
                $isCorrect = (bool) $option?->is_correct;
                $correct += $isCorrect ? 1 : 0;
                $rows[] = [
                    'quiz_id' => $quiz->id,
                    'question_id' => $question->id,
                    'question_option_id' => $option?->id,
                    'is_correct' => $isCorrect,
                    'points_earned' => $isCorrect ? 1 : 0,
                ];
            }

            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'user_id' => $userId,
                'attempt_number' => (int) QuizAttempt::where('quiz_id', $quiz->id)->where('user_id', $userId)->max('attempt_number') + 1,
                'score' => $questions->isEmpty() ? 0 : round($correct / $questions->count() * 100, 2),
                'time_spent' => $request->validated('timeSpent'),
                'status' => 'submitted',
                'started_at' => now()->subSeconds((int) $request->validated('timeSpent', 0)),
                'completed_at' => now(),
            ]);
            $attempt->answers()->createMany($rows);
        });

        return response()->json($this->summary($quiz, $userId), 201);
    }

    private function quizFor(Request $request, int $courseId, int $quizId): Quiz
    {
        Enrollment::where('user_id', $request->user()->id)
            ->where('course_id', $courseId)
            ->where('status', 'active')
            ->firstOrFail();

        return Quiz::where('course_id', $courseId)->findOrFail($quizId);
    }

    /**
     * @return array{attempts: int, best: int|null, latest: array{answers: list<int|null>, score: int, correct: int, total: int, attempt: int, completedAt: string|null}|null}
     */
    private function summary(Quiz $quiz, int $userId): array
    {
        $attempts = QuizAttempt::where('quiz_id', $quiz->id)->where('user_id', $userId);
        $latest = (clone $attempts)->with('answers')->latest('id')->first();

        if ($latest === null) {
            return ['attempts' => 0, 'best' => null, 'latest' => null];
        }

        $questions = $quiz->questions()->with('options:id,question_id,order')->get(['id', 'quiz_id', 'order']);
        $byQuestion = $latest->answers->keyBy('question_id');
        $choices = $questions->map(function ($question) use ($byQuestion) {
            $optionId = $byQuestion->get($question->id)?->question_option_id;
            $index = $optionId === null ? false : $question->options->values()->search(fn ($option) => $option->id === $optionId);

            return $index === false ? null : $index;
        })->values()->all();

        return [
            'attempts' => (clone $attempts)->count(),
            'best' => (int) round((clone $attempts)->max('score')),
            'latest' => [
                'answers' => $choices,
                'score' => (int) round($latest->score),
                'correct' => $latest->answers->where('is_correct', true)->count(),
                'total' => $questions->count(),
                'attempt' => $latest->attempt_number,
                'completedAt' => $latest->completed_at?->toIso8601String(),
            ],
        ];
    }
}
