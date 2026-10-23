import { AchievementBadge } from '@/components/game/achievement-badge';
import { EmptyState } from '@/components/game/empty-state';
import { ProgressTrack, XpBar } from '@/components/game/xp-bar';
import { Button } from '@/components/ui/button';
import { WorldEmblem } from '@/components/world/world-scope';
import AppLayout from '@/layouts/app-layout';
import {
    computeAchievements,
    computeLevel,
    computeXp,
} from '@/lib/gamification';
import { worldFor } from '@/lib/worlds';
import { type BreadcrumbItem } from '@/types';
import type { CourseProgressInput } from '@/types/gamification';
import { Head, Link } from '@inertiajs/react';
import { Award, ChevronRight, Compass, Medal } from 'lucide-react';
import { useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Progress', href: '/my-progress' },
];

interface ModuleProgress {
    module_id: number;
    course_id: number;
    module_title: string;
    course_title: string;
    instructor: string;
    /** Materials read plus games cleared. */
    contents_completed: number;
    total_contents: number;
    games_cleared: number;
    total_games: number;
    progress: number;
    completed_at: string | null;
}

interface CertificateLink {
    course_id: number;
    course_title: string;
    completed_at: string | null;
    url: string;
}

interface Props {
    modules: ModuleProgress[];
    certificates?: CertificateLink[];
}

/** Roll module rows up into per-course totals for XP and badges. */
function toCourseProgress(modules: ModuleProgress[]): CourseProgressInput[] {
    const byCourse = new Map<number, CourseProgressInput>();
    for (const m of modules) {
        const course = byCourse.get(m.course_id) ?? {
            id: m.course_id,
            title: m.course_title,
            completed: 0,
            total: 0,
            progress: 0,
        };
        course.completed += m.contents_completed;
        course.total += m.total_contents;
        byCourse.set(m.course_id, course);
    }

    return [...byCourse.values()].map((c) => ({
        ...c,
        progress: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
    }));
}

