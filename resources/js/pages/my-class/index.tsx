import { ACCENT_POOL, CourseCard } from '@/components/course-card';
import { CoverGallery } from '@/components/cover/cover-gallery';
import { EmptyState } from '@/components/game/empty-state';
import { ProgressRing } from '@/components/game/progress-ring';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Camera,
    ChevronRight,
    Clock,
    FileText,
    GraduationCap,
    GripVertical,
    Image as ImageIcon,
    Layers,
    Loader2,
    Search,
    Users,
} from 'lucide-react';
import { useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Course', href: '/my-course' },
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
        <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8">
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
                <div>
                    <h1 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">
                        My courses
                    </h1>
                    <p className="mt-1.5 text-muted-foreground">
                        {enrollments.length === 0
                            ? 'Courses you join will live here.'
                            : `${enrollments.length} ${enrollments.length === 1 ? 'course' : 'courses'} in your journey.`}
                    </p>
                </div>
                {enrollments.length > 0 && (
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search your courses"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                            aria-label="Search your courses"
                        />
                    </div>
                )}
            </header>

            <div className="mt-8">
                {enrollments.length === 0 ? (
                    <EmptyState
                        title="No courses yet"
                        description="Pick a course to start. Your XP and badges begin with your first lesson."
                        action={
                            <Button asChild>
                                <Link href="/explore">
                                    Explore courses <ChevronRight />
                                </Link>
                            </Button>
                        }
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title="No matches"
                        description="No course in your list matches that search."
                    />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((e, idx) => {
                            const colors =
                                ACCENT_POOL[idx % ACCENT_POOL.length];
                            const isCleared = e.progress_percentage >= 100;

                            return (
                                <CourseCard
                                    key={e.enrollment_id}
                                    title={e.course.title}
                                    thumbnail={e.course.thumbnail}
                                    thumbnailFocus={e.course.thumbnail_focus}
                                    description={
                                        e.course.short_description ??
                                        e.course.description
                                    }
                                    colors={colors}
                                    badge={
                                        <span className="rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                                            {isCleared
                                                ? 'Cleared'
                                                : e.course.level}
                                        </span>
                                    }
                                    titleExtra={
                                        <ProgressRing
                                            value={e.progress_percentage}
                                            size={52}
                                            stroke={5}
                                        />
                                    }
                                    stats={[
                                        {
                                            icon: Layers,
                                            value: e.course.modules_count,
                                            label: 'modules',
                                        },
                                    ]}
                                    meta={[
                                        {
                                            icon: GraduationCap,
                                            text:
                                                e.course.instructor?.name ??
                                                'No instructor yet',
                                        },
                                        {
                                            icon: Clock,
                                            text: `Joined ${e.enrollment_date}`,
                                        },
                                    ]}
                                    cta={
                                        <Button
                                            asChild
                                            variant={
                                                isCleared ? 'outline' : 'play'
                                            }
                                            className="w-full"
                                        >
                                            <Link
                                                href={`/my-course/${e.course_id}`}
                                            >
                                                {isCleared
                                                    ? 'Review course'
                                                    : e.progress_percentage > 0
                                                      ? 'Continue'
                                                      : 'Start'}
                                                <ChevronRight />
                                            </Link>
                                        </Button>
                                    }
                                />
                            );
                        })}
                    </div>
                )}
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
        /** 'gallery' picks a ready-made cover or upload; 'position' drags the focus point. */
        view: 'gallery' | 'position';
        preview: string;
        file: File | null;
        presetId?: string | null;
        focusX: number;
        focusY: number;
    };
    const [repos, setRepos] = useState<ReposState | null>(null);
    const [reposSaving, setReposSaving] = useState(false);
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
                view: 'position',
                preview: thumb,
                file: null,
                focusX: m ? parseFloat(m[1]) : 50,
                focusY: m ? parseFloat(m[2]) : 50,
            });
        } else {
            setRepos({
                course,
                view: 'gallery',
                preview: '',
                file: null,
                focusX: 50,
                focusY: 50,
            });
        }
    }

    function openCoverUpload(course: CourseData) {
        activeCourseRef.current = course;
        thumbInputRef.current?.click();
    }

    function handlePresetPick(file: File, presetId: string) {
        setRepos((prev) =>
            prev
                ? {
                      ...prev,
                      view: 'position',
                      preview: URL.createObjectURL(file),
                      file,
                      presetId,
                      focusX: 50,
                      focusY: 50,
                  }
                : null,
        );
    }

    function handleThumbFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        const course = activeCourseRef.current;
        if (!file || !course) return;
        setRepos({
            course,
            view: 'position',
            preview: URL.createObjectURL(file),
            file,
            presetId: null,
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
            <div className="min-h-full pb-10">
                {/* Header */}
                <PageHeader
                    title={isAdmin ? 'All courses' : 'Your courses'}
                    description={
                        isAdmin
                            ? 'Every course created in Dulatuon.'
                            : 'Manage your courses, modules and lesson materials.'
                    }
                />

                {/* Hidden file input for thumbnail upload */}
                <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbFile}
                />

                {/* Content */}
                <div className="mx-auto w-full max-w-[1600px] space-y-10 px-5 py-8 sm:px-8">
                    {groups.map((group) => (
                        <div key={group.level}>
                            {/* Level label */}
                            <div className="mb-5 flex items-center gap-3">
                                <h2 className="text-base font-bold text-foreground">
                                    {group.level}
                                </h2>
                                <div className="flex-1 border-t border-border" />
                                <span className="text-xs text-muted-foreground">
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
                                                <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm dark:text-muted-foreground/60">
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
                                                    className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-violet-300/20 bg-primary/55 px-2.5 py-1 text-[11px] font-medium text-violet-50 backdrop-blur-sm transition-colors hover:bg-primary/75"
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
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Link
                                                        href={`/my-course/${course.id}`}
                                                    >
                                                        Manage course{' '}
                                                        <ChevronRight />
                                                    </Link>
                                                </Button>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Cover modal: pick a cover, then position it ── */}
            <Dialog
                open={!!repos}
                onOpenChange={(open) => {
                    if (!open && !reposSaving) {
                        setRepos(null);
                    }
                }}
            >
                <DialogContent
                    className={`overflow-hidden p-0 ${repos?.view === 'gallery' ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
                >
                    <DialogHeader className="px-5 pt-5 pb-1">
                        <DialogTitle className="font-display text-lg font-extrabold tracking-[-0.02em]">
                            {repos?.view === 'gallery'
                                ? 'Choose a cover'
                                : 'Edit cover'}
                        </DialogTitle>
                        {repos?.view === 'gallery' && (
                            <p className="text-sm text-muted-foreground">
                                Pick a Dulatuon cover made for science courses,
                                or upload your own photo.
                            </p>
                        )}
                    </DialogHeader>

                    {repos?.view === 'gallery' && (
                        <>
                            <div className="max-h-[60vh] overflow-y-auto px-5 pt-2">
                                <CoverGallery
                                    selectedId={repos.presetId}
                                    onPick={handlePresetPick}
                                    onUpload={() =>
                                        openCoverUpload(repos.course)
                                    }
                                />
                            </div>
                            <DialogFooter className="gap-2 px-5 pt-3 pb-5">
                                {repos.preview ? (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setRepos((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          view: 'position',
                                                      }
                                                    : null,
                                            )
                                        }
                                    >
                                        Back
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => setRepos(null)}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}

                    {repos?.view === 'position' && (
                        <>
                            {/* Drag-to-reposition cropper */}
                            <div
                                ref={reposPreviewRef}
                                className={`relative mt-3 w-full overflow-hidden bg-muted select-none ${reposDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-linear-to-t from-black/50 to-transparent pt-8 pb-2.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                                        <GripVertical className="h-3 w-3" />
                                        Drag to reposition
                                    </span>
                                </div>
                            </div>

                            <div className="px-5 pt-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRepos((prev) =>
                                            prev
                                                ? { ...prev, view: 'gallery' }
                                                : null,
                                        )
                                    }
                                    className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    Choose a different cover
                                </button>
                            </div>

                            <DialogFooter className="gap-2 px-5 pt-3 pb-5">
                                <Button
                                    variant="outline"
                                    onClick={() => setRepos(null)}
                                    disabled={reposSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveRepos}
                                    disabled={reposSaving}
                                >
                                    {reposSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving…
                                        </>
                                    ) : repos.file ? (
                                        'Save cover'
                                    ) : (
                                        'Save position'
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
