import {
    GradeDialog,
    type GradeSummary,
} from '@/components/assignments/grade-dialog';
import { EmptyState } from '@/components/game/empty-state';
import { StatTile } from '@/components/game/stat-tile';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    ClipboardList,
    Download,
    ExternalLink,
    FileText,
    ListChecks,
    PenLine,
    Send,
    Type,
    Video,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assignments', href: '/assignments' },
];

// ─── Shapes from AssignmentsController ────────────────────────────────────────

interface TeacherSubmission {
    id: number;
    student: { id: number | null; name: string; avatar: string | null };
    type: string;
    text: string | null;
    videoUrl: string | null;
    fileName: string | null;
    fileUrl: string | null;
    submittedAt: string | null;
    late: boolean;
    grade: GradeSummary | null;
}

interface TeacherAssignment {
    id: number;
    title: string;
    courseId: number;
    courseTitle: string;
    lesson: string | null;
    dueDate: string | null;
    points: number;
    classSize: number;
    submissions: TeacherSubmission[];
    toGrade: number;
}

interface TeacherQuiz {
    id: number;
    title: string;
    courseId: number;
    courseTitle: string;
    questions: number;
    takers: number;
    averageBest: number | null;
    students: {
        id: number;
        name: string;
        avatar: string | null;
        best: number;
        attempts: number;
    }[];
}

interface StudentAssignment {
    id: number;
    title: string;
    courseId: number;
    courseTitle: string;
    lesson: string | null;
    dueDate: string | null;
    points: number;
    status: 'todo' | 'overdue' | 'submitted' | 'graded';
    submittedAt: string | null;
    grade: GradeSummary | null;
}

interface StudentQuiz {
    id: number;
    title: string;
    courseId: number;
    courseTitle: string;
    questions: number;
    best: number | null;
    attempts: number;
}

type Props =
    | {
          view: 'teacher';
          summary: { toGrade: number; graded: number; missing: number };
          assignments: TeacherAssignment[];
          quizzes: TeacherQuiz[];
      }
    | {
          view: 'student';
          summary: { todo: number; submitted: number; graded: number };
          assignments: StudentAssignment[];
          quizzes: StudentQuiz[];
      };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string | null): string {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function scoreTone(percent: number): string {
    if (percent >= 75) {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
    }
    if (percent >= 50) {
        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
    }

    return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
}

function Chip({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap tabular-nums',
                className,
            )}
        >
            {children}
        </span>
    );
}

