import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

const tones = {
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    emerald:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
} as const;

export type StatTone = keyof typeof tones;

export function StatTile({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'violet',
    className,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    tone?: StatTone;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-panel',
                className,
            )}
        >
            <span
                className={cn(
                    'grid size-12 shrink-0 place-items-center rounded-2xl',
                    tones[tone],
                )}
            >
                <Icon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs font-bold text-muted-foreground">
                    {label}
                </p>
                <p className="font-display text-2xl leading-tight font-semibold text-foreground tabular-nums">
                    {value}
                </p>
                {hint && (
                    <p className="truncate text-xs text-muted-foreground">
                        {hint}
                    </p>
                )}
            </div>
        </div>
    );
}
