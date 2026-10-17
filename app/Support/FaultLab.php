<?php

namespace App\Support;

/**
 * Fault Lab is a fixed 3D simulation, so its scored checkpoints are defined
 * here instead of being typed in by a teacher. The order is part of the
 * contract with the client (resources/js/components/games/fault-lab.tsx).
 */
class FaultLab
{
    public const GAME_TYPE = 'fault_lab';

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(): array
    {
        $stresses = ['Tension', 'Compression', 'Shear'];
        $motions = [
            'One block drops down',
            'One block is pushed up',
            'The blocks slide sideways',
        ];
        $faults = ['Normal fault', 'Reverse fault', 'Strike-slip fault'];

        return [
            self::item('The ground is being pulled apart. What is this force called?', 'Tension', $stresses),
            self::item('The fault is about to slip from the pulling. What will the blocks do?', 'One block drops down', $motions),
            self::item('The ground is being pushed together. What is this force called?', 'Compression', $stresses),
            self::item('The fault is about to slip from the pushing. What will the blocks do?', 'One block is pushed up', $motions),
            self::item('The two sides are being pushed sideways, in opposite directions. What is this force called?', 'Shear', $stresses),
            self::item('The fault is about to slip from the sideways force. What will the blocks do?', 'The blocks slide sideways', $motions),
            self::item('You kept adding force, but the fault did not move at first. What was holding it?', 'Friction', [
                'Friction',
                'The weight of the houses',
                'Seismic waves',
            ]),
            self::item('Where was the energy just before the fault slipped?', 'Stored in the bent rocks', [
                'Stored in the bent rocks',
                'In the seismic waves',
                'In the air',
            ]),
            self::item('Which point is the focus, where the earthquake started?', 'A', ['A', 'B', 'C']),
            self::item('Which point is the epicenter?', 'B', ['A', 'B', 'C']),
            self::item('Pulling apart (tension) makes a…', 'Normal fault', $faults),
            self::item('Pushing together (compression) makes a…', 'Reverse fault', $faults),
            self::item('Sliding sideways (shear) makes a…', 'Strike-slip fault', $faults),
        ];
    }

    /**
     * @param  array<int, string>  $options
     * @return array{prompt: string, answer: string, distractors: array<int, string>}
     */
    private static function item(string $prompt, string $answer, array $options): array
    {
        return [
            'prompt' => $prompt,
            'answer' => $answer,
            'distractors' => array_values(array_filter($options, fn (string $option): bool => $option !== $answer)),
        ];
    }
}
