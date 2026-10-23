import type { Achievement, CourseProgressInput, PlayerLevel } from '@/types/gamification';

export const XP_PER_ITEM = 10;
export const XP_PER_COURSE_CLEAR = 100;

const RANK_TITLES = ['Rookie Explorer', 'Field Scout', 'Lab Apprentice', 'Junior Scientist', 'Researcher', 'Senior Scientist', 'Expert', 'Master Scientist'];

/** Total XP required to reach the start of `level` (level 1 starts at 0). */
export function xpForLevel(level: number): number {
    const n = Math.max(0, level - 1);

    return 25 * n * (n + 1);
}

export function computeXp(courses: CourseProgressInput[]): number {
    return courses.reduce((sum, course) => {
        const cleared = course.total > 0 && course.completed >= course.total;

        return sum + course.completed * XP_PER_ITEM + (cleared ? XP_PER_COURSE_CLEAR : 0);
    }, 0);
}

export function computeLevel(xp: number): PlayerLevel {
    let level = 1;
    while (xpForLevel(level + 1) <= xp) {
        level++;
    }

    const levelFloorXp = xpForLevel(level);
    const nextLevelXp = xpForLevel(level + 1);
    const span = nextLevelXp - levelFloorXp;

    return {
        xp,
        level,
        levelFloorXp,
        nextLevelXp,
        levelProgress: span > 0 ? Math.round(((xp - levelFloorXp) / span) * 100) : 0,
        title: RANK_TITLES[Math.min(level - 1, RANK_TITLES.length - 1)],
    };
}

export function computeAchievements(courses: CourseProgressInput[]): Achievement[] {
    const itemsDone = courses.reduce((sum, c) => sum + c.completed, 0);
    const best = courses.reduce((max, c) => Math.max(max, c.progress), 0);
    const cleared = courses.filter((c) => c.total > 0 && c.completed >= c.total).length;
    const pct = (value: number, goal: number) => Math.min(100, Math.round((value / goal) * 100));

    return [
        { id: 'first-steps', title: 'First Steps', description: 'Complete your first lesson', earned: itemsDone >= 1, progress: pct(itemsDone, 1), tone: 'sky' },
        { id: 'on-a-roll', title: 'On a Roll', description: 'Complete 10 lessons or activities', earned: itemsDone >= 10, progress: pct(itemsDone, 10), tone: 'violet' },
        { id: 'halfway', title: 'Halfway There', description: 'Reach 50% in any course', earned: best >= 50, progress: pct(best, 50), tone: 'orange' },
        { id: 'course-clear', title: 'Course Clear', description: 'Finish every item in a course', earned: cleared >= 1, progress: pct(best, 100), tone: 'emerald' },
        { id: 'explorer', title: 'Explorer', description: 'Join 2 or more courses', earned: courses.length >= 2, progress: pct(courses.length, 2), tone: 'amber' },
    ];
}
