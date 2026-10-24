import {
    GAME_TYPE_META,
    SIMULATION_GAMES,
    extractYouTubeId,
    isIOSDevice,
    noopSubscribe,
} from '@/components/course-player/helpers';
import {
    type Assignment,
    type AssignmentSubmission,
    type ContentItem,
    type Game,
    type Quiz,
} from '@/components/course-player/types';
import { HudPill } from '@/components/game/hud-pill';
import { ProgressRing } from '@/components/game/progress-ring';
import { AnswerTile } from '@/components/game/quiz/answer-tile';
import { GameLivePreview } from '@/components/games/game-live-preview';
import { GameInsights } from '@/components/leaderboard/game-insights';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type WorldTheme } from '@/lib/worlds';
import { FilePdf } from '@phosphor-icons/react';
import {
    BarChart3,
    Calendar,
    CheckCircle2,
    ClipboardList,
    Download,
    ExternalLink,
    File,
    FilePlus,
    FileText,
    Heart,
    Link2,
    PenLine,
    Play,
    PlayCircle,
    RefreshCw,
    RotateCcw,
    Send,
    Star,
    Trophy,
    Type,
    Video,
    XCircle,
} from 'lucide-react';
import { Suspense, lazy, useRef, useState, useSyncExternalStore } from 'react';

// The editor (tiptap) only downloads when a student opens a written answer.
const RichTextEditor = lazy(() =>
    import('@/components/rich-text-editor').then((m) => ({
        default: m.RichTextEditor,
    })),
);
const FlipbookReader = lazy(
    () => import('@/components/flipbook/flipbook-reader'),
);

// ─── PDF Viewer ─────────────────────────────────────────────────────────────
export function PdfViewer({ content }: { content: ContentItem }) {
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
                <p className="text-sm text-muted-foreground">
                    No file uploaded yet.
                </p>
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
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {content.filename}
                            </p>
                        )}
                        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
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
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-foreground/85 transition hover:bg-muted/50"
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
export function ContentViewer({ content }: { content: ContentItem }) {
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
                    <PlayCircle className="h-12 w-12 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
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
                    <p className="mt-1 text-sm text-muted-foreground">
                        {content.filename}
                    </p>
                )}
                {content.description && (
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                    No file uploaded yet.
                </p>
            )}
        </div>
    );
}

// ─── Game Preview ─────────────────────────────────────────────────────────────
/**
 * What a game is before you launch it: the game itself playing on a loop, the rules
 * in brief. Only "Play" opens the game tab.
 */
