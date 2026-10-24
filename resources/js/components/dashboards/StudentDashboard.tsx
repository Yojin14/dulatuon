import { EmptyState } from '@/components/game/empty-state';
import { LowPolyBlock, LowPolyClouds } from '@/components/game/low-poly-scene';
import { ProgressTrack, RankLadder, XpBar } from '@/components/game/xp-bar';
import { Button } from '@/components/ui/button';
import { WorldEmblem } from '@/components/world/world-scope';
import { computeLevel } from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { worldFor } from '@/lib/worlds';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    ChevronRight,
    Compass,
    FileText,
    Play,
} from 'lucide-react';
import { greetingFor } from './shared';

interface CourseRow {
    id: number;
    title: string;
    instructor: string;
    completed: number;
    total: number;
    progress: number;
    /** Every module cleared (materials read and games passed). */
    cleared: boolean;
    status: string;
}

interface DueRow {
    id: number;
    kind: string;
    title: string;
    course: string;
    due: string;
    urgent: boolean;
}

export interface StudentDashboardProps {
    stats: {
        enrolledCount: number;
        avgProgress: number;
        pendingWork: number;
    };
    courses: CourseRow[];
    dueSoon: DueRow[];
    /** Total XP, worked out on the server with the same rules as My Progress. */
    xp?: number;
}

function pickContinueCourse(courses: CourseRow[]): CourseRow | null {
    const unfinished = courses.filter((c) => !c.cleared);
    if (unfinished.length === 0) {
        return courses[0] ?? null;
    }

    return [...unfinished].sort((a, b) => b.progress - a.progress)[0];
}

