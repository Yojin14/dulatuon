import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Course, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, ChevronRight, Edit, GraduationCap, Layers, Plus, Trash2, Users } from 'lucide-react';
import { useCallback, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Courses', href: '/courses' },
];

interface PaginatedCourses {
    data: Course[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface PageProps extends SharedData {
    courses: PaginatedCourses;
}

const levelColors: Record<string, string> = {
    Beginner:     'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    Intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
    Advanced:     'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    draft:     'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived:  'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400',
};

function AdminView({ courses }: { courses: PaginatedCourses }) {
    const [deleting, setDeleting] = useState<number | null>(null);

    const handleDelete = useCallback(async (course: Course) => {
        const { default: Swal } = await import('sweetalert2');
        const result = await Swal.fire({
            title: 'Delete Course?',
            html: `<p>Are you sure you want to delete <strong>${course.title}</strong>? This cannot be undone.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
        });
        if (result.isConfirmed) {
            setDeleting(course.id);
            router.delete(`/courses/${course.id}`, {
                onFinish: () => setDeleting(null),
            });
        }
    }, []);

    return (
        <div className="min-h-full bg-white dark:bg-gray-950">
            <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">Admin Portal</p>
                <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">Course Management</h1>
                <p className="mt-1 text-sm text-blue-200/50">Create and manage all courses. Assign teachers to each course.</p>
            </div>
            <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div className="flex justify-end">
                    <Button asChild className="bg-blue-900 hover:bg-blue-800">
                        <Link href="/courses/create"><Plus className="mr-2 h-4 w-4" />Add Course</Link>
                    </Button>
                </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Instructor</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Max Students</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                        <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
                                        <p className="font-medium">No courses yet</p>
                                        <p className="text-sm">Click &ldquo;Add Course&rdquo; to create the first one.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                courses.data.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell className="font-mono text-sm font-medium">
                                            {course.course_code}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{course.title}</p>
                                                {course.short_description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {course.short_description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {course.teachers?.[0]?.name ?? (
                                                <span className="text-muted-foreground italic">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={levelColors[course.level]}>
                                                {course.level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={statusColors[course.status]}>
                                                {course.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {course.max_students ?? <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/courses/${course.id}/edit`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                                    onClick={() => handleDelete(course)}
                                                    disabled={deleting === course.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
            </div>
            {courses.last_page > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Showing {(courses.current_page - 1) * courses.per_page + 1}–{Math.min(courses.current_page * courses.per_page, courses.total)} of {courses.total} courses</span>
                    <div className="flex gap-2">
                        {courses.current_page > 1 && <Button variant="outline" size="sm" onClick={() => router.get('/courses', { page: courses.current_page - 1 }, { only: ['courses'], preserveScroll: true })}>Previous</Button>}
                        {courses.current_page < courses.last_page && <Button variant="outline" size="sm" onClick={() => router.get('/courses', { page: courses.current_page + 1 }, { only: ['courses'], preserveScroll: true })}>Next</Button>}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

function TeacherView({ courses }: { courses: PaginatedCourses }) {
    return (
        <div className="min-h-full bg-white dark:bg-gray-950">
            <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">Teacher Portal</p>
                        <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">My Assigned Courses</h1>
                        <p className="mt-1 text-sm text-blue-200/50">Courses currently assigned to you as instructor.</p>
                    </div>
                </div>
            </div>
            <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {courses.data.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 py-12 text-center dark:border-gray-800">
                    <BookOpen className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                    <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No courses assigned</p>
                        <p className="mt-0.5 text-xs text-gray-400">You have not been assigned to any courses yet.</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {courses.data.map((course) => (
                            <div key={course.id} className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                        <BookOpen className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{course.title}</p>
                                        <p className="font-mono text-xs text-gray-400">{course.course_code}</p>
                                    </div>
                                </div>
                                {(course.short_description ?? course.description) && (
                                    <p className="mb-3 line-clamp-2 text-xs text-gray-400">{course.short_description ?? course.description}</p>
                                )}
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className={levelColors[course.level]}>{course.level}</Badge>
                                    <Badge variant="outline" className={statusColors[course.status]}>{course.status}</Badge>
                                </div>
                                <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{(course as any).modules_count ?? 0} modules</span>
                                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{(course as any).enrollments_count ?? 0} enrolled</span>
                                </div>
                                <Button asChild className="mt-auto w-full bg-blue-900 hover:bg-blue-800 text-white text-sm">
                                    <Link href={`/my-course/${course.id}`}>Manage Course <ChevronRight className="ml-1 h-4 w-4" /></Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                    {courses.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-400">
                            <span>Showing {(courses.current_page - 1) * courses.per_page + 1}–{Math.min(courses.current_page * courses.per_page, courses.total)} of {courses.total}</span>
                            <div className="flex gap-2">
                                {courses.current_page > 1 && <Button variant="outline" size="sm" onClick={() => router.get('/courses', { page: courses.current_page - 1 }, { only: ['courses'], preserveScroll: true })}>Previous</Button>}
                                {courses.current_page < courses.last_page && <Button variant="outline" size="sm" onClick={() => router.get('/courses', { page: courses.current_page + 1 }, { only: ['courses'], preserveScroll: true })}>Next</Button>}
                            </div>
                        </div>
                    )}
                </>
            )}
            </div>
        </div>
    );
}

function StudentView({ courses }: { courses: PaginatedCourses }) {
    return (
        <div className="min-h-full bg-white dark:bg-gray-950">
            <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">Student Portal</p>
                        <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">Available Courses</h1>
                        <p className="mt-1 text-sm text-blue-200/50">Browse all available courses.</p>
                    </div>
                </div>
            </div>
            <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {courses.data.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 py-12 text-center dark:border-gray-800">
                    <BookOpen className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                    <p className="text-sm text-gray-400">No courses available. Check back later.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.data.map((course) => (
                        <div key={course.id} className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                            <div className="mb-3 flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                    <BookOpen className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{course.title}</p>
                                    <p className="text-xs text-gray-400">{course.teachers?.[0]?.name ?? 'No instructor assigned'}</p>
                                </div>
                            </div>
                            {course.description && (
                                <p className="mb-3 line-clamp-2 text-xs text-gray-400">{course.short_description ?? course.description}</p>
                            )}
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={levelColors[course.level]}>{course.level}</Badge>
                                <span className="font-mono text-xs text-gray-400">{course.course_code}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}

export default function CoursesIndex() {
    const { auth, courses } = usePage<PageProps>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courses" />
            {auth.user.role === 'admin' ? (
                <AdminView courses={courses} />
            ) : auth.user.role === 'teacher' ? (
                <TeacherView courses={courses} />
            ) : (
                <StudentView courses={courses} />
            )}
        </AppLayout>
    );
}
