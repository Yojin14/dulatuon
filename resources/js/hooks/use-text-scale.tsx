import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { type SharedData } from '@/types';

export type TextScale = 'small' | 'medium' | 'large' | 'extra-large';

export const TEXT_SCALE_OPTIONS: { value: TextScale; label: string }[] = [
    { value: 'extra-large', label: 'Extra Large' },
    { value: 'large', label: 'Large' },
    { value: 'medium', label: 'Medium' },
    { value: 'small', label: 'Small' },
];

const storageKey = (userId: number | string | undefined) =>
    userId ? `text-scale:${userId}` : 'text-scale';

const applyTextScale = (scale: TextScale) => {
    document.documentElement.setAttribute('data-text-scale', scale);
};

// Reads the user ID from the Inertia page data embedded in the DOM so we can
// apply the correct scale before React hydrates (no usePage() available yet).
export function initializeTextScale() {
    try {
        const el = document.getElementById('app');
        const page = el ? JSON.parse(el.dataset.page ?? '{}') : {};
        const userId = page?.props?.auth?.user?.id;
        const saved = (localStorage.getItem(storageKey(userId)) as TextScale) || 'medium';
        applyTextScale(saved);
    } catch {
        applyTextScale('medium');
    }
}

export function useTextScale() {
    const { auth } = usePage<SharedData>().props;
    const userId = auth?.user?.id;
    const key = storageKey(userId);

    const [textScale, setTextScale] = useState<TextScale>('medium');

    const updateTextScale = useCallback(
        (scale: TextScale) => {
            setTextScale(scale);
            localStorage.setItem(key, scale);
            applyTextScale(scale);
        },
        [key],
    );

    useEffect(() => {
        const saved = (localStorage.getItem(key) as TextScale) || 'medium';
        // eslint-disable-next-line react-hooks/set-state-in-effect
        updateTextScale(saved);
    }, [key, updateTextScale]);

    return { textScale, updateTextScale } as const;
}
