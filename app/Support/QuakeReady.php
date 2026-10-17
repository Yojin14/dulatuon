<?php

namespace App\Support;

/**
 * Quake Ready is a fixed 3D simulation about earthquake preparedness. Its
 * scored checkpoints live here; the order is part of the contract with the
 * client (resources/js/components/games/quake-ready.tsx).
 */
class QuakeReady
{
    public const GAME_TYPE = 'quake_ready';

    public const SOLVED = 'Solved';

    /**
     * @return array<int, array{prompt: string, answer: string, distractors: array<int, string>}>
     */
    public static function items(): array
    {
        return [
            ['prompt' => 'Get ready: find and fix the 4 dangers in the room.', 'answer' => self::SOLVED, 'distractors' => ['Not solved']],
            ['prompt' => 'Get ready: find the 3 things that keep you safe.', 'answer' => self::SOLVED, 'distractors' => ['Not solved']],
            ['prompt' => 'The room starts to shake hard. What do you do first?', 'answer' => 'Drop, cover and hold on', 'distractors' => ['Run outside', 'Stand next to the window']],
            ['prompt' => 'Do it: drop, take cover and hold on without a wrong move.', 'answer' => self::SOLVED, 'distractors' => ['Not solved']],
            ['prompt' => 'A classmate is hurt. What do you do?', 'answer' => 'Check on them and call for help', 'distractors' => ['Leave them and run', 'Take a photo first']],
            ['prompt' => 'A power line is down and sparking. What do you do?', 'answer' => 'Stay away and report it', 'distractors' => ['Move it out of the way', 'Step over it carefully']],
            ['prompt' => 'The wall has big cracks. What do you do?', 'answer' => 'Go out carefully and stay out until it is checked', 'distractors' => ['Go back in to get your bag', 'Wait inside near the window']],
            ['prompt' => 'A post online says a bigger earthquake will hit at 3 PM. What do you do?', 'answer' => 'Do not share it. Follow PHIVOLCS and official advice', 'distractors' => ['Share it with everyone', 'Believe it because many people shared it']],
            ['prompt' => 'The ground shakes again, a little weaker. What is this, and what do you do?', 'answer' => 'An aftershock. Drop, cover and hold on again', 'distractors' => ['Nothing. Ignore it', 'A sign to go back inside']],
            ['prompt' => 'You are in the mountains, with steep slopes all around. Which danger should you watch for after strong shaking?', 'answer' => 'Landslides', 'distractors' => ['Liquefaction', 'Tsunami']],
            ['prompt' => 'You are on flat, loose ground that is soaked with water. Which danger should you watch for?', 'answer' => 'Liquefaction', 'distractors' => ['Landslides', 'Tsunami']],
            ['prompt' => 'You are near the sea. The shaking was strong and long. What should you do?', 'answer' => 'Move to higher ground. A tsunami may come', 'distractors' => ['Go to the beach to look', 'Stay where you are']],
        ];
    }
}
