<?php

namespace App\Support;

/**
 * The ready-made pixel characters in public/avatars/pixel: the team's own portraits first,
 * then the DiceBear "Pixel Art" set (CC0). Mirrors resources/js/lib/avatar-presets.ts.
 */
class AvatarPresets
{
    public const GENDERS = ['male', 'female', 'unspecified'];

    public const PER_SET = 12;

    /**
     * Hand-made portraits (WebP), keyed by id.
     *
     * @var array<string, 'boy'|'girl'>
     */
    public const FEATURED = [
        'shellou' => 'girl',
        'fhel' => 'boy',
        'eugz' => 'boy',
    ];

    /**
     * @return list<string>
     */
    public static function ids(): array
    {
        $ids = array_keys(self::FEATURED);
        foreach (['boy', 'girl'] as $set) {
            for ($i = 1; $i <= self::PER_SET; $i++) {
                $ids[] = sprintf('%s-%02d', $set, $i);
            }
        }

        return $ids;
    }

    public static function url(string $id): string
    {
        $extension = array_key_exists($id, self::FEATURED) ? 'webp' : 'svg';

        return "/avatars/pixel/{$id}.{$extension}";
    }
}