export function GamePreview({
    game,
    completed,
    world,
    insightsCourseId = null,
}: {
    game: Game;
    completed: boolean;
    world: WorldTheme;
    /** Teachers and admins: the course id, which adds an Insights tab with class results. */
    insightsCourseId?: number | string | null;
}) {
    const [view, setView] = useState<'preview' | 'insights'>('preview');
    const canSeeInsights = insightsCourseId !== null && game.dbId !== undefined;
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
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
                {canSeeInsights && (
                    <div
                        role="tablist"
                        aria-label="Game view"
                        className="mb-4 grid w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:w-72"
                    >
                        {(['preview', 'insights'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                role="tab"
                                aria-selected={view === tab}
                                onClick={() => setView(tab)}
                                className={`flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${view === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {tab === 'preview' ? (
                                    <Play className="size-3.5" />
                                ) : (
                                    <BarChart3 className="size-3.5" />
                                )}
                                {tab === 'preview' ? 'Preview' : 'Insights'}
                            </button>
                        ))}
                    </div>
                )}
                {canSeeInsights && view === 'insights' ? (
                    <GameInsights
                        courseId={insightsCourseId}
                        gameId={game.dbId!}
                    />
                ) : (
                    <section className="overflow-hidden rounded-3xl bg-game-night text-white">
                        {/* The game itself, playing on a loop */}
                        <GameLivePreview
                            gameType={game.gameType}
                            biome={world.biome}
                            className={
                                isSimulation
                                    ? 'h-[clamp(12rem,38svh,20rem)]'
                                    : 'min-h-64'
                            }
                        />
                        <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                            <div className="min-w-0">
                                <HudPill tone="light">
                                    <meta.icon />
                                    {meta.label} ·{' '}
                                    {isSimulation ? '3D lab' : 'Game'}
                                </HudPill>
                                <h2 className="mt-2.5 font-display text-[clamp(1.4rem,3vw,1.9rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
                                    {game.title}
                                </h2>
                                <p className="mt-1 max-w-[56ch] text-sm text-white/70">
                                    {game.description || meta.tagline}
                                </p>
                                <div className="mt-3.5 flex flex-wrap gap-1.5">
                                    {completed && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/30">
                                            <CheckCircle2 className="size-3.5" />
                                            Cleared
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold ring-1 ring-white/10">
                                        <Trophy className="size-3.5 text-amber-300" />
                                        {game.points} pts
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold ring-1 ring-white/10">
                                        <Heart className="size-3.5 text-rose-300" />
                                        {livesLabel}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold ring-1 ring-white/10">
                                        <ClipboardList className="size-3.5 text-sky-300" />
                                        {itemsLabel}
                                    </span>
                                </div>
                            </div>
                            {playUrl ? (
                                <Button
                                    asChild
                                    variant="play"
                                    size="lg"
                                    className="h-12 w-full shrink-0 text-base sm:w-auto sm:min-w-40"
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
                                    className="h-12 w-full shrink-0 text-base sm:w-auto"
                                    disabled
                                >
                                    Save the course to play
                                </Button>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

// ─── Quiz Viewer ──────────────────────────────────────────────────────────────
export interface QuizSavedState {
    answers: (number | null)[];
    submitted: boolean;
}

export function QuizViewer({
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
export const ACCEPTED_TYPES =
    '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.heic';
export const ACCEPTED_LABEL =
    'PDF, Word (.docx), Excel (.xlsx), or image files';

export function fmtBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssignmentViewer({
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
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                            <span>
                                Due: <strong>{assignment.dueDate}</strong>
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                    <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                        <div className="mt-3 rounded-lg border border-emerald-100 bg-card px-4 py-3 dark:border-emerald-900">
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
                            className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-100 bg-card px-3 py-2.5 text-sm font-medium text-emerald-700 hover:underline dark:border-emerald-900 dark:text-emerald-400"
                        >
                            <Video className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                                {submission.videoUrl}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                    ) : (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-100 bg-card px-3 py-2.5 dark:border-emerald-900">
                            <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {submission.fileName}
                                </p>
                                {submission.fileSize && (
                                    <p className="text-xs text-muted-foreground">
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
                <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                            <p className="text-xs text-muted-foreground">
                                Accepted: {ACCEPTED_LABEL}
                            </p>
                            <label
                                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                                    file
                                        ? 'border-amber-300 bg-amber-50/50'
                                        : 'border-border hover:border-amber-300 hover:bg-amber-50/30'
                                }`}
                            >
                                <FilePlus
                                    className={`h-8 w-8 ${file ? 'text-amber-400' : 'text-muted-foreground/60'}`}
                                />
                                {file ? (
                                    <div>
                                        <p className="text-sm font-semibold text-amber-700">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {fmtBytes(file.size)}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Click to choose a file
                                        </p>
                                        <p className="text-xs text-muted-foreground">
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
                            <p className="text-xs text-muted-foreground">
                                Paste a link to your video (YouTube, Google
                                Drive, Vimeo, etc.)
                            </p>
                            <div className="relative">
                                <Link2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) =>
                                        setVideoUrl(e.target.value)
                                    }
                                    placeholder="https://youtu.be/…"
                                    className="w-full rounded-lg border border-border bg-card py-2.5 pr-3 pl-9 text-sm text-foreground outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
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
