/**
 * Rank view-model. Total XP comes from the server (App\Support\StudentProgress);
 * the rank for that XP is worked out in resources/js/lib/gamification.ts.
 */
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/** Division within a tier: 3 is the entry step, 1 the last before the next tier. Diamond has none. */
export type RankDivision = 1 | 2 | 3 | null;

export interface PlayerLevel {
    xp: number;
    /** Position on the rank ladder, 1 (Bronze III) to 13 (Diamond). */
    level: number;
    /** XP at the start of the current rank. */
    levelFloorXp: number;
    /** XP needed to reach the next rank (equal to the floor at the top rank). */
    nextLevelXp: number;
    /** 0–100 progress within the current rank. */
    levelProgress: number;
    /** Rank name, e.g. "Gold II". */
    title: string;
    tier: RankTier;
    division: RankDivision;
    /** Next rank's name, or null at the top. */
    nextRankName: string | null;
    xpToNext: number;
}
