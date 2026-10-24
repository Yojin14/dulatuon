import { cn } from '@/lib/utils';
import { type ComponentProps } from 'react';

const tones = {
    dark: 'bg-slate-900/75 text-white backdrop-blur-sm',
    violet: 'bg-violet-600 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-600 text-white',
    yellow: 'bg-amber-400 text-amber-950',
    green: 'bg-emerald-600 text-white',
    light: 'bg-white/90 text-slate-800 ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/10',
} as const;

export type HudPillTone = keyof typeof tones;

/** Pill label in the style of the 3D scene's floating sprite labels. */
export function HudPill({
    tone = 'dark',
    className,
    ...props
}: ComponentProps<'span'> & { tone?: HudPillTone }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0',
                tones[tone],
                className,
            )}
            {...props}
        />
    );
}
