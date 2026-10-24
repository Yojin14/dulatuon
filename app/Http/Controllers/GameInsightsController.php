<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseGame;
use App\Models\GameAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class GameInsightsController extends Controller
{
    /** Share of checkpoints a student must get right for the game to count as cleared. */
    private const CLEAR_RATIO = 0.6;

    /**
     * How the class did on one game, for its teachers: totals plus, per checkpoint, how many
     * students got it right and the most common wrong answer. Each student's best attempt counts.
     */
    public function __invoke(Request $request, int $courseId, int $gameId): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'student') {
            abort(403);
        }

        $course = $user->role === 'admin'
            ? Course::findOrFail($courseId)
            : Course::whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))->find($courseId);
        abort_if($course === null, 403);

        $game = CourseGame::whereHas('session.module', fn ($q) => $q->where('course_id', $course->id))->findOrFail($gameId);
        $items = $game->checkpointItems();

        $attempts = GameAttempt::query()
            ->where('game_id', $game->id)
            ->whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->orderBy('id')
            ->get(['id', 'user_id', 'score', 'max_score', 'correct_count', 'total_count', 'time_spent', 'detail']);

        $best = $attempts->groupBy('user_id')->map(
            fn (Collection $rows) => $rows->sortBy([['score', 'desc'], ['id', 'desc']])->first()
        );

        return response()->json([
            'game' => ['id' => $game->id, 'title' => $game->title, 'type' => $game->game_type],
            'players' => $best->count(),
            'attempts' => $attempts->count(),
            'average_attempts' => $best->isEmpty() ? 0 : round($attempts->count() / $best->count(), 1),
            'average_score' => $best->isEmpty() ? 0 : (int) round($best->avg(fn ($a) => $a->max_score > 0 ? $a->score / $a->max_score * 100 : 0)),
            'cleared' => $best->filter(fn ($a) => $a->total_count > 0 && $a->correct_count / $a->total_count >= self::CLEAR_RATIO)->count(),
            'median_time' => $this->median($best->pluck('time_spent')->filter(fn ($t) => $t !== null)->values()->all()),
            'checkpoints' => $this->checkpoints($items, $best->values()),
        ]);
    }

    /**
     * @param  list<array{prompt: string, answer: string}>  $items
     * @param  Collection<int, GameAttempt>  $best
     * @return list<array{index: int, prompt: string, answered: int, correct: int, correct_percent: int, common_wrong: array{answer: string, count: int}|null}>
     */
    private function checkpoints(array $items, Collection $best): array
    {
        $rows = [];
        foreach ($items as $index => $item) {
            $answered = 0;
            $correct = 0;
            $wrong = [];
            foreach ($best as $attempt) {
                $given = $attempt->detail['answers'][$index] ?? null;
                if (! is_string($given) || trim($given) === '') {
                    continue;
                }
                $answered++;
                if (CourseGame::answerMatches($given, (string) ($item['answer'] ?? ''))) {
                    $correct++;
                } else {
                    $key = trim($given);
                    $wrong[$key] = ($wrong[$key] ?? 0) + 1;
                }
            }
            arsort($wrong);
            $commonWrong = array_key_first($wrong);

            $rows[] = [
                'index' => $index,
                'prompt' => (string) ($item['prompt'] ?? 'Checkpoint '.($index + 1)),
                'answered' => $answered,
                'correct' => $correct,
                'correct_percent' => $answered > 0 ? (int) round($correct / $answered * 100) : 0,
                'common_wrong' => $commonWrong === null ? null : ['answer' => (string) $commonWrong, 'count' => $wrong[$commonWrong]],
            ];
        }

        return $rows;
    }

    /**
     * @param  list<int>  $values
     */
    private function median(array $values): ?int
    {
        if ($values === []) {
            return null;
        }
        sort($values);
        $middle = intdiv(count($values), 2);

        return count($values) % 2 === 1
            ? (int) $values[$middle]
            : (int) round(($values[$middle - 1] + $values[$middle]) / 2);
    }
}
