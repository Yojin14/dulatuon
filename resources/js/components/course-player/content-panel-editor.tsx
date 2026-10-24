import {
    AssessmentPicker,
    AssignmentBuilder,
    ContentPicker,
    GameBuilder,
    MeetingBuilder,
    QuizBuilder,
} from '@/components/course-player/builders';
import {
    CONTENT_META,
    GAME_TYPE_META,
    SIMULATION_GAMES,
    lessonLabel,
} from '@/components/course-player/helpers';
import {
    type Assessment,
    type ContentItem,
    type Game,
    type Meeting,
    type Session,
} from '@/components/course-player/types';
import {
    flipbookDraftKey,
    formatDraftTime,
    readFlipbookDraft,
} from '@/components/flipbook/flipbook-draft';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ClipboardList,
    ExternalLink,
    History,
    PenLine,
    Pencil,
    Plus,
    Trash2,
    Video,
} from 'lucide-react';
import { useState } from 'react';

// ─── Content Panel Editor (right panel, edit mode) ────────────────────────────
export interface ContentPanelEditorProps {
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
export function ContentPanelEditor({
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
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-violet-600"
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
                            if (mode === 'edit-content') {
                                onUpdateContent(item);
                            } else {
                                onAddContent(item);
                            }
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
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-violet-600"
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
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600"
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
                            if (mode === 'edit-meeting') {
                                onUpdateMeeting(m);
                            } else {
                                onAddMeeting(m);
                            }
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
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-violet-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {mode === 'edit-game' ? 'Edit Game' : 'Add Game'}
                    </button>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
                    <GameBuilder
                        initial={editingGame ?? undefined}
                        onSave={(g) => {
                            if (mode === 'edit-game') {
                                onUpdateGame(g);
                            } else {
                                onAddGame(g);
                            }
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
            <div className="shrink-0 border-b border-border px-5 py-3.5">
                <p className="truncate text-sm font-semibold text-foreground">
                    {lessonLabel(session.title)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
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

            <div className="flex-1 divide-y divide-border overflow-y-auto">
                {/* Materials */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
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
                                        <p className="text-[11px] text-muted-foreground">
                                            {CONTENT_META[c.type].label}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                                        <button
                                            onClick={() => {
                                                setEditingContent(c);
                                                setMode('edit-content');
                                            }}
                                            className="rounded p-1 text-muted-foreground/60 transition hover:text-violet-500"
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
                                            className="rounded p-1 text-muted-foreground/60 transition hover:text-red-400"
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
                        <span className="text-[11px] font-medium text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
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
                                        <p className="text-[11px] text-muted-foreground">
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
                                            className="rounded p-1 text-muted-foreground/60 transition hover:text-violet-500"
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
                                            className="rounded p-1 text-muted-foreground/60 transition hover:text-red-400"
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
                        <span className="text-[11px] font-medium text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
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
                                            <p className="text-[11px] text-muted-foreground">
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
                                                className="rounded p-1 text-muted-foreground/60 transition hover:text-violet-500"
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
                                                className="rounded p-1 text-muted-foreground/60 transition hover:text-red-400"
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
                        <span className="text-[11px] font-medium text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground">
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
                                            <p className="text-[11px] text-muted-foreground">
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
                                                className="rounded p-1 text-muted-foreground/60 transition hover:text-violet-500"
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
                                                className="rounded p-1 text-muted-foreground/60 transition hover:text-red-400"
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
