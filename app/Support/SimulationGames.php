<?php

namespace App\Support;

/**
 * Registry of the ready-made 3D simulation games. Unlike the question-based
 * games, these score against fixed checkpoints rather than teacher-typed items.
 */
class SimulationGames
{
    /**
     * @return array<int, string>
     */
    public static function types(): array
    {
        return [
            FaultLab::GAME_TYPE,
            ShakeTown::GAME_TYPE,
            WaveTank::GAME_TYPE,
            QuakeTracker::GAME_TYPE,
            GroundTest::GAME_TYPE,
            QuakeReady::GAME_TYPE,
        ];
    }

    public static function isSimulation(?string $gameType): bool
    {
        return in_array($gameType, self::types(), true);
    }

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(string $gameType): array
    {
        return match ($gameType) {
            FaultLab::GAME_TYPE => FaultLab::items(),
            ShakeTown::GAME_TYPE => ShakeTown::items(),
            WaveTank::GAME_TYPE => WaveTank::items(),
            QuakeTracker::GAME_TYPE => QuakeTracker::items(),
            GroundTest::GAME_TYPE => GroundTest::items(),
            QuakeReady::GAME_TYPE => QuakeReady::items(),
        };
    }
}
