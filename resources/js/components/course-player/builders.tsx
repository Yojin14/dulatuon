import {
    GAME_ITEM_LABELS,
    GAME_TYPE_META,
    SIMULATION_GAMES,
    SIMULATION_NOTES,
    capiFormProgress,
    uid,
} from '@/components/course-player/helpers';
import {
    type Assessment,
    type Assignment,
    type ContentItem,
    type ContentType,
    type Game,
    type GameItem,
    type GameType,
    type Meeting,
    type Quiz,
    type QuizQuestion,
} from '@/components/course-player/types';
import {
    clearFlipbookDraft,
    flipbookDraftKey,
    formatDraftTime,
    readFlipbookDraft,
    useFlipbookAutosave,
    type FlipbookDraft,
} from '@/components/flipbook/flipbook-draft';
import { type FlipbookImageUploader } from '@/components/flipbook/flipbook-editor';
import {
    newPage,
    pagesForSave,
    type FlipbookPage,
} from '@/components/flipbook/flipbook-types';
import { AnswerTile } from '@/components/game/quiz/answer-tile';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BookOpen,
    CheckCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    File,
    FileText,
    Globe,
    Heart,
    History,
    Link2,
    PenLine,
    Pencil,
    PlayCircle,
    Plus,
    Trash2,
    Trophy,
    Upload,
    Video,
    type LucideIcon,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';

// Flipbook builder and reader download only when a flipbook is opened.
const FlipbookEditor = lazy(
    () => import('@/components/flipbook/flipbook-editor'),
);

// ─── Content Picker (Add & Edit) ──────────────────────────────────────────────
export interface ContentPickerProps {
    initial?: ContentItem;
    courseId?: string;
    lessonId: string;
    resumeDraft?: boolean;
    onSave: (item: ContentItem) => void;
    onCancel: () => void;
}

export const FILE_ACCEPT: Record<ContentType, string> = {
    pdf: 'application/pdf,.pdf',
    word: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword',
    video: 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov',
    youtube: '',
    flipbook: '',
};

export const CONTENT_TYPE_OPTIONS: {
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

export function ContentPicker({
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
export interface QuizBuilderProps {
    initial?: Quiz;
    onSave: (quiz: Quiz) => void;
    onCancel: () => void;
}
export function QuizBuilder({ initial, onSave, onCancel }: QuizBuilderProps) {
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
export interface AssignmentBuilderProps {
    initial?: Assignment;
    onSave: (a: Assignment) => void;
    onCancel: () => void;
}
export function AssignmentBuilder({
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
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none"
            />
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Due Date (optional)
                    </label>
                    <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>
                <div className="w-28">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
            <div className="flex gap-2 border-t border-border pt-3">
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
export interface AssessmentPickerProps {
    onAdd: (a: Assessment) => void;
    onCancel: () => void;
}
export function AssessmentPicker({ onAdd, onCancel }: AssessmentPickerProps) {
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
                        className="ml-auto text-xs text-muted-foreground hover:text-violet-600"
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
                        className="ml-auto text-xs text-muted-foreground hover:text-violet-600"
                    >
                        ← Back
                    </button>
                </div>
                <AssignmentBuilder onSave={onAdd} onCancel={onCancel} />
            </div>
        );
    return (
        <>
            <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Add Assessment
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setMode('quiz')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-card p-4 shadow-sm transition hover:border-primary/30 hover:bg-primary/5"
                >
                    <ClipboardList className="h-7 w-7 text-primary" />
                    <span className="text-sm font-semibold">Quiz</span>
                    <span className="text-[10px] text-muted-foreground">
                        Multiple choice questions
                    </span>
                </button>
                <button
                    onClick={() => setMode('assignment')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-card p-4 shadow-sm transition hover:border-amber-400 hover:bg-amber-50"
                >
                    <PenLine className="h-7 w-7 text-amber-500" />
                    <span className="text-sm font-semibold">Assignment</span>
                    <span className="text-[10px] text-muted-foreground">
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

export const WORLD_ZONES = [
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

export const TZ_GROUPS = [
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

export function tzLabel(tz: string) {
    return tz.replace(/_/g, ' ').replace('/', ' / ');
}

export interface MeetingBuilderProps {
    initial?: Meeting;
    onSave: (m: Meeting) => void;
    onCancel: () => void;
}
export function MeetingBuilder({
    initial,
    onSave,
    onCancel,
}: MeetingBuilderProps) {
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
                    <Link2 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
                    <p className="text-[11px] text-muted-foreground">
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
                <p className="text-[11px] text-muted-foreground">
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
                                            : 'border-border bg-muted/50 hover:border-violet-200 hover:bg-violet-50/50'
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
                                        <p className="truncate text-[10px] text-muted-foreground">
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
                    <span className="font-normal text-muted-foreground">
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

export interface GameBuilderProps {
    initial?: Game;
    onSave: (g: Game) => void;
    onCancel: () => void;
}
export function GameBuilder({ initial, onSave, onCancel }: GameBuilderProps) {
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
                                <span className="text-[11px] leading-snug text-muted-foreground">
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
            <p className="-mt-3 text-[11px] text-muted-foreground">
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
                            className={`ml-1 font-normal ${itemsError ? 'text-red-500' : 'text-muted-foreground'}`}
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
                            className="rounded-xl border border-border bg-card p-3"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                    #{idx + 1}
                                </span>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        className="rounded p-1 text-muted-foreground/60 hover:text-red-400"
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
                    <p className="text-[11px] text-muted-foreground">
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
