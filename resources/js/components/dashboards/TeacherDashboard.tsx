import { EmptyState } from '@/components/game/empty-state';
import { ProgressTrack } from '@/components/game/xp-bar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { WorldEmblem } from '@/components/world/world-scope';
import { worldFor } from '@/lib/worlds';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, ChevronRight, ClipboardCheck, Users } from 'lucide-react';
import { greetingFor } from './shared';

interface ClassRow {
    id: number;
    title: string;
    students: number;
    progress: number;
    pending: number;
}

interface GradingRow {
    id: number;
    student: string;
    assignment: string;
    submitted: string;
}

export interface TeacherDashboardProps {
    stats: {
        totalStudents: number;
        classCount: number;
        avgProgress: number;
        toGrade: number;
    };
    classes: ClassRow[];
    gradingQueue: GradingRow[];
}

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

export default function TeacherDashboard({ stats, classes, gradingQueue }: TeacherDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const firstName = auth.user.firstname || auth.user.name.split(' ')[0];
    const greeting = greetingFor(new Date().getHours());

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title={`${greeting}, ${firstName}.`}
                description={`${stats.totalStudents} students in ${stats.classCount} ${stats.classCount === 1 ? 'class' : 'classes'} · ${stats.avgProgress}% average progress`}
                actions={
                    stats.toGrade > 0 ? (
                        <Button asChild size="lg">
                            <Link href="/class-management">
                                <ClipboardCheck />
                                Grade {stats.toGrade} {stats.toGrade === 1 ? 'submission' : 'submissions'}
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="lg">
                            <Link href="/my-course">Open your courses</Link>
                        </Button>
                    )
                }
            />

            <div className="mx-auto grid max-w-[1600px] gap-10 px-5 pt-8 sm:px-8 lg:grid-cols-12">
                <section aria-labelledby="classes-title" className="lg:col-span-8">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 id="classes-title" className="text-xl font-bold tracking-[-0.02em]">
                            Your classes
                        </h2>
                        <Link href="/class-management" className="text-sm font-bold text-primary hover:underline">
                            Manage
                        </Link>
                    </div>

                    {classes.length === 0 ? (
                        <EmptyState className="mt-4" title="No classes yet" description="Classes you're assigned to will show up here with their progress." />
                    ) : (
                        <div className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-panel">
                            <div className="hidden grid-cols-[minmax(0,1fr)_6rem_12rem_6rem_1.25rem] gap-4 border-b px-5 py-3 text-xs font-bold text-muted-foreground sm:grid">
                                <span>Class</span>
                                <span>Students</span>
                                <span>Progress</span>
                                <span>To grade</span>
                                <span />
                            </div>
                            <ul className="divide-y">
                                {classes.map((c) => (
                                    <li key={c.id}>
                                        <Link
                                            href="/class-management"
                                            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-accent/50 sm:grid-cols-[minmax(0,1fr)_6rem_12rem_6rem_1.25rem]"
                                        >
                                            <span className="flex min-w-0 items-center gap-3">
                                                <WorldEmblem world={worldFor(c)} size="sm" />
                                                <span className="truncate font-bold">{c.title}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums sm:text-foreground">
                                                <Users className="size-4 text-muted-foreground" />
                                                {c.students}
                                            </span>
                                            <span className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
                                                <ProgressTrack value={c.progress} className="h-2.5" />
                                                <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums">{c.progress}%</span>
                                            </span>
                                            <span className="hidden sm:block">
                                                {c.pending > 0 ? (
                                                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800 dark:bg-orange-500/15 dark:text-orange-300">
                                                        {c.pending}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">None</span>
                                                )}
                                            </span>
                                            <ChevronRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                <aside aria-labelledby="queue-title" className="lg:col-span-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 id="queue-title" className="text-xl font-bold tracking-[-0.02em]">
                            Grading queue
                        </h2>
                        <span className="text-sm font-bold text-muted-foreground tabular-nums">{stats.toGrade}</span>
                    </div>

                    {gradingQueue.length === 0 ? (
                        <p className="mt-4 rounded-2xl bg-muted/70 px-4 py-3 text-sm font-semibold text-muted-foreground">Nothing waiting. Nice.</p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {gradingQueue.map((item) => (
                                <li key={item.id}>
                                    <Link href="/class-management" className="group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:border-primary/40">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                            {initials(item.student)}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold">{item.student}</span>
                                            <span className="block truncate text-xs text-muted-foreground">{item.assignment}</span>
                                        </span>
                                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{item.submitted}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {gradingQueue.length > 0 && (
                        <Link href="/class-management" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                            Open grading <ArrowRight className="size-4" />
                        </Link>
                    )}
                </aside>
            </div>
        </div>
    );
}
