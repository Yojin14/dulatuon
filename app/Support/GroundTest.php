<?php

namespace App\Support;

/**
 * Ground Test is a fixed 3D simulation about how earthquakes change the land.
 * Its scored checkpoints live here; the order is part of the contract with the
 * client (resources/js/components/games/ground-test.tsx).
 */
class GroundTest
{
    public const GAME_TYPE = 'ground_test';

    public const SOLVED = 'Solved';

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(): array
    {
        return [
            ['prompt' => 'Strong shaking hits a steep hillside. What can happen?', 'answer' => 'A landslide', 'distractors' => ['Liquefaction', 'Nothing at all']],
            ['prompt' => 'What made the landslide happen?', 'answer' => 'A steep slope and strong shaking', 'distractors' => ['Flat ground and weak shaking', 'A fault breaking the surface']],
            ['prompt' => 'Strong shaking hits flat ground that is loose and soaked with water. What can happen?', 'answer' => 'Liquefaction: the ground acts like a liquid', 'distractors' => ['A landslide', 'Ground rupture']],
            ['prompt' => 'Which three things are needed for liquefaction?', 'answer' => 'Loose soil, lots of water and strong shaking', 'distractors' => ['Solid rock, dry ground and weak shaking', 'A steep slope, dry ground and strong shaking']],
            ['prompt' => 'Challenge: keep the shaking strong, but change the ground so liquefaction does not happen.', 'answer' => self::SOLVED, 'distractors' => ['Not solved']],
            ['prompt' => 'The fault movement reaches all the way to the surface. What will you see?', 'answer' => 'The ground is cut and shifted', 'distractors' => ['The ground turns to liquid', 'Nothing changes']],
            ['prompt' => 'Does every earthquake break the ground surface?', 'answer' => 'No. Only when the fault movement reaches the surface', 'distractors' => ['Yes, always', 'Only weak earthquakes do']],
            ['prompt' => 'Challenge: set up the land so strong shaking causes no landslide, no liquefaction and no ground rupture.', 'answer' => self::SOLVED, 'distractors' => ['Not solved']],
        ];
    }
}
