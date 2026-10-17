<?php

namespace App\Support;

/**
 * Wave Tank is a fixed 3D simulation about seismic waves. Its scored
 * checkpoints live here; the order is part of the contract with the client
 * (resources/js/components/games/wave-tank.tsx).
 */
class WaveTank
{
    public const GAME_TYPE = 'wave_tank';

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(): array
    {
        return [
            ['prompt' => 'A P wave and an S wave start at the same time. Which reaches the station first?', 'answer' => 'The P wave', 'distractors' => ['The S wave', 'Both at the same time']],
            ['prompt' => 'How do the dots of rock move in a P wave?', 'answer' => 'Back and forth, along the wave', 'distractors' => ['Up and down, across the wave', 'In small circles']],
            ['prompt' => 'How do the dots of rock move in an S wave?', 'answer' => 'Up and down, across the wave', 'distractors' => ['Back and forth, along the wave', 'In small circles']],
            ['prompt' => 'A layer of liquid is in the way. Which wave can pass through it?', 'answer' => 'Only the P wave', 'distractors' => ['Only the S wave', 'Both waves']],
            ['prompt' => 'Wave C moves the ground side to side and stays flat. Which wave is it?', 'answer' => 'Love wave', 'distractors' => ['Rayleigh wave', 'P wave']],
            ['prompt' => 'Wave D makes the ground roll, like a wave on the sea. Which wave is it?', 'answer' => 'Rayleigh wave', 'distractors' => ['Love wave', 'S wave']],
            ['prompt' => 'The station moves farther from the earthquake. What happens to the time gap between the P wave and the S wave?', 'answer' => 'The gap gets bigger', 'distractors' => ['The gap gets smaller', 'The gap stays the same']],
            ['prompt' => 'What can scientists learn from the P–S time gap?', 'answer' => 'How far away the earthquake is', 'distractors' => ['How tall the buildings are', 'What time of day it is']],
        ];
    }
}
