import { EmptyState } from '@/components/game/empty-state';
import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorldChip } from '@/components/world/world-scope';
import AppLayout from '@/layouts/app-layout';
import { worldFor } from '@/lib/worlds';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Clock, GraduationCap, Layers, Pencil, Users } from 'lucide-react';

interface CourseDetails {
    id: number;
    title: string;
    course_code: string;
    description: string | null;
    short_description: string | null;
    level: string;
    status: 'draft' | 'published' | 'archived' | string;
    thumbnail: string | null;
    thumbnail_focus: string | null;
    max_students: number | null;
    teachers: { id: number; name: string }[];
    modules: { id: number; title: string }[];
    modules_count: number;
    enrollments_count: number;
    updated_at: string | null;
}

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
    published: { label: 'Published', variant: 'success' },
    draft: { label: 'Draft', variant: 'warning' },
    archived: { label: 'Archived', variant: 'secondary' },
};

/** Course overview for teachers and admins: what's in it, who teaches it, and where to go next. */
export default function CourseShow({ course }: { course: CourseDetails }) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = auth.user.role === 'admin' || auth.user.role === 'teacher';
    const world = worldFor({ title: course.title, course_code: course.course_code });
    const status = STATUS[course.status] ?? { label: course.status, variant: 'secondary' as const };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Courses', href: '/courses' },
        { title: course.title, href: `/courses/${course.id}` },
    ];

    const facts = [
        { icon: Layers, label: 'Modules', value: course.modules_count },
        { icon: Users, label: 'Students', value: course.max_students ? `${course.enrollments_count} / ${course.max_students}` : course.enrollments_count },
        { icon: GraduationCap, label: 'Level', value: course.level },
        { icon: Clock, label: 'Updated', value: course.updated_at ?? '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={course.title} />
            <div className="min-h-full pb-10">
                <PageHeader
                    title={course.title}
                    description={course.short_description || `Course code ${course.course_code}`}
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link href={`/my-course/${course.id}`}>
                                    Open course <ArrowRight />
                                </Link>
                            </Button>
                            {canEdit && (
                                <Button asChild>
                                    <Link href={`/courses/${course.id}/edit`}>
                                        <Pencil /> Edit details
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="flex min-w-0 flex-col gap-6">
                        {/* Cover */}
                        <section className="relative overflow-hidden rounded-3xl border shadow-panel">
                            <div className="relative aspect-[16/6] w-full" style={{ background: world.accentSoft }}>
                                {course.thumbnail ? (
                                    <img
                                        src={course.thumbnail}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        style={{ objectPosition: course.thumbnail_focus ?? 'center' }}
                                    />
                                ) : (
                                    <div className="grid h-full place-items-center bg-world-sky">
                                        <LowPolyBlock biome={world.biome} className="w-40 drop-shadow-[0_18px_18px_rgba(85,48,28,0.25)] sm:w-52" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                    <WorldChip world={world} />
                                    <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                            </div>
                            <dl className="grid grid-cols-2 divide-x divide-y bg-card sm:grid-cols-4 sm:divide-y-0">
                                {facts.map((fact) => (
                                    <div key={fact.label} className="flex items-center gap-3 px-5 py-4">
                                        <fact.icon className="size-5 shrink-0 text-primary" aria-hidden />
                                        <div className="min-w-0">
                                            <dt className="text-xs font-semibold text-muted-foreground">{fact.label}</dt>
                                            <dd className="truncate font-display font-extrabold">{fact.value}</dd>
                                        </div>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <section className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                            <h2 className="text-lg font-bold tracking-[-0.01em]">About this course</h2>
                            <p className="mt-2 leading-relaxed whitespace-pre-line text-muted-foreground">
                                {course.description || 'No description yet. Add one from Edit details so students know what they will learn.'}
                            </p>
                        </section>

                        <section className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                            <h2 className="text-lg font-bold tracking-[-0.01em]">Modules</h2>
                            {course.modules.length === 0 ? (
                                <EmptyState className="mt-4" title="No modules yet" description="Open the course and switch to edit mode to add modules and lessons." />
                            ) : (
                                <ol className="mt-4 flex flex-col gap-2">
                                    {course.modules.map((module, i) => (
                                        <li key={module.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                                            <span className="grid size-8 shrink-0 place-items-center bg-primary font-display text-sm font-extrabold text-primary-foreground [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
                                                {i + 1}
                                            </span>
                                            <span className="min-w-0 truncate font-semibold">{module.title}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </div>

                    <aside className="flex flex-col gap-6">
                        <section className="rounded-3xl border bg-card p-5 shadow-panel">
                            <h2 className="text-lg font-bold tracking-[-0.01em]">Teachers</h2>
                            {course.teachers.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">No teacher assigned yet.</p>
                            ) : (
                                <ul className="mt-3 flex flex-col gap-2">
                                    {course.teachers.map((teacher) => (
                                        <li key={teacher.id} className="flex items-center gap-3">
                                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                                {teacher.name
                                                    .split(/\s+/)
                                                    .slice(0, 2)
                                                    .map((part) => part[0]?.toUpperCase())
                                                    .join('')}
                                            </span>
                                            <span className="truncate font-semibold">{teacher.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        <section className="rounded-3xl border bg-card p-5 shadow-panel">
                            <h2 className="text-lg font-bold tracking-[-0.01em]">Course code</h2>
                            <p className="mt-1 font-mono text-sm tracking-wide uppercase">{course.course_code}</p>
                        </section>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
