import { ACCENT_POOL, CourseCard } from '@/components/course-card';
import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Camera,
    ChevronRight,
    Clock,
    FileText,
    GraduationCap,
    GripVertical,
    Layers,
    Loader2,
    Search,
    Upload,
    Users,
} from 'lucide-react';
import { useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assigned Course', href: '/my-course' },
];

const STATUS_LABELS: Record<string, string> = {
    published: 'Published',
    draft: 'Draft',
    archived: 'Archived',
};

const STATUS_DOT: Record<string, string> = {
    published: 'bg-green-500',
    draft: 'bg-yellow-500',
    archived: 'bg-gray-400',
};

interface EnrollmentData {
    enrollment_id: number;
    course_id: number;
    status: 'active';
    progress_percentage: number;
    enrollment_date: string;
    course: {
        id: number;
        title: string;
        description?: string;
        short_description?: string;
        level: string;
        course_code: string;
        modules_count: number;
        thumbnail?: string | null;
        thumbnail_focus?: string;
        instructor?: { name: string };
        updated_at: string;
    };
}

function StudentMyClass({ enrollments }: { enrollments: EnrollmentData[] }) {
    const [search, setSearch] = useState('');

    const filtered = enrollments.filter((e) => {
        if (!search) return true;
        return (
            e.course.title.toLowerCase().includes(search.toLowerCase()) ||
            e.course.course_code.toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
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
                            My Course
                        </h1>
                    </div>
                </div>
            </div>

            <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                {enrollments.length > 0 && (
                    <div className="relative max-w-xs">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search your courses…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                )}
                {/* Content */}
                <div>
                    {enrollments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <BookOpen className="mb-4 h-12 w-12 text-gray-200" />
                            <p className="text-base font-semibold text-gray-500">
                                No courses yet
                            </p>
                            <p className="mt-1 mb-5 text-sm text-gray-400">
                                Browse available courses and request enrollment.
                            </p>
                            <Link href="/explore">
                                <Button className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                                    Explore Courses{' '}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((e, idx) => {
                                const colors =
                                    ACCENT_POOL[idx % ACCENT_POOL.length];
                                return (
                                    <CourseCard
                                        key={e.enrollment_id}
                                        title={e.course.title}
                                        thumbnail={e.course.thumbnail}
                                        thumbnailFocus={
                                            e.course.thumbnail_focus
                                        }
                                        description={
                                            e.course.short_description ??
                                            e.course.description
                                        }
                                        colors={colors}
                                        badge={
                                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 shadow-sm dark:bg-green-900/30 dark:text-green-400">
                                                Enrolled
                                            </span>
                                        }
                                        titleExtra={
                                            <div className="relative h-12 w-12">
                                                <svg
                                                    className="h-12 w-12 -rotate-90"
                                                    viewBox="0 0 36 36"
                                                >
                                                    <defs>
                                                        <linearGradient
                                                            id="course-progress-gradient"
                                                            x1="0%"
                                                            y1="0%"
                                                            x2="100%"
                                                            y2="100%"
                                                        >
                                                            <stop
                                                                offset="0%"
                                                                stopColor="#1e3a8a"
                                                            />
                                                            <stop
                                                                offset="45%"
                                                                stopColor="#24335a"
                                                            />
                                                            <stop
                                                                offset="75%"
                                                                stopColor="#97aae9"
                                                            />
                                                            <stop
                                                                offset="100%"
                                                                stopColor="#312e81"
                                                            />
                                                        </linearGradient>
                                                    </defs>
                                                    <circle
                                                        cx="18"
                                                        cy="18"
                                                        r="14"
                                                        fill="none"
                                                        stroke="#e5e7eb"
                                                        strokeWidth="4"
                                                    />
                                                    <circle
                                                        cx="18"
                                                        cy="18"
                                                        r="14"
                                                        fill="none"
                                                        stroke="url(#course-progress-gradient)"
                                                        strokeWidth="4"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${(e.progress_percentage / 100) * 87.96} 87.96`}
                                                    />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1e3a8a]">
                                                    {e.progress_percentage}%
                                                </span>
                                            </div>
                                        }
                                        stats={[
                                            {
                                                icon: Layers,
                                                value: e.course.modules_count,
                                                label: 'Modules',
                                            },
                                        ]}
                                        meta={[
                                            {
                                                icon: GraduationCap,
                                                text:
                                                    e.course.instructor?.name ??
                                                    'No instructor',
                                            },
                                            {
                                                icon: Clock,
                                                text: `Enrolled ${e.enrollment_date}`,
                                            },
                                        ]}
                                        cta={
                                            <Link
                                                href={`/my-course/${e.course_id}`}
                                                className="block"
                                            >
                                                <button
                                                    className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1e3a8a] transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
                                                    style={{
                                                        background: `linear-gradient(white, white) padding-box, ${PORTAL_GRADIENT} border-box`,
                                                        border: '1.5px solid transparent',
                                                    }}
                                                >
                                                    View Course{' '}
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </Link>
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface CourseData {
    id: number;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    title: string;
    short_description?: string;
    description?: string;
    status: string;
    modules_count: number;
    enrollments_count: number;
    course_code: string;
    thumbnail?: string | null;
    thumbnail_focus?: string;
    updated_at: string;
    instructor?: { name: string };
}

interface PageProps {
    courses?: CourseData[];
    enrollments?: EnrollmentData[];
}

const LEVEL_ORDER: Array<CourseData['level']> = [
    'Beginner',
    'Intermediate',
    'Advanced',
];

export default function MyClassIndex({
    courses = [],
    enrollments = [],
}: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const isStudent = auth.user.role === 'student';
    const isAdmin = auth.user.role === 'admin';

    // Thumbnail upload + reposition (teacher/admin only)
    const [thumbOverrides, setThumbOverrides] = useState<
        Record<number, string>
    >({});
    const [thumbFocusOverrides, setThumbFocusOverrides] = useState<
        Record<number, string>
    >({});
    const thumbInputRef = useRef<HTMLInputElement>(null);
    const activeCourseRef = useRef<CourseData | null>(null);

    // Reposition modal
    type ReposState = {
        course: CourseData;
        preview: string;
        file: File | null;
        focusX: number;
        focusY: number;
    };
    const [repos, setRepos] = useState<ReposState | null>(null);
    const [reposSaving, setReposSaving] = useState(false);
    const [confirmReplace, setConfirmReplace] = useState(false);
    const reposPreviewRef = useRef<HTMLDivElement>(null);
    const reposImgRef = useRef<HTMLImageElement>(null);
    const reposDragRef = useRef<{
        startX: number;
        startY: number;
        fx: number;
        fy: number;
    } | null>(null);
    const [reposDragging, setReposDragging] = useState(false);

    function handleEditCover(course: CourseData) {
        const thumb = thumbOverrides[course.id] ?? course.thumbnail;
        if (thumb) {
            const fs =
                thumbFocusOverrides[course.id] ??
                course.thumbnail_focus ??
                '50% 50%';
            const m = fs.match(/^([\d.]+)%\s+([\d.]+)%$/);
            setRepos({
                course,
                preview: thumb,
                file: null,
                focusX: m ? parseFloat(m[1]) : 50,
                focusY: m ? parseFloat(m[2]) : 50,
            });
        } else {
            activeCourseRef.current = course;
            thumbInputRef.current?.click();
        }
    }

    function handleThumbFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        const course = activeCourseRef.current;
        if (!file || !course) return;
        setRepos({
            course,
            preview: URL.createObjectURL(file),
            file,
            focusX: 50,
            focusY: 50,
        });
        if (thumbInputRef.current) thumbInputRef.current.value = '';
    }

    function handleReposDragStart(e: React.MouseEvent) {
        if (!repos) return;
        e.preventDefault();
        reposDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            fx: repos.focusX,
            fy: repos.focusY,
        };
        setReposDragging(true);
    }

    function handleReposDragMove(e: React.MouseEvent) {
        if (!reposDragRef.current || !repos) return;
        const img = reposImgRef.current;
        const container = reposPreviewRef.current;
        if (!img || !container) return;
        const cw = container.offsetWidth,
            ch = container.offsetHeight;
        const nw = img.naturalWidth || cw,
            nh = img.naturalHeight || ch;
        const scale = Math.max(cw / nw, ch / nh);
        const ox = Math.max(1, nw * scale - cw),
            oy = Math.max(1, nh * scale - ch);
        const dx = e.clientX - reposDragRef.current.startX;
        const dy = e.clientY - reposDragRef.current.startY;
        const newX = Math.max(
            0,
            Math.min(100, reposDragRef.current.fx - (dx / ox) * 100),
        );
        const newY = Math.max(
            0,
            Math.min(100, reposDragRef.current.fy - (dy / oy) * 100),
        );
        setRepos((prev) =>
            prev ? { ...prev, focusX: newX, focusY: newY } : null,
        );
    }

    function handleReposDragEnd() {
        reposDragRef.current = null;
        setReposDragging(false);
    }

    async function saveRepos() {
        if (!repos) return;
        const { course, file, focusX, focusY } = repos;
        const focusStr = `${focusX.toFixed(1)}% ${focusY.toFixed(1)}%`;
        setReposSaving(true);
        try {
            const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
            const xsrf = token ? decodeURIComponent(token) : '';
            if (file) {
                const fd = new FormData();
                fd.append('thumbnail_file', file);
                fd.append('thumbnail_focus', focusStr);
                const res = await fetch(`/my-course/${course.id}/thumbnail`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': xsrf,
                    },
                    body: fd,
                });
                if (res.ok) {
                    const json = (await res.json()) as {
                        thumbnail: string;
                        thumbnail_focus: string;
                    };
                    setThumbOverrides((p) => ({
                        ...p,
                        [course.id]: json.thumbnail,
                    }));
                    setThumbFocusOverrides((p) => ({
                        ...p,
                        [course.id]: json.thumbnail_focus,
                    }));
                }
            } else {
                await fetch(`/my-course/${course.id}/thumbnail-focus`, {
                    method: 'PATCH',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': xsrf,
                    },
                    body: JSON.stringify({ thumbnail_focus: focusStr }),
                });
                setThumbFocusOverrides((p) => ({
                    ...p,
                    [course.id]: focusStr,
                }));
            }
            setRepos(null);
        } catch {
            /* silent */
        } finally {
            setReposSaving(false);
        }
    }

    // Group courses by level, only include levels that have courses
    const groups = LEVEL_ORDER.map((level) => ({
        level,
        courses: courses.filter((c) => c.level === level),
    })).filter((g) => g.courses.length > 0);

    // Assign a stable accent color per course by index across all courses
    const accentByIndex = (idx: number) =>
        ACCENT_POOL[idx % ACCENT_POOL.length];

    // Build a flat index across groups for color assignment
    let colorIdx = 0;
    const colorMap = new Map<number, (typeof ACCENT_POOL)[0]>();
    groups.forEach((g) =>
        g.courses.forEach((c) => {
            colorMap.set(c.id, accentByIndex(colorIdx++));
        }),
    );

    if (isStudent) {
        const studentBreadcrumbs: BreadcrumbItem[] = [
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'My Course', href: '/my-course' },
        ];
        return (
            <AppLayout breadcrumbs={studentBreadcrumbs}>
                <Head title="My Course" />
                <StudentMyClass enrollments={enrollments} />
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assigned Course" />
            <div className="min-h-full bg-white dark:bg-gray-950">
                {/* Header */}
                <div
                    className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
                    style={{ background: PORTAL_GRADIENT }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-yellow-300/80 uppercase">
                                {isAdmin ? 'Admin Portal' : 'Teacher Portal'}
                            </p>
                            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                                {isAdmin ? 'All Courses' : 'Assigned Course'}
                            </h1>
                            <p className="mt-1 text-sm text-blue-200/50">
                                {isAdmin
                                    ? 'All courses created in the system.'
                                    : 'Manage your courses, modules, and lesson materials.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Hidden file input for thumbnail upload */}
                <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbFile}
                />

                {/* Content */}
                <div className="space-y-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    {groups.map((group) => (
                        <div key={group.level}>
                            {/* Level label */}
                            <div className="mb-5 flex items-center gap-3">
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                    {group.level}
                                </h2>
                                <div className="flex-1 border-t border-gray-200 dark:border-gray-800" />
                                <span className="text-xs text-gray-400">
                                    {group.courses.length} course
                                    {group.courses.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Cards grid */}
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                {group.courses.map((course) => {
                                    const colors = colorMap.get(course.id)!;
                                    const thumb =
                                        thumbOverrides[course.id] ??
                                        course.thumbnail;
                                    const focus =
                                        thumbFocusOverrides[course.id] ??
                                        course.thumbnail_focus;
                                    return (
                                        <CourseCard
                                            key={course.id}
                                            title={course.title}
                                            thumbnail={thumb}
                                            thumbnailFocus={focus}
                                            description={
                                                course.short_description ??
                                                course.description
                                            }
                                            colors={colors}
                                            badge={
                                                <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-600 shadow-sm backdrop-blur-sm dark:bg-gray-900/80 dark:text-gray-300">
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[course.status] ?? 'bg-gray-400'}`}
                                                    />
                                                    {
                                                        STATUS_LABELS[
                                                            course.status
                                                        ]
                                                    }
                                                </span>
                                            }
                                            thumbnailOverlay={
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEditCover(course)
                                                    }
                                                    className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-blue-300/20 bg-[#1e3a8a]/55 px-2.5 py-1 text-[11px] font-medium text-blue-50 backdrop-blur-sm transition-colors hover:bg-[#1e3a8a]/75"
                                                >
                                                    <Camera className="h-3 w-3" />
                                                    Edit cover
                                                </button>
                                            }
                                            stats={[
                                                {
                                                    icon: Layers,
                                                    value: course.modules_count,
                                                    label: 'Modules',
                                                },
                                                {
                                                    icon: Users,
                                                    value: course.enrollments_count,
                                                    label: 'Enrolled',
                                                },
                                                {
                                                    icon: FileText,
                                                    value: 0,
                                                    label: 'Materials',
                                                },
                                            ]}
                                            meta={[
                                                {
                                                    icon: GraduationCap,
                                                    text: (
                                                        <>
                                                            <span className="truncate">
                                                                {course
                                                                    .instructor
                                                                    ?.name ??
                                                                    'No instructor'}
                                                            </span>
                                                            <span className="mx-1">
                                                                ·
                                                            </span>
                                                            <span className="font-mono tracking-wide uppercase">
                                                                {
                                                                    course.course_code
                                                                }
                                                            </span>
                                                        </>
                                                    ),
                                                },
                                                {
                                                    icon: Clock,
                                                    text: `Updated ${course.updated_at}`,
                                                },
                                            ]}
                                            cta={
                                                <Link
                                                    href={`/my-course/${course.id}`}
                                                    className="block"
                                                >
                                                    <button
                                                        className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-[#1e3a8a] transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
                                                        style={{
                                                            background: `linear-gradient(white, white) padding-box, ${PORTAL_GRADIENT} border-box`,
                                                            border: '1.5px solid transparent',
                                                        }}
                                                    >
                                                        Manage Course{' '}
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </button>
                                                </Link>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Reposition modal ── */}
            <Dialog
                open={!!repos}
                onOpenChange={(open) => {
                    if (!open && !reposSaving) {
                        setRepos(null);
                        setConfirmReplace(false);
                    }
                }}
            >
                <DialogContent className="max-w-md overflow-hidden p-0">
                    <DialogHeader className="px-5 pt-5 pb-3">
                        <DialogTitle className="text-base font-semibold">
                            Edit Cover Photo
                        </DialogTitle>
                    </DialogHeader>

                    {repos && (
                        <>
                            {/* Drag-to-reposition cropper */}
                            <div
                                ref={reposPreviewRef}
                                className={`relative w-full overflow-hidden bg-gray-100 select-none ${reposDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                style={{ aspectRatio: '16 / 7' }}
                                onMouseDown={handleReposDragStart}
                                onMouseMove={handleReposDragMove}
                                onMouseUp={handleReposDragEnd}
                                onMouseLeave={handleReposDragEnd}
                            >
                                <img
                                    ref={reposImgRef}
                                    src={repos.preview}
                                    alt=""
                                    draggable={false}
                                    className="pointer-events-none h-full w-full object-cover"
                                    style={{
                                        objectPosition: `${repos.focusX}% ${repos.focusY}%`,
                                    }}
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent pt-8 pb-2.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                                        <GripVertical className="h-3 w-3" />
                                        Drag to reposition
                                    </span>
                                </div>
                            </div>

                            {/* Change photo option */}
                            <div className="px-5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmReplace(true)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Change photo
                                </button>
                            </div>

                            <DialogFooter className="gap-2 px-5 pt-2 pb-5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRepos(null)}
                                    disabled={reposSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={saveRepos}
                                    disabled={reposSaving}
                                >
                                    {reposSaving ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        'Save Position'
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Confirm replace cover modal ── */}
            <Dialog open={confirmReplace} onOpenChange={setConfirmReplace}>
                <DialogContent className="max-w-xs overflow-hidden p-0">
                    <DialogTitle className="sr-only">
                        Replace Cover Photo
                    </DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div
                            className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ background: PORTAL_GRADIENT }}
                        >
                            <Upload className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Replace cover photo?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            Choose a new image to replace the current cover. The
                            previous photo will be removed.
                        </p>
                        <div className="mt-5 flex w-full gap-2">
                            <Button
                                variant="outline"
                                className="h-9 flex-1"
                                onClick={() => setConfirmReplace(false)}
                            >
                                Cancel
                            </Button>
                            <button
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-[#1e3a8a] transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                style={{
                                    background: `linear-gradient(white, white) padding-box, ${PORTAL_GRADIENT} border-box`,
                                    border: '1.5px solid transparent',
                                }}
                                onClick={() => {
                                    setConfirmReplace(false);
                                    if (repos) {
                                        activeCourseRef.current = repos.course;
                                    }
                                    thumbInputRef.current?.click();
                                }}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Replace
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
