import type { PlayerLevel, RankDivision, RankTier } from '@/types/gamification';

/** XP rules live on the server (App\Support\StudentProgress); kept here for display copy. */
export const XP_PER_ITEM = 10;
export const XP_PER_COURSE_CLEAR = 100;

/**
 * Tier colours used by every rank surface (emblem, name, progress bar, ladder).
 * Each tier is a real metal or mineral, so the familiar game ladder stays on-theme.
 */
export const RANK_TIERS: Record<
    RankTier,
    { label: string; gradient: string; edge: string; text: string; bar: string }
> = {
    bronze: {
        label: 'Bronze',
        gradient: 'from-[#e2a272] to-[#a8613a]',
        edge: '#7a4325',
        text: 'text-[#9a5730] dark:text-[#f0b48a]',
        bar: 'bg-linear-to-r from-[#d9925f] to-[#a8613a]',
    },
    silver: {
        label: 'Silver',
        gradient: 'from-[#eef2f6] to-[#9aa6b6]',
        edge: '#6b7686',
        text: 'text-[#56606e] dark:text-[#d5dce6]',
        bar: 'bg-linear-to-r from-[#c7d0db] to-[#8e9aab]',
    },
    gold: {
        label: 'Gold',
        gradient: 'from-[#fde68a] to-[#f59e0b]',
        edge: '#b45309',
        text: 'text-[#a16207] dark:text-[#fcd34d]',
        bar: 'bg-linear-to-r from-[#fcd34d] to-[#f59e0b]',
    },
    platinum: {
        label: 'Platinum',
        gradient: 'from-[#a7f3e8] to-[#14b8a6]',
        edge: '#0f766e',
        text: 'text-[#0f766e] dark:text-[#5eead4]',
        bar: 'bg-linear-to-r from-[#5eead4] to-[#14b8a6]',
    },
    diamond: {
        label: 'Diamond',
        gradient: 'from-[#bae6fd] via-[#818cf8] to-[#8b5cf6]',
        edge: '#5b21b6',
        text: 'text-[#6d28d9] dark:text-[#c4b5fd]',
        bar: 'bg-linear-to-r from-[#7dd3fc] via-[#818cf8] to-[#8b5cf6]',
    },
};

const TIER_ORDER: RankTier[] = [
    'bronze',
    'silver',
    'gold',
    'platinum',
    'diamond',
];

/** The rank ladder: where each rank starts, in XP. Tune thresholds here only. */
export const RANK_LADDER: {
    tier: RankTier;
    division: RankDivision;
    minXp: number;
}[] = [
    { tier: 'bronze', division: 3, minXp: 0 },
    { tier: 'bronze', division: 2, minXp: 50 },
    { tier: 'bronze', division: 1, minXp: 100 },
    { tier: 'silver', division: 3, minXp: 150 },
    { tier: 'silver', division: 2, minXp: 225 },
    { tier: 'silver', division: 1, minXp: 300 },
    { tier: 'gold', division: 3, minXp: 400 },
    { tier: 'gold', division: 2, minXp: 500 },
    { tier: 'gold', division: 1, minXp: 600 },
    { tier: 'platinum', division: 3, minXp: 750 },
    { tier: 'platinum', division: 2, minXp: 900 },
    { tier: 'platinum', division: 1, minXp: 1050 },
    { tier: 'diamond', division: null, minXp: 1250 },
];

const ROMAN: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

export function rankName(tier: RankTier, division: RankDivision): string {
    return division
        ? `${RANK_TIERS[tier].label} ${ROMAN[division]}`
        : RANK_TIERS[tier].label;
}

/** Where each tier starts, for the ladder view. */
export function tierStarts(): { tier: RankTier; minXp: number }[] {
    return TIER_ORDER.map((tier) => ({
        tier,
        minXp: RANK_LADDER.find((step) => step.tier === tier)!.minXp,
    }));
}

export function tierIndex(tier: RankTier): number {
    return TIER_ORDER.indexOf(tier);
}

/** The student's rank for a total XP: Bronze III at 0 up to Diamond at the top. */
export function computeLevel(xp: number): PlayerLevel {
    const safeXp = Math.max(0, xp);
    let index = 0;
    while (
        index + 1 < RANK_LADDER.length &&
        RANK_LADDER[index + 1].minXp <= safeXp
    ) {
        index++;
    }

    const current = RANK_LADDER[index];
    const next = RANK_LADDER[index + 1] ?? null;
    const span = next ? next.minXp - current.minXp : 0;

    return {
        xp: safeXp,
        level: index + 1,
        levelFloorXp: current.minXp,
        nextLevelXp: next ? next.minXp : current.minXp,
        levelProgress: next
            ? Math.floor(((safeXp - current.minXp) / span) * 100)
            : 100,
        title: rankName(current.tier, current.division),
        tier: current.tier,
        division: current.division,
        nextRankName: next ? rankName(next.tier, next.division) : null,
        xpToNext: next ? next.minXp - safeXp : 0,
    };
}

/** Alias that reads better at call sites that only care about the rank. */
export const computeRank = computeLevel;
