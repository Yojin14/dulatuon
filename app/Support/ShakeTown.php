<?php

namespace App\Support;

/**
 * Shake Town is a fixed 3D simulation about focal depth, magnitude and
 * intensity. Its scored checkpoints live here; the order is part of the
 * contract with the client (resources/js/components/games/shake-town.tsx).
 */
class ShakeTown
{
    public const GAME_TYPE = 'shake_town';

    public const SOLVED = 'Solved';

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(): array
    {
        return [
            self::item(
                'Two earthquakes have the same magnitude (6.0). One starts 10 km deep, the other 300 km deep. Which shakes the town above it more?',
                'The shallow one (10 km)',
                ['The deep one (300 km)', 'Both the same'],
            ),
            self::item(
                'Why did the deep earthquake shake the town less?',
                'Its waves had to travel much farther to reach the town',
                ['It had less energy', 'Deep rocks cannot make waves'],
            ),
            self::item(
                'Which earthquake will damage the town above it more?',
                'Magnitude 5.5, 8 km deep',
                ['Magnitude 6.5, 250 km deep', 'Both the same'],
            ),
            self::item(
                'Look at your magnitude 6.5 run at 250 km. How did the towns feel it?',
                'All towns felt it, at about the same weak level',
                ['Only the town above felt it', 'The farthest town felt it most'],
            ),
            self::item(
                'One earthquake is coming: magnitude 6.4, 12 km deep. Will every town feel the same intensity?',
                'No, towns farther away will feel it less',
                ['Yes, one earthquake has one intensity', 'No, towns farther away will feel it more'],
            ),
            self::item(
                'That was one earthquake. How many magnitudes did it have?',
                'One. Magnitude is the energy released at the source',
                ['One for each town', 'It depends on the ground'],
            ),
            self::item(
                'What does intensity tell us?',
                'How strong the shaking is at one place',
                ['How much energy the earthquake released', 'How deep the earthquake started'],
            ),
            self::item(
                'Towns B and C are the same distance away, but C shook more. Look at the ground under C. Why?',
                'C is on soft ground, which makes shaking stronger',
                ['C is closer to the focus', 'C has stronger buildings'],
            ),
            self::item(
                'Challenge: make Town A feel Intensity VII or more while Town D feels Intensity IV or less.',
                self::SOLVED,
                ['Not solved'],
            ),
            self::item(
                'Challenge: make every town feel it (Intensity III or more), but keep every town below Intensity VI.',
                self::SOLVED,
                ['Not solved'],
            ),
        ];
    }

    /**
     * @param  array<int, string>  $distractors
     * @return array{prompt: string, answer: string, distractors: array<int, string>}
     */
    private static function item(string $prompt, string $answer, array $distractors): array
    {
        return ['prompt' => $prompt, 'answer' => $answer, 'distractors' => $distractors];
    }
}
