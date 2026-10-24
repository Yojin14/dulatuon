import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import {
    clearFlipbookDraft,
    flipbookDraftKey,
    formatDraftTime,
    readFlipbookDraft,
    useFlipbookAutosave,
    type FlipbookDraft,
} from '@/components/flipbook/flipbook-draft';
import type { FlipbookImageUploader } from '@/components/flipbook/flipbook-editor';
import {
    newPage,
    pagesForSave,
    type FlipbookPage,
} from '@/components/flipbook/flipbook-types';
import { HudPill } from '@/components/game/hud-pill';
import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { ProgressRing } from '@/components/game/progress-ring';
import { AnswerTile } from '@/components/game/quiz/answer-tile';
import {
    CourseLeaderboard,
    LeaderboardFooterButton,
} from '@/components/leaderboard/course-leaderboard';
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
import { Textarea } from '@/components/ui/textarea';
import { WorldChip } from '@/components/world/world-scope';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from '@/layouts/app-layout';
import { toast } from '@/lib/toast';
import { worldFor, worldStyle, type WorldTheme } from '@/lib/worlds';
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
    Brain,
    Building2,
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
    Grid3x3,
    GripVertical,
    Heart,
    History,
    Info,
    Layers,
    LayoutList,
    LifeBuoy,
    Link2,
    Lock,
    Map as MapIcon,
    Maximize,
    Megaphone,
    Mountain,
    PenLine,
    Pencil,
    Play,
    PlayCircle,
    Plus,
    RefreshCw,
    RotateCcw,
    Send,
    ShieldCheck,
    Shuffle,
    Star,
    Trash2,
    Trophy,
    Type,
    Upload,
    User,
    Video,
    Waves,
    XCircle,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import {
    Suspense,
    lazy,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type Dispatch,
    type SetStateAction,
} from 'react';

// The editor (tiptap) only downloads when a student opens a written answer.
const RichTextEditor = lazy(() =>
    import('@/components/rich-text-editor').then((m) => ({
        default: m.RichTextEditor,
    })),
);
// Flipbook builder and reader download only when a flipbook is opened.
const FlipbookEditor = lazy(
    () => import('@/components/flipbook/flipbook-editor'),
);
const FlipbookReader = lazy(
    () => import('@/components/flipbook/flipbook-reader'),
);

// ─── Types ────────────────────────────────────────────────────────────────────
type ContentType = 'pdf' | 'word' | 'video' | 'youtube' | 'flipbook';

