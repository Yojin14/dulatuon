<?php

namespace App\Support;

/**
 * The ready-made pixel characters in public/avatars/pixel (DiceBear "Pixel Art", CC0).
 * Mirrors resources/js/lib/avatar-presets.ts.
 */
class AvatarPresets
{
    public const GENDERS = ['male', 'female', 'unspecified'];

    public const PER_SET = 12;

    /**
     * @return list<string>
     */
    public static function ids(): array
    {
        $ids = [];
        foreach (['boy', 'girl'] as $set) {
            for ($i = 1; $i <= self::PER_SET; $i++) {
                $ids[] = sprintf('%s-%02d', $set, $i);
            }
        }

        return $ids;
    }

    public static function url(string $id): string
    {
        return "/avatars/pixel/{$id}.svg";
    }
}