export default function StudentDashboard({
    stats,
    courses,
    dueSoon,
    xp = 0,
}: StudentDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const firstName = auth.user.firstname || auth.user.name.split(' ')[0];
    const greeting = greetingFor(new Date().getHours());

    const player = computeLevel(xp);
    const current = pickContinueCourse(courses);
    const currentWorld = worldFor(current);

    return (
        <div className="min-h-full">
            {/* Base camp: the student's corner of the world */}
            <header className="relative isolate overflow-hidden bg-world-sky text-slate-900">
                <LowPolyClouds className="absolute inset-x-0 top-0 -z-10 opacity-80" />
                <div className="mx-auto grid max-w-[1600px] gap-6 px-5 pt-8 pb-7 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
                        <h1 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.05] font-extrabold tracking-[-0.035em]">
                            {greeting}, {firstName}.
                        </h1>
                        <p className="mt-2 font-medium text-slate-700">
                            {stats.enrolledCount}{' '}
                            {stats.enrolledCount === 1 ? 'course' : 'courses'} ·{' '}
                            {stats.avgProgress}% average progress ·{' '}
                            {stats.pendingWork === 0
                                ? 'nothing due'
                                : `${stats.pendingWork} due soon`}
                        </p>
                        <div className="mt-5 max-w-sm rounded-2xl bg-white/80 p-3.5 ring-1 ring-black/5 backdrop-blur-sm dark:bg-card/85 dark:ring-white/10">
                            <XpBar player={player} />
                        </div>
                    </div>
                    <LowPolyBlock className="hidden w-52 drop-shadow-[0_18px_18px_rgba(85,48,28,0.25)] md:block" />
                </div>
                <div
                    aria-hidden
                    className="h-3 bg-[linear-gradient(180deg,#6fbf5a_0_45%,#c99a6b_45%)]"
                />
            </header>

            <div className="mx-auto grid max-w-[1600px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-12">
                <div className="space-y-10 lg:col-span-8">
                    {/* The one main action */}
                    {current ? (
                        <section
                            aria-labelledby="continue-title"
                            className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                        >
                            <div
                                aria-hidden
                                className="h-1.5"
                                style={{ backgroundColor: currentWorld.accent }}
                            />
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <WorldEmblem world={currentWorld} />
                                        <div className="min-w-0">
                                            <p
                                                className="text-sm font-bold"
                                                style={{
                                                    color: currentWorld.accentInk,
                                                }}
                                            >
                                                {currentWorld.name} · Continue
                                                where you left off
                                            </p>
                                            <h2
                                                id="continue-title"
                                                className="mt-1 text-2xl leading-tight font-bold tracking-[-0.02em]"
                                            >
                                                {current.title}
                                            </h2>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                with {current.instructor}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        asChild
                                        variant="play"
                                        size="lg"
                                        className="shrink-0"
                                    >
                                        <Link href={`/my-course/${current.id}`}>
                                            <Play className="size-5 fill-current" />
                                            {current.progress > 0
                                                ? 'Continue'
                                                : 'Start'}
                                        </Link>
                                    </Button>
                                </div>
                                <div className="mt-5 flex items-center gap-3">
                                    <ProgressTrack
                                        value={current.progress}
                                        className="h-3.5"
                                    />
                                    <span className="shrink-0 text-sm font-bold tabular-nums">
                                        {current.progress}%
                                    </span>
                                </div>
                                {current.total > 0 && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {current.completed} of {current.total}{' '}
                                        lessons and activities cleared
                                    </p>
                                )}
                            </div>
                        </section>
                    ) : (
                        <EmptyState
                            title="Pick your first course"
                            description="Join a course to start earning XP. Every course is packed with labs and checkpoints."
                            action={
                                <Button asChild>
                                    <Link href="/explore">
                                        <Compass /> Explore courses
                                    </Link>
                                </Button>
                            }
                        />
                    )}

                    {/* All courses */}
                    {courses.length > 0 && (
                        <section aria-labelledby="courses-title">
                            <div className="flex items-baseline justify-between gap-4">
                                <h2
                                    id="courses-title"
                                    className="text-xl font-bold tracking-[-0.02em]"
                                >
                                    Your courses
                                </h2>
                                <Link
                                    href="/my-course"
                                    className="text-sm font-bold text-primary hover:underline"
                                >
                                    View all
                                </Link>
                            </div>
                            <ul className="mt-4 divide-y rounded-3xl border bg-card shadow-panel">
                                {courses.map((course) => {
                                    const cleared = course.cleared;

                                    return (
                                        <li key={course.id}>
                                            <Link
                                                href={`/my-course/${course.id}`}
                                                className="group flex items-center gap-4 px-4 py-4 transition-colors first:rounded-t-3xl last:rounded-b-3xl hover:bg-accent/60 sm:px-5"
                                            >
                                                <WorldEmblem
                                                    world={worldFor(course)}
                                                    size="sm"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-bold">
                                                        {course.title}
                                                    </p>
                                                    <p className="truncate text-sm text-muted-foreground">
                                                        {course.instructor}
                                                        {course.total > 0 &&
                                                            ` · ${course.completed}/${course.total} cleared`}
                                                    </p>
                                                    <ProgressTrack
                                                        value={course.progress}
                                                        className="mt-2 h-1.5 max-w-xs"
                                                    />
                                                </div>
                                                <span className="hidden w-10 text-right text-sm font-bold tabular-nums sm:block">
                                                    {course.progress}%
                                                </span>
                                                {cleared && (
                                                    <span className="hidden rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 sm:inline dark:bg-emerald-500/15 dark:text-emerald-300">
                                                        Cleared
                                                    </span>
                                                )}
                                                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                </div>

                <aside className="space-y-10 lg:col-span-4">
                    <section aria-labelledby="due-title">
                        <h2
                            id="due-title"
                            className="text-xl font-bold tracking-[-0.02em]"
                        >
                            Due soon
                        </h2>
                        {dueSoon.length === 0 ? (
                            <p className="mt-3 rounded-2xl bg-muted/70 px-4 py-3 text-sm font-semibold text-muted-foreground">
                                You're all caught up.
                            </p>
                        ) : (
                            <ul className="mt-4 space-y-2">
                                {dueSoon.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex gap-3 rounded-2xl border bg-card px-4 py-3"
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
                                                item.urgent
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {item.urgent ? (
                                                <CalendarClock className="size-4.5" />
                                            ) : (
                                                <FileText className="size-4.5" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold">
                                                {item.title}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {item.kind} · {item.course}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'shrink-0 text-xs font-bold',
                                                item.urgent
                                                    ? 'text-orange-600 dark:text-orange-300'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {item.due}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="rank-title">
                        <h2
                            id="rank-title"
                            className="text-xl font-bold tracking-[-0.02em]"
                        >
                            Road to Diamond
                        </h2>
                        <div className="mt-4 rounded-3xl bg-game-night p-5 text-white shadow-panel">
                            <RankLadder player={player} compact />
                            <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                                {player.nextRankName
                                    ? `${player.xpToNext} XP to ${player.nextRankName}. Every lesson and lab you finish counts.`
                                    : 'You reached Diamond, the top rank.'}
                            </p>
                        </div>
                        <Link
                            href="/my-progress"
                            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                        >
                            See your progress <ArrowRight className="size-4" />
                        </Link>
                    </section>
                </aside>
            </div>
        </div>
    );
}