interface ContentItem {
    id: string;
    dbId?: number;
    type: ContentType;
    title: string;
    description?: string;
    url?: string;
    filename?: string;
    file?: File;
    pages?: FlipbookPage[];
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
    id: 'earthquakes',
    slug: 'earthquakes',
    courseTitle: 'Earthquakes',
    description:
        'How faults store and release energy, how seismic waves travel, how intensity differs from magnitude, and how to stay safe, set in the Philippines.',
    modules: [
        {
            id: 'module-1',
            title: 'Module 1: Faults and Plates',
            items: [
                {
                    id: 's1',
                    itemType: 'session',
                    title: 'What is an earthquake?',
                    contents: [
                        {
                            id: 'c1',
                            type: 'youtube',
                            title: 'Intro Video',
                            url: '',
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
                            title: 'Checkpoint: Faults',
                            description:
                                'Check what you know about faults before the lab.',
                            questions: [
                                {
                                    id: 'q1',
                                    question: 'What is a fault?',
                                    options: [
                                        'A crack in the crust where blocks of rock move',
                                        'A layer of molten rock under the crust',
                                        'A wave that travels across the ocean',
                                        'A volcano that has stopped erupting',
                                    ],
                                    correctIndex: 0,
                                },
                                {
                                    id: 'q2',
                                    question:
                                        'Which fault runs the length of the Philippine archipelago?',
                                    options: [
                                        'Manila Trench',
                                        'Valley Fault System',
                                        'Philippine Fault Zone',
                                        'Cotabato Trench',
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
                    title: 'Normal, reverse and strike-slip faults',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
                {
                    id: 's3',
                    itemType: 'session',
                    title: 'Plate boundaries around the Philippines',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
            ],
        },
        {
            id: 'module-2',
            title: 'Module 2: Seismic Waves and Intensity',
            items: [
                {
                    id: 's10',
                    itemType: 'session',
                    title: 'P waves and S waves',
                    contents: [],
                    assessments: [],
                    meetings: [],
                },
                {
                    id: 'lg1',
                    itemType: 'lesson-group',
                    title: 'Lesson: Magnitude vs. Intensity',
                    sessions: [
                        {
                            id: 's13',
                            itemType: 'session',
                            title: 'Reading the PEIS intensity scale',
                            contents: [],
                            assessments: [],
                            meetings: [],
                        },
                        {
                            id: 's14',
                            itemType: 'session',
                            title: 'Why depth changes the shaking',
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

/** Display-only: legacy default titles like "Session 2" read as "Lesson 2". */
function lessonLabel(title: string): string {
    return title.replace(/^session(\s*\d+)$/i, 'Lesson$1');
}
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
        badge: 'bg-violet-100 text-violet-700',
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
    flipbook: {
        label: 'Flipbook',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
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
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 py-20 text-center">
                <FileText className="h-12 w-12 text-violet-300" />
                <p className="text-sm text-gray-500">No file uploaded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {canEmbed ? (
                <>
                    <div className="h-[75vh] overflow-hidden rounded-xl border border-border">
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
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-violet-300"
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
                        <h3 className="text-lg font-semibold text-foreground">
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
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
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
                <div className="rounded-2xl bg-muted/50 px-4 py-3">
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {content.description}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Content Viewer ───────────────────────────────────────────────────────────
function ContentViewer({ content }: { content: ContentItem }) {
    if (content.type === 'flipbook') {
        return (
            <div className="space-y-4">
                <Suspense
                    fallback={
                        <div className="h-[70vh] animate-pulse rounded-3xl bg-muted" />
                    }
                >
                    <FlipbookReader pages={content.pages ?? []} />
                </Suspense>
                {content.description && (
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {content.description}
                        </p>
                    </div>
                )}
            </div>
        );
    }
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
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
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
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                        <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
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
        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100">
                <File className="h-10 w-10 text-violet-600" />
            </div>
            <div>
                <p className="text-xs font-semibold tracking-wider text-violet-500 uppercase">
                    Word Document
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
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

// ─── Game Preview ─────────────────────────────────────────────────────────────
/**
 * What a game is before you launch it: a game-night stage with the course's low-poly
 * block, the rules in brief and a full-screen tip. Only "Play" opens the game tab.
 */
function GamePreview({
    game,
    completed,
    isStudent,
    world,
}: {
    game: Game;
    completed: boolean;
    isStudent: boolean;
    world: WorldTheme;
}) {
    const meta = GAME_TYPE_META[game.gameType];
    const isSimulation = SIMULATION_GAMES.includes(game.gameType);
    const playUrl = game.dbId ? `/games/${game.dbId}/play` : null;
    const itemsLabel = isSimulation
        ? 'Built-in checkpoints'
        : `${game.items.length} ${game.items.length === 1 ? 'question' : 'questions'}`;
    const livesLabel =
        game.lives > 0
            ? `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} a day`
            : 'Unlimited tries';

    return (
        <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
                {/* Stage */}
                <section className="relative overflow-hidden rounded-3xl bg-game-night text-white">
                    <div className="grid items-center gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_13rem] sm:p-8">
                        <div className="min-w-0">
                            <HudPill tone="light">
                                <meta.icon />
                                {meta.label} ·{' '}
                                {isSimulation ? '3D lab' : 'Game'}
                            </HudPill>
                            <h2 className="mt-3 font-display text-[clamp(1.6rem,3.5vw,2.25rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
                                {game.title}
                            </h2>
                            <p className="mt-2 max-w-[48ch] text-white/70">
                                {game.description || meta.tagline}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold ring-1 ring-white/10">
                                    <Trophy className="size-4 text-amber-300" />
                                    {game.points} pts
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold ring-1 ring-white/10">
                                    <Heart className="size-4 text-rose-300" />
                                    {livesLabel}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold ring-1 ring-white/10">
                                    <ClipboardList className="size-4 text-sky-300" />
                                    {itemsLabel}
                                </span>
                            </div>
                        </div>
                        <div
                            className="relative mx-auto w-44 sm:w-full"
                            aria-hidden
                        >
                            <LowPolyBlock
                                biome={world.biome}
                                variant={
                                    world.biome === 'earth' ? 'quake' : 'town'
                                }
                                className="drop-shadow-[0_18px_18px_rgba(0,0,0,0.35)]"
                            />
                            <span className="absolute -top-2 right-1 grid size-12 place-items-center bg-linear-to-b from-violet-400 to-violet-600 text-white shadow-[0_3px_0_0_var(--color-violet-800)] [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
                                <meta.icon className="size-5" />
                            </span>
                        </div>
                    </div>
                </section>

                {completed && (
                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm">
                            <span className="font-bold">Cleared.</span> Play
                            again any time to beat your best score.
                        </p>
                    </div>
                )}

                {/* Full-screen tip */}
                <div className="flex gap-3 rounded-2xl bg-violet-50 px-4 py-3.5 dark:bg-violet-500/10">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm dark:bg-white/10">
                        <Maximize className="size-4" />
                    </span>
                    <div className="text-sm">
                        <p className="font-bold text-foreground">
                            Best played in full screen
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                            The game opens in a new tab and goes full screen
                            when you press{' '}
                            <span className="font-semibold">Start game</span>.
                            On a phone, turn it sideways for the widest view.
                        </p>
                    </div>
                </div>

                {!isStudent &&
                    isSimulation &&
                    SIMULATION_NOTES[game.gameType] && (
                        <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">
                                For teachers:{' '}
                            </span>
                            {SIMULATION_NOTES[game.gameType]}
                        </p>
                    )}

                <div className="pt-1">
                    {playUrl ? (
                        <Button
                            asChild
                            variant="play"
                            size="lg"
                            className="h-13 w-full text-base sm:w-auto sm:min-w-56"
                        >
                            <a
                                href={`${playUrl}?fullscreen=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Play className="fill-current" />
                                {completed ? 'Play again' : 'Play'}
                            </a>
                        </Button>
                    ) : (
                        <Button
                            variant="play"
                            size="lg"
                            className="h-13 w-full text-base sm:w-auto"
                            disabled
                        >
                            Save the course to play
                        </Button>
                    )}
                </div>
            </div>
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
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed py-16 text-center">
                <ClipboardList className="size-10 text-muted-foreground/60" />
                <p className="font-semibold text-muted-foreground">
                    No questions added yet.
                </p>
            </div>
        );

    const setAnswer = (questionIndex: number, optionIndex: number) => {
        const a = [...answers];
        a[questionIndex] = optionIndex;
        setAnswers(a);
        onSave?.({ answers: a, submitted: false });
    };

    if (submitted) {
        const passed = score >= 75;
        const decent = score >= 50;
        const message =
            score >= 90
                ? 'Outstanding. You aced it.'
                : score >= 75
                  ? 'Checkpoint cleared.'
                  : score >= 50
                    ? 'Close. Review the answers below.'
                    : 'Not yet. Study the review and try again.';

        return (
            <div className="space-y-6">
                {/* Result */}
                <section className="flex flex-wrap items-center gap-5 rounded-4xl border bg-card p-5 shadow-panel sm:p-6">
                    <ProgressRing value={score} size={88} stroke={8}>
                        <span className="font-display text-xl font-extrabold">
                            {score}%
                        </span>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-muted-foreground">
                            {quiz.title}
                        </p>
                        <h2
                            className={`mt-0.5 font-display text-2xl leading-tight font-extrabold tracking-[-0.02em] ${passed ? 'text-emerald-700 dark:text-emerald-400' : decent ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                            {message}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {correctCount} of {quiz.questions.length} correct
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            const fresh = Array(quiz.questions.length).fill(
                                null,
                            );
                            setSubmitted(false);
                            setAnswers(fresh);
                            onSave?.({ answers: fresh, submitted: false });
                        }}
                    >
                        <RotateCcw />
                        Retake
                    </Button>
                </section>

                {/* Review */}
                <section aria-label="Answer review" className="space-y-4">
                    {quiz.questions.map((q, i) => {
                        const isCorrect = answers[i] === q.correctIndex;
                        return (
                            <div
                                key={q.id}
                                className="rounded-3xl border bg-card p-5 shadow-panel"
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white ${isCorrect ? 'bg-emerald-600' : 'bg-red-500'}`}
                                    >
                                        {isCorrect ? (
                                            <CheckCircle2 className="size-4" />
                                        ) : (
                                            <XCircle className="size-4" />
                                        )}
                                    </span>
                                    <p className="flex-1 font-display text-lg leading-snug font-bold tracking-[-0.01em]">
                                        {q.question}
                                    </p>
                                </div>
                                <div className="mt-4 grid gap-2">
                                    {q.options.map((opt, j) => (
                                        <AnswerTile
                                            key={j}
                                            label={opt}
                                            index={j}
                                            disabled
                                            state={
                                                j === q.correctIndex
                                                    ? 'correct'
                                                    : j === answers[i]
                                                      ? 'wrong'
                                                      : 'idle'
                                            }
                                            className="disabled:opacity-100"
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>
        );
    }

    const answeredCount = answers.filter((a) => a !== null).length;

    return (
        <div className="space-y-5">
            <header className="rounded-3xl border bg-card p-6 shadow-panel sm:p-7">
                <p className="text-eyebrow text-violet-600 dark:text-violet-300">
                    Checkpoint quiz
                </p>
                <h2 className="mt-1.5 font-display text-2xl leading-tight font-bold tracking-[-0.02em] text-foreground">
                    {quiz.title}
                </h2>
                {quiz.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {quiz.description}
                    </p>
                )}
                <div className="mt-5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-violet-600 transition-[width] duration-500 ease-out"
                            style={{
                                width: `${(answeredCount / quiz.questions.length) * 100}%`,
                            }}
                        />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                        {answeredCount} of {quiz.questions.length} answered
                    </span>
                </div>
            </header>

            {quiz.questions.map((q, i) => (
                <fieldset
                    key={q.id}
                    className="rounded-3xl border bg-card p-5 sm:p-6"
                >
                    <legend className="sr-only">Question {i + 1}</legend>
                    <p className="text-sm font-semibold text-muted-foreground">
                        Question {i + 1} of {quiz.questions.length}
                    </p>
                    <p className="mt-1 mb-4 font-display text-lg leading-snug font-bold tracking-[-0.01em] text-foreground">
                        {q.question}
                    </p>
                    <div className="grid gap-2.5">
                        {q.options.map((opt, j) => (
                            <AnswerTile
                                key={j}
                                label={opt}
                                index={j}
                                state={answers[i] === j ? 'selected' : 'idle'}
                                onClick={() => setAnswer(i, j)}
                            />
                        ))}
                    </div>
                </fieldset>
            ))}

            <Button
                size="lg"
                className="h-14 w-full text-base"
                disabled={!allAnswered}
                onClick={() => {
                    setSubmitted(true);
                    onSave?.({ answers, submitted: true });
                    onMarkDone?.();
                }}
            >
                <Send />
                {allAnswered
                    ? 'Submit answers'
                    : `Answer all questions (${answeredCount}/${quiz.questions.length})`}
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
                    <p className="text-xs font-semibold tracking-wider text-amber-600 uppercase">
                        Assignment
                    </p>
                </div>
                <h2 className="text-lg font-bold text-foreground">
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
                <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                    <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        Instructions
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
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
                                    ? 'bg-violet-100 text-violet-600'
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
                                <p className="truncate text-sm font-medium text-foreground">
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
                    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
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
                            <Suspense
                                fallback={
                                    <div
                                        className="h-40 animate-pulse rounded-2xl border-2 bg-muted/50"
                                        aria-label="Loading editor"
                                    />
                                }
                            >
                                <RichTextEditor
                                    value={textHtml}
                                    onChange={setTextHtml}
                                    placeholder="Write your answer here… Use the toolbar or press Ctrl+K to add a link."
                                />
                            </Suspense>
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
    courseId?: string;
    lessonId: string;
    resumeDraft?: boolean;
    onSave: (item: ContentItem) => void;
    onCancel: () => void;
}

const FILE_ACCEPT: Record<ContentType, string> = {
    pdf: 'application/pdf,.pdf',
    word: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword',
    video: 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov',
    youtube: '',
    flipbook: '',
};

const CONTENT_TYPE_OPTIONS: {
    type: ContentType;
    label: string;
    icon: LucideIcon;
    desc: string;
}[] = [
    {
        type: 'flipbook',
        label: 'Flipbook',
        icon: BookOpen,
        desc: 'Build pages or import a PDF',
    },
    { type: 'pdf', label: 'PDF', icon: FileText, desc: 'Upload PDF' },
    { type: 'word', label: 'Word Doc', icon: File, desc: 'Upload .docx' },
    { type: 'video', label: 'Video', icon: Video, desc: 'Upload MP4/MOV' },
    { type: 'youtube', label: 'YouTube', icon: PlayCircle, desc: 'Paste link' },
];

function ContentPicker({
    initial,
    courseId,
    lessonId,
    resumeDraft,
    onSave,
    onCancel,
}: ContentPickerProps) {
    const isEdit = !!initial;
    const { auth } = usePage<SharedData>().props;
    const draftKey = flipbookDraftKey(
        auth.user?.id,
        courseId,
        lessonId,
        initial?.dbId ?? (initial ? initial.id : undefined),
    );
    // Opened from "Continue draft": start straight from the kept work.
    const [resumed] = useState<FlipbookDraft | null>(() =>
        resumeDraft && !initial ? readFlipbookDraft(draftKey) : null,
    );
    const [draftOffer, setDraftOffer] = useState<FlipbookDraft | null>(() =>
        resumed || (initial && initial.type !== 'flipbook')
            ? null
            : readFlipbookDraft(draftKey),
    );
    const [lastDraftSave, setLastDraftSave] = useState<number | null>(
        resumed?.savedAt ?? null,
    );

    const [selectedType, setSelectedType] = useState<ContentType | null>(
        resumed ? 'flipbook' : (initial?.type ?? null),
    );
    const [title, setTitle] = useState(resumed?.title ?? initial?.title ?? '');
    const [description, setDescription] = useState(
        resumed?.description ?? initial?.description ?? '',
    );
    const [url, setUrl] = useState(initial?.url ?? '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pages, setPages] = useState<FlipbookPage[]>(() =>
        resumed?.pages.length
            ? resumed.pages
            : initial?.pages?.length
              ? initial.pages
              : [newPage()],
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    // What the flipbook looked like when it was opened; anything else is unsaved work.
    const [baseline] = useState(() =>
        JSON.stringify({
            title: (initial?.title ?? '').trim(),
            description: (initial?.description ?? '').trim(),
            pages: pagesForSave(initial?.pages ?? []),
        }),
    );
    const flipbookDirty =
        selectedType === 'flipbook' &&
        JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            pages: pagesForSave(pages),
        }) !== baseline;

    useFlipbookAutosave(
        draftKey,
        { title, description, pages },
        flipbookDirty && !draftOffer,
        setLastDraftSave,
    );

    const restoreDraft = (draft: FlipbookDraft) => {
        setSelectedType('flipbook');
        setTitle(draft.title);
        setDescription(draft.description);
        setPages(draft.pages.length ? draft.pages : [newPage()]);
        setLastDraftSave(draft.savedAt);
        setDraftOffer(null);
    };

    const discardDraft = () => {
        clearFlipbookDraft(draftKey);
        setDraftOffer(null);
    };

    const draftBanner = draftOffer && (
        <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center dark:bg-amber-400/10 dark:text-amber-100">
            <History className="hidden size-5 shrink-0 text-amber-600 sm:block dark:text-amber-300" />
            <p className="flex-1 text-sm">
                <span className="font-bold">
                    You have unsaved flipbook work
                    {draftOffer.title ? ` "${draftOffer.title}"` : ''}.
                </span>{' '}
                {draftOffer.pages.length}{' '}
                {draftOffer.pages.length === 1 ? 'page' : 'pages'}, kept in this
                browser at {formatDraftTime(draftOffer.savedAt)}.
            </p>
            <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" onClick={discardDraft}>
                    Discard
                </Button>
                <Button size="sm" onClick={() => restoreDraft(draftOffer)}>
                    Continue editing
                </Button>
            </div>
        </div>
    );

    const uploadFlipbookImage: FlipbookImageUploader = async (
        file,
        onProgress,
    ) => {
        if (!courseId) {
            onProgress(100);
            return URL.createObjectURL(file);
        }
        const fd = new FormData();
        fd.append('image', file);
        const res = await capiFormProgress<{ url: string }>(
            `/curriculum/${courseId}/flipbook-images`,
            fd,
            onProgress,
        );
        return res.url;
    };

    const savedPages = pagesForSave(pages);
    const canSave =
        !!selectedType &&
        !!title.trim() &&
        (selectedType === 'flipbook'
            ? savedPages.length > 0
            : selectedType === 'youtube'
              ? !!url.trim()
              : !!selectedFile || (isEdit && !!initial?.filename));

    const handleSave = () => {
        if (!selectedType || !title.trim()) return;
        if (selectedType === 'flipbook') {
            onSave({
                id: initial?.id ?? uid(),
                dbId: initial?.dbId,
                type: selectedType,
                title: title.trim(),
                description: description.trim() || undefined,
                pages: savedPages,
            });
        } else if (selectedType === 'youtube') {
            onSave({
                id: initial?.id ?? uid(),
                dbId: initial?.dbId,
                type: selectedType,
                title: title.trim(),
                description: description.trim() || undefined,
                url: url.trim(),
            });
        } else {
            onSave({
                id: initial?.id ?? uid(),
                dbId: initial?.dbId,
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
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">
                        What do you want to add?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Build a flipbook right here, or upload a file or link.
                    </p>
                </div>
                {draftBanner}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {CONTENT_TYPE_OPTIONS.map((t) => {
                        const featured = t.type === 'flipbook';
                        return (
                            <button
                                key={t.type}
                                type="button"
                                onClick={() => setSelectedType(t.type)}
                                className={`group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                                    featured
                                        ? 'col-span-2 border-primary/30 bg-primary/5 hover:border-primary sm:col-span-1'
                                        : 'border-border bg-card hover:border-primary/40'
                                }`}
                            >
                                <span
                                    className={`flex size-10 items-center justify-center rounded-xl ${
                                        featured
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground group-hover:text-primary'
                                    }`}
                                >
                                    <t.icon className="size-5" />
                                </span>
                                <span>
                                    <span className="block text-sm font-extrabold text-foreground">
                                        {t.label}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {t.desc}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        );

    const meta = CONTENT_TYPE_OPTIONS.find((t) => t.type === selectedType);
    const MetaIcon = meta?.icon ?? FileText;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <MetaIcon className="size-5" />
                </span>
                <div className="min-w-0">
                    <h3 className="font-display text-lg leading-tight font-extrabold tracking-[-0.02em]">
                        {isEdit ? `Edit ${meta?.label}` : `New ${meta?.label}`}
                    </h3>
                    {selectedType === 'flipbook' && (
                        <p className="text-sm text-muted-foreground">
                            Import a PDF, or add pages one by one with a topic,
                            text and images.
                        </p>
                    )}
                </div>
                {!isEdit && (
                    <button
                        type="button"
                        onClick={() => setSelectedType(null)}
                        className="ml-auto flex shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Change type
                    </button>
                )}
            </div>
            {selectedType === 'flipbook' && draftBanner}
            <div className="grid gap-3 sm:grid-cols-2">
                <Input
                    placeholder={
                        selectedType === 'flipbook'
                            ? 'Flipbook title, e.g. How Earthquakes Happen *'
                            : 'Content title *'
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="Title"
                />
                <Input
                    placeholder="Short description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    aria-label="Description"
                />
            </div>
            {selectedType === 'flipbook' ? (
                <Suspense
                    fallback={
                        <div className="h-96 animate-pulse rounded-3xl bg-muted" />
                    }
                >
                    <FlipbookEditor
                        pages={pages}
                        onChange={setPages}
                        uploadImage={uploadFlipbookImage}
                        title={title.trim() || undefined}
                    />
                </Suspense>
            ) : selectedType === 'youtube' ? (
                <Input
                    placeholder="YouTube URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
            ) : (
                <div className="space-y-2">
                    {isEdit && initial?.filename && !selectedFile && (
                        <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="flex-1 truncate">
                                Current: {initial.filename}
                            </span>
                            <span className="shrink-0">Replace below</span>
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
                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-4 py-4 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                        <Upload className="h-4 w-4 shrink-0 text-primary" />
                        <span
                            className={
                                selectedFile
                                    ? 'truncate font-semibold text-foreground'
                                    : 'text-muted-foreground'
                            }
                        >
                            {selectedFile
                                ? selectedFile.name
                                : 'Click to choose a file…'}
                        </span>
                    </button>
                    <p className="text-xs text-muted-foreground">
                        {selectedType === 'pdf'
                            ? 'PDF only'
                            : selectedType === 'word'
                              ? '.docx or .doc only'
                              : 'MP4, WebM, MOV · max 500 MB'}
                    </p>
                </div>
            )}
            <div className="flex items-center justify-end gap-2 border-t pt-4">
                {selectedType === 'flipbook' && !canSave && title.trim() ? (
                    <p className="mr-auto text-xs text-muted-foreground">
                        Add a topic or some text to at least one page.
                    </p>
                ) : selectedType === 'flipbook' &&
                  flipbookDirty &&
                  lastDraftSave ? (
                    <p
                        className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground"
                        aria-live="polite"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Draft kept in this browser ·{' '}
                        {formatDraftTime(lastDraftSave)}
                    </p>
                ) : null}
                <Button variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button disabled={!canSave} onClick={handleSave}>
                    {isEdit
                        ? 'Save changes'
                        : selectedType === 'flipbook'
                          ? 'Save flipbook'
                          : 'Add content'}
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

    const canSaveQuestion =
        qText.trim() !== '' && opts.every((o) => o.trim() !== '');

    return (
        <div className="space-y-5">
            <div className="space-y-2.5">
                <Input
                    placeholder="Quiz title"
                    aria-label="Quiz title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 font-display text-lg font-bold"
                />
                <Textarea
                    placeholder="What is this checkpoint about? (optional)"
                    aria-label="Quiz description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                />
            </div>

            {/* Questions so far */}
            {questions.length > 0 && (
                <ol className="space-y-2">
                    {questions.map((q, i) => (
                        <li
                            key={q.id}
                            className="group flex items-start gap-3 rounded-2xl border bg-card p-3.5"
                        >
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 font-bold text-foreground">
                                    {q.question}
                                </p>
                                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    <CheckCircle className="size-3.5" />
                                    {q.options[q.correctIndex]}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1 transition lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    onClick={() => openEditQ(q)}
                                    aria-label={`Edit question ${i + 1}`}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8 hover:text-red-600"
                                    onClick={() =>
                                        setQuestions((prev) =>
                                            prev.filter((x) => x.id !== q.id),
                                        )
                                    }
                                    aria-label={`Delete question ${i + 1}`}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {/* Question editor with a live student preview */}
            {showQForm ? (
                <section
                    aria-label={editingQ ? 'Edit question' : 'New question'}
                    className="grid gap-4 rounded-3xl border-2 border-violet-200 bg-violet-50/40 p-4 sm:p-5 xl:grid-cols-2 dark:border-violet-500/30 dark:bg-violet-500/5"
                >
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-primary">
                            {editingQ
                                ? 'Edit question'
                                : `Question ${questions.length + 1}`}
                        </p>
                        <Textarea
                            placeholder="Type the question"
                            aria-label="Question text"
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            rows={2}
                        />
                        <p className="text-xs font-semibold text-muted-foreground">
                            Tap a letter to mark the correct answer.
                        </p>
                        <div className="space-y-2">
                            {opts.map((opt, j) => {
                                const isCorrect = correctIdx === j;
                                return (
                                    <div
                                        key={j}
                                        className="flex items-center gap-2"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setCorrectIdx(j)}
                                            aria-pressed={isCorrect}
                                            aria-label={`Mark option ${String.fromCharCode(65 + j)} as correct`}
                                            className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold transition-colors ${isCorrect ? 'bg-emerald-600 text-white shadow-[0_3px_0_0_var(--color-emerald-800)]' : 'bg-card text-muted-foreground ring-2 ring-border hover:text-emerald-700 hover:ring-emerald-300'}`}
                                        >
                                            {isCorrect ? (
                                                <CheckCircle className="size-5" />
                                            ) : (
                                                String.fromCharCode(65 + j)
                                            )}
                                        </button>
                                        <Input
                                            placeholder={`Option ${String.fromCharCode(65 + j)}`}
                                            aria-label={`Option ${String.fromCharCode(65 + j)}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const o = [...opts];
                                                o[j] = e.target.value;
                                                setOpts(o);
                                            }}
                                            className={
                                                isCorrect
                                                    ? 'border-emerald-400 dark:border-emerald-600'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button
                                onClick={saveQuestion}
                                disabled={!canSaveQuestion}
                            >
                                {editingQ ? 'Update question' : 'Add question'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowQForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>

                    <div
                        className="rounded-2xl border bg-card p-4 sm:p-5"
                        aria-label="Student preview"
                    >
                        <p className="text-eyebrow text-muted-foreground">
                            Student preview
                        </p>
                        <p className="mt-2 font-display text-lg leading-snug font-bold">
                            {qText.trim() || 'Your question appears here'}
                        </p>
                        <div className="mt-3 grid gap-2">
                            {opts.map((opt, j) => (
                                <AnswerTile
                                    key={j}
                                    label={
                                        opt.trim() ||
                                        `Option ${String.fromCharCode(65 + j)}`
                                    }
                                    index={j}
                                    state={
                                        correctIdx === j ? 'correct' : 'idle'
                                    }
                                    disabled
                                    className="disabled:opacity-100"
                                />
                            ))}
                        </div>
                    </div>
                </section>
            ) : (
                <button
                    type="button"
                    onClick={openNewQ}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 text-sm font-bold text-primary transition hover:border-primary/60 hover:bg-primary/5"
                >
                    <Plus className="size-4" />
                    {questions.length === 0
                        ? 'Add the first question'
                        : 'Add another question'}
                </button>
            )}

            <div className="flex gap-2 border-t pt-4">
                <Button
                    size="lg"
                    className="flex-1"
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
                        ? 'Save changes'
                        : `Save quiz${questions.length > 0 ? ` · ${questions.length} ${questions.length === 1 ? 'question' : 'questions'}` : ''}`}
                </Button>
                <Button
                    size="lg"
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
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Create Quiz</p>
                    <button
                        onClick={() => setMode('choose')}
                        className="ml-auto text-xs text-gray-400 hover:text-violet-600"
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
                        className="ml-auto text-xs text-gray-400 hover:text-violet-600"
                    >
                        ← Back
                    </button>
                </div>
                <AssignmentBuilder onSave={onAdd} onCancel={onCancel} />
            </div>
        );
    return (
        <>
            <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Add Assessment
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setMode('quiz')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-4 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 dark:bg-gray-800"
                >
                    <ClipboardList className="h-7 w-7 text-primary" />
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
                <label className="block text-xs font-semibold text-muted-foreground">
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
                <label className="block text-xs font-semibold text-muted-foreground">
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
                        <label className="block text-xs font-semibold text-muted-foreground">
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
                        <label className="block text-xs font-semibold text-muted-foreground">
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
                        <label className="block text-xs font-semibold text-muted-foreground">
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
                <label className="block flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 text-violet-400" /> Timezone
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
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-500 transition-colors hover:text-violet-700"
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
                                            ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40'
                                            : 'border-gray-100 bg-gray-50 hover:border-violet-200 hover:bg-violet-50/50 dark:border-gray-800 dark:bg-gray-900/60'
                                    }`}
                                >
                                    <span className="text-base leading-none">
                                        {flag}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate font-semibold ${isSelected ? 'text-violet-700 dark:text-violet-400' : 'text-foreground/85'}`}
                                        >
                                            {city}
                                        </p>
                                        <p
                                            className={`font-mono tabular-nums ${isSelected ? 'text-violet-600 dark:text-violet-300' : 'text-muted-foreground'}`}
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
                <label className="block text-xs font-semibold text-muted-foreground">
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
    {
        label: string;
        tagline: string;
        icon: LucideIcon;
        chip: string;
        ring: string;
    }
> = {
    quiz_quest: {
        label: 'Quiz Quest',
        tagline: 'Timed multiple-choice with streak bonuses',
        icon: Zap,
        chip: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        ring: 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40',
    },
    memory_match: {
        label: 'Memory Match',
        tagline: 'Flip & match prompt ↔ answer pairs',
        icon: Brain,
        chip: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300',
        ring: 'border-pink-400 bg-pink-50 dark:border-pink-600 dark:bg-pink-950/40',
    },
    word_scramble: {
        label: 'Word Scramble',
        tagline: 'Unscramble the answer to each clue',
        icon: Shuffle,
        chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
        ring: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/40',
    },
    crossword: {
        label: 'Crossword',
        tagline: 'Fill the grid using the clues',
        icon: Grid3x3,
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        ring: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
    },
    hangman: {
        label: 'Word Rescue',
        tagline: 'Guess the word before you run out of tries',
        icon: LifeBuoy,
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        ring: 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40',
    },
    fault_lab: {
        label: 'Fault Lab',
        tagline: '3D simulation: stress, faults and how earthquakes begin',
        icon: Layers,
        chip: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
        ring: 'border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/40',
    },
    shake_town: {
        label: 'Shake Town',
        tagline: '3D simulation: depth, magnitude and intensity',
        icon: Building2,
        chip: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
        ring: 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40',
    },
    wave_tank: {
        label: 'Wave Tank',
        tagline: '3D simulation: P, S and surface waves',
        icon: Waves,
        chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
        ring: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/40',
    },
    quake_tracker: {
        label: 'Quake Tracker',
        tagline: '3D simulation: earthquakes in the Philippines',
        icon: MapIcon,
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        ring: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
    },
    ground_test: {
        label: 'Ground Test',
        tagline: '3D simulation: landslides, liquefaction, rupture',
        icon: Mountain,
        chip: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
        ring: 'border-lime-400 bg-lime-50 dark:border-lime-600 dark:bg-lime-950/40',
    },
    quake_ready: {
        label: 'Quake Ready',
        tagline: '3D simulation: before, during and after',
        icon: ShieldCheck,
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
        promptPlaceholder: 'e.g. Which wave arrives first after an earthquake?',
        answerPlaceholder: 'e.g. The P wave',
    },
    memory_match: {
        prompt: 'Term / prompt',
        answer: 'Matching answer',
        promptPlaceholder: 'e.g. Epicenter',
        answerPlaceholder: 'e.g. The point on the surface above the focus',
    },
    word_scramble: {
        prompt: 'Clue / hint',
        answer: 'Answer to unscramble',
        promptPlaceholder: 'e.g. A crack where blocks of crust move',
        answerPlaceholder: 'e.g. Fault',
    },
    crossword: {
        prompt: 'Clue',
        answer: 'Answer (single word)',
        promptPlaceholder: 'e.g. Instrument that records ground shaking',
        answerPlaceholder: 'e.g. Seismograph',
    },
    hangman: {
        prompt: 'Clue / hint',
        answer: 'Word to guess (single word)',
        promptPlaceholder: 'e.g. Giant sea wave caused by an undersea quake',
        answerPlaceholder: 'e.g. Tsunami',
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
                <label className="block text-xs font-semibold text-muted-foreground">
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
                                className={`flex flex-col gap-1.5 rounded-2xl border-2 p-3.5 text-left transition-all ${selected ? `${meta.ring} shadow-[0_3px_0_0_var(--color-violet-300)] dark:shadow-none` : 'border-border bg-card hover:border-violet-300'}`}
                            >
                                <span
                                    className={`grid size-10 place-items-center rounded-xl ${meta.chip}`}
                                >
                                    <meta.icon className="size-5" />
                                </span>
                                <span className="text-sm font-semibold text-foreground">
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
                    <label className="block text-xs font-semibold text-muted-foreground">
                        Game Title
                    </label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Fault Finder Challenge"
                        className={`h-9 ${titleError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    />
                    {titleError && (
                        <p className="text-[11px] font-medium text-red-500">
                            A game title is required.
                        </p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground">
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
                    <label className="block text-xs font-semibold text-muted-foreground">
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
                    <label className="block text-xs font-semibold text-muted-foreground">
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
                            {(() => {
                                const GameIcon = GAME_TYPE_META[gameType].icon;
                                return (
                                    <GameIcon className="size-5 text-primary" />
                                );
                            })()}
                            {initial ? 'Save Changes?' : 'Add this Game?'}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
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
    courseId?: string;
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
    courseId,
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
    const [resumeDraft, setResumeDraft] = useState(false);
    const { auth } = usePage<SharedData>().props;
    const pendingDraft =
        mode === 'list'
            ? readFlipbookDraft(
                  flipbookDraftKey(auth.user?.id, courseId, session.id),
              )
            : null;
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
        setResumeDraft(false);
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
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {mode === 'edit-content'
                            ? 'Edit Content'
                            : 'Add Content'}
                    </button>
                </div>
                <div className="rounded-3xl border bg-card p-4 shadow-panel sm:p-5">
                    <ContentPicker
                        initial={editingContent ?? undefined}
                        courseId={courseId}
                        lessonId={session.id}
                        resumeDraft={resumeDraft}
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
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600"
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
                <p className="truncate text-sm font-semibold text-foreground">
                    {lessonLabel(session.title)}
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
                            className="flex items-center gap-1 text-[11px] font-medium text-violet-500 transition-colors hover:text-violet-700"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                    {pendingDraft && (
                        <button
                            type="button"
                            onClick={() => {
                                setResumeDraft(true);
                                setMode('add-content');
                            }}
                            className="mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-amber-50 px-2.5 py-2 text-left transition-colors hover:bg-amber-100 dark:bg-amber-400/10 dark:hover:bg-amber-400/15"
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-200 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
                                <History className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-amber-950 dark:text-amber-100">
                                    {pendingDraft.title || 'Untitled flipbook'}{' '}
                                    · unsaved
                                </span>
                                <span className="block text-[11px] text-amber-800/80 dark:text-amber-200/70">
                                    {pendingDraft.pages.length}{' '}
                                    {pendingDraft.pages.length === 1
                                        ? 'page'
                                        : 'pages'}{' '}
                                    · {formatDraftTime(pendingDraft.savedAt)} ·
                                    Continue editing
                                </span>
                            </span>
                        </button>
                    )}
                    {session.contents.length === 0 && !pendingDraft ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">
                            No materials yet.
                        </p>
                    ) : session.contents.length === 0 ? null : (
                        <div className="space-y-0.5">
                            {session.contents.map((c) => (
                                <div
                                    key={c.id}
                                    className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                                >
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${CONTENT_META[c.type].badge}`}
                                    >
                                        {CONTENT_META[c.type].icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-foreground">
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
                                            className="rounded p-1 text-gray-300 transition hover:text-violet-500"
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
                                    className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                                >
                                    <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${a.kind === 'quiz' ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-500'}`}
                                    >
                                        {a.kind === 'quiz' ? (
                                            <ClipboardList className="h-3.5 w-3.5" />
                                        ) : (
                                            <PenLine className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-foreground">
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
                                            className="rounded p-1 text-gray-300 transition hover:text-violet-500"
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
                                        className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                                    >
                                        <span
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${meta.chip}`}
                                        >
                                            <meta.icon className="size-3.5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium text-foreground">
                                                {g.title}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                {meta.label} · {g.items.length}{' '}
                                                {SIMULATION_GAMES.includes(
                                                    g.gameType,
                                                )
                                                    ? 'checkpoints'
                                                    : g.gameType ===
                                                        'memory_match'
                                                      ? 'pairs'
                                                      : g.gameType ===
                                                              'crossword' ||
                                                          g.gameType ===
                                                              'hangman'
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
                                                className="rounded p-1 text-gray-300 transition hover:text-violet-500"
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
                                        className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                                    >
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-500">
                                            <Video className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium text-foreground">
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
                                                className="rounded p-1 text-gray-300 transition hover:text-violet-500"
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
                    <p className="text-sm text-muted-foreground">
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
    activeGameId?: string | null;
    activeAssessmentId: string | null;
    viewedIds: Set<string>;
    onSelectContent: (session: Session, content: ContentItem) => void;
    onSelectGame?: (session: Session, game: Game) => void;
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
    activeGameId,
    activeAssessmentId,
    viewedIds,
    onSelectContent,
    onSelectGame,
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
                className={`group/sess flex items-center gap-2 rounded-xl px-3 py-3 transition-all ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'bg-primary/10 text-primary dark:bg-violet-900/20 dark:text-violet-300' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60'}`}
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
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'bg-primary/20' : locked ? 'bg-muted' : 'bg-muted'}`}
                >
                    {locked ? (
                        <Lock className="h-3 w-3 text-gray-400" />
                    ) : (
                        <BookOpen
                            className={`h-3 w-3 ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'text-primary' : 'text-gray-400'}`}
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
                            className="h-6 bg-primary px-2 text-xs text-white hover:bg-primary/90"
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
                            isActive &&
                            !activeContentId &&
                            !activeAssessmentId &&
                            !activeGameId;
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
                                className={`line-clamp-2 flex-1 text-xs leading-snug ${allCompleted && !active ? 'font-normal text-muted-foreground' : 'font-semibold'}`}
                            >
                                {lessonLabel(session.title)}
                            </span>
                        );
                    })()
                )}
                {!editMode && hasSubItems && (
                    <>
                        <span
                            className={`shrink-0 text-[10px] font-medium ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'text-primary/50' : 'text-gray-400'}`}
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
                            className="rounded p-1 text-gray-400 hover:text-violet-600"
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
                <div className="mt-0.5 ml-5 space-y-px border-l-2 border-dashed border-[color-mix(in_oklab,var(--world-accent,var(--color-violet-600))_35%,transparent)] pl-3">
                    {session.contents.map((c) => {
                        const seen = viewedIds.has(c.id);
                        const done = !!(
                            c.dbId && completedContents?.has(c.dbId)
                        );
                        return (
                            <div
                                key={c.id}
                                onClick={() => onSelectContent(session, c)}
                                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-sm transition-all ${activeContentId === c.id ? 'bg-primary/10 text-primary dark:bg-violet-900/20 dark:text-violet-300' : 'text-gray-500 hover:bg-accent'}`}
                            >
                                <span
                                    className={`shrink-0 ${activeContentId === c.id ? 'text-primary' : 'text-gray-400'}`}
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
                                        className={`h-3 w-3 shrink-0 ${activeContentId === c.id ? 'text-primary' : 'text-emerald-500'}`}
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
                        const selected = activeGameId === g.id;
                        return (
                            <button
                                key={g.id}
                                type="button"
                                aria-current={selected ? 'true' : undefined}
                                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-left text-sm transition-all ${selected ? 'bg-primary/10 text-primary dark:bg-violet-900/20 dark:text-violet-300' : 'text-gray-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/20'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectGame?.(session, g);
                                }}
                            >
                                <meta.icon className="size-4 shrink-0" />
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
                            </button>
                        );
                    })}
                </div>
            )}

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete lesson?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        "<strong>{lessonLabel(session.title)}</strong>" and all
                        its content will be removed.
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
    activeGameId?: string | null;
    activeAssessmentId: string | null;
    viewedIds: Set<string>;
    onSelectContent: (session: Session, content: ContentItem) => void;
    onSelectGame?: (session: Session, game: Game) => void;
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
    activeGameId,
    activeAssessmentId,
    viewedIds,
    onSelectContent,
    onSelectGame,
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
                                className="h-6 bg-primary px-2 text-xs text-white hover:bg-primary/90"
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
                            className="rounded p-1 text-gray-400 hover:text-violet-600"
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
                                    activeGameId={
                                        activeSessionId === session.id
                                            ? activeGameId
                                            : null
                                    }
                                    activeAssessmentId={
                                        activeSessionId === session.id
                                            ? activeAssessmentId
                                            : null
                                    }
                                    viewedIds={viewedIds}
                                    onSelectContent={onSelectContent}
                                    onSelectGame={onSelectGame}
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
                                        placeholder="Lesson title…"
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
                                        className="h-7 bg-primary px-2 text-xs text-white hover:bg-primary/90"
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
                                    Add lesson
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
                            Delete unit?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        "<strong>{group.title}</strong>" and all its lessons
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
    activeGameId?: string | null;
    activeAssessmentId: string | null;
    viewedIds: Set<string>;
    onSelectContent: (session: Session, content: ContentItem) => void;
    onSelectGame?: (session: Session, game: Game) => void;
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
    activeGameId,
    activeAssessmentId,
    viewedIds,
    onSelectContent,
    onSelectGame,
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
        <div className="overflow-hidden rounded-2xl border bg-card shadow-panel">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-accent/50"
            >
                <div className="grid size-9 shrink-0 place-items-center bg-(--world-accent,var(--color-violet-600)) font-display text-sm font-extrabold text-white [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]">
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
                                className="h-6 bg-primary px-2 text-xs text-white hover:bg-primary/90"
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
                        <p className="truncate text-sm font-semibold text-foreground">
                            {mod.title}
                        </p>
                    )}
                    <p className="text-[11px] text-gray-400">
                        {sessionCount}{' '}
                        {sessionCount === 1 ? 'lesson' : 'lessons'}
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
                        className="rounded p-1 text-gray-400 hover:text-violet-600"
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
                                            activeGameId={activeGameId}
                                            activeAssessmentId={
                                                activeAssessmentId
                                            }
                                            viewedIds={viewedIds}
                                            onSelectContent={onSelectContent}
                                            onSelectGame={onSelectGame}
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
                                        activeGameId={
                                            activeSessionId === item.id
                                                ? activeGameId
                                                : null
                                        }
                                        activeAssessmentId={
                                            activeSessionId === item.id
                                                ? activeAssessmentId
                                                : null
                                        }
                                        viewedIds={viewedIds}
                                        onSelectContent={onSelectContent}
                                        onSelectGame={onSelectGame}
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
                                        placeholder="Lesson title…"
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
                                        className="h-7 bg-primary px-2 text-xs text-white hover:bg-primary/90"
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
                                    className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-primary/30 px-2.5 py-1.5 text-[11px] font-medium text-primary transition hover:bg-primary/5 dark:border-violet-700 dark:text-violet-400"
                                >
                                    <Plus className="h-3 w-3" />
                                    Lesson
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
                        title="When enabled, students must complete each lesson before opening the next"
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
                    <p className="text-sm text-muted-foreground">
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
                    : 'bg-white hover:bg-muted/50 dark:hover:bg-gray-800/50'
            }`}
        >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-muted-foreground">
                    Announcements
                </p>
                {latest ? (
                    <p className="truncate text-xs text-muted-foreground">
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
                    <h2 className="text-lg font-bold text-foreground">
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
                            className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                        >
                            <div className="flex items-start gap-3 p-4 sm:p-5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white">
                                    {acInitials(a.author?.name ?? '?')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {a.author?.name ?? 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {announcementTime(a.created_at)}
                                        </p>
                                    </div>
                                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
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
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                <span className="font-semibold text-foreground/85">
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
                                    className="shrink-0 p-1.5 text-violet-600 transition-colors hover:text-violet-700 disabled:text-gray-300"
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
    const editModeStorageKey = courseId
        ? `dulatuon:editMode:${courseId}`
        : null;
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
    const [activeGame, setActiveGame] = useState<Game | null>(null);
    const [showAnnouncements, setShowAnnouncements] = useState(() => {
        if (typeof window === 'undefined') return false;
        return (
            new URLSearchParams(window.location.search).get('view') ===
            'announcements'
        );
    });
    const [showLeaderboard, setShowLeaderboard] = useState(() => {
        if (typeof window === 'undefined') return false;
        return (
            new URLSearchParams(window.location.search).get('view') ===
            'leaderboard'
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
            setShowLeaderboard(false);
            setActiveSession(session);
            setActiveContent(content);
            setActiveAssessment(null);
            setActiveGame(null);
            setMobilePanel('content');
            markViewed(content.id);
        },
        [markViewed],
    );
    const handleSelectAssessment = useCallback(
        (session: Session, assessment: Assessment) => {
            setShowAnnouncements(false);
            setShowLeaderboard(false);
            setActiveSession(session);
            setActiveAssessment(assessment);
            setActiveContent(null);
            setActiveGame(null);
            setMobilePanel('content');
            markViewed(assessment.id);
        },
        [markViewed],
    );
    const handleSelectGame = useCallback((session: Session, game: Game) => {
        setShowAnnouncements(false);
        setShowLeaderboard(false);
        setActiveSession(session);
        setActiveGame(game);
        setActiveContent(null);
        setActiveAssessment(null);
        setMobilePanel('content');
    }, []);
    const handleSelectSession = useCallback(
        (session: Session) => {
            setShowAnnouncements(false);
            setShowLeaderboard(false);
            setActiveSession(session);
            setActiveGame(null);
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
            if (content.type === 'flipbook') {
                clearFlipbookDraft(
                    flipbookDraftKey(auth.user?.id, courseId, sessionId),
                );
            }
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
                    content.type === 'flipbook'
                        ? {
                              type: content.type,
                              title: content.title,
                              description: content.description,
                              pages: content.pages,
                          }
                        : {
                              type: content.type,
                              title: content.title,
                              description: content.description,
                              url: content.url,
                          },
                );
                if (content.type === 'flipbook') {
                    clearFlipbookDraft(
                        flipbookDraftKey(auth.user?.id, courseId, sessionId),
                    );
                    toast(`"${content.title}" flipbook saved`, 'success');
                }
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
            } else if (content.type === 'flipbook') {
                toast(`Flipbook not saved: ${(e as Error).message}`, 'error');
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
            } else if (content.type === 'flipbook') {
                capi('PUT', `/curriculum/${courseId}/content/${content.dbId}`, {
                    title: content.title,
                    description: content.description,
                    pages: content.pages,
                })
                    .then(() => {
                        clearFlipbookDraft(
                            flipbookDraftKey(
                                auth.user?.id,
                                courseId,
                                sessionId,
                                content.dbId,
                            ),
                        );
                        toast(`"${content.title}" flipbook saved`, 'success');
                    })
                    .catch((e: Error) =>
                        toast(`Flipbook not saved: ${e.message}`, 'error'),
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

    const courseWorld = worldFor({ title: course.courseTitle });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={`${course.courseTitle} — ${isStudent ? 'My Course' : 'My Class'}`}
            />
            <div
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
                style={worldStyle(courseWorld) as CSSProperties}
            >
                {/* Header */}
                <div className="shrink-0 border-b bg-card">
                    <div
                        aria-hidden
                        className="h-1"
                        style={{ backgroundColor: courseWorld.accent }}
                    />
                    {/* Title row */}
                    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
                        <Link href="/my-course">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="size-9 shrink-0 p-0 text-muted-foreground hover:text-primary sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    {isStudent ? 'My Course' : 'My Class'}
                                </span>
                            </Button>
                        </Link>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            <h1 className="truncate font-display text-lg leading-tight font-extrabold tracking-[-0.02em] text-foreground sm:text-xl">
                                {course.courseTitle}
                            </h1>
                            <WorldChip
                                world={courseWorld}
                                className="hidden sm:inline-flex"
                            />
                        </div>
                        {!isStudent &&
                            propCanEdit &&
                            (effectiveEditMode ? (
                                <Button
                                    size="sm"
                                    className={`h-9 shrink-0 gap-1.5 bg-emerald-600 text-xs text-white [--press:var(--color-emerald-800)] hover:bg-emerald-600 sm:text-sm ${wiggleDone ? 'animate-wiggle' : ''}`}
                                    onClick={() => setConfirmSaveOpen(true)}
                                >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        Done Editing
                                    </span>
                                    <span className="sm:hidden">Done</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 shrink-0 gap-1.5"
                                    onClick={() => setConfirmEditOpen(true)}
                                >
                                    <Pencil className="size-4" />
                                    <span className="hidden sm:inline">
                                        Edit course
                                    </span>
                                </Button>
                            ))}
                    </div>

                    {/* Edit mode banner */}
                    {effectiveEditMode && (
                        <div className="flex items-center gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                Editing mode
                            </span>
                            <span className="text-amber-300 dark:text-amber-700">
                                ·
                            </span>
                            <span className="hidden text-xs text-amber-600 sm:inline dark:text-amber-500">
                                Drag lessons to reorder · Click a lesson to
                                manage its content
                            </span>
                        </div>
                    )}

                    {/* Mobile tab toggle — always visible on mobile */}
                    <div className="flex border-t border-gray-100 md:hidden dark:border-gray-800">
                        <button
                            onClick={() => setMobilePanel('curriculum')}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm font-bold transition-all ${mobilePanel === 'curriculum' ? 'border-primary text-primary dark:text-violet-300' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            Curriculum
                        </button>
                        <button
                            onClick={() => setMobilePanel('content')}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm font-bold transition-all ${mobilePanel === 'content' ? 'border-primary text-primary dark:text-violet-300' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            <Play className="h-3.5 w-3.5" />
                            Content
                        </button>
                        {effectiveEditMode && (
                            <button
                                onClick={() => setMobilePanel('curriculum')}
                                className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-400 hover:text-violet-600"
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
                                        setShowLeaderboard(false);
                                        setActiveSession(null);
                                        setActiveContent(null);
                                        setActiveAssessment(null);
                                        setActiveGame(null);
                                        setMobilePanel('content');
                                    }}
                                    className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                                        !activeSession &&
                                        !activeContent &&
                                        !activeAssessment
                                            ? 'bg-primary text-primary-foreground shadow-[0_3px_0_0_var(--press)]'
                                            : 'border-2 border-border bg-card text-foreground hover:border-primary/40'
                                    }`}
                                >
                                    <div
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                            !activeSession &&
                                            !activeContent &&
                                            !activeAssessment
                                                ? 'bg-white/20'
                                                : 'bg-muted'
                                        }`}
                                    >
                                        <Info className="h-4 w-4" />
                                    </div>
                                    <span>Course Overview</span>
                                </button>
                            </div>

                            <div className="flex shrink-0 items-center justify-between px-4 py-2">
                                <p className="font-display text-base font-bold text-foreground">
                                    Your path
                                </p>
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <span>
                                        {course.modules.length}{' '}
                                        {course.modules.length === 1
                                            ? 'module'
                                            : 'modules'}
                                    </span>
                                    <span>·</span>
                                    <span>
                                        {totalSessions}{' '}
                                        {totalSessions === 1
                                            ? 'lesson'
                                            : 'lessons'}
                                    </span>
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
                                            activeGameId={
                                                activeGame?.id ?? null
                                            }
                                            activeAssessmentId={
                                                activeAssessment?.id ?? null
                                            }
                                            onSelectContent={
                                                handleSelectContent
                                            }
                                            onSelectGame={handleSelectGame}
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
                                                    className="h-8 bg-primary text-white hover:bg-primary/90"
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
                                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-3 text-sm font-medium text-primary transition hover:bg-primary/5 dark:border-violet-700 dark:text-violet-400"
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

                            {courseId && (
                                <LeaderboardFooterButton
                                    active={showLeaderboard}
                                    onOpen={() => {
                                        setShowLeaderboard(true);
                                        setShowAnnouncements(false);
                                        setActiveSession(null);
                                        setActiveContent(null);
                                        setActiveAssessment(null);
                                        setActiveGame(null);
                                        setMobilePanel('content');
                                    }}
                                />
                            )}
                            <AnnouncementFooterButton
                                announcements={announcements}
                                active={showAnnouncements}
                                onOpen={() => {
                                    setShowAnnouncements(true);
                                    setShowLeaderboard(false);
                                    setActiveSession(null);
                                    setActiveContent(null);
                                    setActiveAssessment(null);
                                    setActiveGame(null);
                                    setMobilePanel('content');
                                }}
                            />
                        </div>
                    </aside>

                    {/* Right panel */}
                    <main
                        className={`flex-1 overflow-hidden bg-card ${mobilePanel === 'content' ? 'flex flex-col' : 'hidden'} md:flex md:flex-col`}
                    >
                        {/* Leaderboard and announcements (opened from the sidebar buttons) */}
                        {showLeaderboard && courseId ? (
                            <CourseLeaderboard courseId={courseId} />
                        ) : showAnnouncements ? (
                            <AnnouncementsPanel
                                announcements={announcements}
                                setAnnouncements={setAnnouncements}
                            />
                        ) : effectiveEditMode && liveActiveSession ? (
                            <ContentPanelEditor
                                key={liveActiveSession.id}
                                session={liveActiveSession}
                                courseId={courseId}
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
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                                    <Pencil className="h-8 w-8 text-gray-300" />
                                </div>
                                <div className="max-w-xs">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                        Select a lesson
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-500">
                                        Click any lesson in the sidebar to
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
                                        {activeSession
                                            ? lessonLabel(activeSession.title)
                                            : null}
                                    </span>
                                    <ChevronRight className="h-3 w-3 shrink-0" />
                                    <span
                                        className={`font-semibold ${activeAssessment.kind === 'quiz' ? 'text-primary' : 'text-amber-500'}`}
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
                        ) : activeGame ? (
                            <GamePreview
                                key={activeGame.id}
                                game={activeGame}
                                completed={
                                    !!activeGame.dbId &&
                                    completedGames.has(activeGame.dbId)
                                }
                                isStudent={isStudent}
                                world={courseWorld}
                            />
                        ) : activeContent ? (
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                {/* Fixed content header */}
                                <div className="shrink-0 border-b border-gray-100 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-800 dark:bg-gray-950">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                            <BookOpen className="h-3 w-3 shrink-0" />
                                            <span className="truncate">
                                                {activeSession
                                                    ? lessonLabel(
                                                          activeSession.title,
                                                      )
                                                    : null}
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
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                                    <BookOpen className="h-8 w-8 text-gray-300" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold tracking-wider text-primary/60 uppercase">
                                        Selected lesson
                                    </p>
                                    <h3 className="mt-1 text-xl font-bold text-foreground">
                                        {lessonLabel(activeSession.title)}
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-500">
                                        No content uploaded for this lesson yet.
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
                                        <h2 className="text-xl font-bold text-foreground">
                                            {course.courseTitle}
                                        </h2>
                                    </div>

                                    {/* Description */}
                                    {course.description && (
                                        <div className="rounded-2xl bg-muted/50 p-4">
                                            <div className="mb-2 flex items-center gap-2">
                                                <Info className="h-4 w-4 shrink-0 text-primary/60" />
                                                <h3 className="text-sm font-semibold text-foreground/85">
                                                    About this Course
                                                </h3>
                                            </div>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                                {course.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Instructor */}
                                    {courseData?.instructor && (
                                        <div className="rounded-2xl bg-muted/50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4 shrink-0 text-primary/60" />
                                                <h3 className="text-sm font-semibold text-foreground/85">
                                                    Instructor
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-violet-900/30">
                                                    <User className="h-5 w-5 text-primary dark:text-violet-300" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
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
                                    <div className="rounded-2xl bg-muted/50 p-4">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Layers className="h-4 w-4 shrink-0 text-primary/60" />
                                            <h3 className="text-sm font-semibold text-foreground/85">
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
                                                                className="flex items-center gap-2 text-sm text-muted-foreground"
                                                            >
                                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary dark:bg-violet-900/30 dark:text-violet-300">
                                                                    {i + 1}
                                                                </span>
                                                                <span className="flex-1 truncate">
                                                                    {mod.title}
                                                                </span>
                                                                <span className="shrink-0 text-xs text-gray-400">
                                                                    {count}{' '}
                                                                    lesson
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
                            !showLeaderboard &&
                            (activeContent || activeAssessment) &&
                            navLessons.length > 1 && (
                                <div className="shrink-0 border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                                    <div
                                        className="h-1 w-full bg-muted"
                                        role="progressbar"
                                        aria-valuenow={currentNavIndex + 1}
                                        aria-valuemin={1}
                                        aria-valuemax={navLessons.length}
                                        aria-label="Lesson progress"
                                    >
                                        <div
                                            className="h-full bg-primary transition-all duration-300 motion-reduce:transition-none dark:bg-violet-500"
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
                                            className="h-auto min-h-[44px] min-w-0 gap-1.5 bg-primary py-2 text-white hover:bg-primary/90 disabled:opacity-50"
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
                        <h2 className="text-base font-bold text-foreground">
                            Edit this course?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            You'll enter editing mode where you can rename
                            lessons, add content and rearrange the curriculum.
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
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-primary transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30"
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
                        <h2 className="text-base font-bold text-foreground">
                            Exit Editing Mode?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
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
                        <h2 className="text-base font-bold text-foreground">
                            Leave editing mode?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
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
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-primary transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30"
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
                        <h2 className="text-base font-bold text-foreground">
                            Mark as Completed?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                            Mark{' '}
                            <span className="font-semibold text-foreground/85">
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
                                          : 'bg-violet-100 text-violet-600'
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
                                <p className="text-sm font-semibold text-foreground">
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
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all duration-200 ${
                                    upload?.status === 'success'
                                        ? 'bg-emerald-500'
                                        : upload?.status === 'error'
                                          ? 'bg-red-400'
                                          : 'bg-primary'
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
