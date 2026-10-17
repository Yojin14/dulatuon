import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from '@/layouts/app-layout';
import { toast } from '@/lib/toast';
import { type BreadcrumbItem, type SharedData } from '@/types';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { FilePdf, YoutubeLogo } from '@phosphor-icons/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowLeft,
    BookOpen,
    Calendar,
    CheckCircle,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Download,
    ExternalLink,
    File,
    FilePlus,
    FileText,
    FolderOpen,
    Globe,
    GraduationCap,
    GripVertical,
    Heart,
    Info,
    Layers,
    LayoutList,
    Link2,
    Lock,
    Megaphone,
    PenLine,
    Pencil,
    Play,
    PlayCircle,
    Plus,
    RefreshCw,
    RotateCcw,
    Send,
    Star,
    Trash2,
    Trophy,
    Type,
    Upload,
    User,
    Video,
    XCircle,
} from 'lucide-react';
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type Dispatch,
    type SetStateAction,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ContentType = 'pdf' | 'word' | 'video' | 'youtube';

interface ContentItem {
    id: string;
    dbId?: number;
    type: ContentType;
    title: string;
    description?: string;
    url?: string;
    filename?: string;
    file?: File;
}

interface QuizQuestion {
    id: string;
    dbId?: number;
    question: string;
    options: string[];
    correctIndex: number;
}

interface Quiz {
    id: string;
    dbId?: number;
    kind: 'quiz';
    title: string;
    description: string;
    questions: QuizQuestion[];
}

interface AssignmentSubmission {
    id: number;
    submissionType?: 'text' | 'file' | 'video' | 'both';
    textContent?: string | null;
    videoUrl?: string | null;
    fileName: string | null;
    filePath: string | null;
    fileSize: number | null;
    submittedAt: string;
    status: 'submitted' | 'graded' | 'late';
}

interface Assignment {
    id: string;
    dbId?: number;
    kind: 'assignment';
    title: string;
    instructions: string;
    dueDate: string;
    maxScore: number;
}

type Assessment = Quiz | Assignment;

interface Meeting {
    id: string;
    dbId?: number;
    title: string;
    description: string;
    meetLink: string;
    scheduledAt: string;
    timezone: string;
    durationMinutes: number | null;
}

type GameType =
    | 'quiz_quest'
    | 'memory_match'
    | 'word_scramble'
    | 'crossword'
    | 'hangman'
    | 'fault_lab'
    | 'shake_town'
    | 'wave_tank'
    | 'quake_tracker'
    | 'ground_test'
    | 'quake_ready';

interface GameItem {
    prompt: string;
    answer: string;
    distractors: string[];
}

interface Game {
    id: string;
    dbId?: number;
    title: string;
    description?: string;
    gameType: GameType;
    points: number;
    lives: number;
    items: GameItem[];
}

interface Session {
    id: string;
    dbId?: number;
    itemType: 'session';
    title: string;
    contents: ContentItem[];
    assessments: Assessment[];
    meetings: Meeting[];
    games?: Game[];
}

interface LessonGroup {
    id: string;
    dbId?: number;
    itemType: 'lesson-group';
    title: string;
    sessions: Session[];
}

type ModuleItem = Session | LessonGroup;

interface CourseModule {
    id: string;
    dbId?: number;
    title: string;
    prerequisite?: boolean;
    items: ModuleItem[];
}

interface Course {
    id: string;
    slug: string;
    courseTitle: string;
    description: string;
    modules: CourseModule[];
}

interface CourseData {
    id: number;
    title: string;
    description: string;
    course_code: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    status: 'draft' | 'published' | 'archived';
    thumbnail: string | null;
    thumbnail_focus: string;
    intro_video: string | null;
    instructor: { id: number; name: string } | null;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const DUMMY_COURSE: Course = {
    id: 'life-of-christ',
    slug: 'life-of-christ',
    courseTitle: 'Life of Christ Study',
    description:
        'A comprehensive study of the life, ministry, death, and resurrection of Jesus Christ drawn from the four Gospels.',
    modules: [
        {
            id: 'module-1',
            title: 'Life of Christ (As Taught by John Mayhue)',
            items: [
                {
                    id: 's1',
                    itemType: 'session',
                    title: 'Introduction to the Life of Christ',
                    contents: [
                        {
                            id: 'c1',
                            type: 'youtube',
                            title: 'Intro Video',
                            url: 'https://www.youtube.com/watch?v=jkmOwE4FRfw&t=2s',
                        },
                        {
                            id: 'c2',
                            type: 'pdf',
                            title: 'Lesson Notes',
                            url: '',
                        },
                    ],
                    assessments: [
                        {
                            id: 'a1',
                            kind: 'quiz',
                            title: 'Intro Quiz',
                            description:
                                'Test your knowledge on the introduction.',
                            questions: [
                                {
                                    id: 'q1',
                                    question: 'What are the four Gospels?',
                                    options: [
                                        'Matthew, Mark, Luke, John',
                                        'Genesis, Exodus, Leviticus, Numbers',
                                        'Acts, Romans, Corinthians, Galatians',
                                        'Isaiah, Jeremiah, Ezekiel, Daniel',
                                    ],
                                    correctIndex: 0,
                                },
                                {
                                    id: 'q2',
                                    question: 'Who wrote the Gospel of Luke?',
                                    options: [
                                        'Peter',
                                        'Paul',
                                        'Luke the physician',
                                        'John the apostle',
                                    ],
                                    correctIndex: 2,
                                },
                            ],
                        },
                    ],
                    meetings: [],
                },
                {
                    id: 's2',
                    itemType: 'session',
                    title: 'Law and Grace',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
                {
                    id: 's3',
                    itemType: 'session',
                    title: 'The Death Principle 1',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
                {
                    id: 's4',
                    itemType: 'session',
                    title: 'The Burial Principle 2',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
                {
                    id: 's5',
                    itemType: 'session',
                    title: 'The Resurrection Principle',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
            ],
        },
        {
            id: 'module-2',
            title: 'The Life of Christ (Evangelism Ministry 2023)',
            items: [
                {
                    id: 's10',
                    itemType: 'session',
                    title: 'Introduction to the Life of Christ',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
                {
                    id: 'lg1',
                    itemType: 'lesson-group',
                    title: 'Lesson One: Life in Heaven',
                    sessions: [
                        {
                            id: 's13',
                            itemType: 'session',
                            title: 'Session 3: Word is God and Creator',
                            contents: [],
                            assessments: [],
                            meetings: [],
                        },
                        {
                            id: 's14',
                            itemType: 'session',
                            title: 'Session 4: Jesus Humbled Himself',
                            contents: [],
                            assessments: [],
                            meetings: [],
                        },
                    ],
                },
            ],
        },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() {
    return Math.random().toString(36).slice(2, 9);
}

async function capi<T = unknown>(
    method: string,
    url: string,
    body?: unknown,
): Promise<T> {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            (err as { message?: string }).message ??
                `Request failed (${res.status})`,
        );
    }
    return res.json() as Promise<T>;
}

async function capiForm<T = unknown>(
    url: string,
    formData: FormData,
): Promise<T> {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            (err as { message?: string }).message ??
                `Request failed (${res.status})`,
        );
    }
    return res.json() as Promise<T>;
}

function capiFormProgress<T = unknown>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        if (token) {
            xhr.setRequestHeader('X-XSRF-TOKEN', decodeURIComponent(token));
        }
        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText) as T);
                } catch {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                let msg = `Request failed (${xhr.status})`;
                try {
                    const err = JSON.parse(xhr.responseText) as {
                        message?: string;
                    };
                    if (err.message) {
                        msg = err.message;
                    }
                } catch {
                    /* keep default msg */
                }
                reject(new Error(msg));
            }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
}

function extractYouTubeId(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
        return u.searchParams.get('v') || '';
    } catch {
        const match = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^&\n?#]+)/);
        return match ? match[1] : '';
    }
}

const CONTENT_META: Record<
    ContentType,
    { label: string; icon: React.ReactNode; badge: string }
> = {
    pdf: {
        label: 'PDF',
        icon: <FilePdf weight="fill" className="h-3.5 w-3.5" />,
        badge: 'bg-red-100 text-red-700',
    },
    word: {
        label: 'Word',
        icon: <File className="h-3.5 w-3.5" />,
        badge: 'bg-blue-100 text-blue-700',
    },
    video: {
        label: 'Video',
        icon: <Video className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
    youtube: {
        label: 'YouTube',
        icon: <YoutubeLogo weight="fill" className="h-3.5 w-3.5" />,
        badge: 'bg-rose-100 text-rose-700',
    },
};

/**
 * iOS Safari (and the iOS webviews all iOS browsers are built on) cannot render
 * a PDF reliably inside an <iframe> — it shows a blank frame or only the first
 * page. Detect it so we can fall back to an "Open PDF" action instead.
 */
function isIOSDevice(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    const ua = navigator.userAgent;
    // iPadOS 13+ reports as "MacIntel" but exposes touch points.
    return (
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
}

const noopSubscribe = (): (() => void) => () => {};

// ─── PDF Viewer ─────────────────────────────────────────────────────────────
function PdfViewer({ content }: { content: ContentItem }) {
    // Embed the PDF in an <iframe> everywhere except iOS, which can't render it.
    // useSyncExternalStore keeps SSR/hydration on the "embed" path, then swaps to
    // the real client value — no hydration mismatch, no setState-in-effect.
    const canEmbed = useSyncExternalStore(
        noopSubscribe,
        () => !isIOSDevice(),
        () => true,
    );

    if (!content.url) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 py-20 text-center">
                <FileText className="h-12 w-12 text-blue-300" />
                <p className="text-sm text-gray-500">No file uploaded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {canEmbed ? (
                <>
                    <div className="h-[75vh] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <iframe
                            src={`${content.url}#toolbar=0&navpanes=0`}
                            className="h-full w-full"
                            title={content.title}
                            loading="lazy"
                        />
                    </div>
                    <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a8a] hover:underline dark:text-indigo-300"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open in new tab
                    </a>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50/50 px-6 py-16 text-center dark:border-red-900/40 dark:bg-red-950/10">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                        <FilePdf weight="fill" className="h-8 w-8" />
                    </span>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {content.title}
                        </h3>
                        {content.filename && (
                            <p className="mt-0.5 text-sm text-gray-500">
                                {content.filename}
                            </p>
                        )}
                        <p className="mt-2 max-w-xs text-sm text-gray-500">
                            Tap below to open the PDF in your browser’s reader.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <a
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]/90"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open PDF
                        </a>
                        <a
                            href={content.url}
                            download={content.filename || true}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </a>
                    </div>
                </div>
            )}
            {content.description && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                        {content.description}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Content Viewer ───────────────────────────────────────────────────────────
function ContentViewer({ content }: { content: ContentItem }) {
    if (content.type === 'youtube') {
        const videoId = extractYouTubeId(content.url || '');
        if (!videoId)
            return (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <PlayCircle className="h-12 w-12 text-gray-300" />
                    <p className="text-sm text-gray-500">
                        Invalid YouTube URL.
                    </p>
                </div>
            );
        return (
            <div className="space-y-4">
                <div
                    className="relative w-full overflow-hidden rounded-xl bg-black"
                    style={{ paddingTop: '56.25%' }}
                >
                    <iframe
                        className="absolute inset-0 h-full w-full"
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                        title={content.title}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
                {content.description && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                            {content.description}
                        </p>
                    </div>
                )}
            </div>
        );
    }
    if (content.type === 'video')
        return (
            <div className="space-y-4">
                <div className="overflow-hidden rounded-xl bg-black">
                    <video
                        src={content.url}
                        controls
                        className="max-h-[70vh] w-full"
                        controlsList="nodownload"
                    />
                </div>
                {content.description && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                            {content.description}
                        </p>
                    </div>
                )}
            </div>
        );
    if (content.type === 'pdf') {
        return <PdfViewer content={content} />;
    }
    return (
        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100">
                <File className="h-10 w-10 text-blue-600" />
            </div>
            <div>
                <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase">
                    Word Document
                </p>
                <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {content.title}
                </h3>
                {content.filename && (
                    <p className="mt-1 text-sm text-gray-500">
                        {content.filename}
                    </p>
                )}
                {content.description && (
                    <p className="mt-2 max-w-sm text-sm text-gray-500">
                        {content.description}
                    </p>
                )}
            </div>
            {content.url ? (
                <a
                    href={content.url}
                    download
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]/90"
                >
                    <Download className="h-4 w-4" />
                    Download Document
                </a>
            ) : (
                <p className="text-sm text-gray-400">No file uploaded yet.</p>
            )}
        </div>
    );
}

// ─── Quiz Viewer ──────────────────────────────────────────────────────────────
interface QuizSavedState {
    answers: (number | null)[];
    submitted: boolean;
}

