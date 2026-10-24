import {
    GradeDialog,
    type GradeSummary,
} from '@/components/assignments/grade-dialog';
import { RankAvatar } from '@/components/game/rank-avatar';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { alertDialog, confirmDialog } from '@/lib/dialog';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    BookOpen,
    CheckCircle2,
    ClipboardList,
    Download,
    ExternalLink,
    Eye,
    FileText,
    GraduationCap,
    MessageSquare,
    PenLine,
    Send,
    TrendingUp,
    Type,
    Users,
    Video,
    X,
} from 'lucide-react';
import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbModule {
    id: number;
    title: string;
}

interface DbStudent {
    id: number;
    name: string;
    email: string;
    progress_percentage: number;
    /** Overall XP across all their courses (rank frame). */
    xp?: number;
    avatar?: string | null;
    enrollment_status: string;
    enrollment_id: number;
}

interface DbInstructor {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
}

interface DbCourse {
    id: number;
    title: string;
    course_code: string;
    level: string | null;
    status: string;
    teachers: DbInstructor[];
    modules: DbModule[];
    students: DbStudent[];
    announcements: DbAnnouncement[];
}

interface FeedAuthor {
    id: number;
    name: string;
}
interface DbAnnouncementComment {
    id: number;
    author: FeedAuthor | null;
    body: string;
    created_at: string;
}
interface DbAnnouncement {
    id: number;
    author: FeedAuthor | null;
    body: string;
    created_at: string;
    comments: DbAnnouncementComment[];
}

interface DbSubmission {
    id: number;
    student: { id: number; name: string; email: string };
    submissionType?: 'text' | 'file' | 'video' | 'both';
    textContent?: string | null;
    videoUrl?: string | null;
    fileName: string | null;
    filePath: string | null;
    fileSize: number | null;
    submittedAt: string;
    status: 'submitted' | 'graded' | 'late';
    grade?: GradeSummary | null;
}