function Segmented<T extends string>({
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: { value: T; label: string; count?: number }[];
    onChange: (value: T) => void;
    label: string;
}) {
    return (
        <div
            role="tablist"
            aria-label={label}
            className="flex flex-wrap gap-1.5"
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
                        value === option.value
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                    {option.count !== undefined && (
                        <span className="text-xs tabular-nums opacity-70">
                            {option.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

function PersonAvatar({
    name,
    avatar,
}: {
    name: string;
    avatar: string | null;
}) {
    const getInitials = useInitials();

    return (
        <Avatar className="size-9 shrink-0">
            <AvatarImage src={avatar ?? undefined} alt="" />
            <AvatarFallback className="bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentsIndex(props: Props) {
    const [tab, setTab] = useState<'assignments' | 'quizzes'>('assignments');
    const isTeacher = props.view === 'teacher';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assignments" />
            <PageHeader
                title="Assignments"
                description={
                    isTeacher
                        ? 'Grade submissions and see quiz results across your courses.'
                        : 'Your assignments and quizzes, what is due and how you did.'
                }
            />
            <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 py-8 sm:px-8">
                {props.view === 'teacher' ? (
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 [&>div]:p-3 sm:[&>div]:p-4 [&>div>span:first-child]:hidden sm:[&>div>span:first-child]:grid">
                        <StatTile
                            icon={PenLine}
                            tone="amber"
                            label="To grade"
                            value={props.summary.toGrade}
                        />
                        <StatTile
                            icon={ClipboardCheck}
                            tone="emerald"
                            label="Graded"
                            value={props.summary.graded}
                        />
                        <StatTile
                            icon={AlertTriangle}
                            tone="red"
                            label="Not submitted yet"
                            value={props.summary.missing}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 [&>div]:p-3 sm:[&>div]:p-4 [&>div>span:first-child]:hidden sm:[&>div>span:first-child]:grid">
                        <StatTile
                            icon={ClipboardList}
                            tone="amber"
                            label="To do"
                            value={props.summary.todo}
                        />
                        <StatTile
                            icon={Send}
                            tone="sky"
                            label="Submitted"
                            value={props.summary.submitted}
                        />
                        <StatTile
                            icon={ClipboardCheck}
                            tone="emerald"
                            label="Graded"
                            value={props.summary.graded}
                        />
                    </div>
                )}

                <Segmented
                    label="Show"
                    value={tab}
                    onChange={setTab}
                    options={[
                        {
                            value: 'assignments',
                            label: 'Assignments',
                            count: props.assignments.length,
                        },
                        {
                            value: 'quizzes',
                            label: 'Quizzes',
                            count: props.quizzes.length,
                        },
                    ]}
                />

                {props.view === 'teacher' ? (
                    tab === 'assignments' ? (
                        <TeacherAssignments assignments={props.assignments} />
                    ) : (
                        <TeacherQuizzes quizzes={props.quizzes} />
                    )
                ) : tab === 'assignments' ? (
                    <StudentAssignments assignments={props.assignments} />
                ) : (
                    <StudentQuizzes quizzes={props.quizzes} />
                )}
            </div>
        </AppLayout>
    );
}

// ─── Teacher: assignments + grading ───────────────────────────────────────────

function TeacherAssignments({
    assignments,
}: {
    assignments: TeacherAssignment[];
}) {
    const [filter, setFilter] = useState<'all' | 'grade' | 'done'>('all');
    const [open, setOpen] = useState<number | null>(
        assignments.find((a) => a.toGrade > 0)?.id ?? null,
    );
    const [saved, setSaved] = useState<Record<number, GradeSummary>>({});
    const [grading, setGrading] = useState<{
        submission: TeacherSubmission;
        assignment: TeacherAssignment;
    } | null>(null);

    const gradeOf = (s: TeacherSubmission) => saved[s.id] ?? s.grade;
    const ungraded = (a: TeacherAssignment) =>
        a.submissions.filter((s) => !gradeOf(s)).length;

    if (assignments.length === 0) {
        return (
            <EmptyState
                title="No assignments yet"
                description="Assignments you add to lessons show up here with every submission, ready to grade."
            />
        );
    }

    const shown = assignments.filter((a) =>
        filter === 'grade'
            ? ungraded(a) > 0
            : filter === 'done'
              ? a.submissions.length > 0 && ungraded(a) === 0
              : true,
    );

    return (
        <div className="space-y-4">
            <Segmented
                label="Filter assignments"
                value={filter}
                onChange={setFilter}
                options={[
                    { value: 'all', label: 'All' },
                    {
                        value: 'grade',
                        label: 'To grade',
                        count: assignments.filter((a) => ungraded(a) > 0)
                            .length,
                    },
                    { value: 'done', label: 'All graded' },
                ]}
            />

            {shown.length === 0 && (
                <EmptyState
                    title={
                        filter === 'grade' ? 'All caught up' : 'Nothing here'
                    }
                    description={
                        filter === 'grade'
                            ? 'Every submission has a grade.'
                            : 'No assignments match this filter.'
                    }
                />
            )}

            <ul className="grid gap-3">
                {shown.map((a) => {
                    const isOpen = open === a.id;
                    const left = ungraded(a);

                    return (
                        <li
                            key={a.id}
                            className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                        >
                            <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : a.id)}
                                aria-expanded={isOpen}
                                className="flex w-full cursor-pointer items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:items-center sm:p-5"
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                    <PenLine className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-display text-base font-bold">
                                        {a.title}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {a.courseTitle}
                                        {a.lesson ? ` · ${a.lesson}` : ''}
                                        {a.dueDate
                                            ? ` · Due ${formatDate(a.dueDate)}`
                                            : ''}{' '}
                                        · {a.points} pts
                                    </span>
                                    <span className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
                                        <Chip className="bg-muted text-muted-foreground">
                                            {a.submissions.length}/{a.classSize}{' '}
                                            in
                                        </Chip>
                                        {left > 0 && (
                                            <Chip className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                {left} to grade
                                            </Chip>
                                        )}
                                    </span>
                                </span>
                                <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                                    <Chip className="bg-muted text-muted-foreground">
                                        {a.submissions.length}/{a.classSize}{' '}
                                        submitted
                                    </Chip>
                                    {left > 0 ? (
                                        <Chip className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                            {left} to grade
                                        </Chip>
                                    ) : a.submissions.length > 0 ? (
                                        <Chip className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            <CheckCircle2 className="size-3.5" />
                                            Graded
                                        </Chip>
                                    ) : null}
                                </span>
                                <ChevronDown
                                    className={cn(
                                        'mt-2 size-4 shrink-0 text-muted-foreground transition-transform sm:mt-0',
                                        isOpen && 'rotate-180',
                                    )}
                                />
                            </button>

                            {isOpen && (
                                <div className="border-t">
                                    {a.submissions.length === 0 ? (
                                        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                                            No submissions yet.
                                        </p>
                                    ) : (
                                        <ul className="divide-y">
                                            {a.submissions.map((s) => {
                                                const grade = gradeOf(s);

                                                return (
                                                    <li
                                                        key={s.id}
                                                        className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
                                                    >
                                                        <PersonAvatar
                                                            name={
                                                                s.student.name
                                                            }
                                                            avatar={
                                                                s.student.avatar
                                                            }
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-semibold">
                                                                {s.student.name}
                                                            </p>
                                                            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                                                <span>
                                                                    {formatDate(
                                                                        s.submittedAt,
                                                                    )}
                                                                </span>
                                                                {s.late && (
                                                                    <span className="font-bold text-red-600 dark:text-red-400">
                                                                        Late
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <SubmissionLink
                                                            submission={s}
                                                        />
                                                        {grade && (
                                                            <Chip
                                                                className={scoreTone(
                                                                    grade.percent,
                                                                )}
                                                            >
                                                                {grade.points}/
                                                                {a.points}
                                                            </Chip>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setGrading({
                                                                    submission:
                                                                        s,
                                                                    assignment:
                                                                        a,
                                                                })
                                                            }
                                                            className={cn(
                                                                'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors',
                                                                grade
                                                                    ? 'border bg-card hover:bg-muted'
                                                                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
                                                            )}
                                                        >
                                                            <PenLine className="size-4" />
                                                            {grade
                                                                ? 'Edit'
                                                                : 'Grade'}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {grading && (
                <GradeDialog
                    key={grading.submission.id}
                    open
                    onOpenChange={(value) => !value && setGrading(null)}
                    submissionId={grading.submission.id}
                    studentName={grading.submission.student.name}
                    assignmentTitle={grading.assignment.title}
                    maxPoints={grading.assignment.points}
                    current={gradeOf(grading.submission)}
                    onGraded={(grade) => {
                        setSaved((prev) => ({
                            ...prev,
                            [grading.submission.id]: grade,
                        }));
                        // Refresh the counters at the top.
                        router.reload({ only: ['summary'] });
                    }}
                />
            )}
        </div>
    );
}

/** Opens what the student handed in: text in a dialog-free expander, a file, or a video link. */
function SubmissionLink({ submission }: { submission: TeacherSubmission }) {
    const [showText, setShowText] = useState(false);
    const base =
        'inline-flex min-h-9 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground';

    if (submission.type === 'text') {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setShowText((v) => !v)}
                    className={cn(base, 'cursor-pointer')}
                >
                    <Type className="size-4" />
                    {showText ? 'Hide' : 'Read'}
                </button>
                {showText && (
                    <div
                        className="rte-render basis-full rounded-xl border bg-muted/40 px-4 py-3 text-sm"
                        dangerouslySetInnerHTML={{
                            __html: submission.text ?? '',
                        }}
                    />
                )}
            </>
        );
    }
    if (submission.type === 'video' && submission.videoUrl) {
        return (
            <a
                href={submission.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={base}
            >
                <Video className="size-4" />
                Video
                <ExternalLink className="size-3.5" />
            </a>
        );
    }
    if (submission.fileUrl) {
        return (
            <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(base, 'max-w-48')}
                title={submission.fileName ?? undefined}
            >
                <Download className="size-4 shrink-0" />
                <span className="truncate">
                    {submission.fileName ?? 'File'}
                </span>
            </a>
        );
    }

    return null;
}

// ─── Teacher: quiz results ────────────────────────────────────────────────────

function TeacherQuizzes({ quizzes }: { quizzes: TeacherQuiz[] }) {
    const [open, setOpen] = useState<number | null>(null);

    if (quizzes.length === 0) {
        return (
            <EmptyState
                title="No quizzes yet"
                description="Quizzes you add to lessons show here with each student's best score."
            />
        );
    }

    return (
        <ul className="grid gap-3">
            {quizzes.map((quiz) => {
                const isOpen = open === quiz.id;

                return (
                    <li
                        key={quiz.id}
                        className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                    >
                        <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : quiz.id)}
                            aria-expanded={isOpen}
                            className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
                        >
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                <ListChecks className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-display text-base font-bold">
                                    {quiz.title}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                    {quiz.courseTitle} · {quiz.questions}{' '}
                                    {quiz.questions === 1
                                        ? 'question'
                                        : 'questions'}{' '}
                                    · {quiz.takers}{' '}
                                    {quiz.takers === 1 ? 'student' : 'students'}{' '}
                                    took it
                                </span>
                            </span>
                            {quiz.averageBest !== null && (
                                <Chip className={scoreTone(quiz.averageBest)}>
                                    Avg {quiz.averageBest}%
                                </Chip>
                            )}
                            <ChevronDown
                                className={cn(
                                    'size-4 shrink-0 text-muted-foreground transition-transform',
                                    isOpen && 'rotate-180',
                                )}
                            />
                        </button>
                        {isOpen && (
                            <div className="border-t">
                                {quiz.students.length === 0 ? (
                                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                                        No one has taken this quiz yet.
                                    </p>
                                ) : (
                                    <ul className="divide-y">
                                        {quiz.students.map((student) => (
                                            <li
                                                key={student.id}
                                                className="flex items-center gap-3 px-4 py-3 sm:px-5"
                                            >
                                                <PersonAvatar
                                                    name={student.name}
                                                    avatar={student.avatar}
                                                />
                                                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                                                    {student.name}
                                                </p>
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                    {student.attempts}{' '}
                                                    {student.attempts === 1
                                                        ? 'try'
                                                        : 'tries'}
                                                </span>
                                                <Chip
                                                    className={scoreTone(
                                                        student.best,
                                                    )}
                                                >
                                                    {student.best}%
                                                </Chip>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

// ─── Student ──────────────────────────────────────────────────────────────────

const STATUS: Record<
    StudentAssignment['status'],
    { label: string; className: string }
> = {
    todo: {
        label: 'To do',
        className: 'bg-muted text-muted-foreground',
    },
    overdue: {
        label: 'Overdue',
        className:
            'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    },
    submitted: {
        label: 'Submitted',
        className:
            'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
    graded: {
        label: 'Graded',
        className:
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
};

function StudentAssignments({
    assignments,
}: {
    assignments: StudentAssignment[];
}) {
    const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');

    if (assignments.length === 0) {
        return (
            <EmptyState
                title="No assignments yet"
                description="When your teacher adds an assignment to a lesson, it shows up here with its due date."
            />
        );
    }

    const isTodo = (a: StudentAssignment) =>
        a.status === 'todo' || a.status === 'overdue';
    const shown = assignments.filter((a) =>
        filter === 'todo' ? isTodo(a) : filter === 'done' ? !isTodo(a) : true,
    );

    return (
        <div className="space-y-4">
            <Segmented
                label="Filter assignments"
                value={filter}
                onChange={setFilter}
                options={[
                    { value: 'all', label: 'All' },
                    {
                        value: 'todo',
                        label: 'To do',
                        count: assignments.filter(isTodo).length,
                    },
                    { value: 'done', label: 'Done' },
                ]}
            />
            {shown.length === 0 && (
                <EmptyState
                    title={filter === 'todo' ? 'All done' : 'Nothing here'}
                    description={
                        filter === 'todo'
                            ? 'You have handed in every assignment.'
                            : 'No assignments match this filter.'
                    }
                />
            )}
            <ul className="grid gap-3 lg:grid-cols-2">
                {shown.map((a) => (
                    <li
                        key={a.id}
                        className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-panel sm:p-5"
                    >
                        <div className="flex items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                <FileText className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-base leading-snug font-bold">
                                    {a.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {a.courseTitle}
                                    {a.lesson ? ` · ${a.lesson}` : ''}
                                </p>
                            </div>
                            <Chip className={STATUS[a.status].className}>
                                {STATUS[a.status].label}
                            </Chip>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {a.dueDate && (
                                <span className="inline-flex items-center gap-1">
                                    <CalendarClock className="size-3.5" />
                                    Due {formatDate(a.dueDate)}
                                </span>
                            )}
                            <span>{a.points} points</span>
                            {a.submittedAt && (
                                <span>
                                    Handed in {formatDate(a.submittedAt)}
                                </span>
                            )}
                        </div>

                        {a.grade && (
                            <div className="rounded-2xl bg-muted/50 p-3">
                                <div className="flex items-center gap-2">
                                    <Chip
                                        className={scoreTone(a.grade.percent)}
                                    >
                                        {a.grade.points}/{a.grade.possible}
                                    </Chip>
                                    <span className="text-sm font-semibold">
                                        {a.grade.percent}%
                                    </span>
                                </div>
                                {a.grade.feedback && (
                                    <p className="mt-2 text-sm whitespace-pre-line text-foreground">
                                        {a.grade.feedback}
                                    </p>
                                )}
                            </div>
                        )}

                        <Link
                            href={`/my-course/${a.courseId}`}
                            className="mt-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
                        >
                            {isTodo(a) ? 'Open and submit' : 'Open in course'}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function StudentQuizzes({ quizzes }: { quizzes: StudentQuiz[] }) {
    if (quizzes.length === 0) {
        return (
            <EmptyState
                title="No quizzes yet"
                description="Quizzes in your lessons show here with your best score."
            />
        );
    }

    return (
        <ul className="grid gap-3 lg:grid-cols-2">
            {quizzes.map((quiz) => (
                <li
                    key={quiz.id}
                    className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-panel sm:p-5"
                >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        <ListChecks className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-bold">
                            {quiz.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {quiz.courseTitle} · {quiz.questions}{' '}
                            {quiz.questions === 1 ? 'question' : 'questions'}
                            {quiz.attempts > 0 &&
                                ` · ${quiz.attempts} ${quiz.attempts === 1 ? 'try' : 'tries'}`}
                        </p>
                    </div>
                    {quiz.best !== null ? (
                        <Chip className={scoreTone(quiz.best)}>
                            Best {quiz.best}%
                        </Chip>
                    ) : (
                        <Link
                            href={`/my-course/${quiz.courseId}`}
                            className="inline-flex min-h-9 items-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                            Take quiz
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    );
}
