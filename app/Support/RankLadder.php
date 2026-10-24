<?php

namespace App\Support;

/**
 * Student ranks by total XP. Mirrors RANK_LADDER in resources/js/lib/gamification.ts.
 */
class RankLadder
{
    /**
     * @var list<array{name: string, min_xp: int}>
     */
    public const STEPS = [
        ['name' => 'Bronze III', 'min_xp' => 0],
        ['name' => 'Bronze II', 'min_xp' => 50],
        ['name' => 'Bronze I', 'min_xp' => 100],
        ['name' => 'Silver III', 'min_xp' => 150],
        ['name' => 'Silver II', 'min_xp' => 225],
        ['name' => 'Silver I', 'min_xp' => 300],
        ['name' => 'Gold III', 'min_xp' => 400],
        ['name' => 'Gold II', 'min_xp' => 500],
        ['name' => 'Gold I', 'min_xp' => 600],
        ['name' => 'Platinum III', 'min_xp' => 750],
        ['name' => 'Platinum II', 'min_xp' => 900],
        ['name' => 'Platinum I', 'min_xp' => 1050],
        ['name' => 'Diamond', 'min_xp' => 1250],
    ];

    /**
     * Position on the ladder (0 = Bronze III) for a total XP.
     */
    public static function index(int $xp): int
    {
        $index = 0;
        foreach (self::STEPS as $i => $step) {
            if ($xp >= $step['min_xp']) {
                $index = $i;
            }
        }

        return $index;
    }

    public static function name(int $xp): string
    {
        return self::STEPS[self::index($xp)]['name'];
    }
}
