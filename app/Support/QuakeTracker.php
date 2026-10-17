<?php

namespace App\Support;

/**
 * Quake Tracker is a fixed 3D simulation about earthquakes in the Philippines.
 * Its scored checkpoints live here; the order is part of the contract with the
 * client (resources/js/components/games/quake-tracker.tsx).
 */
class QuakeTracker
{
    public const GAME_TYPE = 'quake_tracker';

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(): array
    {
        $source = 'Which fault or trench caused this earthquake?';

        return [
            ['prompt' => $source, 'answer' => 'Philippine Fault Zone', 'distractors' => ['North Bohol Fault', 'Manila Trench']],
            ['prompt' => $source, 'answer' => 'North Bohol Fault', 'distractors' => ['Philippine Fault Zone', 'Philippine Trench']],
            ['prompt' => $source, 'answer' => 'Philippine Fault Zone', 'distractors' => ['Philippine Trench', 'Bogo Bay Fault']],
            ['prompt' => $source, 'answer' => 'Bogo Bay Fault', 'distractors' => ['Philippine Fault Zone', 'North Bohol Fault']],
            ['prompt' => $source, 'answer' => 'Cotabato Trench', 'distractors' => ['Philippine Fault Zone', 'Central Mindanao Fault']],
            ['prompt' => 'Many smaller earthquakes followed the big one, in the same area. What are they called?', 'answer' => 'Aftershocks', 'distractors' => ['Foreshocks', 'Mainshocks']],
            ['prompt' => 'In a group of earthquakes, which one is the mainshock?', 'answer' => 'The largest one', 'distractors' => ['The first one', 'The last one']],
            ['prompt' => 'Someone says: "All earthquakes in the Philippines come from the Philippine Fault Zone." Is that right?', 'answer' => 'No. Other faults and trenches caused earthquakes too', 'distractors' => ['Yes. Every case was on the Philippine Fault Zone', 'Yes. It is the only fault in the country']],
            ['prompt' => 'An earthquake happens near a known fault. Did that fault cause it for sure?', 'answer' => 'Not for sure. Scientists check the location, depth and how the ground moved', 'distractors' => ['Yes. It is always the nearest fault', 'Yes, if the earthquake is strong']],
        ];
    }
}
