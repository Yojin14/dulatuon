<?php

namespace App\Http\Controllers;

use App\Events\GameLeaderboardUpdated;
use App\Models\Course;
use App\Models\CourseGame;
use App\Models\Enrollment;
use App\Models\GameAttempt;
use App\Support\Realtime;
use App\Support\SimulationGames;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GamePlayController extends Controller
{
    /**
     * Render the interactive play page for a game.
     */
    public function play(CourseGame $game): Response
    {
        $game->load('session.module');
        $courseId = $game->session->module->course_id;
        $this->authoriseAccess($courseId);

        return Inertia::render('games/play', [
            'game' => [
                'id' => $game->id,
                'courseId' => $courseId,
                'title' => $game->title,
                'description' => $game->description ?? '',
                'gameType' => $game->game_type,
                'points' => $game->points,
                'lives' => $game->lives,
                'items' => $this->items($game),
            ],
            'me' => $this->meState($game),
            'leaderboard' => $this->leaderboard($game),
            'isPreview' => auth()->user()->role !== 'student',
        ]);
    }

    /**
     * Record a finished play-through and return the graded result.
     */
    public function storeAttempt(Request $request, CourseGame $game): JsonResponse
    {
        $game->load('session.module');
        $courseId = $game->session->module->course_id;
        $this->authoriseAccess($courseId);

        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*' => 'nullable|string',
            'timeSpent' => 'nullable|integer|min:0|max:86400',
        ]);

        // Enforce lives before recording anything.
        $lives = $this->livesState($game);
        if ($lives['remaining'] !== null && $lives['remaining'] <= 0) {
            return response()->json([
                'message' => 'You are out of lives for this game. Come back later to play again.',
                'nextResetAt' => $lives['nextResetAt'],
            ], 429);
        }

        $items = $this->items($game);
        $total = count($items);
        $correct = 0;

        foreach ($items as $index => $item) {
            $given = $data['answers'][$index] ?? null;
            if (is_string($given) && $this->matches($given, $item['answer'] ?? '')) {
                $correct++;
            }
        }

        $score = $total > 0 ? (int) round($game->points * ($correct / $total)) : 0;

        GameAttempt::create([
            'game_id' => $game->id,
            'user_id' => auth()->id(),
            'score' => $score,
            'max_score' => $game->points,
            'correct_count' => $correct,
            'total_count' => $total,
            'time_spent' => $data['timeSpent'] ?? null,
            'detail' => ['answers' => $data['answers']],
            'completed_at' => now(),
        ]);

        Realtime::dispatch(fn () => broadcast(new GameLeaderboardUpdated($courseId, $game->id, $this->globalLeaderboard($game))));

        return response()->json([
            'score' => $score,
            'maxScore' => $game->points,
            'correctCount' => $correct,
            'totalCount' => $total,
            'me' => $this->meState($game->refresh()),
            'leaderboard' => $this->leaderboard($game),
        ], 201);
    }

    /**
     * Simulation games always use their current built-in checkpoints, so wording
     * changes reach games that were added earlier; other games use the teacher's items.
     *
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    private function items(CourseGame $game): array
    {
        if (SimulationGames::isSimulation($game->game_type)) {
            return SimulationGames::items($game->game_type);
        }

        return $game->config['items'] ?? [];
    }

    /**
     * The current viewer's personal stats: best score/time and remaining lives.
     *
     * @return array{bestScore: int|null, bestTime: int|null, livesTotal: int, livesRemaining: int|null, nextResetAt: string|null}
     */
    private function meState(CourseGame $game): array
    {
        $userId = auth()->id();
        $best = GameAttempt::where('game_id', $game->id)
            ->where('user_id', $userId)
            ->orderByDesc('score')
            ->orderByRaw('time_spent is null, time_spent asc')
            ->first();

        $lives = $this->livesState($game);

        return [
            'bestScore' => $best?->score,
            'bestTime' => $best?->time_spent,
            'livesTotal' => $lives['total'],
            'livesRemaining' => $lives['remaining'],
            'nextResetAt' => $lives['nextResetAt'],
        ];
    }

    /**
     * Lives are spent per recorded attempt and regenerate on a rolling 24h window.
     * A `null` remaining means unlimited (game configured with 0 lives).
     *
     * @return array{total: int, remaining: int|null, nextResetAt: string|null}
     */
    private function livesState(CourseGame $game): array
    {
        if ($game->lives <= 0) {
            return ['total' => $game->lives, 'remaining' => null, 'nextResetAt' => null];
        }

        $windowStart = now()->subDay();
        $recent = GameAttempt::where('game_id', $game->id)
            ->where('user_id', auth()->id())
            ->where('created_at', '>=', $windowStart)
            ->orderBy('created_at')
            ->get(['created_at']);

        $remaining = max(0, $game->lives - $recent->count());
        $nextResetAt = $recent->isNotEmpty()
            ? $recent->first()->created_at->copy()->addDay()->toIso8601String()
            : null;

        return ['total' => $game->lives, 'remaining' => $remaining, 'nextResetAt' => $nextResetAt];
    }

    /**
     * Best attempt per user, ranked: highest score first, then fastest time.
     *
     * @return \Illuminate\Support\Collection<int, GameAttempt>
     */
    private function bestPerUser(CourseGame $game): \Illuminate\Support\Collection
    {
        $cmp = fn ($a, $b) => [$b->score, $a->time_spent ?? PHP_INT_MAX] <=> [$a->score, $b->time_spent ?? PHP_INT_MAX];

        return GameAttempt::query()
            ->where('game_id', $game->id)
            ->whereHas('user', fn ($q) => $q->where('role', 'student'))
            ->with('user:id,name')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->sort($cmp)->first())
            ->values()
            ->sort($cmp)
            ->values();
    }

    /**
     * Global leaderboard (top 20 + player count). Shared by the page payload and
     * realtime broadcasts — `isMe` is left to the client to compute per viewer.
     *
     * @return array{top: array<int, array<string, mixed>>, totalPlayers: int}
     */
    private function globalLeaderboard(CourseGame $game): array
    {
        $best = $this->bestPerUser($game);

        return [
            'top' => $best->take(20)->values()->map(fn ($a, $i) => [
                'rank' => $i + 1,
                'userId' => $a->user_id,
                'name' => $a->user?->name ?? 'Student',
                'score' => $a->score,
                'timeSpent' => $a->time_spent,
            ])->toArray(),
            'totalPlayers' => $best->count(),
        ];
    }

    /**
     * The global leaderboard plus the current viewer's own rank (for the page payload).
     *
     * @return array{top: array<int, array<string, mixed>>, me: array<string, mixed>|null, totalPlayers: int}
     */
    private function leaderboard(CourseGame $game): array
    {
        $best = $this->bestPerUser($game);
        $meId = auth()->id();
        $me = null;

        foreach ($best as $i => $attempt) {
            if ($attempt->user_id === $meId) {
                $me = ['rank' => $i + 1, 'score' => $attempt->score, 'timeSpent' => $attempt->time_spent];
                break;
            }
        }

        return [
            'top' => $best->take(20)->values()->map(fn ($a, $i) => [
                'rank' => $i + 1,
                'userId' => $a->user_id,
                'name' => $a->user?->name ?? 'Student',
                'score' => $a->score,
                'timeSpent' => $a->time_spent,
            ])->toArray(),
            'me' => $me,
            'totalPlayers' => $best->count(),
        ];
    }

    /**
     * Students must be enrolled; teachers/admins may preview their own courses.
     */
    private function authoriseAccess(int $courseId): void
    {
        $user = auth()->user();

        if ($user->role === 'admin') {
            return;
        }

        if ($user->role === 'teacher') {
            $teaches = Course::where('id', $courseId)
                ->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id))
                ->exists();
            abort_unless($teaches, 403);

            return;
        }

        Enrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->where('status', 'active')
            ->firstOrFail();
    }

    private function matches(string $given, string $answer): bool
    {
        return mb_strtolower(trim($given)) === mb_strtolower(trim($answer));
    }
}
