import { EmptyState } from '@/components/game/empty-state';
import { ProgressTrack, RankLadder, XpBar } from '@/components/game/xp-bar';
import { Button } from '@/components/ui/button';
import { WorldEmblem } from '@/components/world/world-scope';
import AppLayout from '@/layouts/app-layout';
import { computeLevel } from '@/lib/gamification';
import { worldFor } from '@/lib/worlds';
import { type BreadcrumbItem } from '@/types';
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
    /** Total XP, worked out on the server with the same rules as the dashboard. */
    xp?: number;
}

export default function MyProgress({
    modules = [],
    certificates = [],
    xp = 0,
}: Props) {
    // Exact counts: a rounded 100% (e.g. 199 of 200) is not cleared yet.
    const isCleared = (m: ModuleProgress) =>
        m.contents_completed >= m.total_contents;
    const earned = modules.filter(isCleared);
    const inProgress = modules.filter((m) => !isCleared(m));

    const player = useMemo(() => computeLevel(xp), [xp]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Progress" />

            {/* Trophy room: game-night mode for the moments that are earned */}
            <header className="bg-game-night text-white">
                <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-9 sm:px-8 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-5">
                        <h1 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">
                            Your progress
                        </h1>
                        <p className="mt-2 text-white/70">
                            {earned.length}{' '}
                            {earned.length === 1 ? 'module' : 'modules'} cleared
                            {certificates.length > 0 &&
                                ` · ${certificates.length} ${certificates.length === 1 ? 'certificate' : 'certificates'}`}
                        </p>
                    </div>

                    {/* `dark` so the rank colours and track use their on-dark variants here */}
                    <section
                        aria-label="Your rank"
                        className="dark rounded-3xl bg-white/6 p-5 ring-1 ring-white/10 lg:col-span-7 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/65"
                    >
                        <XpBar player={player} />
                        <RankLadder
                            player={player}
                            className="mt-4 border-t border-white/10 pt-3"
                        />
                    </section>
                </div>
            </header>

            <div className="mx-auto max-w-[1600px] space-y-12 px-5 py-10 sm:px-8">
                {modules.length === 0 && (
                    <EmptyState
                        title="No progress yet"
                        description="Read lesson materials and clear 3D labs to fill this up. Every lesson and lab you finish adds XP and moves you up the ranks."
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