interface DbAssignment {
    id: number;
    title: string;
    dueDate: string | null;
    maxScore: number;
    courseId: number;
    sessionTitle: string;
    submissions: DbSubmission[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function Bar({ value }: { value: number }) {
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/30">
            <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
    course,
    moduleId,
}: {
    course: DbCourse;
    moduleId: number | null;
}) {
    const students = course.students;
    const { avg, done, inProg, notStarted } = useMemo(() => {
        const avg = students.length
            ? Math.round(
                  students.reduce((s, st) => s + st.progress_percentage, 0) /
                      students.length,
              )
            : 0;
        const done = students.filter(
            (s) => s.progress_percentage === 100,
        ).length;
        const inProg = students.filter(
            (s) => s.progress_percentage > 0 && s.progress_percentage < 100,
        ).length;
        const notStarted = students.length - done - inProg;
        return { avg, done, inProg, notStarted };
    }, [students]);

    const activeModule = useMemo(
        () => (moduleId ? course.modules.find((m) => m.id === moduleId) : null),
        [moduleId, course.modules],
    );

    return (
        <div className="space-y-6">
            {activeModule && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 px-5 py-3 dark:border-violet-900/40 dark:bg-violet-900/20">
                    <p className="text-xs font-semibold tracking-wide text-violet-500 uppercase">
                        Filtered by module
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-violet-700 dark:text-violet-300">
                        {activeModule.title}
                    </p>
                </div>
            )}

            <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                <div className="mb-1 flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-foreground">
                        Overall Class Completion
                    </p>
                    <span className="text-xl font-bold text-violet-600">
                        {avg}%
                    </span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                    Average across all {students.length} enrolled students
                </p>
                <Bar value={avg} />
                <div className="mt-3 flex flex-wrap gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {done} completed
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        {inProg} in progress
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        {notStarted} not started
                    </span>
                </div>
            </div>

            {course.modules.length > 0 && (
                <div className="rounded-3xl border bg-card shadow-panel">
                    <div className="border-b border-border px-5 py-3.5">
                        <p className="text-sm font-semibold text-foreground">
                            Modules ({course.modules.length})
                        </p>
                    </div>
                    <div className="divide-y divide-border">
                        {course.modules.map((m, i) => (
                            <div
                                key={m.id}
                                className={`flex items-center gap-4 px-5 py-3.5 ${moduleId === m.id ? 'bg-violet-50/60 dark:bg-violet-900/10' : ''}`}
                            >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                                    {i + 1}
                                </span>
                                <p className="flex-1 text-sm text-foreground">
                                    {m.title}
                                </p>
                                {moduleId === m.id && (
                                    <span className="text-xs font-medium text-violet-600">
                                        Selected
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Students Tab ─────────────────────────────────────────────────────────────

function StudentsTab({
    course,
    moduleId,
}: {
    course: DbCourse;
    moduleId: number | null;
}) {
    const [search, setSearch] = useState('');

    const activeModule = useMemo(
        () => (moduleId ? course.modules.find((m) => m.id === moduleId) : null),
        [moduleId, course.modules],
    );

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return course.students.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q),
        );
    }, [search, course.students]);

    return (
        <div className="space-y-4">
            {activeModule && (
                <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-2 dark:border-violet-900/40 dark:bg-violet-900/20">
                    <p className="text-xs text-violet-600 dark:text-violet-300">
                        Viewing students for{' '}
                        <span className="font-semibold">
                            {activeModule.title}
                        </span>
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <Input
                    placeholder="Search students…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 max-w-xs text-sm"
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                    {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                        {search
                            ? 'No students match your search'
                            : 'No students enrolled'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-xl border border-border bg-card sm:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-5 py-3 text-left text-xs font-bold text-muted-foreground">
                                        Student
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-muted-foreground">
                                        Overall Progress
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-bold text-muted-foreground">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-900/10"
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <RankAvatar
                                                    name={s.name}
                                                    src={s.avatar}
                                                    xp={s.xp ?? 0}
                                                    size="sm"
                                                />
                                                <div>
                                                    <p className="font-semibold text-foreground">
                                                        {s.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {s.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="min-w-[160px] px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <Bar
                                                    value={
                                                        s.progress_percentage
                                                    }
                                                />
                                                <span className="w-9 shrink-0 text-right text-xs font-bold text-violet-600">
                                                    {s.progress_percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                    s.enrollment_status ===
                                                    'active'
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                        : 'bg-muted/50 text-muted-foreground ring-border'
                                                }`}
                                            >
                                                {s.enrollment_status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    s.enrollment_status.slice(
                                                        1,
                                                    )}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2 sm:hidden">
                        {filtered.map((s) => (
                            <div
                                key={s.id}
                                className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6"
                            >
                                <div className="flex items-center gap-3">
                                    <RankAvatar
                                        name={s.name}
                                        src={s.avatar}
                                        xp={s.xp ?? 0}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {s.name}
                                            </p>
                                            <span className="ml-2 text-xs font-bold text-violet-600">
                                                {s.progress_percentage}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {s.email}
                                        </p>
                                        <Bar value={s.progress_percentage} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── People Tab ───────────────────────────────────────────────────────────────

function PeopleTab({ course }: { course: DbCourse }) {
    return (
        <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />{' '}
                Instructors
            </p>
            {course.teachers && course.teachers.length > 0 ? (
                <div className="space-y-2">
                    {course.teachers.map((teacher) => (
                        <div
                            key={teacher.id}
                            className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarImage
                                    src={teacher.avatar ?? undefined}
                                    alt=""
                                />
                                <AvatarFallback className="bg-violet-700 text-sm font-bold text-white">
                                    {initials(teacher.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">
                                    {teacher.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {teacher.email}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-600">
                                Instructor
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    No instructors assigned.
                </p>
            )}
        </div>
    );
}

// ─── Announcements Tab ────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Date.now() - then;
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function AnnouncementsTab({ course }: { course: DbCourse }) {
    const { auth } = usePage<SharedData>().props;
    const me = auth.user;
    const [items, setItems] = useState<DbAnnouncement[]>(
        course.announcements ?? [],
    );
    const [newMsg, setNewMsg] = useState('');
    const [posting, setPosting] = useState(false);
    const [comments, setComments] = useState<Record<number, string>>({});

    // Reseed when switching to a different course (adjusted during render, not in an effect).
    const [seededCourseId, setSeededCourseId] = useState(course.id);
    if (seededCourseId !== course.id) {
        setSeededCourseId(course.id);
        setItems(course.announcements ?? []);
    }

    const refetch = useCallback(() => {
        axios
            .get(`/courses/${course.id}/announcements`)
            .then((r) => setItems(r.data))
            .catch(() => {});
    }, [course.id]);

    // Live updates from other participants (students commenting, co-teachers posting)
    useEffect(() => {
        if (!window.Echo) return;
        const channel = window.Echo.private(`course.${course.id}`);
        const handler = (e: { triggered_by: number }) => {
            if (e.triggered_by === me?.id) return;
            refetch();
        };
        channel.listen('.AnnouncementUpdated', handler);
        return () => {
            channel.stopListening('.AnnouncementUpdated', handler);
            window.Echo.leave(`course.${course.id}`);
        };
    }, [course.id, me?.id, refetch]);

    function post() {
        if (!newMsg.trim() || posting) return;
        setPosting(true);
        axios
            .post(`/courses/${course.id}/announcements`, {
                body: newMsg.trim(),
            })
            .then((r) => {
                setItems((prev) => [r.data, ...prev]);
                setNewMsg('');
            })
            .catch(() =>
                alertDialog({
                    title: 'Could not post',
                    description: 'Check your connection and try again.',
                    tone: 'error',
                }),
            )
            .finally(() => setPosting(false));
    }

    function comment(id: number) {
        const body = comments[id]?.trim();
        if (!body) return;
        axios
            .post(`/announcements/${id}/comments`, { body })
            .then((r) => {
                setItems((prev) =>
                    prev.map((a) =>
                        a.id === id
                            ? {
                                  ...a,
                                  comments: [...a.comments, r.data.comment],
                              }
                            : a,
                    ),
                );
                setComments((p) => ({ ...p, [id]: '' }));
            })
            .catch(() =>
                alertDialog({
                    title: 'Could not comment',
                    description: 'Check your connection and try again.',
                    tone: 'error',
                }),
            );
    }

    async function removeAnnouncement(id: number) {
        const confirmed = await confirmDialog({
            title: 'Delete announcement?',
            description: 'This removes it and all of its comments.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (confirmed) {
            axios
                .delete(`/announcements/${id}`)
                .then(() => setItems((prev) => prev.filter((a) => a.id !== id)))
                .catch(() => {});
        }
    }

    function removeComment(id: number) {
        axios
            .delete(`/announcement-comments/${id}`)
            .then(() =>
                setItems((prev) =>
                    prev.map((a) => ({
                        ...a,
                        comments: a.comments.filter((c) => c.id !== id),
                    })),
                ),
            )
            .catch(() => {});
    }

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-violet-700 text-sm font-bold text-white">
                            {initials(me.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                        <Textarea
                            placeholder="Announce something to your class…"
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            rows={3}
                            className="resize-none text-sm"
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                className="gap-2 bg-violet-600 hover:bg-violet-700"
                                onClick={post}
                                disabled={!newMsg.trim() || posting}
                            >
                                <Send className="h-3.5 w-3.5" />
                                {posting ? 'Posting…' : 'Post'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        No announcements yet. Post one above.
                    </p>
                </div>
            ) : (
                items.map((a) => {
                    const authorName = a.author?.name ?? 'Unknown';
                    return (
                        <div
                            key={a.id}
                            className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                        >
                            <div className="flex items-start gap-4 p-5">
                                <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarFallback className="bg-violet-700 text-sm font-bold text-white">
                                        {initials(authorName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {authorName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {relativeTime(a.created_at)}
                                        </p>
                                    </div>
                                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
                                        {a.body}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeAnnouncement(a.id)}
                                    title="Delete announcement"
                                    className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {a.comments.length > 0 && (
                                <div className="space-y-3 border-t border-border bg-muted/30 px-5 py-4">
                                    {a.comments.map((c) => {
                                        const cName =
                                            c.author?.name ?? 'Unknown';
                                        const canDelete =
                                            c.author?.id === me.id ||
                                            me.role !== 'student';
                                        return (
                                            <div
                                                key={c.id}
                                                className="group flex items-start gap-3"
                                            >
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarFallback className="bg-muted text-[10px] font-bold text-muted-foreground">
                                                        {initials(cName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-xs font-semibold text-foreground">
                                                            {cName}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {relativeTime(
                                                                c.created_at,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <p className="mt-0.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                                        {c.body}
                                                    </p>
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        onClick={() =>
                                                            removeComment(c.id)
                                                        }
                                                        className="shrink-0 p-1 text-muted-foreground/60 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex items-center gap-3 border-t border-border px-5 py-3">
                                <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarFallback className="bg-violet-700 text-[10px] font-bold text-white">
                                        {initials(me.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <Input
                                    placeholder="Add a class comment…"
                                    value={comments[a.id] ?? ''}
                                    onChange={(e) =>
                                        setComments((p) => ({
                                            ...p,
                                            [a.id]: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            comment(a.id);
                                        }
                                    }}
                                    className="h-8 text-xs"
                                />
                                <button
                                    onClick={() => comment(a.id)}
                                    disabled={!comments[a.id]?.trim()}
                                    className="shrink-0 p-1.5 text-violet-600 transition-colors hover:text-violet-700 disabled:text-muted-foreground/60"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// ─── Submissions Tab ──────────────────────────────────────────────────────────

function fmtBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SubmissionsTab({ assignments }: { assignments: DbAssignment[] }) {
    const [expanded, setExpanded] = useState<number | null>(
        assignments[0]?.id ?? null,
    );
    // Grades saved on this page, so the row updates without a reload.
    const [savedGrades, setSavedGrades] = useState<
        Record<number, GradeSummary>
    >({});
    const [grading, setGrading] = useState<{
        submission: DbSubmission;
        assignment: DbAssignment;
    } | null>(null);
    const [openRows, setOpenRows] = useState<Set<number>>(new Set());
    const toggleRow = (id: number) =>
        setOpenRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    if (assignments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                    No assignments in this course
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Assignments you add to lessons will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
                {assignments.length} assignment
                {assignments.length !== 1 ? 's' : ''} ·{' '}
                {assignments.reduce((s, a) => s + a.submissions.length, 0)}{' '}
                submission
                {assignments.reduce((s, a) => s + a.submissions.length, 0) !== 1
                    ? 's'
                    : ''}
            </p>

            {assignments.map((a) => {
                const isOpen = expanded === a.id;
                return (
                    <div
                        key={a.id}
                        className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                    >
                        {/* Assignment header row */}
                        <button
                            onClick={() => setExpanded(isOpen ? null : a.id)}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                <PenLine className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-foreground">
                                    {a.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {a.sessionTitle && (
                                        <span className="mr-2">
                                            {a.sessionTitle}
                                        </span>
                                    )}
                                    {a.dueDate && (
                                        <span>Due {a.dueDate} · </span>
                                    )}
                                    <span>{a.maxScore} pts</span>
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        a.submissions.length > 0
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {a.submissions.length} submitted
                                </span>
                                <span
                                    className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                >
                                    ▾
                                </span>
                            </div>
                        </button>

                        {/* Submission list */}
                        {isOpen &&
                            (a.submissions.length === 0 ? (
                                <div className="border-t border-border px-5 py-8 text-center">
                                    <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        No submissions yet for this assignment.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full border-t border-border text-sm">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="px-5 py-2.5 text-left text-xs font-bold text-muted-foreground">
                                                Student
                                            </th>
                                            <th className="hidden px-5 py-2.5 text-left text-xs font-bold text-muted-foreground sm:table-cell">
                                                Submission
                                            </th>
                                            <th className="hidden px-5 py-2.5 text-left text-xs font-bold text-muted-foreground md:table-cell">
                                                Submitted
                                            </th>
                                            <th className="px-5 py-2.5 text-center text-xs font-bold text-muted-foreground">
                                                Status
                                            </th>
                                            <th className="px-5 py-2.5 text-right text-xs font-bold text-muted-foreground">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {a.submissions.map((s) => {
                                            const isText =
                                                s.submissionType === 'text';
                                            const isVideo =
                                                s.submissionType === 'video';
                                            const rowOpen = openRows.has(s.id);
                                            return (
                                                <Fragment key={s.id}>
                                                    <tr className="transition-colors hover:bg-muted/40">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-7 w-7 shrink-0">
                                                                    <AvatarFallback className="bg-violet-600 text-[10px] font-bold text-white">
                                                                        {s.student.name
                                                                            .split(
                                                                                ' ',
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    n,
                                                                                ) =>
                                                                                    n[0],
                                                                            )
                                                                            .join(
                                                                                '',
                                                                            )
                                                                            .slice(
                                                                                0,
                                                                                2,
                                                                            )
                                                                            .toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-semibold text-foreground">
                                                                        {
                                                                            s
                                                                                .student
                                                                                .name
                                                                        }
                                                                    </p>
                                                                    <p className="truncate text-xs text-muted-foreground">
                                                                        {
                                                                            s
                                                                                .student
                                                                                .email
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="hidden px-5 py-3.5 sm:table-cell">
                                                            <div className="flex min-w-0 items-center gap-1.5">
                                                                {isText ? (
                                                                    <Type className="h-4 w-4 shrink-0 text-violet-400" />
                                                                ) : isVideo ? (
                                                                    <Video className="h-4 w-4 shrink-0 text-purple-400" />
                                                                ) : (
                                                                    <FileText className="h-4 w-4 shrink-0 text-amber-400" />
                                                                )}
                                                                <span className="max-w-[180px] truncate text-sm text-foreground/85">
                                                                    {isText
                                                                        ? 'Text answer'
                                                                        : isVideo
                                                                          ? 'Video link'
                                                                          : s.fileName}
                                                                </span>
                                                                {!isText &&
                                                                    !isVideo &&
                                                                    s.fileSize && (
                                                                        <span className="shrink-0 text-xs text-muted-foreground">
                                                                            (
                                                                            {fmtBytes(
                                                                                s.fileSize,
                                                                            )}
                                                                            )
                                                                        </span>
                                                                    )}
                                                            </div>
                                                        </td>
                                                        <td className="hidden px-5 py-3.5 text-xs text-muted-foreground md:table-cell">
                                                            {s.submittedAt}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            {(savedGrades[
                                                                s.id
                                                            ] ?? s.grade) ? (
                                                                <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 tabular-nums dark:bg-violet-500/15 dark:text-violet-300">
                                                                    {
                                                                        (savedGrades[
                                                                            s.id
                                                                        ] ??
                                                                            s.grade)!
                                                                            .points
                                                                    }
                                                                    /
                                                                    {a.maxScore}
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                                                                        s.status ===
                                                                        'graded'
                                                                            ? 'bg-violet-100 text-violet-600'
                                                                            : s.status ===
                                                                                'late'
                                                                              ? 'bg-red-100 text-red-600'
                                                                              : 'bg-emerald-100 text-emerald-600'
                                                                    }`}
                                                                >
                                                                    {s.status ===
                                                                        'submitted' && (
                                                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                                                    )}
                                                                    {s.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setGrading(
                                                                            {
                                                                                submission:
                                                                                    s,
                                                                                assignment:
                                                                                    a,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                                                                >
                                                                    <PenLine className="h-3.5 w-3.5" />
                                                                    {(savedGrades[
                                                                        s.id
                                                                    ] ??
                                                                    s.grade)
                                                                        ? 'Edit grade'
                                                                        : 'Grade'}
                                                                </button>
                                                                {isText ? (
                                                                    <button
                                                                        onClick={() =>
                                                                            toggleRow(
                                                                                s.id,
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-violet-300 hover:text-violet-600 dark:text-muted-foreground/60"
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5" />
                                                                        {rowOpen
                                                                            ? 'Hide'
                                                                            : 'View'}
                                                                    </button>
                                                                ) : isVideo ? (
                                                                    <a
                                                                        href={
                                                                            s.videoUrl ??
                                                                            '#'
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-violet-300 hover:text-violet-600 dark:text-muted-foreground/60"
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                        Open
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        href={
                                                                            s.filePath ??
                                                                            '#'
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-violet-300 hover:text-violet-600 dark:text-muted-foreground/60"
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        Download
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isText && rowOpen && (
                                                        <tr className="bg-muted/30">
                                                            <td
                                                                colSpan={5}
                                                                className="px-5 py-4"
                                                            >
                                                                <div
                                                                    className="rte-render rounded-lg border border-border bg-card px-4 py-3"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html:
                                                                            s.textContent ??
                                                                            '',
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ))}
                    </div>
                );
            })}

            {grading && (
                <GradeDialog
                    key={grading.submission.id}
                    open
                    onOpenChange={(open) => !open && setGrading(null)}
                    submissionId={grading.submission.id}
                    studentName={grading.submission.student.name}
                    assignmentTitle={grading.assignment.title}
                    maxPoints={grading.assignment.maxScore}
                    current={
                        savedGrades[grading.submission.id] ??
                        grading.submission.grade ??
                        null
                    }
                    onGraded={(grade) =>
                        setSavedGrades((prev) => ({
                            ...prev,
                            [grading.submission.id]: grade,
                        }))
                    }
                />
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Class Management', href: '/class-management' },
];

const TABS = [
    { value: 'overview', label: 'Overview', Icon: TrendingUp },
    { value: 'students', label: 'Enrolled Students', Icon: Users },
    { value: 'submissions', label: 'Submissions', Icon: ClipboardList },
    { value: 'people', label: 'People', Icon: GraduationCap },
    { value: 'announcements', label: 'Announcements', Icon: MessageSquare },
];

interface ClassManagementProps {
    courses: DbCourse[];
    assignments: DbAssignment[];
}

export default function ClassManagementIndex({
    courses = [],
    assignments = [],
}: ClassManagementProps) {
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (typeof window === 'undefined') return 'overview';
        const tab = new URLSearchParams(window.location.search).get('tab');
        return TABS.some((t) => t.value === tab) ? (tab as string) : 'overview';
    });

    function handleTabChange(value: string) {
        setActiveTab(value);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', value);
            window.history.replaceState({}, '', url);
        }
    }

    const [selectedCourseId, setSelectedCourseId] = useState<string>(
        courses[0]?.id?.toString() ?? '',
    );
    const [selectedModuleId, setSelectedModuleId] = useState<string>('all');

    // Real-time state derived from WebSocket events
    const [newSubmissionsCount, setNewSubmissionsCount] = useState(0);
    const subscribedCourseIds = useRef<Set<number>>(new Set());

    // Subscribe to a class channel for each course the teacher manages
    useEffect(() => {
        if (!window.Echo) return;
        const subscribed = subscribedCourseIds.current;

        courses.forEach((c) => {
            if (subscribed.has(c.id)) return;
            subscribed.add(c.id);

            window.Echo.private(`class.${c.id}`).listen(
                '.SubmissionReceived',
                () => {
                    setNewSubmissionsCount((n) => n + 1);
                },
            );
        });

        return () => {
            subscribed.forEach((id) => {
                window.Echo.leave(`class.${id}`);
            });
            subscribed.clear();
        };
    }, [courses]);

    const course = useMemo(
        () => courses.find((c) => c.id.toString() === selectedCourseId) ?? null,
        [courses, selectedCourseId],
    );
    const moduleId =
        selectedModuleId !== 'all' ? parseInt(selectedModuleId, 10) : null;

    function handleCourseChange(val: string) {
        setSelectedCourseId(val);
        setSelectedModuleId('all');
    }

    const courseAssignments = useMemo(
        () =>
            course ? assignments.filter((a) => a.courseId === course.id) : [],
        [assignments, course],
    );

    const avgProgress =
        course && course.students.length
            ? Math.round(
                  course.students.reduce(
                      (s, st) => s + st.progress_percentage,
                      0,
                  ) / course.students.length,
              )
            : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Class Management" />
            <div className="min-h-full pb-10">
                {/* ── Page header ── */}
                <PageHeader
                    title={course ? course.title : 'Select a course'}
                    description="Students, modules, submissions and announcements for your class."
                />

                <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 py-8 sm:px-8">
                    {/* ── Two-level filter ── */}
                    <div className="flex flex-wrap items-end gap-3">
                        {/* Course filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1 text-sm font-bold text-foreground">
                                <BookOpen className="h-3.5 w-3.5 text-violet-500" />{' '}
                                Course
                            </label>
                            <Select
                                value={selectedCourseId}
                                onValueChange={handleCourseChange}
                            >
                                <SelectTrigger className="h-11 min-w-[260px] rounded-lg border-2 border-border bg-card text-sm font-semibold shadow-sm transition-colors hover:border-violet-400 focus:border-violet-500 dark:hover:border-violet-500 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:opacity-100">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 shrink-0 text-violet-500" />
                                        <SelectValue placeholder="Select a course…" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.length === 0 ? (
                                        <SelectItem value="_none" disabled>
                                            No courses assigned
                                        </SelectItem>
                                    ) : (
                                        courses.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={c.id.toString()}
                                            >
                                                <span className="font-medium">
                                                    {c.title}
                                                </span>
                                                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                                                    {c.course_code}
                                                </span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Chevron separator */}
                        <div className="pb-2.5 text-2xl leading-none font-light text-muted-foreground/60 dark:text-muted-foreground">
                            ›
                        </div>

                        {/* Module filter */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-foreground">
                                Module
                            </label>
                            <Select
                                value={selectedModuleId}
                                onValueChange={setSelectedModuleId}
                                disabled={
                                    !course || course.modules.length === 0
                                }
                            >
                                <SelectTrigger className="h-11 min-w-[220px] rounded-lg border-2 border-border bg-card text-sm font-semibold shadow-sm transition-colors hover:border-violet-400 focus:border-violet-500 disabled:opacity-60 dark:hover:border-violet-500 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:opacity-100">
                                    <SelectValue placeholder="All modules" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All modules
                                    </SelectItem>
                                    {course?.modules.map((m) => (
                                        <SelectItem
                                            key={m.id}
                                            value={m.id.toString()}
                                        >
                                            {m.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {moduleId !== null && (
                            <button
                                onClick={() => setSelectedModuleId('all')}
                                className="mb-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground/85"
                            >
                                <X className="h-3 w-3" /> Clear module
                            </button>
                        )}
                    </div>

                    {courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
                            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                            <p className="text-base font-semibold text-muted-foreground">
                                No courses assigned
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                You have no courses assigned to manage.
                            </p>
                        </div>
                    ) : !course ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
                            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                            <p className="text-base font-semibold text-muted-foreground">
                                Select a course to begin
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ── KPI Cards ── */}
                            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                                {[
                                    {
                                        label: 'Enrolled Students',
                                        value: course.students.length,
                                        sub: 'active learners',
                                        Icon: Users,
                                        color: 'text-violet-500',
                                    },
                                    {
                                        label: 'Avg. Completion',
                                        value: `${avgProgress}%`,
                                        sub: 'of course content',
                                        Icon: TrendingUp,
                                        color: 'text-emerald-500',
                                    },
                                    {
                                        label: 'Modules',
                                        value: course.modules.length,
                                        sub: 'in this course',
                                        Icon: BookOpen,
                                        color: 'text-violet-500',
                                    },
                                ].map(({ label, value, sub, Icon, color }) => (
                                    <div
                                        key={label}
                                        className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-sm font-bold text-muted-foreground">
                                                {label}
                                            </p>
                                            <Icon
                                                className={`h-4 w-4 ${color}`}
                                            />
                                        </div>
                                        <p className="font-display text-3xl font-extrabold tracking-[-0.03em] text-foreground tabular-nums">
                                            {value}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {sub}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Tabs ── */}
                            <div className="overflow-hidden rounded-3xl border bg-card shadow-panel">
                                <Tabs
                                    value={activeTab}
                                    onValueChange={handleTabChange}
                                >
                                    <div className="border-b border-border px-4">
                                        <TabsList className="-mb-px flex h-auto [scrollbar-width:none] gap-0 overflow-x-auto rounded-none bg-transparent p-0 [&::-webkit-scrollbar]:hidden">
                                            {TABS.map(
                                                ({ value, label, Icon }) => (
                                                    <TabsTrigger
                                                        key={value}
                                                        value={value}
                                                        className="flex shrink-0 items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-muted-foreground transition-none hover:text-foreground/85 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none dark:text-muted-foreground"
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        {label}
                                                        {value ===
                                                            'submissions' &&
                                                            (() => {
                                                                const count =
                                                                    courseAssignments.reduce(
                                                                        (
                                                                            s,
                                                                            a,
                                                                        ) =>
                                                                            s +
                                                                            a
                                                                                .submissions
                                                                                .length,
                                                                        0,
                                                                    ) +
                                                                    newSubmissionsCount;
                                                                return count >
                                                                    0 ? (
                                                                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
                                                                        {count}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                    </TabsTrigger>
                                                ),
                                            )}
                                        </TabsList>
                                    </div>
                                    <div className="p-5 sm:p-6">
                                        <TabsContent
                                            value="overview"
                                            className="mt-0"
                                        >
                                            <OverviewTab
                                                course={course}
                                                moduleId={moduleId}
                                            />
                                        </TabsContent>
                                        <TabsContent
                                            value="students"
                                            className="mt-0"
                                        >
                                            <StudentsTab
                                                course={course}
                                                moduleId={moduleId}
                                            />
                                        </TabsContent>
                                        <TabsContent
                                            value="submissions"
                                            className="mt-0"
                                        >
                                            <SubmissionsTab
                                                assignments={courseAssignments}
                                            />
                                        </TabsContent>
                                        <TabsContent
                                            value="people"
                                            className="mt-0"
                                        >
                                            <PeopleTab course={course} />
                                        </TabsContent>
                                        <TabsContent
                                            value="announcements"
                                            className="mt-0"
                                        >
                                            <AnnouncementsTab course={course} />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
