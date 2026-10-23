import { cn } from '@/lib/utils';
import type { Achievement } from '@/types/gamification';
import { Award, BookOpenCheck, Compass, Flame, Footprints, Lock, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
    'first-steps': Footprints,
    'on-a-roll': Flame,
    halfway: Compass,
    'course-clear': BookOpenCheck,
    explorer: Award,
};

const tones = {
    violet: 'from-violet-400 to-violet-600 shadow-[0_3px_0_0_var(--color-violet-800)]',
    amber: 'from-amber-300 to-amber-500 shadow-[0_3px_0_0_var(--color-amber-700)]',
    emerald: 'from-emerald-400 to-emerald-600 shadow-[0_3px_0_0_var(--color-emerald-800)]',
    sky: 'from-sky-300 to-sky-500 shadow-[0_3px_0_0_var(--color-sky-700)]',
    orange: 'from-orange-400 to-red-500 shadow-[0_3px_0_0_var(--color-red-700)]',
} as const;

/** Hexagonal low-poly medal. Locked medals are greyed with progress. */
export function AchievementBadge({ achievement, size = 'md' }: { achievement: Achievement; size?: 'sm' | 'md' }) {
    const Icon = achievement.earned ? (icons[achievement.id] ?? Award) : Lock;
    const dims = size === 'sm' ? 'size-11' : 'size-14';

    return (
        <div className="flex w-full flex-col items-center gap-2 text-center" title={achievement.description}>
            <span
                className={cn(
                    'grid place-items-center bg-linear-to-b text-white [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
                    dims,
                    achievement.earned ? tones[achievement.tone] : 'from-slate-200 to-slate-300 text-slate-500 dark:from-white/10 dark:to-white/5 dark:text-white/40',
                )}
            >
                <Icon className={size === 'sm' ? 'size-5' : 'size-6'} aria-hidden />
            </span>
            <div className="min-w-0">
                <p className={cn('text-xs font-extrabold', achievement.earned ? 'text-foreground' : 'text-muted-foreground')}>{achievement.title}</p>
                {!achievement.earned && size === 'md' && <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">{achievement.progress}%</p>}
            </div>
        </div>
    );
}
