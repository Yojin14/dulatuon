import {
    CONTENT_META,
    GAME_TYPE_META,
    lessonLabel,
} from '@/components/course-player/helpers';
import {
    type Assessment,
    type ContentItem,
    type CourseModule,
    type Game,
    type LessonGroup,
    type ModuleItem,
    type Session,
} from '@/components/course-player/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
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
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    GripVertical,
    Layers,
    Lock,
    PenLine,
    Pencil,
    Play,
    Plus,
    Trash2,
    Video,
} from 'lucide-react';
import { memo, useRef, useState } from 'react';

// ─── Sidebar Session (with drag-and-drop support) ─────────────────────────────
export interface SidebarSessionProps {
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
export const SidebarSession = memo(function SidebarSession({
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
                className={`group/sess flex items-center gap-2 rounded-xl px-3 py-3 transition-all ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'bg-primary/10 text-primary dark:bg-violet-900/20 dark:text-violet-300' : 'text-foreground/85 hover:bg-muted dark:text-muted-foreground/60'}`}
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
                        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}
                <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'bg-primary/20' : locked ? 'bg-muted' : 'bg-muted'}`}
                >
                    {locked ? (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                    ) : (
                        <BookOpen
                            className={`h-3 w-3 ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'text-primary' : 'text-muted-foreground'}`}
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
                            className={`shrink-0 text-[10px] font-medium ${isActive && !activeContentId && !activeAssessmentId && !activeGameId ? 'text-primary/50' : 'text-muted-foreground'}`}
                        >
                            {subItemCount}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSubOpen((o) => !o);
                            }}
                            className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:text-muted-foreground"
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
                            className="rounded p-1 text-muted-foreground hover:text-violet-600"
                            onClick={() => {
                                setRenaming(true);
                                setRenameVal(session.title);
                            }}
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            className="rounded p-1 text-muted-foreground hover:text-red-500"
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
                                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-sm transition-all ${activeContentId === c.id ? 'bg-primary/10 text-primary dark:bg-violet-900/20 dark:text-violet-300' : 'text-muted-foreground hover:bg-accent'}`}
                            >
                                <span
                                    className={`shrink-0 ${activeContentId === c.id ? 'text-primary' : 'text-muted-foreground'}`}
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
                                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-sm transition-all ${activeAssessmentId === a.id ? 'bg-amber-500 text-white' : 'text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}
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
                                className="flex items-center gap-2 rounded-md px-3 py-3 text-sm text-muted-foreground transition-all hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
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
                                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-3 text-left text-sm transition-all ${selected ? 'bg-primary/10 text-primary dark:bg-violet-900/20 dark:text-violet-300' : 'text-muted-foreground hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/20'}`}
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
export interface SidebarLessonGroupProps {
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
export const SidebarLessonGroup = memo(function SidebarLessonGroup({
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
                            className="rounded p-1 text-muted-foreground hover:text-violet-600"
                            onClick={() => {
                                setRenaming(true);
                                setRenameVal(group.title);
                            }}
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            className="rounded p-1 text-muted-foreground hover:text-red-500"
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
export interface SidebarModuleProps {
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
export const SidebarModule = memo(function SidebarModule({
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
                    <p className="text-[11px] text-muted-foreground">
                        {sessionCount}{' '}
                        {sessionCount === 1 ? 'lesson' : 'lessons'}
                    </p>
                </div>
                {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
            </button>

            {/* Top edit bar: rename */}
            {editMode && !renaming && (
                <div className="flex items-center gap-1 border-t border-border px-4 py-1.5">
                    <button
                        className="rounded p-1 text-muted-foreground hover:text-violet-600"
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
                <div className="space-y-0.5 border-t border-border px-2 pt-1.5 pb-2">
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
                        <div className="mt-2 border-t border-dashed border-border pt-2">
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
                <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
                    <button
                        onClick={() =>
                            onTogglePrerequisite?.(!mod.prerequisite)
                        }
                        title="When enabled, students must complete each lesson before opening the next"
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                            mod.prerequisite
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'text-muted-foreground hover:bg-muted hover:text-purple-600'
                        }`}
                    >
                        <Layers className="h-3 w-3" />
                        Progressive
                        {mod.prerequisite && (
                            <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-purple-500" />
                        )}
                    </button>
                    <button
                        className="rounded p-1 text-muted-foreground hover:text-red-500"
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

export const LEVEL_COLORS: Record<string, string> = {
    Beginner:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Intermediate:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
export const STATUS_COLORS: Record<string, string> = {
    published:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived: 'bg-muted text-muted-foreground dark:text-muted-foreground',
};
