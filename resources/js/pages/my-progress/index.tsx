import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Award, BookOpen } from 'lucide-react';

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
    contents_completed: number;
    total_contents: number;
    progress: number;
    completed_at: string | null;
}

interface Props {
    modules: ModuleProgress[];
}

export default function MyProgress({ modules = [] }: Props) {
    const earned = modules.filter((m) => m.progress >= 100);
    const inProgress = modules.filter((m) => m.progress < 100);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Progress" />
            <div className="min-h-full bg-white dark:bg-gray-950">
                {/* Header */}
                <div
                    className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
                    style={{ background: PORTAL_GRADIENT }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-yellow-300/80 uppercase">
                                Student Portal
                            </p>
                            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                                My Progress
                            </h1>
                            <p className="mt-1 text-sm text-blue-200/50">
                                Track how far along you are in each module.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    {/* Earned */}
                    {earned.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase">
                                Completed
                            </p>
                            <div className="space-y-3">
                                {earned.map((m) => (
                                    <div
                                        key={m.module_id}
                                        className="flex items-center gap-5 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600">
                                            <Award className="h-5 w-5 text-white" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {m.module_title}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {m.course_title} ·{' '}
                                                {m.instructor}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-3">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                    Completed {m.completed_at}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                                                    <BookOpen className="h-3 w-3" />
                                                    {m.contents_completed}/
                                                    {m.total_contents} content
                                                    {m.total_contents !== 1
                                                        ? 's'
                                                        : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* In Progress */}
                    {inProgress.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase">
                                In Progress
                            </p>
                            <div className="space-y-3">
                                {inProgress.map((m) => {
                                    const remaining =
                                        m.total_contents - m.contents_completed;
                                    return (
                                        <div
                                            key={m.module_id}
                                            className="flex items-center gap-5 rounded-xl border border-gray-100 px-5 py-4 dark:border-gray-800"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                                <BookOpen className="h-4 w-4 text-gray-400" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {m.module_title}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {m.course_title} ·{' '}
                                                    {m.instructor}
                                                </p>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <div className="h-1 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                        <div
                                                            className="h-full rounded-full bg-gray-400 transition-all"
                                                            style={{
                                                                width: `${m.progress}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] text-gray-400">
                                                        {m.progress}% ·{' '}
                                                        {remaining} content
                                                        {remaining !== 1
                                                            ? 's'
                                                            : ''}{' '}
                                                        left
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {modules.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-20 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                <Award className="h-6 w-6 text-gray-300" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    No progress yet
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    Modules you start will show up here.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
