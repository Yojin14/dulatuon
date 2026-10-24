import {
    RANK_TIERS,
    rankName,
    tierIndex,
    tierStarts,
} from '@/lib/gamification';
import { cn } from '@/lib/utils';
import type { PlayerLevel, RankDivision, RankTier } from '@/types/gamification';
import { Gem, Sparkles } from 'lucide-react';
import { type ReactNode } from 'react';

const ROMAN: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

const EMBLEM_SIZES = {
    xs: { box: 'size-5', text: 'text-[8px]', icon: 'size-3' },
    sm: { box: 'size-8', text: 'text-[11px]', icon: 'size-3.5' },
    md: { box: 'size-11', text: 'text-sm', icon: 'size-5' },
    lg: { box: 'size-16', text: 'text-lg', icon: 'size-7' },
} as const;

/**
 * Hexagon rank emblem in the tier's metal: the division numeral inside (III → I),
 * a gem for Diamond. Dimmed when the tier is still ahead of the student.
 */
export function RankEmblem({
    tier,
    division,
    size = 'md',
    dimmed = false,
    glyph,
    className,
}: {
    tier: RankTier;
    division: RankDivision;
    size?: keyof typeof EMBLEM_SIZES;
    dimmed?: boolean;
    /** Replaces the numeral, e.g. the tier's letter on the ladder. */
    glyph?: ReactNode;
    className?: string;
}) {
    const style = RANK_TIERS[tier];
    const dims = EMBLEM_SIZES[size];

    return (
        <span
            className={cn(
                'relative inline-flex shrink-0',
                dimmed && 'opacity-40 grayscale',
                className,
            )}
            style={{
                filter: dimmed
                    ? undefined
                    : `drop-shadow(0 3px 0 ${style.edge})`,
            }}
            role="img"
            aria-label={`${rankName(tier, division)} rank`}
        >
            <span
                className={cn(
                    'grid place-items-center bg-linear-to-b font-display font-extrabold text-slate-900/80 [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
                    style.gradient,
                    dims.box,
                    dims.text,
                )}
            >
                {tier === 'diamond' ? (
                    <Gem className={cn(dims.icon, 'text-white')} aria-hidden />
                ) : (
                    (glyph ?? (division ? ROMAN[division] : null))
                )}
            </span>
            {tier === 'diamond' && !dimmed && (
                <Sparkles
                    className="absolute -top-1.5 -right-1.5 size-4 text-sky-300"
                    aria-hidden
                />
            )}
        </span>
    );
}

/** Thick rounded XP track with violet fill, matching the game progress bars. */
export function ProgressTrack({
    value,
    className,
    tone = 'violet',
    fillClassName,
}: {
    value: number;
    className?: string;
    tone?: 'violet' | 'stress' | 'emerald' | 'amber';
    /** Overrides the tone's fill, e.g. a rank tier's colours. */
    fillClassName?: string;
}) {
    const fill = {
        violet: 'bg-linear-to-r from-violet-500 to-violet-600',
        stress: 'bg-linear-to-r from-cyan-400 via-amber-400 to-red-500',
        emerald: 'bg-linear-to-r from-emerald-400 to-emerald-600',
        amber: 'bg-linear-to-r from-amber-300 to-amber-500',
    }[tone];

    return (
        <div
            className={cn(
                'h-3 w-full overflow-hidden rounded-full bg-muted ring-1 ring-black/5 ring-inset dark:ring-white/5',
                className,
            )}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
        >
            <div
                className={cn(
                    'h-full rounded-full transition-[width] duration-700 ease-out',
                    fillClassName ?? fill,
                )}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    );
}

/** Rank emblem, rank name in its metal colour, progress to the next rank and what it takes. */
export function XpBar({
    player,
    compact = false,
    className,
}: {
    player: PlayerLevel;
    compact?: boolean;
    className?: string;
}) {
    const style = RANK_TIERS[player.tier];
    const atTop = player.nextRankName === null;

    return (
        <div className={cn('flex items-center gap-3', className)}>
            <RankEmblem
                tier={player.tier}
                division={player.division}
                size={compact ? 'sm' : 'md'}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <span
                        className={cn(
                            'truncate font-display text-sm font-extrabold',
                            style.text,
                        )}
                    >
                        {player.title}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground tabular-nums">
                        {atTop
                            ? `${player.xp} XP`
                            : `${player.xp} / ${player.nextLevelXp} XP`}
                    </span>
                </div>
                <ProgressTrack
                    value={player.levelProgress}
                    fillClassName={style.bar}
                    className={cn('mt-1.5', compact ? 'h-2' : 'h-2.5')}
                />
                {!compact && (
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                        {atTop
                            ? 'Top rank reached'
                            : `${player.xpToNext} XP to ${player.nextRankName}`}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * The five tiers in a row so students see the whole climb: passed tiers in full colour,
 * the current one raised with a "You" marker, the ones ahead dimmed with where they start.
 */
export function RankLadder({
    player,
    compact = false,
    className,
}: {
    player: PlayerLevel;
    /** Smaller emblems for narrow cards, so all five tiers fit without scrolling. */
    compact?: boolean;
    className?: string;
}) {
    const current = tierIndex(player.tier);

    return (
        <ol
            className={cn('grid grid-cols-5 items-end gap-1', className)}
            aria-label="Rank ladder"
        >
            {tierStarts().map(({ tier, minXp }, index) => {
                const isCurrent = index === current;
                const ahead = index > current;
                return (
                    <li
                        key={tier}
                        className="flex min-w-0 flex-col items-center gap-1.5 text-center"
                        aria-current={isCurrent ? 'step' : undefined}
                    >
                        {isCurrent ? (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-900">
                                You
                            </span>
                        ) : (
                            <span className="h-[18px]" aria-hidden />
                        )}
                        <RankEmblem
                            tier={tier}
                            division={isCurrent ? player.division : null}
                            size={
                                isCurrent
                                    ? compact
                                        ? 'md'
                                        : 'lg'
                                    : compact
                                      ? 'sm'
                                      : 'md'
                            }
                            dimmed={ahead}
                            glyph={
                                isCurrent
                                    ? undefined
                                    : RANK_TIERS[tier].label[0]
                            }
                        />
                        <span
                            className={cn(
                                'max-w-full truncate font-extrabold',
                                compact ? 'text-[11px]' : 'text-xs',
                                ahead ? 'text-white/45' : 'text-white',
                            )}
                        >
                            {RANK_TIERS[tier].label}
                        </span>
                        <span className="text-[10px] font-semibold text-white/45 tabular-nums">
                            {minXp === 0 ? 'Start' : `${minXp} XP`}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
