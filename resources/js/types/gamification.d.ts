/**
 * Gamification view-model. Derived client-side from existing props today;
 * the backend can later send these fields directly with the same shape.
 */
export interface CourseProgressInput {
    id: number;
    title: string;
    completed: number;
    total: number;
    progress: number;
}

export interface PlayerLevel {
    xp: number;
    level: number;
    /** XP at the start of the current level. */
    levelFloorXp: number;
    /** XP needed to reach the next level. */
    nextLevelXp: number;
    /** 0–100 progress within the current level. */
    levelProgress: number;
    title: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    earned: boolean;
    /** 0–100 for locked achievements that track progress. */
    progress: number;
    tone: 'violet' | 'amber' | 'emerald' | 'sky' | 'orange';
}
