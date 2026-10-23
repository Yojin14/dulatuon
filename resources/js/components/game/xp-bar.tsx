import { cn } from '@/lib/utils';
import type { PlayerLevel } from '@/types/gamification';
import { Star } from 'lucide-react';

export function LevelBadge({ level, className }: { level: number; className?: string }) {
    return (
        <span
            className={cn(
                'relative inline-grid size-10 shrink-0 place-items-center rounded-xl bg-violet-600 font-display text-base font-bold text-white shadow-[0_3px_0_0_var(--color-violet-800)]',
                className,
            )}
            aria-label={`Level ${level}`}
        >
            {level}
            <Star className="absolute -top-1.5 -right-1.5 size-4 fill-amber-400 text-amber-500" aria-hidden />
        </span>
    );
}

/** Thick rounded XP track with violet fill, matching the game progress bars. */
export function ProgressTrack({ value, className, tone = 'violet' }: { value: number; className?: string; tone?: 'violet' | 'stress' | 'emerald' | 'amber' }) {
    const fill = {
        violet: 'bg-linear-to-r from-violet-500 to-violet-600',
        stress: 'bg-linear-to-r from-cyan-400 via-amber-400 to-red-500',
        emerald: 'bg-linear-to-r from-emerald-400 to-emerald-600',
        amber: 'bg-linear-to-r from-amber-300 to-amber-500',
    }[tone];

    return (
        <div
            className={cn('h-3 w-full overflow-hidden rounded-full bg-muted ring-1 ring-black/5 ring-inset dark:ring-white/5', className)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
        >
            <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

export function XpBar({ player, compact = false, className }: { player: PlayerLevel; compact?: boolean; className?: string }) {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <LevelBadge level={player.level} className={compact ? 'size-8 text-sm' : undefined} />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-extrabold text-foreground">{player.title}</span>
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground tabular-nums">
                        {player.xp - player.levelFloorXp}/{player.nextLevelXp - player.levelFloorXp} XP
                    </span>
                </div>
                <ProgressTrack value={player.levelProgress} className={cn('mt-1.5', compact ? 'h-2' : 'h-2.5')} />
            </div>
        </div>
    );
}