function QuizViewer({
    quiz,
    savedState,
    onSave,
    onMarkDone,
}: {
    quiz: Quiz;
    savedState?: QuizSavedState;
    onSave?: (s: QuizSavedState) => void;
    onMarkDone?: () => void;
}) {
    const [answers, setAnswers] = useState<(number | null)[]>(
        savedState?.answers ?? Array(quiz.questions.length).fill(null),
    );
    const [submitted, setSubmitted] = useState(savedState?.submitted ?? false);
    const correctCount = submitted
        ? answers.filter((a, i) => a === quiz.questions[i].correctIndex).length
        : 0;
    const score =
        quiz.questions.length > 0
            ? Math.round((correctCount / quiz.questions.length) * 100)
            : 0;
    const allAnswered = answers.every((a) => a !== null);

    if (quiz.questions.length === 0)
        return (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
                <ClipboardList className="h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">No questions added yet.</p>
            </div>
        );

    if (submitted) {
        const passed = score >= 75;
        const decent = score >= 50;
        const accentColor = passed
            ? 'text-green-600'
            : decent
              ? 'text-amber-500'
              : 'text-red-500';
        const barColor = passed
            ? 'bg-green-500'
            : decent
              ? 'bg-amber-400'
              : 'bg-red-400';
        const message =
            score >= 90
                ? 'Outstanding! You aced it.'
                : score >= 75
                  ? 'Great job! You passed.'
                  : score >= 50
                    ? 'Good effort — review your answers.'
                    : 'Keep studying and try again!';

        return (
            <div className="space-y-5">
                {/* ── Result card ── */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs text-gray-400">
                                {quiz.title}
                            </p>
                            <p
                                className={`mt-0.5 text-sm font-medium ${accentColor}`}
                            >
                                {message}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <span
                                className={`text-3xl font-bold ${accentColor}`}
                            >
                                {score}
                                <span className="text-lg font-medium opacity-60">
                                    %
                                </span>
                            </span>
                            <p className="text-[11px] text-gray-400">
                                {correctCount} / {quiz.questions.length} correct
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                            className={`h-1.5 rounded-full transition-all ${barColor}`}
                            style={{ width: `${score}%` }}
                        />
                    </div>

                    {/* Retake */}
                    <div className="mt-4 flex justify-end">
                        <button
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                            onClick={() => {
                                const fresh = Array(quiz.questions.length).fill(
                                    null,
                                );
                                setSubmitted(false);
                                setAnswers(fresh);
                                onSave?.({ answers: fresh, submitted: false });
                            }}
                        >
                            <RotateCcw className="h-3 w-3" />
                            Retake Quiz
                        </button>
                    </div>
                </div>

                {/* ── Answer review ── */}
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                        Review
                    </p>

                    {quiz.questions.map((q, i) => {
                        const isCorrect = answers[i] === q.correctIndex;
                        return (
                            <div
                                key={q.id}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                            >
                                {/* Question row */}
                                <div className="flex items-start gap-3 px-4 py-3">
                                    <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-semibold text-gray-400">
                                        {i + 1}.
                                    </span>
                                    <p className="flex-1 text-sm leading-snug font-medium text-gray-800 dark:text-gray-200">
                                        {q.question}
                                    </p>
                                    {isCorrect ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                                    ) : (
                                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                                    )}
                                </div>

                                {/* Options */}
                                <div className="border-t border-gray-100 dark:border-gray-800">
                                    {q.options.map((opt, j) => {
                                        const isCorrectOpt =
                                            j === q.correctIndex;
                                        const isWrongPick =
                                            j === answers[i] && !isCorrect;
                                        return (
                                            <div
                                                key={j}
                                                className={`flex items-center gap-3 border-b border-gray-50 px-4 py-2 text-sm last:border-0 dark:border-gray-800 ${isCorrectOpt ? 'bg-green-50/60 dark:bg-green-950/20' : isWrongPick ? 'bg-red-50/60 dark:bg-red-950/20' : ''}`}
                                            >
                                                <div
                                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCorrectOpt ? 'bg-green-500' : isWrongPick ? 'bg-red-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                />
                                                <span
                                                    className={`flex-1 ${isCorrectOpt ? 'font-medium text-gray-900 dark:text-gray-100' : isWrongPick ? 'text-gray-400 line-through' : 'text-gray-500 dark:text-gray-400'}`}
                                                >
                                                    {opt}
                                                </span>
                                                {isCorrectOpt && (
                                                    <span className="shrink-0 text-[10px] font-medium text-green-600 dark:text-green-400">
                                                        Correct
                                                    </span>
                                                )}
                                                {isWrongPick && (
                                                    <span className="shrink-0 text-[10px] font-medium text-red-500 dark:text-red-400">
                                                        Your answer
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="mb-1 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-[#1e3a8a]" />
                    <p className="text-xs font-semibold tracking-widest text-[#1e3a8a] uppercase">
                        Quiz
                    </p>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {quiz.title}
                </h2>
                {quiz.description && (
                    <p className="mt-1 text-sm text-gray-500">
                        {quiz.description}
                    </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                    {quiz.questions.length} questions · Answer all to submit
                </p>
            </div>
            {quiz.questions.map((q, i) => (
                <div
                    key={q.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                    <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        <span className="mr-2 text-[#1e3a8a]">Q{i + 1}.</span>
                        {q.question}
                    </p>
                    <div className="space-y-2">
                        {q.options.map((opt, j) => (
                            <label
                                key={j}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all ${answers[i] === j ? 'border-[#1e3a8a]/40 bg-[#1e3a8a]/5' : 'border-gray-200 hover:border-[#1e3a8a]/20 hover:bg-[#1e3a8a]/5'}`}
                            >
                                <div
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${answers[i] === j ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-gray-300'}`}
                                >
                                    {answers[i] === j && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                    )}
                                </div>
                                <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    className="sr-only"
                                    checked={answers[i] === j}
                                    onChange={() => {
                                        const a = [...answers];
                                        a[i] = j;
                                        setAnswers(a);
                                        onSave?.({
                                            answers: a,
                                            submitted: false,
                                        });
                                    }}
                                />
                                <span className="text-sm text-gray-700">
                                    {opt}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
            <Button
                className="w-full gap-2 py-3 text-sm font-semibold text-white"
                style={{ background: PORTAL_GRADIENT }}
                disabled={!allAnswered}
                onClick={() => {
                    setSubmitted(true);
                    onSave?.({ answers, submitted: true });
                    onMarkDone?.();
                }}
            >
                <Send className="h-4 w-4" />
                Submit Quiz{' '}
                {!allAnswered &&
                    `(${answers.filter((a) => a !== null).length}/${quiz.questions.length} answered)`}
            </Button>
        </div>
    );
}

// ─── Assignment Viewer ────────────────────────────────────────────────────────
const ACCEPTED_TYPES =
    '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.heic';
const ACCEPTED_LABEL = 'PDF, Word (.docx), Excel (.xlsx), or image files';

function fmtBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssignmentViewer({
    assignment,
    courseId,
    initialSubmission,
    onMarkDone,
}: {
    assignment: Assignment;
    courseId: string | undefined;
    initialSubmission?: AssignmentSubmission;
    onMarkDone?: () => void;
}) {
    const [tab, setTab] = useState<'text' | 'file' | 'video'>('text');
    const [textHtml, setTextHtml] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submission, setSubmission] = useState<
        AssignmentSubmission | undefined
    >(initialSubmission);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resubmitting, setResubmitting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setError(null);
        if (!f) {
            setFile(null);
            return;
        }
        const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
        const allowed = [
            'pdf',
            'doc',
            'docx',
            'xls',
            'xlsx',
            'jpg',
            'jpeg',
            'png',
            'gif',
            'webp',
            'heic',
        ];
        if (!allowed.includes(ext)) {
            setError(`"${f.name}" is not allowed. Only ${ACCEPTED_LABEL}.`);
            setFile(null);
            e.target.value = '';
            return;
        }
        setFile(f);
    };

    const textIsEmpty =
        textHtml
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim() === '';
    const canSubmit =
        tab === 'text'
            ? !textIsEmpty
            : tab === 'video'
              ? videoUrl.trim() !== ''
              : !!file;

    const handleSubmit = async () => {
        if (!canSubmit || !assignment.dbId || !courseId || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
            const fd = new FormData();
            fd.append('type', tab);
            if (tab === 'text') {
                fd.append('textContent', textHtml);
            } else if (tab === 'video') {
                fd.append('videoUrl', videoUrl.trim());
            } else if (file) {
                fd.append('file', file);
            }

            const res = await fetch(
                `/curriculum/${courseId}/assignments/${assignment.dbId}/submit`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
                    },
                    body: fd,
                },
            );
            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as {
                    message?: string;
                    errors?: Record<string, string[]>;
                };
                const firstError = err.errors
                    ? Object.values(err.errors)[0]?.[0]
                    : undefined;
                throw new Error(
                    firstError ?? err.message ?? 'Submission failed',
                );
            }
            const created = (await res.json()) as AssignmentSubmission;
            setSubmission(created);
            setFile(null);
            setTextHtml('');
            setVideoUrl('');
            setResubmitting(false);
            onMarkDone?.();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    const startResubmit = () => {
        setError(null);
        if (submission?.submissionType === 'text') {
            setTab('text');
            setTextHtml(submission.textContent ?? '');
        } else if (submission?.submissionType === 'video') {
            setTab('video');
            setVideoUrl(submission.videoUrl ?? '');
        } else {
            setTab('file');
        }
        setResubmitting(true);
    };

    const showUploadForm = !submission || resubmitting;

    return (
        <div className="space-y-5">
            {/* Assignment header */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                <div className="mb-1 flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-amber-600" />
                    <p className="text-xs font-semibold tracking-widest text-amber-600 uppercase">
                        Assignment
                    </p>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {assignment.title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {assignment.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                            <span>
                                Due: <strong>{assignment.dueDate}</strong>
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        <span>
                            Max score:{' '}
                            <strong>{assignment.maxScore} pts</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            {assignment.instructions && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                        Instructions
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {assignment.instructions}
                    </p>
                </div>
            )}

            {/* Current submission status */}
            {submission && !resubmitting && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    Submitted
                                </p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                                    {submission.submittedAt}
                                </p>
                            </div>
                        </div>
                        <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                                submission.status === 'graded'
                                    ? 'bg-blue-100 text-blue-600'
                                    : submission.status === 'late'
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-emerald-100 text-emerald-600'
                            }`}
                        >
                            {submission.status}
                        </span>
                    </div>
                    {submission.submissionType === 'text' ? (
                        <div className="mt-3 rounded-lg border border-emerald-100 bg-white px-4 py-3 dark:border-emerald-900 dark:bg-gray-900">
                            <div
                                className="rte-render"
                                dangerouslySetInnerHTML={{
                                    __html: submission.textContent ?? '',
                                }}
                            />
                        </div>
                    ) : submission.submissionType === 'video' ? (
                        <a
                            href={submission.videoUrl ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2.5 text-sm font-medium text-emerald-700 hover:underline dark:border-emerald-900 dark:bg-gray-900 dark:text-emerald-400"
                        >
                            <Video className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                                {submission.videoUrl}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                    ) : (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2.5 dark:border-emerald-900 dark:bg-gray-900">
                            <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {submission.fileName}
                                </p>
                                {submission.fileSize && (
                                    <p className="text-xs text-gray-400">
                                        {fmtBytes(submission.fileSize)}
                                    </p>
                                )}
                            </div>
                            <a
                                href={submission.filePath ?? '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                            >
                                <Download className="h-3.5 w-3.5" />
                                View
                            </a>
                        </div>
                    )}
                    <button
                        onClick={startResubmit}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Re-submit
                    </button>
                </div>
            )}

            {/* Upload form */}
            {showUploadForm && (
                <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                        Turn In
                    </p>

                    <Tabs
                        value={tab}
                        onValueChange={(v) => {
                            setTab(v as 'text' | 'file' | 'video');
                            setError(null);
                        }}
                    >
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="text">
                                <Type className="mr-1.5 h-3.5 w-3.5" />
                                Text
                            </TabsTrigger>
                            <TabsTrigger value="file">
                                <FilePlus className="mr-1.5 h-3.5 w-3.5" />
                                File
                            </TabsTrigger>
                            <TabsTrigger value="video">
                                <Video className="mr-1.5 h-3.5 w-3.5" />
                                Video
                            </TabsTrigger>
                        </TabsList>

                        {/* Text answer */}
                        <TabsContent value="text" className="mt-4">
                            <RichTextEditor
                                value={textHtml}
                                onChange={setTextHtml}
                                placeholder="Write your answer here… Use the toolbar or press Ctrl+K to add a link."
                            />
                        </TabsContent>

                        {/* File upload */}
                        <TabsContent value="file" className="mt-4 space-y-2">
                            <p className="text-xs text-gray-400">
                                Accepted: {ACCEPTED_LABEL}
                            </p>
                            <label
                                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                                    file
                                        ? 'border-amber-300 bg-amber-50/50'
                                        : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
                                }`}
                            >
                                <FilePlus
                                    className={`h-8 w-8 ${file ? 'text-amber-400' : 'text-gray-300'}`}
                                />
                                {file ? (
                                    <div>
                                        <p className="text-sm font-semibold text-amber-700">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {fmtBytes(file.size)}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">
                                            Click to choose a file
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            or drag and drop here
                                        </p>
                                    </div>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept={ACCEPTED_TYPES}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </TabsContent>

                        {/* Video link */}
                        <TabsContent value="video" className="mt-4 space-y-2">
                            <p className="text-xs text-gray-400">
                                Paste a link to your video (YouTube, Google
                                Drive, Vimeo, etc.)
                            </p>
                            <div className="relative">
                                <Link2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) =>
                                        setVideoUrl(e.target.value)
                                    }
                                    placeholder="https://youtu.be/…"
                                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-3 pl-9 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                            <XCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        {resubmitting && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                    setResubmitting(false);
                                    setFile(null);
                                    setTextHtml('');
                                    setVideoUrl('');
                                    setError(null);
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            className="flex-1 gap-2 bg-amber-500 font-semibold text-white hover:bg-amber-600"
                            disabled={!canSubmit || submitting}
                            onClick={handleSubmit}
                        >
                            {submitting ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {submitting
                                ? 'Submitting…'
                                : resubmitting
                                  ? 'Re-submit'
                                  : 'Submit Assignment'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Content Picker (Add & Edit) ──────────────────────────────────────────────
interface ContentPickerProps {
    initial?: ContentItem;
    onSave: (item: ContentItem) => void;
    onCancel: () => void;
}

const FILE_ACCEPT: Record<ContentType, string> = {
    pdf: 'application/pdf,.pdf',
    word: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword',
    video: 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov',
    youtube: '',
};

function ContentPicker({ initial, onSave, onCancel }: ContentPickerProps) {
    const isEdit = !!initial;
    const [selectedType, setSelectedType] = useState<ContentType | null>(
        initial?.type ?? null,
    );
    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [url, setUrl] = useState(initial?.url ?? '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const types: {
        type: ContentType;
        label: string;
        icon: React.ReactNode;
        desc: string;
        color: string;
    }[] = [
        {
            type: 'pdf',
            label: 'PDF',
            icon: <FileText className="h-5 w-5" />,
            desc: 'Upload PDF',
            color: 'hover:border-red-400 hover:bg-red-50',
        },
        {
            type: 'word',
            label: 'Word Doc',
            icon: <File className="h-5 w-5" />,
            desc: 'Upload .docx',
            color: 'hover:border-blue-400 hover:bg-blue-50',
        },
        {
            type: 'video',
            label: 'Video',
            icon: <Video className="h-5 w-5" />,
            desc: 'Upload MP4/MOV',
            color: 'hover:border-violet-400 hover:bg-violet-50',
        },
        {
            type: 'youtube',
            label: 'YouTube',
            icon: <PlayCircle className="h-5 w-5" />,
            desc: 'Paste link',
            color: 'hover:border-rose-400 hover:bg-rose-50',
        },
    ];

    const canSave =
        !!selectedType &&
        !!title.trim() &&
        (selectedType === 'youtube'
            ? !!url.trim()
            : !!selectedFile || (isEdit && !!initial?.filename));

    const handleSave = () => {
        if (!selectedType || !title.trim()) return;
        if (selectedType === 'youtube') {
            onSave({
                id: initial?.id ?? uid(),
                type: selectedType,
                title: title.trim(),
                description: description.trim() || undefined,
                url: url.trim(),
            });
        } else {
            onSave({
                id: initial?.id ?? uid(),
                type: selectedType,
                title: title.trim(),
                description: description.trim() || undefined,
                filename: selectedFile?.name ?? initial?.filename,
                url: initial?.url,
                file: selectedFile ?? undefined,
            });
        }
    };

    if (!selectedType)
        return (
            <>
                <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Select content type
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {types.map((t) => (
                        <button
                            key={t.type}
                            onClick={() => setSelectedType(t.type)}
                            className={`flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-3 text-center shadow-sm transition-all dark:bg-gray-800 ${t.color}`}
                        >
                            <span className="text-gray-500">{t.icon}</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {t.label}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {t.desc}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </>
        );

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-blue-600">
                    {types.find((t) => t.type === selectedType)?.icon}
                </span>
                <p className="text-sm font-semibold">
                    {types.find((t) => t.type === selectedType)?.label}
                </p>
                {!isEdit && (
                    <button
                        onClick={() => setSelectedType(null)}
                        className="ml-auto text-xs text-gray-400 hover:text-blue-600"
                    >
                        ← Back
                    </button>
                )}
            </div>
            <Input
                placeholder="Content title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
                placeholder="Description (optional) — shown below the content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            {selectedType === 'youtube' ? (
                <Input
                    placeholder="YouTube URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
            ) : (
                <div className="space-y-2">
                    {isEdit && initial?.filename && !selectedFile && (
                        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            <span className="flex-1 truncate">
                                Current: {initial.filename}
                            </span>
                            <span className="shrink-0 text-gray-400">
                                Replace below
                            </span>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_ACCEPT[selectedType]}
                        className="hidden"
                        onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] ?? null)
                        }
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <Upload className="h-4 w-4 shrink-0 text-gray-400" />
                        <span
                            className={
                                selectedFile
                                    ? 'truncate font-medium text-gray-800 dark:text-gray-200'
                                    : 'text-gray-400'
                            }
                        >
                            {selectedFile
                                ? selectedFile.name
                                : 'Click to choose file…'}
                        </span>
                    </button>
                    <p className="text-[11px] text-gray-400">
                        {selectedType === 'pdf'
                            ? 'PDF only'
                            : selectedType === 'word'
                              ? '.docx or .doc only'
                              : 'MP4, WebM, MOV · max 500 MB'}
                    </p>
                </div>
            )}
            <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    className="bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90"
                    disabled={!canSave}
                    onClick={handleSave}
                >
                    {isEdit ? 'Save Changes' : 'Add Content'}
                </Button>
            </div>
        </div>
    );
}

// ─── Quiz Builder (Add & Edit) ────────────────────────────────────────────────
interface QuizBuilderProps {
    initial?: Quiz;
    onSave: (quiz: Quiz) => void;
    onCancel: () => void;
}
function QuizBuilder({ initial, onSave, onCancel }: QuizBuilderProps) {
    const isEdit = !!initial;
    const draftKey = `dulatuon:quizDraft:${initial?.id ?? 'new'}`;
    const cached = (() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(draftKey);
            return raw
                ? (JSON.parse(raw) as {
                      title?: string;
                      description?: string;
                      questions?: QuizQuestion[];
                  })
                : null;
        } catch {
            return null;
        }
    })();
    const [title, setTitle] = useState(cached?.title ?? initial?.title ?? '');
    const [description, setDescription] = useState(
        cached?.description ?? initial?.description ?? '',
    );
    const [questions, setQuestions] = useState<QuizQuestion[]>(
        cached?.questions ?? initial?.questions ?? [],
    );
    const [showQForm, setShowQForm] = useState(false);
    const [editingQ, setEditingQ] = useState<QuizQuestion | null>(null);
    const [qText, setQText] = useState('');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!title && !description && questions.length === 0) {
            window.localStorage.removeItem(draftKey);
            return;
        }
        try {
            window.localStorage.setItem(
                draftKey,
                JSON.stringify({ title, description, questions }),
            );
        } catch {
            /* quota */
        }
    }, [draftKey, title, description, questions]);

    const clearDraft = () => {
        try {
            window.localStorage.removeItem(draftKey);
        } catch {
            /* noop */
        }
    };

    const openNewQ = () => {
        setEditingQ(null);
        setQText('');
        setOpts(['', '', '', '']);
        setCorrectIdx(0);
        setShowQForm(true);
    };
    const openEditQ = (q: QuizQuestion) => {
        setEditingQ(q);
        setQText(q.question);
        setOpts([...q.options]);
        setCorrectIdx(q.correctIndex);
        setShowQForm(true);
    };

    const saveQuestion = () => {
        if (!qText.trim() || opts.some((o) => !o.trim())) return;
        const updated: QuizQuestion = {
            id: editingQ?.id ?? uid(),
            question: qText.trim(),
            options: opts.map((o) => o.trim()),
            correctIndex: correctIdx,
        };
        setQuestions((prev) =>
            editingQ
                ? prev.map((q) => (q.id === editingQ.id ? updated : q))
                : [...prev, updated],
        );
        setShowQForm(false);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Input
                    placeholder="Quiz title *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="font-medium"
                />
                <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
            </div>

            {/* Questions list */}
            {questions.length > 0 && (
                <div className="space-y-2">
                    {questions.map((q, i) => (
                        <div
                            key={q.id}
                            className="group flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                        >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-xs font-bold text-[#1e3a8a]">
                                {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {q.question}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    {q.options[q.correctIndex]}
                                </p>
                                <p className="mt-0.5 text-[10px] text-gray-400">
                                    {q.options.length} options
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                                <button
                                    onClick={() => openEditQ(q)}
                                    className="rounded p-1 text-gray-400 hover:text-blue-600"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() =>
                                        setQuestions((prev) =>
                                            prev.filter((x) => x.id !== q.id),
                                        )
                                    }
                                    className="rounded p-1 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Question form */}
            {showQForm ? (
                <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                    <p className="text-xs font-semibold tracking-widest text-[#1e3a8a]/70 uppercase">
                        {editingQ ? 'Edit Question' : 'New Question'}
                    </p>
                    <textarea
                        placeholder="Question text *"
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-400">
                            Answer options — click circle to mark correct
                        </p>
                        {opts.map((opt, j) => (
                            <div key={j} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCorrectIdx(j)}
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${correctIdx === j ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
                                >
                                    {correctIdx === j && (
                                        <div className="h-2 w-2 rounded-full bg-white" />
                                    )}
                                </button>
                                <Input
                                    placeholder={`Option ${j + 1}${correctIdx === j ? ' (correct)' : ''}`}
                                    value={opt}
                                    onChange={(e) => {
                                        const o = [...opts];
                                        o[j] = e.target.value;
                                        setOpts(o);
                                    }}
                                    className={`text-sm ${correctIdx === j ? 'border-green-300 bg-green-50 dark:border-green-700' : ''}`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button
                            size="sm"
                            className="bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90"
                            onClick={saveQuestion}
                            disabled={
                                !qText.trim() || opts.some((o) => !o.trim())
                            }
                        >
                            {editingQ ? 'Update Question' : 'Add Question'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowQForm(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={openNewQ}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1e3a8a]/30 py-2.5 text-sm font-medium text-[#1e3a8a] transition hover:bg-[#1e3a8a]/5 dark:border-indigo-700 dark:text-indigo-400"
                >
                    <Plus className="h-4 w-4" />
                    Add Question{' '}
                    {questions.length > 0 && `(${questions.length} added)`}
                </button>
            )}

            <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Button
                    className="flex-1 bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90"
                    onClick={() => {
                        clearDraft();
                        onSave({
                            id: initial?.id ?? uid(),
                            kind: 'quiz',
                            title: title.trim(),
                            description: description.trim(),
                            questions,
                        });
                    }}
                    disabled={!title.trim() || questions.length === 0}
                >
                    {isEdit
                        ? 'Save Changes'
                        : `Save Quiz${questions.length > 0 ? ` (${questions.length} Q${questions.length !== 1 ? 's' : ''})` : ''}`}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        clearDraft();
                        onCancel();
                    }}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

// ─── Assignment Builder (Add & Edit) ─────────────────────────────────────────
interface AssignmentBuilderProps {
    initial?: Assignment;
    onSave: (a: Assignment) => void;
    onCancel: () => void;
}
function AssignmentBuilder({
    initial,
    onSave,
    onCancel,
}: AssignmentBuilderProps) {
    const isEdit = !!initial;
    const draftKey = `dulatuon:assignmentDraft:${initial?.id ?? 'new'}`;
    const cached = (() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(draftKey);
            return raw
                ? (JSON.parse(raw) as {
                      title?: string;
                      instructions?: string;
                      dueDate?: string;
                      maxScore?: number;
                  })
                : null;
        } catch {
            return null;
        }
    })();
    const [title, setTitle] = useState(cached?.title ?? initial?.title ?? '');
    const [instructions, setInstructions] = useState(
        cached?.instructions ?? initial?.instructions ?? '',
    );
    const [dueDate, setDueDate] = useState(
        cached?.dueDate ?? initial?.dueDate ?? '',
    );
    const [maxScore, setMaxScore] = useState(
        cached?.maxScore ?? initial?.maxScore ?? 100,
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!title && !instructions && !dueDate && maxScore === 100) {
            window.localStorage.removeItem(draftKey);
            return;
        }
        try {
            window.localStorage.setItem(
                draftKey,
                JSON.stringify({ title, instructions, dueDate, maxScore }),
            );
        } catch {
            /* quota */
        }
    }, [draftKey, title, instructions, dueDate, maxScore]);

    const clearDraft = () => {
        try {
            window.localStorage.removeItem(draftKey);
        } catch {
            /* noop */
        }
    };

    return (
        <div className="space-y-3">
            <Input
                placeholder="Assignment title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-medium"
            />
            <textarea
                placeholder="Instructions for students *"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                        Due Date (optional)
                    </label>
                    <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>
                <div className="w-28">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                        Max Score
                    </label>
                    <Input
                        type="number"
                        min={1}
                        value={maxScore}
                        onChange={(e) => setMaxScore(Number(e.target.value))}
                    />
                </div>
            </div>
            <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Button
                    className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
                    onClick={() => {
                        clearDraft();
                        onSave({
                            id: initial?.id ?? uid(),
                            kind: 'assignment',
                            title: title.trim(),
                            instructions: instructions.trim(),
                            dueDate,
                            maxScore,
                        });
                    }}
                    disabled={!title.trim() || !instructions.trim()}
                >
                    {isEdit ? 'Save Changes' : 'Save Assignment'}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        clearDraft();
                        onCancel();
                    }}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

// ─── Assessment Picker ────────────────────────────────────────────────────────
interface AssessmentPickerProps {
    onAdd: (a: Assessment) => void;
    onCancel: () => void;
}
function AssessmentPicker({ onAdd, onCancel }: AssessmentPickerProps) {
    const [mode, setMode] = useState<'choose' | 'quiz' | 'assignment'>(
        'choose',
    );
    if (mode === 'quiz')
        return (
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-[#1e3a8a]" />
                    <p className="text-sm font-semibold">Create Quiz</p>
                    <button
                        onClick={() => setMode('choose')}
                        className="ml-auto text-xs text-gray-400 hover:text-blue-600"
                    >
                        ← Back
                    </button>
                </div>
                <QuizBuilder onSave={onAdd} onCancel={onCancel} />
            </div>
        );
    if (mode === 'assignment')
        return (
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold">Create Assignment</p>
                    <button
                        onClick={() => setMode('choose')}
                        className="ml-auto text-xs text-gray-400 hover:text-blue-600"
                    >
                        ← Back
                    </button>
                </div>
                <AssignmentBuilder onSave={onAdd} onCancel={onCancel} />
            </div>
        );
    return (
        <>
            <p className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                Add Assessment
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setMode('quiz')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/30 hover:bg-[#1e3a8a]/5 dark:bg-gray-800"
                >
                    <ClipboardList className="h-7 w-7 text-[#1e3a8a]" />
                    <span className="text-sm font-semibold">Quiz</span>
                    <span className="text-[10px] text-gray-400">
                        Multiple choice questions
                    </span>
                </button>
                <button
                    onClick={() => setMode('assignment')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-4 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 dark:bg-gray-800"
                >
                    <PenLine className="h-7 w-7 text-amber-500" />
                    <span className="text-sm font-semibold">Assignment</span>
                    <span className="text-[10px] text-gray-400">
                        Written / file submission
                    </span>
                </button>
            </div>
            <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </>
    );
}

// ─── Meeting Builder ──────────────────────────────────────────────────────────

const WORLD_ZONES = [
    { tz: 'UTC', flag: '🌐', city: 'UTC' },
    { tz: 'America/New_York', flag: '🇺🇸', city: 'New York' },
    { tz: 'America/Chicago', flag: '🇺🇸', city: 'Chicago' },
    { tz: 'America/Los_Angeles', flag: '🇺🇸', city: 'Los Angeles' },
    { tz: 'America/Sao_Paulo', flag: '🇧🇷', city: 'São Paulo' },
    { tz: 'Europe/London', flag: '🇬🇧', city: 'London' },
    { tz: 'Europe/Paris', flag: '🇪🇺', city: 'Paris' },
    { tz: 'Europe/Moscow', flag: '🇷🇺', city: 'Moscow' },
    { tz: 'Asia/Dubai', flag: '🇦🇪', city: 'Dubai' },
    { tz: 'Asia/Karachi', flag: '🇵🇰', city: 'Karachi' },
    { tz: 'Asia/Kolkata', flag: '🇮🇳', city: 'Mumbai' },
    { tz: 'Asia/Bangkok', flag: '🇹🇭', city: 'Bangkok' },
    { tz: 'Asia/Manila', flag: '🇵🇭', city: 'Manila' },
    { tz: 'Asia/Shanghai', flag: '🇨🇳', city: 'Beijing' },
    { tz: 'Asia/Tokyo', flag: '🇯🇵', city: 'Tokyo' },
    { tz: 'Asia/Seoul', flag: '🇰🇷', city: 'Seoul' },
    { tz: 'Australia/Sydney', flag: '🇦🇺', city: 'Sydney' },
    { tz: 'Pacific/Auckland', flag: '🇳🇿', city: 'Auckland' },
];

const TZ_GROUPS = [
    { label: 'UTC', options: ['UTC'] },
    {
        label: 'Americas',
        options: [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Anchorage',
            'America/Sao_Paulo',
            'America/Mexico_City',
            'America/Toronto',
            'America/Vancouver',
        ],
    },
    {
        label: 'Europe',
        options: [
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Rome',
            'Europe/Madrid',
            'Europe/Amsterdam',
            'Europe/Moscow',
            'Europe/Istanbul',
        ],
    },
    {
        label: 'Africa & Middle East',
        options: [
            'Africa/Cairo',
            'Africa/Johannesburg',
            'Asia/Riyadh',
            'Asia/Dubai',
            'Asia/Kuwait',
        ],
    },
    {
        label: 'Asia',
        options: [
            'Asia/Karachi',
            'Asia/Kolkata',
            'Asia/Dhaka',
            'Asia/Bangkok',
            'Asia/Singapore',
            'Asia/Manila',
            'Asia/Shanghai',
            'Asia/Tokyo',
            'Asia/Seoul',
            'Asia/Hong_Kong',
        ],
    },
    {
        label: 'Oceania',
        options: [
            'Australia/Perth',
            'Australia/Adelaide',
            'Australia/Sydney',
            'Australia/Melbourne',
            'Pacific/Auckland',
            'Pacific/Honolulu',
        ],
    },
];

function tzLabel(tz: string) {
    return tz.replace(/_/g, ' ').replace('/', ' / ');
}

interface MeetingBuilderProps {
    initial?: Meeting;
    onSave: (m: Meeting) => void;
    onCancel: () => void;
}
function MeetingBuilder({ initial, onSave, onCancel }: MeetingBuilderProps) {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const parseInitial = () => {
        if (!initial) return { date: '', time: '', endTime: '' };
        const d = new Date(initial.scheduledAt);
        const inTz = new Date(
            d.toLocaleString('en-US', { timeZone: initial.timezone }),
        );
        const pad = (n: number) => String(n).padStart(2, '0');
        let endTime = '';
        if (initial.durationMinutes != null) {
            const end = new Date(
                inTz.getTime() + initial.durationMinutes * 60000,
            );
            endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
        }
        return {
            date: `${inTz.getFullYear()}-${pad(inTz.getMonth() + 1)}-${pad(inTz.getDate())}`,
            time: `${pad(inTz.getHours())}:${pad(inTz.getMinutes())}`,
            endTime,
        };
    };

    const { date: initDate, time: initTime, endTime: initEnd } = parseInitial();

    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [meetLink, setMeetLink] = useState(initial?.meetLink ?? '');
    const [date, setDate] = useState(initDate);
    const [time, setTime] = useState(initTime);
    const [endTime, setEndTime] = useState(initEnd);
    const [timezone, setTimezone] = useState(initial?.timezone ?? localTz);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [now, setNow] = useState(new Date());

    // Derive the duration (in minutes) from the start/end time range. A range that
    // ends past midnight (end <= start) is treated as crossing into the next day.
    const durationMinutes = (() => {
        if (!time || !endTime) return null;
        const [sh, sm] = time.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        let mins = eh * 60 + em - (sh * 60 + sm);
        if (mins <= 0) {
            mins += 1440;
        }
        return mins;
    })();

    const durationLabel = (() => {
        if (durationMinutes == null) {
            return null;
        }
        const h = Math.floor(durationMinutes / 60);
        const m = durationMinutes % 60;
        if (h === 0) {
            return `${m} min`;
        }
        if (m === 0) {
            return `${h} hr`;
        }
        return `${h} hr ${m} min`;
    })();

    // Only tick the clock when the world-time panel is actually open
    useEffect(() => {
        if (!showAdvanced) return;
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, [showAdvanced]);

    const scheduledIso = (() => {
        if (!date || !time) return null;
        try {
            const [y, mo, d2] = date.split('-').map(Number);
            const [h, mi] = time.split(':').map(Number);
            // Build a string that JS can parse as if it were in the chosen timezone
            const local = new Date(`${date}T${time}:00`);
            // Get offset of the chosen timezone at that moment
            const fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });
            // Find the UTC instant where the chosen-tz wall clock reads date+time
            const utcApprox = new Date(`${date}T${time}:00Z`);
            const tzParts = fmt.formatToParts(utcApprox);
            const get = (t: string) =>
                Number(tzParts.find((p) => p.type === t)?.value ?? 0);
            const tzYear = get('year'),
                tzMonth = get('month'),
                tzDay = get('day');
            const tzHour = get('hour') % 24,
                tzMin = get('minute'),
                tzSec = get('second');
            const diff =
                utcApprox.getTime() -
                Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec);
            return new Date(
                Date.UTC(y, mo - 1, d2, h, mi, 0) + diff,
            ).toISOString();
        } catch {
            return null;
        }
    })();

    const worldPreview = useMemo(() => {
        if (!showAdvanced || !scheduledIso) return null;
        return WORLD_ZONES.map(({ tz, flag, city }) => {
            const t = new Date(scheduledIso);
            const timeStr = t.toLocaleTimeString('en-US', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
            const dateStr = t.toLocaleDateString('en-US', {
                timeZone: tz,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
            const isSelected = tz === timezone;
            return { tz, flag, city, timeStr, dateStr, isSelected };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAdvanced, scheduledIso, timezone, now]);

    const handleSave = () => {
        if (
            !title.trim() ||
            !meetLink.trim() ||
            !date ||
            !time ||
            !endTime ||
            !scheduledIso ||
            durationMinutes == null
        )
            return;
        const m: Meeting = {
            id: initial?.id ?? 'meeting-' + Math.random().toString(36).slice(2),
            dbId: initial?.dbId,
            title: title.trim(),
            description: description.trim(),
            meetLink: meetLink.trim(),
            scheduledAt: scheduledIso,
            timezone,
            durationMinutes,
        };
        onSave(m);
    };

    const valid =
        title.trim() &&
        meetLink.trim() &&
        date &&
        time &&
        endTime &&
        endTime !== time;

    return (
        <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Meeting Title
                </label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Live Q&A Session"
                    className="h-9"
                />
            </div>

            {/* Google Meet link */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Google Meet Link
                </label>
                <div className="relative">
                    <Link2 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={meetLink}
                        onChange={(e) => setMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="h-9 pl-8"
                    />
                </div>
            </div>

            {/* Date, start time, end time row */}
            <div className="space-y-1.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Date
                        </label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Start Time
                        </label>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                            End Time
                        </label>
                        <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="h-9"
                        />
                    </div>
                </div>
                {time && endTime && endTime === time ? (
                    <p className="text-[11px] text-red-400">
                        End time must be different from the start time.
                    </p>
                ) : durationLabel ? (
                    <p className="text-[11px] text-gray-400">
                        Duration: {durationLabel}
                    </p>
                ) : null}
            </div>

            {/* Timezone selector */}
            <div className="space-y-1.5">
                <label className="block flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <Globe className="h-3.5 w-3.5 text-blue-400" /> Timezone
                </label>
                <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                >
                    {TZ_GROUPS.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                            {g.options.map((tz) => (
                                <option key={tz} value={tz}>
                                    {tzLabel(tz)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <p className="text-[11px] text-gray-400">
                    Your local timezone: {tzLabel(localTz)}
                </p>
            </div>

            {/* Advanced toggle */}
            <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 transition-colors hover:text-blue-700"
            >
                <Globe className="h-3.5 w-3.5" />
                World Time Zones
                {showAdvanced ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                )}
            </button>

            {/* World clock preview */}
            {showAdvanced && worldPreview && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {worldPreview.map(
                            ({
                                tz,
                                flag,
                                city,
                                timeStr,
                                dateStr,
                                isSelected,
                            }) => (
                                <button
                                    key={tz}
                                    type="button"
                                    onClick={() => setTimezone(tz)}
                                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all ${
                                        isSelected
                                            ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40'
                                            : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-900/60'
                                    }`}
                                >
                                    <span className="text-base leading-none">
                                        {flag}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {city}
                                        </p>
                                        <p
                                            className={`font-mono tabular-nums ${isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}
                                        >
                                            {timeStr}
                                        </p>
                                        <p className="truncate text-[10px] text-gray-400">
                                            {dateStr}
                                        </p>
                                    </div>
                                </button>
                            ),
                        )}
                    </div>
                </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Description{' '}
                    <span className="font-normal text-gray-400">
                        (optional)
                    </span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will be covered in this meeting?"
                    rows={2}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                />
            </div>

            <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    disabled={!valid}
                    onClick={handleSave}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                    {initial ? 'Save Changes' : 'Add Meeting'}
                </Button>
            </div>
        </div>
    );
}

// ─── Games ────────────────────────────────────────────────────────────────────
const GAME_TYPE_META: Record<
    GameType,
    { label: string; tagline: string; icon: string; chip: string; ring: string }
> = {
    quiz_quest: {
        label: 'Quiz Quest',
        tagline: 'Timed multiple-choice with streak bonuses',
        icon: '⚡',
        chip: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        ring: 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40',
    },
    memory_match: {
        label: 'Memory Match',
        tagline: 'Flip & match prompt ↔ answer pairs',
        icon: '🧠',
        chip: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300',
        ring: 'border-pink-400 bg-pink-50 dark:border-pink-600 dark:bg-pink-950/40',
    },
    word_scramble: {
        label: 'Word Scramble',
        tagline: 'Unscramble the answer to each clue',
        icon: '🔤',
        chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
        ring: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/40',
    },
    crossword: {
        label: 'Crossword',
        tagline: 'Fill the grid using the clues',
        icon: '🧩',
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        ring: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
    },
    hangman: {
        label: 'Word Rescue',
        tagline: 'Guess the word before you run out of tries',
        icon: '🪢',
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        ring: 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40',
    },
    fault_lab: {
        label: 'Fault Lab',
        tagline: '3D simulation: stress, faults and how earthquakes begin',
        icon: '🌋',
        chip: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
        ring: 'border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/40',
    },
    shake_town: {
        label: 'Shake Town',
        tagline: '3D simulation: depth, magnitude and intensity',
        icon: '🏘️',
        chip: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
        ring: 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40',
    },
    wave_tank: {
        label: 'Wave Tank',
        tagline: '3D simulation: P, S and surface waves',
        icon: '🌊',
        chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
        ring: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/40',
    },
    quake_tracker: {
        label: 'Quake Tracker',
        tagline: '3D simulation: earthquakes in the Philippines',
        icon: '🗺️',
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        ring: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
    },
    ground_test: {
        label: 'Ground Test',
        tagline: '3D simulation: landslides, liquefaction, rupture',
        icon: '⛰️',
        chip: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
        ring: 'border-lime-400 bg-lime-50 dark:border-lime-600 dark:bg-lime-950/40',
    },
    quake_ready: {
        label: 'Quake Ready',
        tagline: '3D simulation: before, during and after',
        icon: '🎒',
        chip: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
        ring: 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40',
    },
};

// Simulation games ship with their own fixed checkpoints, so there is nothing for a teacher to type in.
const SIMULATION_GAMES: GameType[] = [
    'fault_lab',
    'shake_town',
    'wave_tank',
    'quake_tracker',
    'ground_test',
    'quake_ready',
];

const SIMULATION_NOTES: Partial<Record<GameType, string>> = {
    fault_lab:
        'Students run three experiments on a fault and answer 13 built-in checkpoints.',
    shake_town:
        'Students change the magnitude and depth of an earthquake, watch four towns shake, and answer 10 built-in checkpoints.',
    wave_tank:
        'Students send P, S, Love and Rayleigh waves through rock and read a seismogram, with 8 built-in checkpoints.',
    quake_tracker:
        'Students match five Philippine earthquakes to their faults and trenches on a 3D map, with 9 built-in checkpoints.',
    ground_test:
        'Students set the slope, soil and water of a piece of land and shake it to cause landslides, liquefaction and ground rupture, with 8 built-in checkpoints.',
    quake_ready:
        'Students prepare a classroom, drop, cover and hold on, then decide what to do afterwards, with 12 built-in checkpoints.',
};

const SIMULATION_LABELS = {
    prompt: 'Checkpoint',
    answer: 'Answer',
    promptPlaceholder: '',
    answerPlaceholder: '',
};

const GAME_ITEM_LABELS: Record<
    GameType,
    {
        prompt: string;
        answer: string;
        promptPlaceholder: string;
        answerPlaceholder: string;
    }
> = {
    quiz_quest: {
        prompt: 'Question',
        answer: 'Correct answer',
        promptPlaceholder: 'e.g. Who wrote the Gospel of Luke?',
        answerPlaceholder: 'e.g. Luke the physician',
    },
    memory_match: {
        prompt: 'Term / prompt',
        answer: 'Matching answer',
        promptPlaceholder: 'e.g. Alpha',
        answerPlaceholder: 'e.g. The Beginning',
    },
    word_scramble: {
        prompt: 'Clue / hint',
        answer: 'Answer to unscramble',
        promptPlaceholder: 'e.g. The first book of the Bible',
        answerPlaceholder: 'e.g. Genesis',
    },
    crossword: {
        prompt: 'Clue',
        answer: 'Answer (single word)',
        promptPlaceholder: 'e.g. Jesus turned water into this',
        answerPlaceholder: 'e.g. Wine',
    },
    hangman: {
        prompt: 'Clue / hint',
        answer: 'Word to guess (single word)',
        promptPlaceholder: 'e.g. He was swallowed by a great fish',
        answerPlaceholder: 'e.g. Jonah',
    },
    fault_lab: SIMULATION_LABELS,
    shake_town: SIMULATION_LABELS,
    wave_tank: SIMULATION_LABELS,
    quake_tracker: SIMULATION_LABELS,
    ground_test: SIMULATION_LABELS,
    quake_ready: SIMULATION_LABELS,
};

interface GameBuilderProps {
    initial?: Game;
    onSave: (g: Game) => void;
    onCancel: () => void;
}
function GameBuilder({ initial, onSave, onCancel }: GameBuilderProps) {
    const blankItem = (): GameItem => ({
        prompt: '',
        answer: '',
        distractors: ['', '', ''],
    });

    const [title, setTitle] = useState(initial?.title ?? '');
    const [gameType, setGameType] = useState<GameType>(
        initial?.gameType ?? 'quiz_quest',
    );
    const [points, setPoints] = useState<number>(initial?.points ?? 100);
    const [lives, setLives] = useState<number>(initial?.lives ?? 3);
    const [items, setItems] = useState<GameItem[]>(
        initial?.items?.length
            ? initial.items.map((i) => ({
                  prompt: i.prompt,
                  answer: i.answer,
                  distractors: [...(i.distractors ?? []), '', '', ''].slice(
                      0,
                      3,
                  ),
              }))
            : [blankItem()],
    );

    const labels = GAME_ITEM_LABELS[gameType];

    const updateItem = (idx: number, patch: Partial<GameItem>) =>
        setItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
        );
    const updateDistractor = (idx: number, dIdx: number, val: string) =>
        setItems((prev) =>
            prev.map((it, i) => {
                if (i !== idx) {
                    return it;
                }
                const d = [...it.distractors];
                d[dIdx] = val;
                return { ...it, distractors: d };
            }),
        );
    const addItem = () => setItems((prev) => [...prev, blankItem()]);
    const removeItem = (idx: number) =>
        setItems((prev) =>
            prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
        );

    const cleanItems: GameItem[] = items
        .map((it) => ({
            prompt: it.prompt.trim(),
            answer: it.answer.trim(),
            distractors: it.distractors.map((d) => d.trim()).filter(Boolean),
        }))
        .filter((it) => it.prompt && it.answer);

    const isWordGame = gameType === 'crossword' || gameType === 'hangman';
    const isSimulation = SIMULATION_GAMES.includes(gameType);
    const minItems = isSimulation
        ? 0
        : gameType === 'memory_match' || gameType === 'crossword'
          ? 2
          : 1;
    const itemNoun =
        gameType === 'memory_match' ? 'pair' : isWordGame ? 'word' : 'question';

    const [attempted, setAttempted] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const issues: string[] = [];
    if (!title.trim()) {
        issues.push('Add a game title.');
    }
    if (points <= 0) {
        issues.push('Points must be at least 1.');
    }
    if (cleanItems.length < minItems) {
        const plural = minItems > 1 ? `${itemNoun}s` : itemNoun;
        issues.push(
            `Add at least ${minItems} complete ${plural} (each needs a ${labels.prompt.toLowerCase()} and ${labels.answer.toLowerCase()}).`,
        );
    }
    const valid = issues.length === 0;

    const titleError = attempted && !title.trim();
    const pointsError = attempted && points <= 0;
    const itemsError = attempted && cleanItems.length < minItems;

    const commit = () =>
        onSave({
            id: initial?.id ?? 'game-' + uid(),
            dbId: initial?.dbId,
            title: title.trim(),
            gameType,
            points,
            lives,
            items: isSimulation ? [] : cleanItems,
        });

    const handleSave = () => {
        if (!valid) {
            setAttempted(true);
            return;
        }
        setConfirming(true);
    };

    return (
        <div className="space-y-5">
            {/* Game type picker */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Game Type
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(Object.keys(GAME_TYPE_META) as GameType[]).map((t) => {
                        const meta = GAME_TYPE_META[t];
                        const selected = gameType === t;
                        return (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setGameType(t)}
                                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${selected ? meta.ring : 'border-gray-200 bg-white hover:border-violet-200 dark:border-gray-800 dark:bg-gray-900'}`}
                            >
                                <span className="text-lg leading-none">
                                    {meta.icon}
                                </span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    {meta.label}
                                </span>
                                <span className="text-[11px] leading-snug text-gray-400">
                                    {meta.tagline}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Title + points + lives */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Game Title
                    </label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Books of the Bible Challenge"
                        className={`h-9 ${titleError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    />
                    {titleError && (
                        <p className="text-[11px] font-medium text-red-500">
                            A game title is required.
                        </p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Points
                    </label>
                    <div className="relative">
                        <Trophy className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-amber-400" />
                        <Input
                            type="number"
                            min={1}
                            max={1000}
                            value={points}
                            onChange={(e) =>
                                setPoints(
                                    Math.max(1, Number(e.target.value) || 0),
                                )
                            }
                            className={`h-9 w-full pl-8 sm:w-24 ${pointsError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Lives / day
                    </label>
                    <div className="relative">
                        <Heart className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-rose-400" />
                        <Input
                            type="number"
                            min={0}
                            max={50}
                            value={lives}
                            onChange={(e) =>
                                setLives(
                                    Math.max(0, Number(e.target.value) || 0),
                                )
                            }
                            className="h-9 w-full pl-8 sm:w-24"
                        />
                    </div>
                </div>
            </div>
            <p className="-mt-3 text-[11px] text-gray-400">
                Lives limit attempts per 24h to prevent abuse ·{' '}
                <span className="font-medium">0 = unlimited</span>
            </p>

            {isSimulation && (
                <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
                    This is a ready-made 3D simulation.{' '}
                    {SIMULATION_NOTES[gameType]} There are no questions to add.
                </p>
            )}

            {/* Items */}
            <div className={isSimulation ? 'hidden' : 'space-y-2'}>
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {itemNoun === 'pair'
                            ? 'Pairs'
                            : itemNoun === 'word'
                              ? 'Words'
                              : 'Questions'}
                        <span
                            className={`ml-1 font-normal ${itemsError ? 'text-red-500' : 'text-gray-400'}`}
                        >
                            ({cleanItems.length} ready
                            {minItems > 1 ? `, need ${minItems}+` : ''})
                        </span>
                    </label>
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-1 text-[11px] font-medium text-violet-500 hover:text-violet-700"
                    >
                        <Plus className="h-3 w-3" />
                        Add {itemNoun}
                    </button>
                </div>
                <div className="space-y-3">
                    {items.map((it, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-gray-400">
                                    #{idx + 1}
                                </span>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        className="rounded p-1 text-gray-300 hover:text-red-400"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Input
                                    value={it.prompt}
                                    onChange={(e) =>
                                        updateItem(idx, {
                                            prompt: e.target.value,
                                        })
                                    }
                                    placeholder={labels.promptPlaceholder}
                                    className="h-9"
                                />
                                <div className="relative">
                                    <CheckCircle2 className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-emerald-400" />
                                    <Input
                                        value={it.answer}
                                        onChange={(e) =>
                                            updateItem(idx, {
                                                answer: e.target.value,
                                            })
                                        }
                                        placeholder={labels.answerPlaceholder}
                                        className="h-9 pl-8"
                                    />
                                </div>
                                {gameType === 'quiz_quest' && (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {it.distractors.map((d, dIdx) => (
                                            <Input
                                                key={dIdx}
                                                value={d}
                                                onChange={(e) =>
                                                    updateDistractor(
                                                        idx,
                                                        dIdx,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={`Wrong option ${dIdx + 1}`}
                                                className="h-9"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {gameType === 'quiz_quest' && (
                    <p className="text-[11px] text-gray-400">
                        Tip: leave wrong options blank to auto-fill them from
                        other questions' answers.
                    </p>
                )}
            </div>

            {attempted && !valid && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
                    <div className="space-y-0.5">
                        <p className="font-semibold">
                            Please complete all required details:
                        </p>
                        <ul className="list-inside list-disc space-y-0.5">
                            {issues.map((msg, i) => (
                                <li key={i}>{msg}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-violet-600 text-white hover:bg-violet-700"
                >
                    {initial ? 'Save Changes' : 'Add Game'}
                </Button>
            </div>

            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-lg leading-none">
                                {GAME_TYPE_META[gameType].icon}
                            </span>
                            {initial ? 'Save Changes?' : 'Add this Game?'}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        "<strong>{title.trim()}</strong>" ·{' '}
                        {GAME_TYPE_META[gameType].label}
                        {!isSimulation &&
                            ` · ${cleanItems.length} ${cleanItems.length === 1 ? itemNoun : `${itemNoun}s`}`}{' '}
                        · {points} pts
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirming(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setConfirming(false);
                                commit();
                            }}
                            className="bg-violet-600 text-white hover:bg-violet-700"
                        >
                            {initial ? 'Save Changes' : 'Add Game'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Content Panel Editor (right panel, edit mode) ────────────────────────────
interface ContentPanelEditorProps {
    session: Session;
    onAddContent: (c: ContentItem) => void;
    onUpdateContent: (c: ContentItem) => void;
    onDeleteContent: (id: string) => void;
    onAddAssessment: (a: Assessment) => void;
    onUpdateAssessment: (a: Assessment) => void;
    onDeleteAssessment: (id: string) => void;
    onAddMeeting: (m: Meeting) => void;
    onUpdateMeeting: (m: Meeting) => void;
    onDeleteMeeting: (id: string) => void;
    onAddGame: (g: Game) => void;
    onUpdateGame: (g: Game) => void;
    onDeleteGame: (id: string) => void;
}
function ContentPanelEditor({
    session,
    onAddContent,
    onUpdateContent,
    onDeleteContent,
    onAddAssessment,
    onUpdateAssessment,
    onDeleteAssessment,
    onAddMeeting,
    onUpdateMeeting,
    onDeleteMeeting,
    onAddGame,
    onUpdateGame,
    onDeleteGame,
}: ContentPanelEditorProps) {
    type PanelMode =
        | 'list'
        | 'add-content'
        | 'edit-content'
        | 'add-assessment'
        | 'edit-assessment'
        | 'add-meeting'
        | 'edit-meeting'
        | 'add-game'
        | 'edit-game';
    const [mode, setMode] = useState<PanelMode>('list');
    const [editingContent, setEditingContent] = useState<ContentItem | null>(
        null,
    );
    const [editingAssessment, setEditingAssessment] =
        useState<Assessment | null>(null);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{
        type: 'content' | 'assessment' | 'meeting' | 'game';
        id: string;
        name: string;
    } | null>(null);

    const games = session.games ?? [];

    const reset = () => {
        setMode('list');
        setEditingContent(null);
        setEditingAssessment(null);
        setEditingMeeting(null);
        setEditingGame(null);
    };

    if (mode === 'add-content' || mode === 'edit-content')
        return (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {mode === 'edit-content'
                            ? 'Edit Content'
                            : 'Add Content'}
                    </button>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                    <ContentPicker
                        initial={editingContent ?? undefined}
                        onSave={(item) => {
                            mode === 'edit-content'
                                ? onUpdateContent(item)
                                : onAddContent(item);
                            reset();
                        }}
                        onCancel={reset}
                    />
                </div>
            </div>
        );

    if (mode === 'add-assessment' || mode === 'edit-assessment') {
        const isEditAssessment =
            mode === 'edit-assessment' && editingAssessment;
        return (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {isEditAssessment
                            ? 'Edit Assessment'
                            : 'Add Assessment'}
                    </button>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    {isEditAssessment ? (
                        editingAssessment.kind === 'quiz' ? (
                            <QuizBuilder
                                initial={editingAssessment}
                                onSave={(q) => {
                                    onUpdateAssessment(q);
                                    reset();
                                }}
                                onCancel={reset}
                            />
                        ) : (
                            <AssignmentBuilder
                                initial={editingAssessment}
                                onSave={(a) => {
                                    onUpdateAssessment(a);
                                    reset();
                                }}
                                onCancel={reset}
                            />
                        )
                    ) : (
                        <AssessmentPicker
                            onAdd={(a) => {
                                onAddAssessment(a);
                                reset();
                            }}
                            onCancel={reset}
                        />
                    )}
                </div>
            </div>
        );
    }

    if (mode === 'add-meeting' || mode === 'edit-meeting')
        return (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {mode === 'edit-meeting'
                            ? 'Edit Meeting'
                            : 'Add Meeting'}
                    </button>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <MeetingBuilder
                        initial={editingMeeting ?? undefined}
                        onSave={(m) => {
                            mode === 'edit-meeting'
                                ? onUpdateMeeting(m)
                                : onAddMeeting(m);
                            reset();
                        }}
                        onCancel={reset}
                    />
                </div>
            </div>
        );

    if (mode === 'add-game' || mode === 'edit-game')
        return (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {mode === 'edit-game' ? 'Edit Game' : 'Add Game'}
                    </button>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                    <GameBuilder
                        initial={editingGame ?? undefined}
                        onSave={(g) => {
                            mode === 'edit-game'
                                ? onUpdateGame(g)
                                : onAddGame(g);
                            reset();
                        }}
                        onCancel={reset}
                    />
                </div>
            </div>
        );

    return (
        <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Session header — minimal */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {session.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                    {session.contents.length} material
                    {session.contents.length !== 1 ? 's' : ''}
                    {' · '}
                    {session.assessments.length} assessment
                    {session.assessments.length !== 1 ? 's' : ''}
                    {' · '}
                    {session.meetings.length} meeting
                    {session.meetings.length !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="flex-1 divide-y divide-gray-50 overflow-y-auto dark:divide-gray-800/50">
                {/* Materials */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">
                            Materials
                        </span>
                        <button
                            onClick={() => setMode('add-content')}
                            className="flex items-center gap-1 text-[11px] font-medium text-blue-500 transition-colors hover:text-blue-700"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                    {session.contents.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">
                            No materials yet.
                        </p>
                    ) : (
                        <div className="space-y-0.5">
                            {session.contents.map((c) => (
                                <div
                                    key={c.id}
                                    className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                >
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${CONTENT_META[c.type].badge}`}
                                    >
                                        {CONTENT_META[c.type].icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-gray-800 dark:text-gray-200">
                                            {c.title}
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            {CONTENT_META[c.type].label}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                                        <button
                                            onClick={() => {
                                                setEditingContent(c);
                                                setMode('edit-content');
                                            }}
                                            className="rounded p-1 text-gray-300 transition hover:text-blue-500"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDeleteTarget({
                                                    type: 'content',
                                                    id: c.id,
                                                    name: c.title,
                                                })
                                            }
                                            className="rounded p-1 text-gray-300 transition hover:text-red-400"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assessments */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">
                            Assessments
                        </span>
                        <button
                            onClick={() => setMode('add-assessment')}
                            className="flex items-center gap-1 text-[11px] font-medium text-amber-500 transition-colors hover:text-amber-700"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                    {session.assessments.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">
                            No assessments yet.
                        </p>
                    ) : (
                        <div className="space-y-0.5">
                            {session.assessments.map((a) => (
                                <div
                                    key={a.id}
                                    className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                >
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${a.kind === 'quiz' ? 'bg-[#1e3a8a]/10 text-[#1e3a8a]' : 'bg-amber-50 text-amber-500'}`}
                                    >
                                        {a.kind === 'quiz' ? (
                                            <ClipboardList className="h-3.5 w-3.5" />
                                        ) : (
                                            <PenLine className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-gray-800 dark:text-gray-200">
                                            {a.title}
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            {a.kind === 'quiz'
                                                ? `Quiz · ${a.questions.length}Q`
                                                : `Assignment · ${a.maxScore} pts${a.dueDate ? ` · Due ${a.dueDate}` : ''}`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                                        <button
                                            onClick={() => {
                                                setEditingAssessment(a);
                                                setMode('edit-assessment');
                                            }}
                                            className="rounded p-1 text-gray-300 transition hover:text-blue-500"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDeleteTarget({
                                                    type: 'assessment',
                                                    id: a.id,
                                                    name: a.title,
                                                })
                                            }
                                            className="rounded p-1 text-gray-300 transition hover:text-red-400"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Games */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">
                            Games
                        </span>
                        <button
                            onClick={() => {
                                setEditingGame(null);
                                setMode('add-game');
                            }}
                            className="flex items-center gap-1 text-[11px] font-medium text-violet-500 transition-colors hover:text-violet-700"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                    {games.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">
                            No games yet.
                        </p>
                    ) : (
                        <div className="space-y-0.5">
                            {games.map((g) => {
                                const meta = GAME_TYPE_META[g.gameType];
                                return (
                                    <div
                                        key={g.id}
                                        className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                    >
                                        <span
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${meta.chip}`}
                                        >
                                            {meta.icon}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium text-gray-800 dark:text-gray-200">
                                                {g.title}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                {meta.label} · {g.items.length}{' '}
                                                {SIMULATION_GAMES.includes(
                                                    g.gameType,
                                                )
                                                    ? 'checkpoints'
                                                    : g.gameType === 'memory_match'
                                                    ? 'pairs'
                                                    : g.gameType ===
                                                            'crossword' ||
                                                        g.gameType === 'hangman'
                                                      ? 'words'
                                                      : 'questions'}{' '}
                                                · {g.points} pts
                                                {g.lives > 0
                                                    ? ` · ${g.lives}♥/day`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                                            <button
                                                onClick={() => {
                                                    setEditingGame(g);
                                                    setMode('edit-game');
                                                }}
                                                className="rounded p-1 text-gray-300 transition hover:text-blue-500"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        type: 'game',
                                                        id: g.id,
                                                        name: g.title,
                                                    })
                                                }
                                                className="rounded p-1 text-gray-300 transition hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Meetings */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">
                            Meetings
                        </span>
                        <button
                            onClick={() => setMode('add-meeting')}
                            className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 transition-colors hover:text-emerald-700"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                    {session.meetings.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">
                            No meetings yet.
                        </p>
                    ) : (
                        <div className="space-y-0.5">
                            {session.meetings.map((m) => {
                                const meetDate = new Date(m.scheduledAt);
                                const dateStr = meetDate.toLocaleDateString(
                                    'en-US',
                                    {
                                        timeZone: m.timezone,
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                    },
                                );
                                const timeStr = meetDate.toLocaleTimeString(
                                    'en-US',
                                    {
                                        timeZone: m.timezone,
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                    },
                                );
                                const endStr = m.durationMinutes
                                    ? new Date(
                                          meetDate.getTime() +
                                              m.durationMinutes * 60000,
                                      ).toLocaleTimeString('en-US', {
                                          timeZone: m.timezone,
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true,
                                      })
                                    : null;
                                const tzCity =
                                    m.timezone
                                        .split('/')
                                        .pop()
                                        ?.replace(/_/g, ' ') ?? m.timezone;
                                return (
                                    <div
                                        key={m.id}
                                        className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                    >
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-500">
                                            <Video className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium text-gray-800 dark:text-gray-200">
                                                {m.title}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                {dateStr} · {timeStr}
                                                {endStr ? ` – ${endStr}` : ''} (
                                                {tzCity})
                                            </p>
                                            <a
                                                href={m.meetLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-0.5 text-[11px] text-emerald-500 hover:underline"
                                            >
                                                <ExternalLink className="h-2.5 w-2.5" />
                                                Join
                                            </a>
                                        </div>
                                        <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                                            <button
                                                onClick={() => {
                                                    setEditingMeeting(m);
                                                    setMode('edit-meeting');
                                                }}
                                                className="rounded p-1 text-gray-300 transition hover:text-blue-500"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        type: 'meeting',
                                                        id: m.id,
                                                        name: m.title,
                                                    })
                                                }
                                                className="rounded p-1 text-gray-300 transition hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirm dialog */}
            <Dialog
                open={!!deleteTarget}
                onOpenChange={() => setDeleteTarget(null)}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete{' '}
                            {deleteTarget?.type === 'content'
                                ? 'Content'
                                : deleteTarget?.type === 'meeting'
                                  ? 'Meeting'
                                  : deleteTarget?.type === 'game'
                                    ? 'Game'
                                    : 'Assessment'}
                            ?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        "<strong>{deleteTarget?.name}</strong>" will be
                        permanently removed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!deleteTarget) return;
                                if (deleteTarget.type === 'content')
                                    onDeleteContent(deleteTarget.id);
                                else if (deleteTarget.type === 'assessment')
                                    onDeleteAssessment(deleteTarget.id);
                                else if (deleteTarget.type === 'game')
                                    onDeleteGame(deleteTarget.id);
                                else onDeleteMeeting(deleteTarget.id);
                                setDeleteTarget(null);
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Sidebar Session (with drag-and-drop support) ─────────────────────────────
interface SidebarSessionProps {
    session: Session;
    editMode: boolean;
    indent?: boolean;
    locked?: boolean;
    completedContents?: Set<number>;
    completedGames?: Set<number>;
    isActive: boolean;
    activeContentId: string | null;
    activeAssessmentId: string | null;
    viewedIds: Set<string>;
    onSelectContent: (session: Session, content: ContentItem) => void;
    onSelectAssessment: (session: Session, assessment: Assessment) => void;
    onSelectSession: (session: Session) => void;
    onDelete: () => void;
    onRename: (title: string) => void;
}
const SidebarSession = memo(function SidebarSession({
    session,
    editMode,
    indent = false,
    locked = false,
    completedContents,
    completedGames,
    isActive,
    activeContentId,
    activeAssessmentId,
    viewedIds,
    onSelectContent,
    onSelectAssessment,
    onSelectSession,
    onDelete,
    onRename,
}: SidebarSessionProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: session.id, disabled: !editMode });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
    };
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(session.title);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const renameRef = useRef<HTMLInputElement>(null);

    const isMobile = useIsMobile();
    const subItemCount =
        session.contents.length +
        session.assessments.length +
        session.meetings.length +
        (session.games?.length ?? 0);
    const hasSubItems = subItemCount > 0;
    const [subOpen, setSubOpen] = useState(isActive);
    const [wasActive, setWasActive] = useState(isActive);
    if (isActive !== wasActive) {
        setWasActive(isActive);
        if (isActive) {
            setSubOpen(true);
        }
    }

    return (
        <div ref={setNodeRef} style={style} className={indent ? 'pl-4' : ''}>
            <div
                className={`group/sess flex items-center gap-2 rounded-lg px-3 py-3 transition-all ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isActive && !activeContentId && !activeAssessmentId ? 'bg-[#1e3a8a]/10 text-[#1e3a8a] dark:bg-indigo-900/20 dark:text-indigo-300' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60'}`}
                onClick={() => {
                    if (renaming || locked) {
                        return;
                    }
                    if (!editMode && isMobile && hasSubItems) {
                        setSubOpen((o) => !o);
                    } else {
                        onSelectSession(session);
                    }
                }}
            >
                {editMode && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}
                <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${isActive && !activeContentId && !activeAssessmentId ? 'bg-[#1e3a8a]/20' : locked ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                    {locked ? (
                        <Lock className="h-3 w-3 text-gray-400" />
                    ) : (
                        <BookOpen
                            className={`h-3 w-3 ${isActive && !activeContentId && !activeAssessmentId ? 'text-[#1e3a8a]' : 'text-gray-400'}`}
                        />
                    )}
                </div>
                {renaming ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (renameVal.trim()) onRename(renameVal.trim());
                            setRenaming(false);
                        }}
                        className="flex flex-1 items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Input
                            ref={renameRef}
                            value={renameVal}
                            onChange={(e) => setRenameVal(e.target.value)}
                            className="h-6 flex-1 text-xs"
                            autoFocus
                        />
                        <Button
                            type="submit"
                            size="sm"
                            className="h-6 bg-[#1e3a8a] px-2 text-xs text-white hover:bg-[#1e3a8a]/90"
                        >
                            ✓
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1 text-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                setRenaming(false);
                            }}
                        >
                            ✕
                        </Button>
                    </form>
                ) : (
                    (() => {
                        const active =
                            isActive && !activeContentId && !activeAssessmentId;
                        const completableCount =
                            session.contents.length +
                            session.assessments.length +
                            (session.games?.length ?? 0);
                        const allCompleted =
                            completableCount > 0 &&
                            session.contents.every(
                                (c) =>
                                    c.dbId != null &&
                                    !!completedContents?.has(c.dbId),
                            ) &&
                            session.assessments.every((a) =>
                                viewedIds.has(a.id),
                            ) &&
                            (session.games ?? []).every(
                                (g) =>
                                    g.dbId != null &&
                                    !!completedGames?.has(g.dbId),
                            );
                        return (
                            <span
                                className={`line-clamp-2 flex-1 text-xs leading-snug ${allCompleted && !active ? 'font-normal text-gray-500 dark:text-gray-400' : 'font-semibold'}`}
                            >
                                {session.title}
                            </span>
                        );
                    })()
                )}
                {!editMode && hasSubItems && (
                    <>
                        <span
                            className={`shrink-0 text-[10px] font-medium ${isActive && !activeContentId && !activeAssessmentId ? 'text-[#1e3a8a]/50' : 'text-gray-400'}`}
                        >
                            {subItemCount}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSubOpen((o) => !o);
                            }}
                            className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                            aria-label={
                                subOpen ? 'Collapse items' : 'Expand items'
                            }
                        >
                            {subOpen ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </>
                )}
                {editMode && !renaming && (
                    <div
                        className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover/sess:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="rounded p-1 text-gray-400 hover:text-blue-600"
                            onClick={() => {
                                setRenaming(true);
                                setRenameVal(session.title);
                            }}
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            className="rounded p-1 text-gray-400 hover:text-red-500"
                            onClick={() => setConfirmDelete(true)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Sub-items (view mode only) */}
            {!editMode && hasSubItems && subOpen && (
                <div className="mt-0.5 ml-4 space-y-px border-l-2 border-gray-100 pl-3 dark:border-gray-700">
                    {session.contents.map((c) => {
                        const seen = viewedIds.has(c.id);
                        const done = !!(
                            c.dbId && completedContents?.has(c.dbId)
                        );
                        return (
                            <div
                                key={c.id}
                                onClick={() => onSelectContent(session, c)}
                                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-sm transition-all ${activeContentId === c.id ? 'bg-[#1e3a8a]/10 text-[#1e3a8a] dark:bg-indigo-900/20 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <span
                                    className={`shrink-0 ${activeContentId === c.id ? 'text-[#1e3a8a]' : 'text-gray-400'}`}
                                >
                                    {CONTENT_META[c.type].icon}
                                </span>
                                <span
                                    className={`flex-1 truncate ${seen && !done ? 'font-normal' : done ? 'font-normal' : 'font-semibold'}`}
                                >
                                    {c.title}
                                </span>
                                {done && (
                                    <CheckCircle2
                                        className={`h-3 w-3 shrink-0 ${activeContentId === c.id ? 'text-[#1e3a8a]' : 'text-emerald-500'}`}
                                    />
                                )}
                            </div>
                        );
                    })}
                    {session.assessments.map((a) => {
                        const done = viewedIds.has(a.id);
                        return (
                            <div
                                key={a.id}
                                onClick={() => onSelectAssessment(session, a)}
                                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-sm transition-all ${activeAssessmentId === a.id ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}
                            >
                                {a.kind === 'quiz' ? (
                                    <ClipboardList
                                        className={`h-3.5 w-3.5 shrink-0 ${activeAssessmentId === a.id ? 'text-white' : 'text-amber-400'}`}
                                    />
                                ) : (
                                    <PenLine
                                        className={`h-3.5 w-3.5 shrink-0 ${activeAssessmentId === a.id ? 'text-white' : 'text-amber-400'}`}
                                    />
                                )}
                                <span
                                    className={`flex-1 truncate ${done ? 'font-normal' : 'font-semibold'}`}
                                >
                                    {a.title}
                                </span>
                                <span
                                    className={`shrink-0 rounded px-1 py-px text-[10px] font-semibold ${activeAssessmentId === a.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}
                                >
                                    {a.kind === 'quiz' ? 'Quiz' : 'Task'}
                                </span>
                            </div>
                        );
                    })}
                    {session.meetings.map((m) => {
                        const meetDate = new Date(m.scheduledAt);
                        const timeStr = meetDate.toLocaleTimeString('en-US', {
                            timeZone: m.timezone,
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                        });
                        const endStr = m.durationMinutes
                            ? new Date(
                                  meetDate.getTime() +
                                      m.durationMinutes * 60000,
                              ).toLocaleTimeString('en-US', {
                                  timeZone: m.timezone,
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                              })
                            : null;
                        const dateStr = meetDate.toLocaleDateString('en-US', {
                            timeZone: m.timezone,
                            month: 'short',
                            day: 'numeric',
                        });
                        return (
                            <a
                                key={m.id}
                                href={m.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-md px-3 py-3 text-sm text-gray-500 transition-all hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Video className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                <span className="flex-1 truncate font-semibold">
                                    {m.title}
                                </span>
                                <span className="shrink-0 rounded bg-emerald-100 px-1 py-px text-[10px] font-semibold text-emerald-600">
                                    {dateStr} · {timeStr}
                                    {endStr ? ` – ${endStr}` : ''}
                                </span>
                            </a>
                        );
                    })}
                    {(session.games ?? []).map((g) => {
                        const meta = GAME_TYPE_META[g.gameType];
                        const completed = !!(
                            g.dbId && completedGames?.has(g.dbId)
                        );
                        const href = g.dbId
                            ? `/games/${g.dbId}/play${completed ? '?view=leaderboard' : ''}`
                            : '#';
                        return (
                            <a
                                key={g.id}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-md px-3 py-3 text-sm text-gray-500 transition-all hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/20"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="shrink-0">{meta.icon}</span>
                                <span
                                    className={`flex-1 truncate ${completed ? 'font-normal' : 'font-semibold'}`}
                                >
                                    {g.title}
                                </span>
                                {completed ? (
                                    <CheckCircle2 className="h-3 w-3 shrink-0 text-violet-500" />
                                ) : (
                                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-violet-100 px-1 py-px text-[10px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                        <Play className="h-2.5 w-2.5" />
                                        Play
                                    </span>
                                )}
                            </a>
                        );
                    })}
                </div>
            )}

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete Session?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        "<strong>{session.title}</strong>" and all its content
                        will be removed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setConfirmDelete(false);
                                onDelete();
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});

// ─── Sidebar Lesson Group (with drag support + inner sort) ────────────────────
interface SidebarLessonGroupProps {
    group: LessonGroup;
    editMode: boolean;
    completedContents?: Set<number>;
    completedGames?: Set<number>;
    activeSessionId: string | null;
    activeContentId: string | null;
    activeAssessmentId: string | null;
    viewedIds: Set<string>;
    onSelectContent: (session: Session, content: ContentItem) => void;
    onSelectAssessment: (session: Session, assessment: Assessment) => void;
    onSelectSession: (session: Session) => void;
    onDelete: () => void;
    onRename: (title: string) => void;
    onAddSession: (title: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onRenameSession: (sessionId: string, title: string) => void;
    onReorderSessions: (newSessions: Session[]) => void;
}
const SidebarLessonGroup = memo(function SidebarLessonGroup({
    group,
    editMode,
    completedContents,
    completedGames,
    activeSessionId,
    activeContentId,
    activeAssessmentId,
    viewedIds,
    onSelectContent,
    onSelectAssessment,
    onSelectSession,
    onDelete,
    onRename,
    onAddSession,
    onDeleteSession,
    onRenameSession,
    onReorderSessions,
}: SidebarLessonGroupProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id, disabled: !editMode });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
    };
    const [open, setOpen] = useState(true);
    const [addingSession, setAddingSession] = useState(false);
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(group.title);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const innerSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const handleInnerDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIdx = group.sessions.findIndex((s) => s.id === active.id);
            const newIdx = group.sessions.findIndex((s) => s.id === over.id);
            if (oldIdx !== -1 && newIdx !== -1)
                onReorderSessions(arrayMove(group.sessions, oldIdx, newIdx));
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/10"
        >
            <div className="group/lg flex items-center gap-2 px-3 py-2">
                {editMode && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="shrink-0 cursor-grab touch-none text-amber-300 hover:text-amber-500 active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                    {open ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    {renaming ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (renameVal.trim()) {
                                    onRename(renameVal.trim());
                                    setRenaming(false);
                                }
                            }}
                            className="flex flex-1 items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Input
                                value={renameVal}
                                onChange={(e) => setRenameVal(e.target.value)}
                                className="h-6 flex-1 text-xs"
                                autoFocus
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="h-6 bg-[#1e3a8a] px-2 text-xs text-white hover:bg-[#1e3a8a]/90"
                            >
                                ✓
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRenaming(false);
                                }}
                            >
                                ✕
                            </Button>
                        </form>
                    ) : (
                        <span className="flex-1 truncate text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {group.title}
                        </span>
                    )}
                </button>
                {editMode && !renaming && (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover/lg:opacity-100">
                        <button
                            className="rounded p-1 text-gray-400 hover:text-blue-600"
                            onClick={() => {
                                setRenaming(true);
                                setRenameVal(group.title);
                            }}
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            className="rounded p-1 text-gray-400 hover:text-red-500"
                            onClick={() => setConfirmDelete(true)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>

            {open && (
                <div className="space-y-0.5 pb-2">
                    <DndContext
                        sensors={innerSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleInnerDragEnd}
                    >
                        <SortableContext
                            items={group.sessions.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {group.sessions.map((session) => (
                                <SidebarSession
                                    key={session.id}
                                    session={session}
                                    editMode={editMode}
                                    indent
                                    completedContents={completedContents}
                                    completedGames={completedGames}
                                    isActive={activeSessionId === session.id}
                                    activeContentId={
                                        activeSessionId === session.id
                                            ? activeContentId
                                            : null
                                    }
                                    activeAssessmentId={
                                        activeSessionId === session.id
                                            ? activeAssessmentId
                                            : null
                                    }
                                    viewedIds={viewedIds}
                                    onSelectContent={onSelectContent}
                                    onSelectAssessment={onSelectAssessment}
                                    onSelectSession={onSelectSession}
                                    onDelete={() => onDeleteSession(session.id)}
                                    onRename={(t) =>
                                        onRenameSession(session.id, t)
                                    }
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {editMode && (
                        <div className="px-3 pt-1">
                            {addingSession ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newSessionTitle.trim()) {
                                            onAddSession(
                                                newSessionTitle.trim(),
                                            );
                                            setNewSessionTitle('');
                                            setAddingSession(false);
                                        }
                                    }}
                                    className="flex items-center gap-1"
                                >
                                    <Input
                                        placeholder="Session title…"
                                        value={newSessionTitle}
                                        onChange={(e) =>
                                            setNewSessionTitle(e.target.value)
                                        }
                                        className="h-7 flex-1 text-xs"
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-7 bg-[#1e3a8a] px-2 text-xs text-white hover:bg-[#1e3a8a]/90"
                                        disabled={!newSessionTitle.trim()}
                                    >
                                        Add
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-1 text-xs"
                                        onClick={() => {
                                            setAddingSession(false);
                                            setNewSessionTitle('');
                                        }}
                                    >
                                        ✕
                                    </Button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setAddingSession(true)}
                                    className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 dark:hover:text-amber-300"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add Session
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete Lesson Group?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        "<strong>{group.title}</strong>" and all its sessions
                        will be removed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setConfirmDelete(false);
                                onDelete();
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});

// ─── Sidebar Module (with DndContext for top-level items) ─────────────────────
interface SidebarModuleProps {
    mod: CourseModule;
    editMode: boolean;
    defaultOpen?: boolean;
    moduleIndex: number;
    completedContents?: Set<number>;
    completedGames?: Set<number>;
    activeSessionId: string | null;
    activeContentId: string | null;
    activeAssessmentId: string | null;
    viewedIds: Set<string>;
    onSelectContent: (session: Session, content: ContentItem) => void;
    onSelectAssessment: (session: Session, assessment: Assessment) => void;
    onSelectSession: (session: Session) => void;
    onDelete: () => void;
    onRename: (title: string) => void;
    onTogglePrerequisite?: (val: boolean) => void;
    isStudent?: boolean;
    onAddItem: (type: 'session' | 'lesson-group', title: string) => void;
    onDeleteItem: (itemId: string) => void;
    onRenameItem: (itemId: string, title: string) => void;
    onReorderItems: (newItems: ModuleItem[]) => void;
    onAddSessionToGroup: (groupId: string, title: string) => void;
    onDeleteSessionInGroup: (groupId: string, sessionId: string) => void;
    onRenameSessionInGroup: (
        groupId: string,
        sessionId: string,
        title: string,
    ) => void;
    onReorderGroupSessions: (groupId: string, newSessions: Session[]) => void;
}
const SidebarModule = memo(function SidebarModule({
    mod,
    editMode,
    defaultOpen = false,
    moduleIndex,
    completedContents,
    completedGames,
    activeSessionId,
    activeContentId,
    activeAssessmentId,
    viewedIds,
    onSelectContent,
    onSelectAssessment,
    onSelectSession,
    onDelete,
    onRename,
    onTogglePrerequisite,
    isStudent = false,
    onAddItem,
    onDeleteItem,
    onRenameItem,
    onReorderItems,
    onAddSessionToGroup,
    onDeleteSessionInGroup,
    onRenameSessionInGroup,
    onReorderGroupSessions,
}: SidebarModuleProps) {
    const [open, setOpen] = useState(defaultOpen);
    const [addType, setAddType] = useState<'session' | 'lesson-group' | null>(
        null,
    );
    const [addTitle, setAddTitle] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(mod.title);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const sessionCount = mod.items.reduce(
        (acc, item) =>
            acc + (item.itemType === 'session' ? 1 : item.sessions.length),
        0,
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIdx = mod.items.findIndex((i) => i.id === active.id);
            const newIdx = mod.items.findIndex((i) => i.id === over.id);
            if (oldIdx !== -1 && newIdx !== -1)
                onReorderItems(arrayMove(mod.items, oldIdx, newIdx));
        }
    };

    const flatSessions = mod.items.filter(
        (i) => i.itemType === 'session',
    ) as Session[];
    const isPrereqLocked = (item: ModuleItem): boolean => {
        if (
            editMode ||
            !isStudent ||
            !mod.prerequisite ||
            item.itemType !== 'session'
        )
            return false;
        const idx = flatSessions.findIndex((s) => s.id === item.id);
        if (idx <= 0) return false;
        const prev = flatSessions[idx - 1];
        if (prev.contents.length === 0) return !viewedIds.has(prev.id);
        return !prev.contents.every(
            (c) => c.dbId != null && completedContents?.has(c.dbId),
        );
    };

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
                <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: PORTAL_GRADIENT }}
                >
                    {moduleIndex + 1}
                </div>
                <div className="min-w-0 flex-1">
                    {renaming ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (renameVal.trim()) {
                                    onRename(renameVal.trim());
                                    setRenaming(false);
                                }
                            }}
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Input
                                value={renameVal}
                                onChange={(e) => setRenameVal(e.target.value)}
                                className="h-6 flex-1 text-xs font-semibold"
                                autoFocus
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="h-6 bg-[#1e3a8a] px-2 text-xs text-white hover:bg-[#1e3a8a]/90"
                            >
                                ✓
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRenaming(false);
                                }}
                            >
                                ✕
                            </Button>
                        </form>
                    ) : (
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {mod.title}
                        </p>
                    )}
                    <p className="text-[11px] text-gray-400">
                        {sessionCount} sessions
                    </p>
                </div>
                {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                )}
            </button>

            {/* Top edit bar: rename */}
            {editMode && !renaming && (
                <div className="flex items-center gap-1 border-t border-gray-100 px-4 py-1.5 dark:border-gray-800">
                    <button
                        className="rounded p-1 text-gray-400 hover:text-blue-600"
                        title="Rename module"
                        onClick={() => {
                            setRenaming(true);
                            setRenameVal(mod.title);
                        }}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Sessions list */}
            {open && (
                <div className="space-y-0.5 border-t border-gray-100 px-2 pt-1.5 pb-2 dark:border-gray-800">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={mod.items.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {mod.items.map((item) => {
                                if (item.itemType === 'lesson-group') {
                                    return (
                                        <SidebarLessonGroup
                                            key={item.id}
                                            group={item}
                                            editMode={editMode}
                                            completedContents={
                                                completedContents
                                            }
                                            completedGames={completedGames}
                                            activeSessionId={activeSessionId}
                                            activeContentId={activeContentId}
                                            activeAssessmentId={
                                                activeAssessmentId
                                            }
                                            viewedIds={viewedIds}
                                            onSelectContent={onSelectContent}
                                            onSelectAssessment={
                                                onSelectAssessment
                                            }
                                            onSelectSession={onSelectSession}
                                            onDelete={() =>
                                                onDeleteItem(item.id)
                                            }
                                            onRename={(t) =>
                                                onRenameItem(item.id, t)
                                            }
                                            onAddSession={(t) =>
                                                onAddSessionToGroup(item.id, t)
                                            }
                                            onDeleteSession={(sid) =>
                                                onDeleteSessionInGroup(
                                                    item.id,
                                                    sid,
                                                )
                                            }
                                            onRenameSession={(sid, t) =>
                                                onRenameSessionInGroup(
                                                    item.id,
                                                    sid,
                                                    t,
                                                )
                                            }
                                            onReorderSessions={(newSessions) =>
                                                onReorderGroupSessions(
                                                    item.id,
                                                    newSessions,
                                                )
                                            }
                                        />
                                    );
                                }
                                return (
                                    <SidebarSession
                                        key={item.id}
                                        session={item}
                                        editMode={editMode}
                                        locked={isPrereqLocked(item)}
                                        completedContents={completedContents}
                                        completedGames={completedGames}
                                        isActive={activeSessionId === item.id}
                                        activeContentId={
                                            activeSessionId === item.id
                                                ? activeContentId
                                                : null
                                        }
                                        activeAssessmentId={
                                            activeSessionId === item.id
                                                ? activeAssessmentId
                                                : null
                                        }
                                        viewedIds={viewedIds}
                                        onSelectContent={onSelectContent}
                                        onSelectAssessment={onSelectAssessment}
                                        onSelectSession={onSelectSession}
                                        onDelete={() => onDeleteItem(item.id)}
                                        onRename={(t) =>
                                            onRenameItem(item.id, t)
                                        }
                                    />
                                );
                            })}
                        </SortableContext>
                    </DndContext>

                    {/* + Session button below sessions list */}
                    {editMode && (
                        <div className="mt-2 border-t border-dashed border-gray-200 pt-2 dark:border-gray-700">
                            {addType === 'session' ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (addTitle.trim()) {
                                            onAddItem(
                                                'session',
                                                addTitle.trim(),
                                            );
                                            setAddTitle('');
                                            setAddType(null);
                                        }
                                    }}
                                    className="flex items-center gap-1 px-1"
                                >
                                    <Input
                                        placeholder="Session title…"
                                        value={addTitle}
                                        onChange={(e) =>
                                            setAddTitle(e.target.value)
                                        }
                                        className="h-7 flex-1 text-xs"
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-7 bg-[#1e3a8a] px-2 text-xs text-white hover:bg-[#1e3a8a]/90"
                                        disabled={!addTitle.trim()}
                                    >
                                        Add
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-1 text-xs"
                                        onClick={() => {
                                            setAddType(null);
                                            setAddTitle('');
                                        }}
                                    >
                                        ✕
                                    </Button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setAddType('session')}
                                    className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[#1e3a8a]/30 px-2.5 py-1.5 text-[11px] font-medium text-[#1e3a8a] transition hover:bg-[#1e3a8a]/5 dark:border-indigo-700 dark:text-indigo-400"
                                >
                                    <Plus className="h-3 w-3" />
                                    Session
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bottom footer: prerequisite toggle (left) + delete (right) */}
            {editMode && !renaming && (
                <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
                    <button
                        onClick={() =>
                            onTogglePrerequisite?.(!mod.prerequisite)
                        }
                        title="When enabled, students must complete each session before accessing the next"
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                            mod.prerequisite
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Layers className="h-3 w-3" />
                        Progressive
                        {mod.prerequisite && (
                            <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-purple-500" />
                        )}
                    </button>
                    <button
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                        title="Delete module"
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete Module?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        "<strong>{mod.title}</strong>" and all its content will
                        be permanently removed.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDelete(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setConfirmDelete(false);
                                onDelete();
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});

const LEVEL_COLORS: Record<string, string> = {
    Beginner:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Intermediate:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const STATUS_COLORS: Record<string, string> = {
    published:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ─── Announcements ────────────────────────────────────────────────────────────

interface AnnouncementAuthor {
    id: number;
    name: string;
}
interface AnnouncementCommentData {
    id: number;
    author: AnnouncementAuthor | null;
    body: string;
    created_at: string;
}
interface AnnouncementData {
    id: number;
    author: AnnouncementAuthor | null;
    body: string;
    created_at: string;
    comments: AnnouncementCommentData[];
}

function acInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function announcementTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Sticky button pinned to the bottom of the curriculum sidebar. Shows the latest
 * announcement as a teaser and a count badge; clicking opens the full feed in the
 * main content panel.
 */
function AnnouncementFooterButton({
    announcements,
    active,
    onOpen,
}: {
    announcements: AnnouncementData[];
    active: boolean;
    onOpen: () => void;
}) {
    const latest = announcements[0];

    return (
        <button
            onClick={onOpen}
            className={`mb-[max(10px,env(safe-area-inset-bottom))] flex w-full shrink-0 items-center gap-2.5 border-t border-gray-200 px-4 py-3 text-left transition-colors dark:border-gray-800 ${
                active
                    ? 'bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50'
            }`}
        >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                    Announcements
                </p>
                {latest ? (
                    <p className="truncate text-xs text-gray-600 dark:text-gray-300">
                        {latest.body}
                    </p>
                ) : (
                    <p className="text-xs text-gray-400">Nothing posted yet</p>
                )}
            </div>
            {announcements.length > 0 && (
                <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {announcements.length}
                </span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
    );
}

/**
 * Full announcement feed rendered in the main content panel. Read + comment for
 * everyone with course access (Google-Classroom style).
 */
function AnnouncementsPanel({
    announcements,
    setAnnouncements,
}: {
    announcements: AnnouncementData[];
    setAnnouncements: Dispatch<SetStateAction<AnnouncementData[]>>;
}) {
    const [drafts, setDrafts] = useState<Record<number, string>>({});

    function submitComment(id: number) {
        const body = drafts[id]?.trim();
        if (!body) return;
        axios
            .post(`/announcements/${id}/comments`, { body })
            .then((r) => {
                setAnnouncements((prev) =>
                    prev.map((a) =>
                        a.id === id
                            ? {
                                  ...a,
                                  comments: [...a.comments, r.data.comment],
                              }
                            : a,
                    ),
                );
                setDrafts((p) => ({ ...p, [id]: '' }));
            })
            .catch(() => {});
    }

    return (
        <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Megaphone className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Announcements
                    </h2>
                    <p className="text-sm text-gray-500">
                        Updates from your instructor
                    </p>
                </div>
            </div>

            {announcements.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                    <Megaphone className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                    <p className="text-sm text-gray-400">
                        No announcements yet.
                    </p>
                </div>
            ) : (
                <div className="w-full space-y-4">
                    {announcements.map((a) => (
                        <div
                            key={a.id}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                        >
                            <div className="flex items-start gap-3 p-4 sm:p-5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                                    {acInitials(a.author?.name ?? '?')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {a.author?.name ?? 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {announcementTime(a.created_at)}
                                        </p>
                                    </div>
                                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                        {a.body}
                                    </p>
                                </div>
                            </div>

                            {a.comments.length > 0 && (
                                <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3.5 sm:px-5 dark:border-gray-800 dark:bg-gray-800/20">
                                    {a.comments.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-start gap-2.5"
                                        >
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[9px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                {acInitials(
                                                    c.author?.name ?? '?',
                                                )}
                                            </div>
                                            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {c.author?.name ??
                                                        'Unknown'}
                                                </span>{' '}
                                                {c.body}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 sm:px-5 dark:border-gray-800">
                                <Input
                                    placeholder="Add a comment…"
                                    value={drafts[a.id] ?? ''}
                                    onChange={(e) =>
                                        setDrafts((p) => ({
                                            ...p,
                                            [a.id]: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            submitComment(a.id);
                                        }
                                    }}
                                    className="h-8 text-xs"
                                />
                                <button
                                    onClick={() => submitComment(a.id)}
                                    disabled={!drafts[a.id]?.trim()}
                                    className="shrink-0 p-1.5 text-blue-600 transition-colors hover:text-blue-700 disabled:text-gray-300"
                                    aria-label="Send comment"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Teacher Course Detail ────────────────────────────────────────────────────
function TeacherCourseDetail({
    slug: _slug,
    isStudent = false,
}: {
    slug: string;
    isStudent?: boolean;
}) {
    const {
        auth,
        courseId,
        courseData,
        modules: initialModules,
        completedContentIds: initialCompletedIds,
        completedGameIds: initialCompletedGameIds,
        mySubmissions: initialSubmissions,
        canEdit: propCanEdit,
        announcements: initialAnnouncements,
    } = usePage<
        {
            courseId?: string;
            courseData?: CourseData;
            modules?: CourseModule[];
            completedContentIds?: number[];
            completedGameIds?: number[];
            mySubmissions?: Record<string, AssignmentSubmission>;
            canEdit?: boolean;
            announcements?: AnnouncementData[];
        } & SharedData
    >().props;
    const [announcements, setAnnouncements] = useState<AnnouncementData[]>(
        initialAnnouncements ?? [],
    );
    const mySubmissions: Record<string, AssignmentSubmission> =
        initialSubmissions ?? {};
    const [course, setCourse] = useState<Course>(() => {
        if (courseData) {
            return {
                id: String(courseData.id),
                slug: String(courseData.id),
                courseTitle: courseData.title,
                description: courseData.description,
                modules: (initialModules as CourseModule[]) ?? [],
            };
        }
        return DUMMY_COURSE;
    });
    const [upload, setUpload] = useState<{
        open: boolean;
        filename: string;
        progress: number;
        status: 'uploading' | 'success' | 'error';
        message?: string;
    } | null>(null);
    const editModeStorageKey = courseId ? `dulatuon:editMode:${courseId}` : null;
    const [editMode, setEditMode] = useState(() => {
        if (typeof window === 'undefined' || !editModeStorageKey) return false;
        return window.localStorage.getItem(editModeStorageKey) === '1';
    });
    const [confirmEditOpen, setConfirmEditOpen] = useState(false);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [wiggleDone, setWiggleDone] = useState(false);
    const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
    // Only allow editing if the server confirmed the user has course_edit permission
    const effectiveEditMode = !isStudent && propCanEdit ? editMode : false;

    // Persist edit mode so reloads keep the editor in edit mode.
    useEffect(() => {
        if (!editModeStorageKey) return;
        if (editMode) {
            window.localStorage.setItem(editModeStorageKey, '1');
        } else {
            window.localStorage.removeItem(editModeStorageKey);
        }
    }, [editMode, editModeStorageKey]);

    // Remind the editor to save: wiggle the Done Editing button every 60s.
    useEffect(() => {
        if (!effectiveEditMode) return;
        const id = window.setInterval(() => {
            setWiggleDone(true);
            window.setTimeout(() => setWiggleDone(false), 750);
            toast('Remember to save your changes', 'info');
        }, 60_000);
        return () => window.clearInterval(id);
    }, [effectiveEditMode]);

    // Warn on browser reload/close while editing.
    useEffect(() => {
        if (!effectiveEditMode) return;
        const onBeforeUnload = (ev: BeforeUnloadEvent) => {
            ev.preventDefault();
            ev.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [effectiveEditMode]);

    // Intercept Inertia navigations while editing → confirm before leaving.
    const allowNavRef = useRef(false);
    useEffect(() => {
        if (!effectiveEditMode) return;
        const remove = router.on('before', (event) => {
            if (allowNavRef.current) {
                allowNavRef.current = false;
                return;
            }
            const visit = event.detail.visit as Record<string, unknown> & {
                method?: string;
                url: { toString(): string };
                only?: unknown[];
                except?: unknown[];
            };
            // Skip prefetches and background/async visits — only intercept real clicks.
            if (visit.async) return;
            if (visit.prefetch) return;
            const method = (visit.method ?? 'get').toString().toLowerCase();
            if (method !== 'get') return;
            if (Array.isArray(visit.only) && visit.only.length > 0) return;
            if (Array.isArray(visit.except) && visit.except.length > 0) return;
            const targetUrl = new URL(
                visit.url.toString(),
                window.location.origin,
            );
            if (targetUrl.pathname === window.location.pathname) return;
            event.preventDefault();
            setPendingNavUrl(targetUrl.pathname + targetUrl.search);
        });
        return () => remove();
    }, [effectiveEditMode]);

    const [addingModule, setAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [activeContent, setActiveContent] = useState<ContentItem | null>(
        null,
    );
    const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(
        null,
    );
    const [showAnnouncements, setShowAnnouncements] = useState(() => {
        if (typeof window === 'undefined') return false;
        return (
            new URLSearchParams(window.location.search).get('view') ===
            'announcements'
        );
    });
    const [mobilePanel, setMobilePanel] = useState<'curriculum' | 'content'>(
        () => {
            if (
                typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('view') ===
                    'announcements'
            )
                return 'content';
            return 'curriculum';
        },
    );
    const [quizResults, setQuizResults] = useState<
        Record<string, QuizSavedState>
    >({});
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
    const markViewed = useCallback(
        (id: string) => setViewedIds((prev) => new Set([...prev, id])),
        [],
    );

    const [completedContents, setCompletedContents] = useState<Set<number>>(
        new Set(initialCompletedIds ?? []),
    );
    const completedGames = useMemo(
        () => new Set(initialCompletedGameIds ?? []),
        [initialCompletedGameIds],
    );
    const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
    const [confirmDoneContent, setConfirmDoneContent] =
        useState<ContentItem | null>(null);
    const [markingDone, setMarkingDone] = useState(false);

    const openMarkDoneConfirm = (content: ContentItem) => {
        if (!content.dbId || !isStudent) return;
        if (completedContents.has(content.dbId)) return;
        setConfirmDoneContent(content);
        setConfirmDoneOpen(true);
    };

    const confirmMarkDone = async () => {
        if (!confirmDoneContent?.dbId || !courseId) return;
        setMarkingDone(true);
        try {
            await capi(
                'POST',
                `/my-progress/${courseId}/contents/${confirmDoneContent.dbId}/complete`,
            );
            setCompletedContents(
                (prev) => new Set([...prev, confirmDoneContent.dbId!]),
            );
            const doneIdx = navLessons.findIndex(
                (n) => n.key === confirmDoneContent.id,
            );
            const next =
                doneIdx >= 0 && doneIdx < navLessons.length - 1
                    ? navLessons[doneIdx + 1]
                    : null;
            setConfirmDoneOpen(false);
            setConfirmDoneContent(null);
            if (next) {
                goToNav(next);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setMarkingDone(false);
        }
    };

    const markContentDone = (content: ContentItem) =>
        openMarkDoneConfirm(content);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: isStudent ? 'My Course' : 'My Class', href: '/my-course' },
    ];

    // Keep the local feed in sync if the page is re-served with new data.
    useEffect(() => {
        setAnnouncements(initialAnnouncements ?? []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    // Live announcement feed — refetch when another participant posts/comments.
    useEffect(() => {
        if (!window.Echo || !courseId) return;
        const channel = window.Echo.private(`course.${courseId}`);
        const handler = (e: { triggered_by: number }) => {
            if (e.triggered_by === auth.user?.id) return;
            axios
                .get(`/courses/${courseId}/announcements`)
                .then((r) => setAnnouncements(r.data))
                .catch(() => {});
        };
        channel.listen('.AnnouncementUpdated', handler);
        return () => {
            channel.stopListening('.AnnouncementUpdated', handler);
            window.Echo.leave(`course.${courseId}`);
        };
    }, [courseId, auth.user?.id]);

    // Live session from current course state (avoids stale closure)
    const liveActiveSession = useMemo(() => {
        if (!activeSession) return null;
        for (const mod of course.modules) {
            for (const item of mod.items) {
                if (item.itemType === 'session' && item.id === activeSession.id)
                    return item;
                if (item.itemType === 'lesson-group') {
                    const s = item.sessions.find(
                        (s) => s.id === activeSession.id,
                    );
                    if (s) return s;
                }
            }
        }
        return null;
    }, [activeSession, course]);

    const handleSelectContent = useCallback(
        (session: Session, content: ContentItem) => {
            setShowAnnouncements(false);
            setActiveSession(session);
            setActiveContent(content);
            setActiveAssessment(null);
            setMobilePanel('content');
            markViewed(content.id);
        },
        [markViewed],
    );
    const handleSelectAssessment = useCallback(
        (session: Session, assessment: Assessment) => {
            setShowAnnouncements(false);
            setActiveSession(session);
            setActiveAssessment(assessment);
            setActiveContent(null);
            setMobilePanel('content');
            markViewed(assessment.id);
        },
        [markViewed],
    );
    const handleSelectSession = useCallback(
        (session: Session) => {
            setShowAnnouncements(false);
            setActiveSession(session);
            if (!effectiveEditMode) {
                if (session.contents.length > 0) {
                    setActiveContent(session.contents[0]);
                    setActiveAssessment(null);
                    markViewed(session.contents[0].id);
                } else if (session.assessments.length > 0) {
                    setActiveAssessment(session.assessments[0]);
                    setActiveContent(null);
                    markViewed(session.assessments[0].id);
                } else {
                    setActiveContent(null);
                    setActiveAssessment(null);
                    markViewed(session.id);
                }
            } else {
                setActiveContent(null);
                setActiveAssessment(null);
            }
            setMobilePanel('content');
        },
        [effectiveEditMode, markViewed],
    );

    // ── Linear lesson navigation (prev / next across the whole curriculum) ──────
    type NavLesson = {
        key: string;
        session: Session;
        kind: 'content' | 'assessment';
        content?: ContentItem;
        assessment?: Assessment;
        title: string;
    };
    const navLessons = useMemo<NavLesson[]>(() => {
        const out: NavLesson[] = [];
        for (const mod of course.modules) {
            const sessions: Session[] = [];
            for (const item of mod.items) {
                if (item.itemType === 'session') sessions.push(item);
                else sessions.push(...item.sessions);
            }
            for (const session of sessions) {
                for (const c of session.contents)
                    out.push({
                        key: c.id,
                        session,
                        kind: 'content',
                        content: c,
                        title: c.title,
                    });
                for (const a of session.assessments)
                    out.push({
                        key: a.id,
                        session,
                        kind: 'assessment',
                        assessment: a,
                        title: a.title,
                    });
            }
        }
        return out;
    }, [course, isStudent]);

    const goToNav = useCallback(
        (n: NavLesson) => {
            if (n.kind === 'content' && n.content) {
                handleSelectContent(n.session, n.content);
            } else if (n.kind === 'assessment' && n.assessment) {
                handleSelectAssessment(n.session, n.assessment);
            }
        },
        [handleSelectContent, handleSelectAssessment],
    );

    const currentNavKey = activeContent?.id ?? activeAssessment?.id ?? null;
    const currentNavIndex = currentNavKey
        ? navLessons.findIndex((n) => n.key === currentNavKey)
        : -1;
    const prevNav =
        currentNavIndex > 0 ? navLessons[currentNavIndex - 1] : null;
    const nextNav =
        currentNavIndex >= 0 && currentNavIndex < navLessons.length - 1
            ? navLessons[currentNavIndex + 1]
            : null;

    // ── Universal session helpers ──────────────────────────────────────────────
    const updateSessionById = (
        sessionId: string,
        fn: (s: Session) => Session,
    ) => {
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((mod) => ({
                ...mod,
                items: mod.items.map((item) => {
                    if (item.itemType === 'session' && item.id === sessionId)
                        return fn(item);
                    if (item.itemType === 'lesson-group')
                        return {
                            ...item,
                            sessions: item.sessions.map((s) =>
                                s.id === sessionId ? fn(s) : s,
                            ),
                        };
                    return item;
                }),
            })),
        }));
    };

    const findSessionById = (sessionId: string): Session | null => {
        for (const mod of course.modules) {
            for (const item of mod.items) {
                if (item.itemType === 'session' && item.id === sessionId)
                    return item;
                if (item.itemType === 'lesson-group') {
                    const s = item.sessions.find((s) => s.id === sessionId);
                    if (s) return s;
                }
            }
        }
        return null;
    };

    // ── Module CRUD ────────────────────────────────────────────────────────────
    const deleteModule = (mid: string) => {
        const mod = course.modules.find((m) => m.id === mid);
        setCourse((c) => ({
            ...c,
            modules: c.modules.filter((m) => m.id !== mid),
        }));
        if (mod?.dbId && courseId)
            capi('DELETE', `/curriculum/${courseId}/modules/${mod.dbId}`).catch(
                console.error,
            );
    };
    const renameModule = (mid: string, title: string) => {
        const mod = course.modules.find((m) => m.id === mid);
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) => (m.id === mid ? { ...m, title } : m)),
        }));
        if (mod?.dbId && courseId)
            capi('PUT', `/curriculum/${courseId}/modules/${mod.dbId}`, {
                title,
            }).catch(console.error);
    };
    const addModule = async () => {
        if (!newModuleTitle.trim() || !courseId) return;
        const title = newModuleTitle.trim();
        setNewModuleTitle('');
        setAddingModule(false);
        try {
            const created = await capi<CourseModule>(
                'POST',
                `/curriculum/${courseId}/modules`,
                { title },
            );
            setCourse((c) => ({
                ...c,
                modules: [...c.modules, { ...created, items: [] }],
            }));
        } catch (e) {
            console.error(e);
        }
    };

    const togglePrerequisite = (moduleId: string, val: boolean) => {
        const mod = course.modules.find((m) => m.id === moduleId);
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id === moduleId ? { ...m, prerequisite: val } : m,
            ),
        }));
        if (mod?.dbId && courseId) {
            capi(
                'PATCH',
                `/curriculum/${courseId}/modules/${mod.dbId}/prerequisite`,
                { prerequisite: val },
            ).catch(console.error);
        }
    };

    const addItem = async (
        moduleId: string,
        type: 'session' | 'lesson-group',
        title: string,
    ) => {
        const mod = course.modules.find((m) => m.id === moduleId);
        if (!mod?.dbId || !courseId) return;
        try {
            if (type === 'session') {
                const created = await capi<Session>(
                    'POST',
                    `/curriculum/${courseId}/modules/${mod.dbId}/sessions`,
                    { title },
                );
                setCourse((c) => ({
                    ...c,
                    modules: c.modules.map((m) =>
                        m.id !== moduleId
                            ? m
                            : { ...m, items: [...m.items, created] },
                    ),
                }));
            } else {
                const created = await capi<LessonGroup>(
                    'POST',
                    `/curriculum/${courseId}/modules/${mod.dbId}/lesson-groups`,
                    { title },
                );
                setCourse((c) => ({
                    ...c,
                    modules: c.modules.map((m) =>
                        m.id !== moduleId
                            ? m
                            : { ...m, items: [...m.items, created] },
                    ),
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };
    const deleteItem = (moduleId: string, itemId: string) => {
        const item = course.modules
            .find((m) => m.id === moduleId)
            ?.items.find((i) => i.id === itemId);
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id === moduleId
                    ? { ...m, items: m.items.filter((i) => i.id !== itemId) }
                    : m,
            ),
        }));
        if (!item || !courseId) return;
        if (item.itemType === 'session' && item.dbId)
            capi(
                'DELETE',
                `/curriculum/${courseId}/sessions/${item.dbId}`,
            ).catch(console.error);
        else if (item.itemType === 'lesson-group' && item.dbId)
            capi(
                'DELETE',
                `/curriculum/${courseId}/lesson-groups/${item.dbId}`,
            ).catch(console.error);
    };
    const renameItem = (moduleId: string, itemId: string, title: string) => {
        const item = course.modules
            .find((m) => m.id === moduleId)
            ?.items.find((i) => i.id === itemId);
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id !== moduleId
                    ? m
                    : {
                          ...m,
                          items: m.items.map((i) =>
                              i.id === itemId ? { ...i, title } : i,
                          ),
                      },
            ),
        }));
        if (!item || !courseId) return;
        if (item.itemType === 'session' && item.dbId)
            capi('PUT', `/curriculum/${courseId}/sessions/${item.dbId}`, {
                title,
            }).catch(console.error);
        else if (item.itemType === 'lesson-group' && item.dbId)
            capi('PUT', `/curriculum/${courseId}/lesson-groups/${item.dbId}`, {
                title,
            }).catch(console.error);
    };
    const reorderItems = (moduleId: string, newItems: ModuleItem[]) => {
        const mod = course.modules.find((m) => m.id === moduleId);
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id === moduleId ? { ...m, items: newItems } : m,
            ),
        }));
        if (!mod?.dbId || !courseId) return;
        capi('PUT', `/curriculum/${courseId}/modules/${mod.dbId}/reorder`, {
            items: newItems
                .filter((i) => i.dbId)
                .map((i, idx) => ({
                    id: i.dbId,
                    type: i.itemType,
                    order: idx,
                })),
        }).catch(console.error);
    };

    // ── Lesson group session CRUD ──────────────────────────────────────────────
    const addSessionToGroup = async (
        moduleId: string,
        groupId: string,
        title: string,
    ) => {
        const group = course.modules
            .find((m) => m.id === moduleId)
            ?.items.find((i) => i.id === groupId);
        if (
            !group ||
            group.itemType !== 'lesson-group' ||
            !group.dbId ||
            !courseId
        )
            return;
        try {
            const created = await capi<Session>(
                'POST',
                `/curriculum/${courseId}/lesson-groups/${group.dbId}/sessions`,
                { title },
            );
            setCourse((c) => ({
                ...c,
                modules: c.modules.map((m) =>
                    m.id !== moduleId
                        ? m
                        : {
                              ...m,
                              items: m.items.map((i) =>
                                  i.id === groupId &&
                                  i.itemType === 'lesson-group'
                                      ? {
                                            ...i,
                                            sessions: [...i.sessions, created],
                                        }
                                      : i,
                              ),
                          },
                ),
            }));
        } catch (e) {
            console.error(e);
        }
    };
    const deleteSessionInGroup = (
        moduleId: string,
        groupId: string,
        sessionId: string,
    ) => {
        const group = course.modules
            .find((m) => m.id === moduleId)
            ?.items.find((i) => i.id === groupId);
        const sess =
            group?.itemType === 'lesson-group'
                ? group.sessions.find((s) => s.id === sessionId)
                : undefined;
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id !== moduleId
                    ? m
                    : {
                          ...m,
                          items: m.items.map((i) =>
                              i.id === groupId && i.itemType === 'lesson-group'
                                  ? {
                                        ...i,
                                        sessions: i.sessions.filter(
                                            (s) => s.id !== sessionId,
                                        ),
                                    }
                                  : i,
                          ),
                      },
            ),
        }));
        if (sess?.dbId && courseId)
            capi(
                'DELETE',
                `/curriculum/${courseId}/sessions/${sess.dbId}`,
            ).catch(console.error);
    };
    const renameSessionInGroup = (
        moduleId: string,
        groupId: string,
        sessionId: string,
        title: string,
    ) => {
        const group = course.modules
            .find((m) => m.id === moduleId)
            ?.items.find((i) => i.id === groupId);
        const sess =
            group?.itemType === 'lesson-group'
                ? group.sessions.find((s) => s.id === sessionId)
                : undefined;
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id !== moduleId
                    ? m
                    : {
                          ...m,
                          items: m.items.map((i) =>
                              i.id === groupId && i.itemType === 'lesson-group'
                                  ? {
                                        ...i,
                                        sessions: i.sessions.map((s) =>
                                            s.id === sessionId
                                                ? { ...s, title }
                                                : s,
                                        ),
                                    }
                                  : i,
                          ),
                      },
            ),
        }));
        if (sess?.dbId && courseId)
            capi('PUT', `/curriculum/${courseId}/sessions/${sess.dbId}`, {
                title,
            }).catch(console.error);
    };
    const reorderGroupSessions = (
        moduleId: string,
        groupId: string,
        newSessions: Session[],
    ) => {
        const group = course.modules
            .find((m) => m.id === moduleId)
            ?.items.find((i) => i.id === groupId);
        setCourse((c) => ({
            ...c,
            modules: c.modules.map((m) =>
                m.id !== moduleId
                    ? m
                    : {
                          ...m,
                          items: m.items.map((i) =>
                              i.id === groupId && i.itemType === 'lesson-group'
                                  ? { ...i, sessions: newSessions }
                                  : i,
                          ),
                      },
            ),
        }));
        if (group?.itemType !== 'lesson-group' || !group.dbId || !courseId)
            return;
        capi(
            'PUT',
            `/curriculum/${courseId}/lesson-groups/${group.dbId}/reorder`,
            {
                sessions: newSessions
                    .filter((s) => s.dbId)
                    .map((s, idx) => ({ id: s.dbId, order: idx })),
            },
        ).catch(console.error);
    };

    // ── Content CRUD ───────────────────────────────────────────────────────────
    const addContent = async (sessionId: string, content: ContentItem) => {
        const sess = findSessionById(sessionId);
        if (!sess?.dbId || !courseId) {
            updateSessionById(sessionId, (s) => ({
                ...s,
                contents: [...s.contents, content],
            }));
            return;
        }
        try {
            let created: ContentItem;
            if (content.file) {
                const fd = new FormData();
                fd.append('type', content.type);
                fd.append('title', content.title);
                if (content.description)
                    fd.append('description', content.description);
                fd.append('file', content.file);
                const filename = content.file.name;
                setUpload({
                    open: true,
                    filename,
                    progress: 0,
                    status: 'uploading',
                });
                created = await capiFormProgress<ContentItem>(
                    `/curriculum/${courseId}/sessions/${sess.dbId}/content`,
                    fd,
                    (p) => setUpload((u) => (u ? { ...u, progress: p } : u)),
                );
                setUpload({
                    open: true,
                    filename,
                    progress: 100,
                    status: 'success',
                    message: `"${content.title}" uploaded successfully.`,
                });
                toast(`"${content.title}" uploaded successfully`, 'success');
                setTimeout(
                    () =>
                        setUpload((u) =>
                            u && u.status === 'success' ? null : u,
                        ),
                    1800,
                );
            } else {
                created = await capi<ContentItem>(
                    'POST',
                    `/curriculum/${courseId}/sessions/${sess.dbId}/content`,
                    {
                        type: content.type,
                        title: content.title,
                        description: content.description,
                        url: content.url,
                    },
                );
            }
            updateSessionById(sessionId, (s) => ({
                ...s,
                contents: [...s.contents, created],
            }));
        } catch (e) {
            console.error(e);
            if (content.file) {
                setUpload((u) =>
                    u
                        ? {
                              ...u,
                              status: 'error',
                              message: (e as Error).message,
                          }
                        : u,
                );
                toast(`Upload failed: ${(e as Error).message}`, 'error');
            }
        }
    };
    const updateContent = async (sessionId: string, content: ContentItem) => {
        updateSessionById(sessionId, (s) => ({
            ...s,
            contents: s.contents.map((c) =>
                c.id === content.id ? content : c,
            ),
        }));
        if (!content.dbId || !courseId) return;
        try {
            if (content.file) {
                const fd = new FormData();
                fd.append('_method', 'PUT');
                fd.append('title', content.title);
                if (content.description)
                    fd.append('description', content.description);
                fd.append('file', content.file);
                const filename = content.file.name;
                setUpload({
                    open: true,
                    filename,
                    progress: 0,
                    status: 'uploading',
                });
                const updated = await capiFormProgress<ContentItem>(
                    `/curriculum/${courseId}/content/${content.dbId}`,
                    fd,
                    (p) => setUpload((u) => (u ? { ...u, progress: p } : u)),
                );
                updateSessionById(sessionId, (s) => ({
                    ...s,
                    contents: s.contents.map((c) =>
                        c.id === content.id
                            ? { ...updated, id: content.id }
                            : c,
                    ),
                }));
                setUpload({
                    open: true,
                    filename,
                    progress: 100,
                    status: 'success',
                    message: `"${content.title}" uploaded successfully.`,
                });
                toast(`"${content.title}" uploaded successfully`, 'success');
                setTimeout(
                    () =>
                        setUpload((u) =>
                            u && u.status === 'success' ? null : u,
                        ),
                    1800,
                );
            } else {
                capi('PUT', `/curriculum/${courseId}/content/${content.dbId}`, {
                    title: content.title,
                    description: content.description,
                    url: content.url,
                }).catch(console.error);
            }
        } catch (e) {
            console.error(e);
            if (content.file) {
                setUpload((u) =>
                    u
                        ? {
                              ...u,
                              status: 'error',
                              message: (e as Error).message,
                          }
                        : u,
                );
                toast(`Upload failed: ${(e as Error).message}`, 'error');
            }
        }
    };
    const deleteContent = (sessionId: string, contentId: string) => {
        const item = findSessionById(sessionId)?.contents.find(
            (c) => c.id === contentId,
        );
        updateSessionById(sessionId, (s) => ({
            ...s,
            contents: s.contents.filter((c) => c.id !== contentId),
        }));
        if (activeContent?.id === contentId) setActiveContent(null);
        if (item?.dbId && courseId)
            capi(
                'DELETE',
                `/curriculum/${courseId}/content/${item.dbId}`,
            ).catch(console.error);
    };

    // ── Assessment CRUD ────────────────────────────────────────────────────────
    const addAssessment = async (sessionId: string, assessment: Assessment) => {
        const sess = findSessionById(sessionId);
        if (!sess?.dbId || !courseId) {
            updateSessionById(sessionId, (s) => ({
                ...s,
                assessments: [...s.assessments, assessment],
            }));
            return;
        }
        try {
            let created: Assessment;
            if (assessment.kind === 'quiz') {
                created = await capi<Assessment>(
                    'POST',
                    `/curriculum/${courseId}/sessions/${sess.dbId}/quizzes`,
                    {
                        title: assessment.title,
                        description: assessment.description,
                        questions: assessment.questions.map((q) => ({
                            question: q.question,
                            options: q.options,
                            correctIndex: q.correctIndex,
                        })),
                    },
                );
            } else {
                created = await capi<Assessment>(
                    'POST',
                    `/curriculum/${courseId}/sessions/${sess.dbId}/assignments`,
                    {
                        title: assessment.title,
                        instructions: assessment.instructions,
                        dueDate: assessment.dueDate,
                        maxScore: assessment.maxScore,
                    },
                );
            }
            updateSessionById(sessionId, (s) => ({
                ...s,
                assessments: [...s.assessments, created],
            }));
        } catch (e) {
            console.error(e);
        }
    };
    const updateAssessment = (sessionId: string, assessment: Assessment) => {
        updateSessionById(sessionId, (s) => ({
            ...s,
            assessments: s.assessments.map((a) =>
                a.id === assessment.id ? assessment : a,
            ),
        }));
        if (!assessment.dbId || !courseId) return;
        if (assessment.kind === 'quiz') {
            capi('PUT', `/curriculum/${courseId}/quizzes/${assessment.dbId}`, {
                title: assessment.title,
                description: assessment.description,
                questions: assessment.questions.map((q) => ({
                    question: q.question,
                    options: q.options,
                    correctIndex: q.correctIndex,
                })),
            }).catch(console.error);
        } else {
            capi(
                'PUT',
                `/curriculum/${courseId}/assignments/${assessment.dbId}`,
                {
                    title: assessment.title,
                    instructions: assessment.instructions,
                    dueDate: assessment.dueDate,
                    maxScore: assessment.maxScore,
                },
            ).catch(console.error);
        }
    };
    const deleteAssessment = (sessionId: string, assessmentId: string) => {
        const item = findSessionById(sessionId)?.assessments.find(
            (a) => a.id === assessmentId,
        );
        updateSessionById(sessionId, (s) => ({
            ...s,
            assessments: s.assessments.filter((a) => a.id !== assessmentId),
        }));
        if (activeAssessment?.id === assessmentId) setActiveAssessment(null);
        if (!item?.dbId || !courseId) return;
        if (item.kind === 'quiz')
            capi(
                'DELETE',
                `/curriculum/${courseId}/quizzes/${item.dbId}`,
            ).catch(console.error);
        else
            capi(
                'DELETE',
                `/curriculum/${courseId}/assignments/${item.dbId}`,
            ).catch(console.error);
    };

    // ── Meeting CRUD ───────────────────────────────────────────────────────────
    const addMeeting = async (sessionId: string, meeting: Meeting) => {
        const sess = findSessionById(sessionId);
        if (!sess?.dbId || !courseId) {
            updateSessionById(sessionId, (s) => ({
                ...s,
                meetings: [...s.meetings, meeting],
            }));
            return;
        }
        try {
            const created = await capi<Meeting>(
                'POST',
                `/curriculum/${courseId}/sessions/${sess.dbId}/meetings`,
                {
                    title: meeting.title,
                    description: meeting.description,
                    meetLink: meeting.meetLink,
                    scheduledAt: meeting.scheduledAt,
                    timezone: meeting.timezone,
                    durationMinutes: meeting.durationMinutes,
                },
            );
            updateSessionById(sessionId, (s) => ({
                ...s,
                meetings: [...s.meetings, created],
            }));
        } catch (e) {
            console.error(e);
        }
    };
    const updateMeeting = (sessionId: string, meeting: Meeting) => {
        updateSessionById(sessionId, (s) => ({
            ...s,
            meetings: s.meetings.map((m) =>
                m.id === meeting.id ? meeting : m,
            ),
        }));
        if (!meeting.dbId || !courseId) return;
        capi('PUT', `/curriculum/${courseId}/meetings/${meeting.dbId}`, {
            title: meeting.title,
            description: meeting.description,
            meetLink: meeting.meetLink,
            scheduledAt: meeting.scheduledAt,
            timezone: meeting.timezone,
            durationMinutes: meeting.durationMinutes,
        }).catch(console.error);
    };
    const deleteMeeting = (sessionId: string, meetingId: string) => {
        const item = findSessionById(sessionId)?.meetings.find(
            (m) => m.id === meetingId,
        );
        updateSessionById(sessionId, (s) => ({
            ...s,
            meetings: s.meetings.filter((m) => m.id !== meetingId),
        }));
        if (item?.dbId && courseId)
            capi(
                'DELETE',
                `/curriculum/${courseId}/meetings/${item.dbId}`,
            ).catch(console.error);
    };

    // ── Game CRUD ──────────────────────────────────────────────────────────────
    const gamePayload = (g: Game) => ({
        title: g.title,
        description: g.description,
        gameType: g.gameType,
        points: g.points,
        lives: g.lives,
        items: g.items,
    });
    const addGame = async (sessionId: string, game: Game) => {
        const sess = findSessionById(sessionId);
        if (!sess?.dbId || !courseId) {
            updateSessionById(sessionId, (s) => ({
                ...s,
                games: [...(s.games ?? []), game],
            }));
            toast(`"${game.title}" added`, 'success');
            return;
        }
        try {
            const created = await capi<Game>(
                'POST',
                `/curriculum/${courseId}/sessions/${sess.dbId}/games`,
                gamePayload(game),
            );
            updateSessionById(sessionId, (s) => ({
                ...s,
                games: [...(s.games ?? []), created],
            }));
            toast(`"${game.title}" added`, 'success');
        } catch (e) {
            console.error(e);
            toast('Failed to add game. Please try again.', 'error');
        }
    };
    const updateGame = (sessionId: string, game: Game) => {
        updateSessionById(sessionId, (s) => ({
            ...s,
            games: (s.games ?? []).map((g) => (g.id === game.id ? game : g)),
        }));
        if (!game.dbId || !courseId) {
            toast(`"${game.title}" saved`, 'success');
            return;
        }
        capi(
            'PUT',
            `/curriculum/${courseId}/games/${game.dbId}`,
            gamePayload(game),
        )
            .then(() => toast(`"${game.title}" saved`, 'success'))
            .catch((e) => {
                console.error(e);
                toast('Failed to save game. Please try again.', 'error');
            });
    };
    const deleteGame = (sessionId: string, gameId: string) => {
        const item = (findSessionById(sessionId)?.games ?? []).find(
            (g) => g.id === gameId,
        );
        updateSessionById(sessionId, (s) => ({
            ...s,
            games: (s.games ?? []).filter((g) => g.id !== gameId),
        }));
        if (item?.dbId && courseId)
            capi('DELETE', `/curriculum/${courseId}/games/${item.dbId}`).catch(
                console.error,
            );
    };

    const totalSessions = course.modules.reduce(
        (acc, m) =>
            acc +
            m.items.reduce(
                (a, i) =>
                    a + (i.itemType === 'session' ? 1 : i.sessions.length),
                0,
            ),
        0,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={`${course.courseTitle} — ${isStudent ? 'My Course' : 'My Class'}`}
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="shrink-0 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                    {/* Title row */}
                    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
                        <Link href="/my-course">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 shrink-0 p-0 text-gray-500 hover:text-[#1e3a8a] sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 dark:text-gray-400"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    {isStudent ? 'My Course' : 'My Class'}
                                </span>
                            </Button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-sm font-bold text-gray-900 sm:text-base dark:text-white">
                                {course.courseTitle}
                            </h1>
                        </div>
                        {!isStudent &&
                            propCanEdit &&
                            (effectiveEditMode ? (
                                <Button
                                    size="sm"
                                    className={`h-8 shrink-0 gap-1.5 bg-teal-600 text-xs text-white hover:bg-teal-700 sm:text-sm ${wiggleDone ? 'animate-wiggle' : ''}`}
                                    onClick={() => setConfirmSaveOpen(true)}
                                >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        Done Editing
                                    </span>
                                    <span className="sm:hidden">Done</span>
                                </Button>
                            ) : (
                                <button
                                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#1e3a8a] transition hover:opacity-80 sm:text-sm"
                                    style={{
                                        background: `linear-gradient(white, white) padding-box, ${PORTAL_GRADIENT} border-box`,
                                        border: '1.5px solid transparent',
                                    }}
                                    onClick={() => setConfirmEditOpen(true)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        Edit Course
                                    </span>
                                </button>
                            ))}
                    </div>

                    {/* Edit mode banner */}
                    {effectiveEditMode && (
                        <div className="flex items-center gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                            <span className="text-[10px] font-bold tracking-widest text-amber-700 uppercase dark:text-amber-400">
                                Editing Mode
                            </span>
                            <span className="text-amber-300 dark:text-amber-700">
                                ·
                            </span>
                            <span className="hidden text-xs text-amber-600 sm:inline dark:text-amber-500">
                                Drag sessions to reorder · Click a session to
                                manage its content
                            </span>
                        </div>
                    )}

                    {/* Mobile tab toggle — always visible on mobile */}
                    <div className="flex border-t border-gray-100 md:hidden dark:border-gray-800">
                        <button
                            onClick={() => setMobilePanel('curriculum')}
                            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-semibold transition-all ${mobilePanel === 'curriculum' ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-indigo-300' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            Curriculum
                        </button>
                        <button
                            onClick={() => setMobilePanel('content')}
                            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-semibold transition-all ${mobilePanel === 'content' ? 'border-[#1e3a8a] text-[#1e3a8a] dark:text-indigo-300' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            <Play className="h-3.5 w-3.5" />
                            Content
                        </button>
                        {effectiveEditMode && (
                            <button
                                onClick={() => setMobilePanel('curriculum')}
                                className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-400 hover:text-blue-600"
                            >
                                <GripVertical className="h-3.5 w-3.5" />
                                Reorder
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Sidebar — footer is pinned as a flex child; only the module list scrolls so it can't be clipped */}
                    <aside
                        className={`min-h-0 overflow-hidden border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 ${mobilePanel === 'curriculum' ? 'flex' : 'hidden'} w-full md:flex md:w-80 md:shrink-0`}
                    >
                        <div className="flex min-h-0 w-full flex-1 flex-col">
                            {/* Overview button */}
                            <div className="shrink-0 px-3 pt-3 pb-2">
                                <button
                                    onClick={() => {
                                        setShowAnnouncements(false);
                                        setActiveSession(null);
                                        setActiveContent(null);
                                        setActiveAssessment(null);
                                        setMobilePanel('content');
                                    }}
                                    className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                                        !activeSession &&
                                        !activeContent &&
                                        !activeAssessment
                                            ? 'text-white shadow-sm'
                                            : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                                    }`}
                                    style={
                                        !activeSession &&
                                        !activeContent &&
                                        !activeAssessment
                                            ? { background: PORTAL_GRADIENT }
                                            : undefined
                                    }
                                >
                                    <div
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                            !activeSession &&
                                            !activeContent &&
                                            !activeAssessment
                                                ? 'bg-white/20'
                                                : 'bg-gray-100 dark:bg-gray-800'
                                        }`}
                                    >
                                        <Info className="h-4 w-4" />
                                    </div>
                                    <span>Course Overview</span>
                                </button>
                            </div>

                            <div className="flex shrink-0 items-center justify-between px-4 py-2">
                                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                    Curriculum
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                    <span>{course.modules.length} modules</span>
                                    <span>·</span>
                                    <span>{totalSessions} sessions</span>
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6">
                                {course.modules.map((mod, idx) => {
                                    return (
                                        <SidebarModule
                                            key={mod.id}
                                            mod={mod}
                                            editMode={effectiveEditMode}
                                            defaultOpen={idx === 0}
                                            moduleIndex={idx}
                                            viewedIds={viewedIds}
                                            completedContents={
                                                completedContents
                                            }
                                            completedGames={completedGames}
                                            activeSessionId={
                                                activeSession?.id ?? null
                                            }
                                            activeContentId={
                                                activeContent?.id ?? null
                                            }
                                            activeAssessmentId={
                                                activeAssessment?.id ?? null
                                            }
                                            onSelectContent={
                                                handleSelectContent
                                            }
                                            onSelectAssessment={
                                                handleSelectAssessment
                                            }
                                            onSelectSession={
                                                handleSelectSession
                                            }
                                            onDelete={() =>
                                                deleteModule(mod.id)
                                            }
                                            onRename={(t) =>
                                                renameModule(mod.id, t)
                                            }
                                            onTogglePrerequisite={(val) =>
                                                togglePrerequisite(mod.id, val)
                                            }
                                            isStudent={isStudent}
                                            onAddItem={(type, title) =>
                                                addItem(mod.id, type, title)
                                            }
                                            onDeleteItem={(itemId) =>
                                                deleteItem(mod.id, itemId)
                                            }
                                            onRenameItem={(itemId, title) =>
                                                renameItem(
                                                    mod.id,
                                                    itemId,
                                                    title,
                                                )
                                            }
                                            onReorderItems={(newItems) =>
                                                reorderItems(mod.id, newItems)
                                            }
                                            onAddSessionToGroup={(
                                                groupId,
                                                title,
                                            ) =>
                                                addSessionToGroup(
                                                    mod.id,
                                                    groupId,
                                                    title,
                                                )
                                            }
                                            onDeleteSessionInGroup={(
                                                groupId,
                                                sessionId,
                                            ) =>
                                                deleteSessionInGroup(
                                                    mod.id,
                                                    groupId,
                                                    sessionId,
                                                )
                                            }
                                            onRenameSessionInGroup={(
                                                groupId,
                                                sessionId,
                                                title,
                                            ) =>
                                                renameSessionInGroup(
                                                    mod.id,
                                                    groupId,
                                                    sessionId,
                                                    title,
                                                )
                                            }
                                            onReorderGroupSessions={(
                                                groupId,
                                                newSessions,
                                            ) =>
                                                reorderGroupSessions(
                                                    mod.id,
                                                    groupId,
                                                    newSessions,
                                                )
                                            }
                                        />
                                    );
                                })}

                                {effectiveEditMode && (
                                    <div className="pt-1">
                                        {addingModule ? (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    addModule();
                                                }}
                                                className="flex items-center gap-1.5"
                                            >
                                                <Input
                                                    placeholder="New module title…"
                                                    value={newModuleTitle}
                                                    onChange={(e) =>
                                                        setNewModuleTitle(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 flex-1 text-sm"
                                                    autoFocus
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="h-8 bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90"
                                                    disabled={
                                                        !newModuleTitle.trim()
                                                    }
                                                >
                                                    Add
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => {
                                                        setAddingModule(false);
                                                        setNewModuleTitle('');
                                                    }}
                                                >
                                                    ✕
                                                </Button>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    setAddingModule(true)
                                                }
                                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1e3a8a]/30 py-3 text-sm font-medium text-[#1e3a8a] transition hover:bg-[#1e3a8a]/5 dark:border-indigo-700 dark:text-indigo-400"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Module
                                            </button>
                                        )}
                                    </div>
                                )}

                                {course.modules.length === 0 && (
                                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                                        <FolderOpen className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                        <p className="text-sm text-gray-500">
                                            {effectiveEditMode
                                                ? 'Add your first module above.'
                                                : 'No modules yet.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <AnnouncementFooterButton
                                announcements={announcements}
                                active={showAnnouncements}
                                onOpen={() => {
                                    setShowAnnouncements(true);
                                    setActiveSession(null);
                                    setActiveContent(null);
                                    setActiveAssessment(null);
                                    setMobilePanel('content');
                                }}
                            />
                        </div>
                    </aside>

                    {/* Right panel */}
                    <main
                        className={`flex-1 overflow-hidden bg-white dark:bg-gray-950 ${mobilePanel === 'content' ? 'flex flex-col' : 'hidden'} md:flex md:flex-col`}
                    >
                        {/* Announcements feed (opened from the sidebar button) */}
                        {showAnnouncements ? (
                            <AnnouncementsPanel
                                announcements={announcements}
                                setAnnouncements={setAnnouncements}
                            />
                        ) : effectiveEditMode && liveActiveSession ? (
                            <ContentPanelEditor
                                key={liveActiveSession.id}
                                session={liveActiveSession}
                                onAddContent={(c) =>
                                    addContent(liveActiveSession.id, c)
                                }
                                onUpdateContent={(c) =>
                                    updateContent(liveActiveSession.id, c)
                                }
                                onDeleteContent={(id) =>
                                    deleteContent(liveActiveSession.id, id)
                                }
                                onAddAssessment={(a) =>
                                    addAssessment(liveActiveSession.id, a)
                                }
                                onUpdateAssessment={(a) =>
                                    updateAssessment(liveActiveSession.id, a)
                                }
                                onDeleteAssessment={(id) =>
                                    deleteAssessment(liveActiveSession.id, id)
                                }
                                onAddMeeting={(m) =>
                                    addMeeting(liveActiveSession.id, m)
                                }
                                onUpdateMeeting={(m) =>
                                    updateMeeting(liveActiveSession.id, m)
                                }
                                onDeleteMeeting={(id) =>
                                    deleteMeeting(liveActiveSession.id, id)
                                }
                                onAddGame={(g) =>
                                    addGame(liveActiveSession.id, g)
                                }
                                onUpdateGame={(g) =>
                                    updateGame(liveActiveSession.id, g)
                                }
                                onDeleteGame={(id) =>
                                    deleteGame(liveActiveSession.id, id)
                                }
                            />
                        ) : effectiveEditMode ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                                    <Pencil className="h-8 w-8 text-gray-300" />
                                </div>
                                <div className="max-w-xs">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                        Select a Session
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-500">
                                        Click any session in the sidebar to
                                        manage its content and assessments here.
                                    </p>
                                </div>
                            </div>
                        ) : activeAssessment ? (
                            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
                                {/* Breadcrumb */}
                                <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                                    <BookOpen className="h-3.5 w-3.5" />
                                    <span className="truncate">
                                        {activeSession?.title}
                                    </span>
                                    <ChevronRight className="h-3 w-3 shrink-0" />
                                    <span
                                        className={`font-semibold ${activeAssessment.kind === 'quiz' ? 'text-[#1e3a8a]' : 'text-amber-500'}`}
                                    >
                                        {activeAssessment.title}
                                    </span>
                                </div>
                                {activeAssessment.kind === 'quiz' ? (
                                    <QuizViewer
                                        key={activeAssessment.id}
                                        quiz={activeAssessment}
                                        savedState={
                                            quizResults[activeAssessment.id]
                                        }
                                        onSave={(s) => {
                                            setQuizResults((prev) => ({
                                                ...prev,
                                                [activeAssessment.id]: s,
                                            }));
                                            if (s.submitted)
                                                markViewed(activeAssessment.id);
                                        }}
                                    />
                                ) : (
                                    <AssignmentViewer
                                        key={activeAssessment.id}
                                        assignment={activeAssessment}
                                        courseId={courseId}
                                        initialSubmission={
                                            activeAssessment.dbId
                                                ? mySubmissions[
                                                      activeAssessment.dbId
                                                  ]
                                                : undefined
                                        }
                                        onMarkDone={() =>
                                            markViewed(activeAssessment.id)
                                        }
                                    />
                                )}
                            </div>
                        ) : activeContent ? (
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                {/* Fixed content header */}
                                <div className="shrink-0 border-b border-gray-100 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-gray-950">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <BookOpen className="h-3 w-3 shrink-0" />
                                            <span className="truncate">
                                                {activeSession?.title}
                                            </span>
                                        </div>
                                        {isStudent &&
                                            activeContent?.dbId &&
                                            completedContents.has(
                                                activeContent.dbId,
                                            ) && (
                                                <CheckCircle2
                                                    className="h-5 w-5 shrink-0 text-emerald-500"
                                                    aria-label="Completed"
                                                />
                                            )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            aria-label={
                                                CONTENT_META[activeContent.type]
                                                    .label
                                            }
                                            title={
                                                CONTENT_META[activeContent.type]
                                                    .label
                                            }
                                            className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 ${CONTENT_META[activeContent.type].badge}`}
                                        >
                                            {
                                                CONTENT_META[activeContent.type]
                                                    .icon
                                            }
                                        </span>
                                        <h2
                                            className="min-w-0 truncate text-base font-bold text-gray-900 sm:text-lg dark:text-white"
                                            title={activeContent.title}
                                        >
                                            {activeContent.title}
                                        </h2>
                                    </div>
                                </div>

                                {/* Scrollable body */}
                                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
                                    <div className="flex-1">
                                        <ContentViewer
                                            content={activeContent}
                                        />
                                    </div>

                                    {/* Complete & Continue — merged completion + advance action */}
                                    {isStudent &&
                                        activeContent?.dbId &&
                                        !completedContents.has(
                                            activeContent.dbId,
                                        ) && (
                                            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
                                                <Button
                                                    onClick={() =>
                                                        markContentDone(
                                                            activeContent,
                                                        )
                                                    }
                                                    className="min-h-[44px] gap-1.5 bg-emerald-600 px-5 text-white hover:bg-emerald-700"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                    Mark as Completed
                                                </Button>
                                            </div>
                                        )}
                                </div>
                            </div>
                        ) : activeSession ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                                    <BookOpen className="h-8 w-8 text-gray-300" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold tracking-widest text-[#1e3a8a]/60 uppercase">
                                        Selected Session
                                    </p>
                                    <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                                        {activeSession.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-500">
                                        No content uploaded for this session
                                        yet.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-col overflow-y-auto">
                                {/* Intro video */}
                                {courseData?.intro_video &&
                                    (() => {
                                        const videoId = extractYouTubeId(
                                            courseData.intro_video,
                                        );
                                        return videoId ? (
                                            <div
                                                className="relative w-full bg-black"
                                                style={{ paddingBottom: '42%' }}
                                            >
                                                <iframe
                                                    className="absolute inset-0 h-full w-full"
                                                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                                                    title="Course Introduction"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full bg-black">
                                                <video
                                                    src={courseData.intro_video}
                                                    controls
                                                    className="max-h-[680px] w-full"
                                                />
                                            </div>
                                        );
                                    })()}

                                <div className="space-y-6 p-6">
                                    {/* Course title + badges */}
                                    <div>
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            {courseData && (
                                                <>
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_COLORS[courseData.level]}`}
                                                    >
                                                        {courseData.level}
                                                    </span>
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[courseData.status]}`}
                                                    >
                                                        {courseData.status}
                                                    </span>
                                                    <span className="font-mono text-xs text-gray-400">
                                                        {courseData.course_code}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {course.courseTitle}
                                        </h2>
                                    </div>

                                    {/* Description */}
                                    {course.description && (
                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                            <div className="mb-2 flex items-center gap-2">
                                                <Info className="h-4 w-4 shrink-0 text-[#1e3a8a]/60" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    About this Course
                                                </h3>
                                            </div>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                                                {course.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Instructor */}
                                    {courseData?.instructor && (
                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                            <div className="mb-3 flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4 shrink-0 text-[#1e3a8a]/60" />
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    Instructor
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 dark:bg-indigo-900/30">
                                                    <User className="h-5 w-5 text-[#1e3a8a] dark:text-indigo-300" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {
                                                            courseData
                                                                .instructor.name
                                                        }
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Course Instructor
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Curriculum summary */}
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Layers className="h-4 w-4 shrink-0 text-[#1e3a8a]/60" />
                                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                Course Curriculum
                                            </h3>
                                        </div>
                                        {course.modules.length === 0 ? (
                                            <p className="text-sm text-gray-400">
                                                No modules added yet.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {course.modules.map(
                                                    (mod, i) => {
                                                        const count =
                                                            mod.items.reduce(
                                                                (a, item) =>
                                                                    a +
                                                                    (item.itemType ===
                                                                    'session'
                                                                        ? 1
                                                                        : item
                                                                              .sessions
                                                                              .length),
                                                                0,
                                                            );
                                                        return (
                                                            <div
                                                                key={mod.id}
                                                                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                                                            >
                                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-[10px] font-bold text-[#1e3a8a] dark:bg-indigo-900/30 dark:text-indigo-300">
                                                                    {i + 1}
                                                                </span>
                                                                <span className="flex-1 truncate">
                                                                    {mod.title}
                                                                </span>
                                                                <span className="shrink-0 text-xs text-gray-400">
                                                                    {count}{' '}
                                                                    session
                                                                    {count !== 1
                                                                        ? 's'
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile browse prompt */}
                                    <button
                                        onClick={() =>
                                            setMobilePanel('curriculum')
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition md:hidden"
                                        style={{ background: PORTAL_GRADIENT }}
                                    >
                                        <LayoutList className="h-4 w-4" />
                                        Browse Curriculum
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Linear prev / next navigation */}
                        {!effectiveEditMode &&
                            !showAnnouncements &&
                            (activeContent || activeAssessment) &&
                            navLessons.length > 1 && (
                                <div className="shrink-0 border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                                    <div
                                        className="h-1 w-full bg-gray-100 dark:bg-gray-800"
                                        role="progressbar"
                                        aria-valuenow={currentNavIndex + 1}
                                        aria-valuemin={1}
                                        aria-valuemax={navLessons.length}
                                        aria-label="Lesson progress"
                                    >
                                        <div
                                            className="h-full bg-[#1e3a8a] transition-all duration-300 motion-reduce:transition-none dark:bg-indigo-500"
                                            style={{
                                                width: `${((currentNavIndex + 1) / navLessons.length) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-6">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!prevNav}
                                            onClick={() =>
                                                prevNav && goToNav(prevNav)
                                            }
                                            className="h-auto min-h-[44px] min-w-0 gap-1.5 py-2"
                                        >
                                            <ChevronLeft className="h-4 w-4 shrink-0" />
                                            <span className="flex min-w-0 flex-col items-start leading-tight">
                                                <span className="text-[9px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                                                    Previous
                                                </span>
                                                <span className="max-w-[6.5rem] truncate text-xs font-medium sm:max-w-[12rem]">
                                                    {prevNav?.title ?? '—'}
                                                </span>
                                            </span>
                                        </Button>
                                        <span className="shrink-0 text-[11px] font-medium text-gray-500 tabular-nums dark:text-gray-400">
                                            {currentNavIndex + 1} /{' '}
                                            {navLessons.length}
                                        </span>
                                        <Button
                                            size="sm"
                                            disabled={!nextNav}
                                            onClick={() =>
                                                nextNav && goToNav(nextNav)
                                            }
                                            className="h-auto min-h-[44px] min-w-0 gap-1.5 bg-[#1e3a8a] py-2 text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50"
                                        >
                                            <span className="flex min-w-0 flex-col items-end leading-tight">
                                                <span className="text-[9px] font-semibold tracking-wide uppercase opacity-80">
                                                    Next
                                                </span>
                                                <span className="max-w-[6.5rem] truncate text-xs font-medium sm:max-w-[12rem]">
                                                    {nextNav?.title ?? '—'}
                                                </span>
                                            </span>
                                            <ChevronRight className="h-4 w-4 shrink-0" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                    </main>
                </div>
            </div>

            {/* ── Confirm edit modal ── */}
            <Dialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
                <DialogContent className="max-w-xs overflow-hidden p-0">
                    <DialogTitle className="sr-only">
                        Edit this Course
                    </DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div
                            className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ background: PORTAL_GRADIENT }}
                        >
                            <Pencil className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Edit this Course?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            You'll enter editing mode where you can rename
                            sessions, add content, and rearrange the curriculum.
                        </p>
                        <div className="mt-5 flex w-full gap-2">
                            <Button
                                variant="outline"
                                className="h-9 flex-1"
                                onClick={() => setConfirmEditOpen(false)}
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
                                    setConfirmEditOpen(false);
                                    setEditMode(true);
                                    toast('You are editing', 'info');
                                }}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Course
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Confirm save & exit modal ── */}
            <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
                <DialogContent className="max-w-xs overflow-hidden p-0">
                    <DialogTitle className="sr-only">
                        Exit Editing Mode
                    </DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600">
                            <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Exit Editing Mode?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            Changes are saved automatically. You can re-enter
                            editing mode at any time.
                        </p>
                        <div className="mt-5 flex w-full gap-2">
                            <Button
                                variant="outline"
                                className="h-9 flex-1"
                                onClick={() => setConfirmSaveOpen(false)}
                            >
                                Keep Editing
                            </Button>
                            <Button
                                className="h-9 flex-1 gap-1.5 bg-teal-600 font-semibold text-white hover:bg-teal-700"
                                onClick={() => {
                                    setConfirmSaveOpen(false);
                                    setEditMode(false);
                                    setActiveContent(null);
                                    setActiveAssessment(null);
                                    toast('Saved', 'success');
                                }}
                            >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Done Editing
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Unsaved-nav prompt modal ── */}
            <Dialog
                open={!!pendingNavUrl}
                onOpenChange={(open) => {
                    if (!open) setPendingNavUrl(null);
                }}
            >
                <DialogContent className="max-w-xs overflow-hidden p-0">
                    <DialogTitle className="sr-only">
                        Leave Editing Mode?
                    </DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div
                            className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ background: PORTAL_GRADIENT }}
                        >
                            <Pencil className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Leave editing mode?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            Your edits are saved automatically. You can come
                            back later to continue editing.
                        </p>
                        <div className="mt-5 flex w-full gap-2">
                            <Button
                                variant="outline"
                                className="h-9 flex-1"
                                onClick={() => setPendingNavUrl(null)}
                            >
                                Stay
                            </Button>
                            <button
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-[#1e3a8a] transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                style={{
                                    background: `linear-gradient(white, white) padding-box, ${PORTAL_GRADIENT} border-box`,
                                    border: '1.5px solid transparent',
                                }}
                                onClick={() => {
                                    const url = pendingNavUrl;
                                    setPendingNavUrl(null);
                                    setEditMode(false);
                                    if (url) {
                                        allowNavRef.current = true;
                                        router.visit(url);
                                    }
                                }}
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Mark as Done confirm modal ── */}
            <Dialog
                open={confirmDoneOpen}
                onOpenChange={(open) => {
                    if (!markingDone) setConfirmDoneOpen(open);
                }}
            >
                <DialogContent className="max-w-xs overflow-hidden p-0">
                    <DialogTitle className="sr-only">Mark as Done</DialogTitle>
                    <div className="flex flex-col items-center px-6 pt-6 pb-6 text-center">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Mark as Completed?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                            Mark{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                "{confirmDoneContent?.title}"
                            </span>{' '}
                            as completed.
                        </p>
                        <div className="mt-5 flex w-full gap-2">
                            <Button
                                variant="outline"
                                className="h-9 flex-1"
                                onClick={() => setConfirmDoneOpen(false)}
                                disabled={markingDone}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="h-9 flex-1 gap-1.5 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                                onClick={confirmMarkDone}
                                disabled={markingDone}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {markingDone ? 'Saving…' : 'Mark as Completed'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Upload progress modal ── */}
            <Dialog
                open={!!upload?.open}
                onOpenChange={(open) => {
                    if (!open && upload?.status !== 'uploading')
                        setUpload(null);
                }}
            >
                <DialogContent
                    className="max-w-sm p-0 [&>button]:hidden"
                    onInteractOutside={(e) => {
                        if (upload?.status === 'uploading') e.preventDefault();
                    }}
                >
                    <DialogTitle className="sr-only">
                        Upload progress
                    </DialogTitle>
                    <div className="min-w-0 p-6">
                        <div className="flex items-start gap-3">
                            <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    upload?.status === 'success'
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : upload?.status === 'error'
                                          ? 'bg-red-100 text-red-600'
                                          : 'bg-blue-100 text-blue-600'
                                }`}
                            >
                                {upload?.status === 'success' ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : upload?.status === 'error' ? (
                                    <XCircle className="h-5 w-5" />
                                ) : (
                                    <Upload className="h-5 w-5 animate-pulse" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {upload?.status === 'success'
                                        ? 'Upload complete'
                                        : upload?.status === 'error'
                                          ? 'Upload failed'
                                          : 'Uploading…'}
                                </p>
                                <p
                                    className="truncate text-xs text-gray-500"
                                    title={upload?.filename}
                                >
                                    {upload?.filename}
                                </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-gray-700 tabular-nums dark:text-gray-200">
                                {upload?.progress ?? 0}%
                            </span>
                        </div>
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                                className={`h-full rounded-full transition-all duration-200 ${
                                    upload?.status === 'success'
                                        ? 'bg-emerald-500'
                                        : upload?.status === 'error'
                                          ? 'bg-red-400'
                                          : 'bg-[#1e3a8a]'
                                }`}
                                style={{ width: `${upload?.progress ?? 0}%` }}
                            />
                        </div>
                        {upload?.message && (
                            <p
                                className={`mt-3 text-xs ${
                                    upload?.status === 'error'
                                        ? 'text-red-600'
                                        : 'text-emerald-600'
                                }`}
                            >
                                {upload.message}
                            </p>
                        )}
                        {upload?.status !== 'uploading' && (
                            <div className="mt-4 flex justify-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setUpload(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function MyClassShow() {
    const { subjectName, auth } = usePage<
        { subjectName?: string } & SharedData
    >().props;
    const isStudent = auth.user.role === 'student';
    const slug = useMemo(() => {
        const match = window.location.pathname.match(/\/my-course\/(.+)$/);
        return match ? decodeURIComponent(match[1]) : '';
    }, [subjectName]);
    return <TeacherCourseDetail slug={slug} isStudent={isStudent} />;
}