export default function MyProgress({ modules = [], certificates = [] }: Props) {
    const earned = modules.filter((m) => m.progress >= 100);
    const inProgress = modules.filter((m) => m.progress < 100);

    const { player, achievements } = useMemo(() => {
        const courses = toCourseProgress(modules);

        return {
            player: computeLevel(computeXp(courses)),
            achievements: computeAchievements(courses),
        };
    }, [modules]);
    const earnedBadges = achievements.filter((a) => a.earned).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Progress" />

            {/* Trophy room: game-night mode for the moments that are earned */}
            <header className="bg-game-night text-white">
                <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-9 sm:px-8 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-6">
                        <h1 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">
                            Your progress
                        </h1>
                        <p className="mt-2 text-white/70">
                            {earned.length}{' '}
                            {earned.length === 1 ? 'module' : 'modules'} cleared
                            · {earnedBadges} of {achievements.length} badges
                        </p>
                        <div className="mt-6 max-w-md rounded-2xl bg-white/6 p-4 ring-1 ring-white/10 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/65">
                            <XpBar player={player} />
                        </div>
                    </div>

                    <section aria-label="Badges" className="lg:col-span-6">
                        <div className="grid grid-cols-5 gap-2 rounded-3xl bg-white/4 px-3 pt-5 pb-4 ring-1 ring-white/10 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/55">
                            {achievements.map((achievement) => (
                                <AchievementBadge
                                    key={achievement.id}
                                    achievement={achievement}
                                />
                            ))}
                        </div>
                        <div
                            aria-hidden
                            className="mx-4 h-2 rounded-b-xl bg-[linear-gradient(180deg,#a3623f,#6f3b2a)]"
                        />
                    </section>
                </div>
            </header>

            <div className="mx-auto max-w-[1600px] space-y-12 px-5 py-10 sm:px-8">
                {modules.length === 0 && (
                    <EmptyState
                        title="No progress yet"
                        description="Read lesson materials and clear 3D labs to fill this up. Your XP and badges are earned here."
                        action={
                            <Button asChild>
                                <Link href="/explore">
                                    <Compass /> Find a course
                                </Link>
                            </Button>
                        }
                    />
                )}

                {certificates.length > 0 && (
                    <section aria-labelledby="certificates">
                        <h2
                            id="certificates"
                            className="text-xl font-bold tracking-[-0.02em]"
                        >
                            Certificates
                        </h2>
                        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                            {certificates.map((c) => (
                                <li
                                    key={c.course_id}
                                    className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-amber-300/70 bg-linear-to-br from-amber-50 to-card p-4 shadow-panel sm:flex-nowrap dark:border-amber-400/30 dark:from-amber-400/10"
                                >
                                    <span className="grid size-14 shrink-0 place-items-center bg-linear-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_3px_0_0_var(--color-amber-700)] [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
                                        <Award className="size-6" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                            Course complete
                                        </p>
                                        <p className="truncate font-display text-lg font-extrabold tracking-[-0.02em]">
                                            {c.course_title}
                                        </p>
                                        {c.completed_at && (
                                            <p className="text-sm text-muted-foreground">
                                                Every module cleared on{' '}
                                                {c.completed_at}
                                            </p>
                                        )}
                                    </div>
                                    <Button asChild variant="play">
                                        <Link href={c.url}>
                                            View certificate
                                        </Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {inProgress.length > 0 && (
                    <section aria-labelledby="in-progress">
                        <h2
                            id="in-progress"
                            className="text-xl font-bold tracking-[-0.02em]"
                        >
                            In progress
                        </h2>
                        <ul className="mt-4 divide-y rounded-3xl border bg-card shadow-panel">
                            {inProgress.map((m) => {
                                const remaining =
                                    m.total_contents - m.contents_completed;

                                return (
                                    <li key={m.module_id}>
                                        <Link
                                            href={`/my-course/${m.course_id}`}
                                            prefetch
                                            className="group grid gap-3 px-5 py-4 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_16rem_1.5rem] sm:items-center"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <WorldEmblem
                                                    world={worldFor({
                                                        title: m.course_title,
                                                    })}
                                                    size="sm"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate font-bold">
                                                        {m.module_title}
                                                    </p>
                                                    <p className="truncate text-sm text-muted-foreground">
                                                        {[
                                                            m.course_title,
                                                            m.instructor,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <ProgressTrack
                                                        value={m.progress}
                                                    />
                                                    <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
                                                        {m.progress}%
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {remaining}{' '}
                                                    {remaining === 1
                                                        ? 'item'
                                                        : 'items'}{' '}
                                                    left
                                                    {m.total_games > 0 &&
                                                        ` · ${m.games_cleared} of ${m.total_games} ${m.total_games === 1 ? 'lab' : 'labs'} cleared`}
                                                </p>
                                            </div>
                                            <ChevronRight
                                                aria-hidden
                                                className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                                            />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {earned.length > 0 && (
                    <section aria-labelledby="cleared">
                        <h2
                            id="cleared"
                            className="text-xl font-bold tracking-[-0.02em]"
                        >
                            Cleared
                        </h2>
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                            {earned.map((m) => (
                                <li key={m.module_id}>
                                    <Link
                                        href={`/my-course/${m.course_id}`}
                                        className="flex items-center gap-4 rounded-3xl border bg-card p-4 shadow-panel transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none"
                                    >
                                        <span className="grid size-12 shrink-0 place-items-center bg-linear-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_3px_0_0_var(--color-amber-700)] [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
                                            <Medal className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-bold">
                                                {m.module_title}
                                            </p>
                                            <p className="truncate text-sm text-muted-foreground">
                                                {m.course_title}
                                            </p>
                                            <p className="mt-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                                Cleared {m.completed_at} ·{' '}
                                                {m.contents_completed}/
                                                {m.total_contents} items
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
