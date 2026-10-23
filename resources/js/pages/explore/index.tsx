import { ACCENT_POOL, CourseCard } from '@/components/course-card';
import { EmptyState } from '@/components/game/empty-state';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { toast } from '@/lib/toast';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Layers, Search, Users } from 'lucide-react';
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

    if (!isStudent || course.enrollment?.status === 'active') {
        return (
            <Button asChild variant="outline" className="w-full">
                <Link href={isStudent ? `/my-course/${course.id}` : `/courses/${course.id}`}>
                    {isStudent ? 'Open course' : 'View course'} <ArrowRight />
                </Link>
            </Button>
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
            <Button onClick={() => setConfirmOpen(true)} disabled={loading} className="w-full">
                Join course
            </Button>

            {/* ── Confirm enrollment modal ── */}
            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!loading) setConfirmOpen(open); }}>
                <DialogContent className="max-w-sm">
                    <div className="grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        <GraduationCap className="size-6" />
                    </div>
                    <div>
                        <DialogTitle>Join this course?</DialogTitle>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            You'll get access to <span className="font-bold text-foreground">{course.title}</span> right away, and your progress starts counting.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)} disabled={loading}>
                            Not now
                        </Button>
                        <Button className="flex-1" onClick={handleConfirmEnroll} disabled={loading}>
                            {loading ? 'Joining…' : 'Join course'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Enrollment success modal ── */}
            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent className="max-w-sm">
                    <div className="animate-pop-in grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <CheckCircle2 className="size-6" />
                    </div>
                    <div>
                        <DialogTitle>You're in.</DialogTitle>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            <span className="font-bold text-foreground">{course.title}</span> is now in My Course. Your first lesson is ready.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSuccessOpen(false)}>
                            Keep browsing
                        </Button>
                        <Button asChild className="flex-1">
                            <Link href={`/my-course/${course.id}`}>Start now</Link>
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
            <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 py-8">
                <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
                    <div>
                        <h1 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">Explore courses</h1>
                        <p className="mt-1.5 text-muted-foreground">
                            {courses.length} {courses.length === 1 ? 'course' : 'courses'} open to join. Each one is packed with lessons, 3D labs and checkpoints.
                        </p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by title, code or teacher"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                            aria-label="Search courses"
                        />
                    </div>
                </header>

                <Tabs value={level} onValueChange={(value) => setLevel(value as (typeof LEVELS)[number])} className="mt-6">
                    <TabsList aria-label="Filter by level" className="max-w-full overflow-x-auto">
                        {LEVELS.map((l) => (
                            <TabsTrigger key={l} value={l}>
                                {l}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="mt-8">
                    {filtered.length === 0 ? (
                        <EmptyState title="No courses match" description="Try another search or switch the level filter back to All." />
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
                                                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">Joined</span>
                                                )}
                                                <span className="rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">{course.level}</span>
                                            </div>
                                        }
                                        stats={[
                                            { icon: Layers, value: course.modules_count, label: 'modules' },
                                            { icon: Users, value: course.enrollments_count, label: 'learners' },
                                        ]}
                                        meta={[
                                            { icon: GraduationCap, text: course.instructor?.name ?? 'No instructor yet' },
                                            { icon: BookOpen, text: course.course_code },
                                        ]}
                                        cta={<EnrollButton course={course} isStudent={isStudent} />}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
