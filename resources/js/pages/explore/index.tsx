import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import { ACCENT_POOL, CourseCard } from '@/components/course-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { toast } from '@/lib/toast';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, CheckCircle2, ChevronRight, GraduationCap, Layers, Search, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Explore Courses', href: '/explore' },
];

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;

interface Enrollment {
    id: number;
    status: 'active';
}

interface Course {
    id: number;
    title: string;
    description?: string;
    short_description?: string;
    level: string;
    course_code: string;
    thumbnail?: string | null;
    thumbnail_focus?: string;
    instructor?: { name: string };
    modules_count: number;
    enrollments_count: number;
    enrollment: Enrollment | null;
}

interface PageProps {
    courses: Course[];
}

function EnrollButton({ course, isStudent }: { course: Course; isStudent: boolean }) {
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);

    const gradientBtnStyle = {
        background: `linear-gradient(white, white) padding-box, ${PORTAL_GRADIENT} border-box`,
        border: '1.5px solid transparent',
    };
    const gradientBtnClass =
        'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1e3a8a] transition-all duration-200 hover:opacity-80 active:scale-[0.98]';

    if (!isStudent) {
        return (
            <a href={`/courses/${course.id}`} className="block">
                <button className={gradientBtnClass} style={gradientBtnStyle}>
                    View Course <ChevronRight className="h-4 w-4" />
                </button>
            </a>
        );
    }

    if (course.enrollment?.status === 'active') {
        return (
            <a href={`/my-course/${course.id}`} className="block">
                <button className={gradientBtnClass} style={gradientBtnStyle}>
                    View Course <ChevronRight className="h-4 w-4" />
                </button>
            </a>
        );
    }

    function handleConfirmEnroll() {
        setLoading(true);
        router.post(
            `/courses/${course.id}/enroll`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmOpen(false);
                    setSuccessOpen(true);
                    toast(`You are now enrolled in "${course.title}"`, 'success');
                },
                onError: () => {
                    toast('Enrollment failed. Please try again.', 'error');
                },
                onFinish: () => setLoading(false),
            },
        );
    }

    return (
        <>
            <button
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
                className={gradientBtnClass}
                style={gradientBtnStyle}
            >
                Enroll Now
            </button>

            {/* ── Confirm enrollment modal ── */}
            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!loading) setConfirmOpen(open); }}>
                <DialogContent className="max-w-sm p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Confirm enrollment</DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1e3a8a]">
                            <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Enroll in this course?</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            You're about to enroll in <span className="font-semibold text-gray-700 dark:text-gray-300">"{course.title}"</span>. You'll get access right away.
                        </p>
                        <div className="mt-5 flex w-full gap-2">
                            <Button variant="outline" className="flex-1 h-9" onClick={() => setConfirmOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 h-9 gap-1.5 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-semibold"
                                onClick={handleConfirmEnroll}
                                disabled={loading}
                            >
                                {loading ? 'Enrolling…' : 'Confirm Enroll'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Enrollment success modal ── */}
            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent className="max-w-sm p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Enrollment complete</DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">You're enrolled!</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            You now have access to <span className="font-semibold text-gray-700 dark:text-gray-300">"{course.title}"</span>. Find it under My Course.
                        </p>
                        <Button
                            className="mt-5 w-full h-9 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-semibold"
                            onClick={() => setSuccessOpen(false)}
                        >
                            Got it
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function ExploreIndex({ courses }: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const isStudent = auth.user.role === 'student';

    const [search, setSearch] = useState('');
    const [level, setLevel] = useState<(typeof LEVELS)[number]>('All');

    const filtered = courses.filter((c) => {
        const matchesLevel = level === 'All' || c.level === level;
        const matchesSearch =
            !search ||
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.course_code.toLowerCase().includes(search.toLowerCase()) ||
            c.instructor?.name.toLowerCase().includes(search.toLowerCase());
        return matchesLevel && matchesSearch;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Explore Courses" />
            <div className="min-h-full bg-white dark:bg-gray-950">

                {/* Header */}
                <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">Student Portal</p>
                            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">Explore Courses</h1>
                            <p className="mt-1 text-sm text-blue-200/50">Browse available courses and enroll.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

                {/* Search + Level Filter */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search courses…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        {LEVELS.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLevel(l)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                    level === l
                                        ? 'bg-blue-900 text-white'
                                        : 'border border-gray-200 bg-white text-gray-500 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900'
                                }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cards */}
                <div>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <BookOpen className="h-10 w-10 text-gray-300 mb-3" />
                            <p className="text-sm font-medium text-gray-500">No courses found</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((course, idx) => {
                                const colors = ACCENT_POOL[idx % ACCENT_POOL.length];
                                return (
                                    <CourseCard
                                        key={course.id}
                                        title={course.title}
                                        thumbnail={course.thumbnail}
                                        thumbnailFocus={course.thumbnail_focus}
                                        description={course.short_description ?? course.description}
                                        colors={colors}
                                        badge={
                                            <div className="flex flex-col items-end gap-1.5">
                                                {course.enrollment?.status === 'active' && (
                                                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 shadow-sm dark:bg-green-900/30 dark:text-green-400">
                                                        Enrolled
                                                    </span>
                                                )}
                                                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm backdrop-blur-sm dark:bg-gray-900/80 dark:text-gray-200">
                                                    {course.level}
                                                </span>
                                            </div>
                                        }
                                        stats={[
                                            { icon: Layers, value: course.modules_count,     label: 'Modules'  },
                                            { icon: Users,  value: course.enrollments_count, label: 'Enrolled' },
                                        ]}
                                        meta={[
                                            { icon: GraduationCap, text: course.instructor?.name ?? 'No instructor' },
                                            { icon: BookOpen,      text: <span className="font-mono">{course.course_code}</span> },
                                        ]}
                                        cta={<EnrollButton course={course} isStudent={isStudent} />}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                </div>
            </div>
        </AppLayout>
    );
}
