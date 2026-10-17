import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CheckCircle,
    ClipboardText,
    FileText,
    GraduationCap,
} from '@phosphor-icons/react';
import {
    BarList,
    ChartCard,
    DonutProgress,
    EmptyState,
    greetingFor,
    PortalHeader,
    SectionHeader,
    StatCard,
} from './shared';

interface CourseRow {
    id: number;
    title: string;
    instructor: string;
    completed: number;
    total: number;
    progress: number;
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
}

export default function StudentDashboard({ stats, courses, dueSoon }: StudentDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const firstName = auth.user.firstname || auth.user.name.split(' ')[0];
    const greeting = greetingFor(new Date().getHours());

    const chartData = courses
        .filter((c) => c.total > 0)
        .map((c) => ({
            label: c.title.length > 24 ? `${c.title.slice(0, 24)}…` : c.title,
            value: c.progress,
        }));

    return (
        <div className="min-h-full bg-white dark:bg-gray-950">
            <PortalHeader
                portal="Student Portal"
                title={`${greeting}, ${firstName}.`}
                subtitle="Here's your learning summary."
            />

            <div className="space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8 lg:px-8">
                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    <StatCard
                        label="Enrolled Courses"
                        value={stats.enrolledCount}
                        hint="active this semester"
                        icon={GraduationCap}
                    />

                    <div className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Avg Progress</p>
                        <div className="mt-3 flex items-center gap-3 sm:mt-4">
                            <div className="relative shrink-0">
                                <DonutProgress value={stats.avgProgress} size={52} fillColor="#1e3a8a" />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-200">
                                    {stats.avgProgress}%
                                </span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">{stats.avgProgress}%</p>
                                <p className="mt-0.5 text-xs text-gray-400">across all courses</p>
                            </div>
                        </div>
                    </div>

                    <StatCard
                        label="Pending Work"
                        value={stats.pendingWork}
                        hint={stats.pendingWork === 0 ? 'all caught up' : 'items due soon'}
                        icon={ClipboardText}
                        accent={stats.pendingWork > 0}
                    />
                </div>

                {/* Progress per course chart */}
                {chartData.length > 0 && (
                    <ChartCard title="Course Progress" subtitle="Completion across your enrolled courses" height={Math.max(140, chartData.length * 40)}>
                        <BarList items={chartData} max={100} unit="%" />
                    </ChartCard>
                )}

                {/* My Courses + Due Soon */}
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <SectionHeader title="My Courses" href="/my-course" />
                        {courses.length === 0 ? (
                            <EmptyState icon={BookOpen} message="You're not enrolled in any courses yet" />
                        ) : (
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {courses.map((c) => (
                                    <Link key={c.id} href={`/my-course/${c.id}`}>
                                        <div className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-gray-50 sm:gap-5 sm:px-5 dark:hover:bg-gray-900">
                                            <div className="relative shrink-0">
                                                <DonutProgress value={c.progress} size={40} strokeWidth={4} fillColor="#1e3a8a" />
                                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                                                    {c.progress}%
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{c.title}</p>
                                                <p className="mt-0.5 truncate text-xs text-gray-400">
                                                    {c.instructor}
                                                    {c.total > 0
                                                        ? ` · ${c.completed}/${c.total} lessons`
                                                        : ''}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-400" weight="bold" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <SectionHeader title="Due Soon" />
                        {dueSoon.length === 0 ? (
                            <EmptyState icon={CheckCircle} message="All caught up" />
                        ) : (
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {dueSoon.map((w) => (
                                    <div key={w.id} className="px-4 py-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{w.title}</p>
                                            <span className={`shrink-0 text-[11px] font-semibold ${w.urgent ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {w.due}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-xs text-gray-400">{w.course}</p>
                                        <div className="mt-2 flex items-center gap-1.5">
                                            {w.kind === 'Quiz' ? (
                                                <ClipboardText className="h-3 w-3 text-gray-300" weight="bold" />
                                            ) : (
                                                <FileText className="h-3 w-3 text-gray-300" weight="bold" />
                                            )}
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{w.kind}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
