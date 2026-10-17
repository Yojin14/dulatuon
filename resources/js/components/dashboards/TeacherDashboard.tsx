import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    ClipboardText,
    PencilSimple,
    Users,
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

    const chartData = classes.map((c) => ({
        label: c.title.length > 24 ? `${c.title.slice(0, 24)}…` : c.title,
        value: c.students,
    }));

    return (
        <div className="min-h-full bg-white dark:bg-gray-950">
            <PortalHeader
                portal="Teacher Portal"
                title={`${greeting}, ${firstName}.`}
                subtitle={
                    stats.toGrade > 0
                        ? `${stats.toGrade} submission${stats.toGrade !== 1 ? 's' : ''} waiting to be graded.`
                        : 'No pending submissions today.'
                }
            />

            <div className="space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8 lg:px-8">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Students"
                        value={stats.totalStudents}
                        hint={`across ${stats.classCount} class${stats.classCount !== 1 ? 'es' : ''}`}
                        icon={Users}
                    />
                    <StatCard label="Classes" value={stats.classCount} hint="active this semester" icon={BookOpen} />
                    <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Avg Progress</p>
                        <div className="mt-3 flex items-center gap-2 sm:mt-4 sm:gap-3">
                            <div className="relative shrink-0">
                                <DonutProgress value={stats.avgProgress} size={44} strokeWidth={4} fillColor="#1e3a8a" />
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700 dark:text-gray-200">
                                    {stats.avgProgress}%
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">{stats.avgProgress}%</p>
                                <p className="mt-0.5 text-xs text-gray-400">class avg</p>
                            </div>
                        </div>
                    </div>
                    <StatCard
                        label="To Grade"
                        value={stats.toGrade}
                        hint="pending submissions"
                        icon={ClipboardText}
                        accent={stats.toGrade > 0}
                    />
                </div>

                {/* Students per class chart */}
                {classes.length > 0 && (
                    <ChartCard title="Students per Class" subtitle="Active enrolment by course" height={Math.max(140, classes.length * 40)}>
                        <BarList items={chartData} />
                    </ChartCard>
                )}

                {/* My Classes + Grading Queue */}
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <SectionHeader title="My Classes" href="/class-management" linkLabel="Manage" />
                        {classes.length === 0 ? (
                            <EmptyState icon={BookOpen} message="No classes assigned yet" />
                        ) : (
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {classes.map((c) => (
                                    <Link key={c.id} href="/class-management">
                                        <div className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-gray-50 sm:gap-5 sm:px-5 dark:hover:bg-gray-900">
                                            <div className="relative shrink-0">
                                                <DonutProgress value={c.progress} size={40} strokeWidth={4} fillColor="#1e3a8a" />
                                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                                                    {c.progress}%
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{c.title}</p>
                                                <p className="mt-0.5 text-xs text-gray-400">{c.students} students</p>
                                            </div>
                                            {c.pending > 0 && (
                                                <span className="hidden shrink-0 text-xs font-semibold text-amber-500 sm:inline">
                                                    {c.pending} to grade
                                                </span>
                                            )}
                                            {c.pending > 0 && (
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[10px] font-bold text-amber-500 sm:hidden dark:bg-amber-900/20">
                                                    {c.pending}
                                                </span>
                                            )}
                                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-400" weight="bold" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <SectionHeader title="Grading Queue" href="/class-management" linkLabel="View all" />
                        {gradingQueue.length === 0 ? (
                            <EmptyState icon={ClipboardText} message="Nothing to grade" />
                        ) : (
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {gradingQueue.map((item) => (
                                    <Link key={item.id} href="/class-management">
                                        <div className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                {initials(item.student)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{item.student}</p>
                                                <p className="truncate text-[11px] text-gray-400">{item.assignment}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[10px] text-gray-400">{item.submitted}</p>
                                                <PencilSimple className="mt-0.5 ml-auto h-3 w-3 text-gray-300 transition-colors group-hover:text-blue-500" weight="bold" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
