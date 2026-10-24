/** Mirrors App\Support\AvatarPresets: pixel characters in public/avatars/pixel (DiceBear "Pixel Art", CC0). */
export type Gender = 'male' | 'female' | 'unspecified';

export interface AvatarPreset {
    id: string;
    set: 'boy' | 'girl';
    src: string;
}

const PER_SET = 12;

export const AVATAR_PRESETS: AvatarPreset[] = (
    ['boy', 'girl'] as const
).flatMap((set) =>
    Array.from({ length: PER_SET }, (_, index) => {
        const id = `${set}-${String(index + 1).padStart(2, '0')}`;

        return { id, set, src: `/avatars/pixel/${id}.svg` };
    }),
);

/** Characters that match a gender; everyone else sees the whole set. */
export function presetsFor(gender: Gender | null | undefined): AvatarPreset[] {
    if (gender === 'male') {
        return AVATAR_PRESETS.filter((preset) => preset.set === 'boy');
    }
    if (gender === 'female') {
        return AVATAR_PRESETS.filter((preset) => preset.set === 'girl');
    }

    return AVATAR_PRESETS;
}

export function presetIdFromSrc(src: string | null | undefined): string | null {
    return AVATAR_PRESETS.find((preset) => preset.src === src)?.id ?? null;
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unspecified', label: 'Prefer not to say' },
];
