import {
    type AnnouncementData,
    AnnouncementFooterButton,
    AnnouncementsPanel,
} from '@/components/course-player/announcements';
import {
    CONTENT_META,
    capi,
    capiFormProgress,
    extractYouTubeId,
    lessonLabel,
} from '@/components/course-player/helpers';
import {
    LEVEL_COLORS,
    STATUS_COLORS,
    SidebarModule,
} from '@/components/course-player/sidebar';
import {
    type Assessment,
    type AssignmentSubmission,
    type ContentItem,
    type Course,
    type CourseData,
    type CourseModule,
    type Game,
    type LessonGroup,
    type Meeting,
    type ModuleItem,
    type Session,
} from '@/components/course-player/types';
import {
    AssignmentViewer,
    ContentViewer,
    GamePreview,
    type QuizSavedState,
    QuizViewer,
} from '@/components/course-player/viewers';
import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import {
    clearFlipbookDraft,
    flipbookDraftKey,
} from '@/components/flipbook/flipbook-draft';
import {
    CourseLeaderboard,
    LeaderboardFooterButton,
} from '@/components/leaderboard/course-leaderboard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { WorldChip } from '@/components/world/world-scope';
import AppLayout from '@/layouts/app-layout';
import { toast } from '@/lib/toast';
import { worldFor, worldStyle } from '@/lib/worlds';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FolderOpen,
    GraduationCap,
    GripVertical,
    Info,
    Layers,
    LayoutList,
    Maximize,
    Megaphone,
    Minimize,
    Pencil,
    Play,
    Plus,
    Trophy,
    Upload,
    User,
    XCircle,
} from 'lucide-react';
import {
    type CSSProperties,
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

// Teachers' edit panel (and every builder behind it) only downloads in edit mode.
const ContentPanelEditor = lazy(() =>
    import('@/components/course-player/content-panel-editor').then((m) => ({
        default: m.ContentPanelEditor,
    })),
);

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

// ─── Teacher Course Detail ────────────────────────────────────────────────────
const COURSE_PANEL_KEY = 'dulatuon:course-panel';

/** The lesson panel folded into a slim rail: modules, leaderboard and announcements stay one click away. */
function CourseRail({
    modules,
    onExpand,
    onOpenLeaderboard,
    onOpenAnnouncements,
    leaderboardActive,
    announcementsActive,
    showLeaderboard,
}: {
    modules: CourseModule[];
    onExpand: () => void;
    onOpenLeaderboard: () => void;
    onOpenAnnouncements: () => void;
    leaderboardActive: boolean;
    announcementsActive: boolean;
    showLeaderboard: boolean;
}) {
    const railButton =
        'flex size-10 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

    return (
        <nav
            aria-label="Course path"
            className="hidden min-h-0 w-full flex-1 flex-col items-center gap-2 py-3 md:flex"
        >
            <button
                type="button"
                onClick={onExpand}
                className={railButton}
                aria-label="Show lesson panel"
                title="Show lesson panel"
            >
                <ChevronsRight className="size-5" />
            </button>
            <span className="h-px w-8 bg-border" aria-hidden />
            <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto">
                {modules.map((mod, i) => (
                    <button
                        key={mod.id}
                        type="button"
                        onClick={onExpand}
                        title={mod.title}
                        aria-label={`Module ${i + 1}: ${mod.title}`}
                        className="grid size-9 shrink-0 cursor-pointer place-items-center bg-primary font-display text-sm font-extrabold text-primary-foreground transition-opacity [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)] hover:opacity-85"
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
            <span className="h-px w-8 bg-border" aria-hidden />
            {showLeaderboard && (
                <button
                    type="button"
                    onClick={onOpenLeaderboard}
                    className={`${railButton} ${leaderboardActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : ''}`}
                    aria-label="Leaderboard"
                    title="Leaderboard"
                >
                    <Trophy className="size-5" />
                </button>
            )}
            <button
                type="button"
                onClick={onOpenAnnouncements}
                className={`${railButton} ${announcementsActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : ''}`}
                aria-label="Announcements"
                title="Announcements"
            >
                <Megaphone className="size-5" />
            </button>
        </nav>
    );
}

function TeacherCourseDetail({ isStudent = false }: { isStudent?: boolean }) {
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
    // Lesson panel folded to a rail, remembered per browser.
    const [panelCollapsed, setPanelCollapsedState] = useState(() => {
        try {
            return (
                window.localStorage.getItem(COURSE_PANEL_KEY) === 'collapsed'
            );
        } catch {
            return false;
        }
    });
    const setPanelCollapsed = (collapsed: boolean) => {
        setPanelCollapsedState(collapsed);
        try {
            window.localStorage.setItem(
                COURSE_PANEL_KEY,
                collapsed ? 'collapsed' : 'open',
            );
        } catch {
            /* storage unavailable: the choice lasts for this visit */
        }
    };
    // Focus mode: only the course header and the lesson remain on screen.
    const [focusMode, setFocusMode] = useState(false);
    useEffect(() => {
        if (!focusMode) {
            return;
        }
        document.body.dataset.courseFocus = 'true';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                setFocusMode(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            delete document.body.dataset.courseFocus;
            window.removeEventListener('keydown', onKey);
        };
    }, [focusMode]);
    const railOnly = panelCollapsed || focusMode;
    useEffect(() => {
        document.body.dataset.coursePage = 'true';
        return () => {
            delete document.body.dataset.coursePage;
        };
    }, []);
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
    // Materials marked done plus games cleared, across the whole course.
    const courseItemProgress = useMemo(() => {
        let total = 0;
        let done = 0;
        for (const mod of course.modules) {
            for (const item of mod.items) {
                const sessions =
                    item.itemType === 'lesson-group' ? item.sessions : [item];
                for (const sess of sessions) {
                    for (const c of sess.contents) {
                        total++;
                        if (c.dbId && completedContents.has(c.dbId)) done++;
                    }
                    for (const g of sess.games ?? []) {
                        total++;
                        if (g.dbId && completedGames.has(g.dbId)) done++;
                    }
                }
            }
        }
        return { total, done };
    }, [course.modules, completedContents, completedGames]);
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
    }, [course]);

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

    const openPanel = (panel: 'overview' | 'leaderboard' | 'announcements') => {
        setShowLeaderboard(panel === 'leaderboard');
        setShowAnnouncements(panel === 'announcements');
        setActiveSession(null);
        setActiveContent(null);
        setActiveAssessment(null);
        setActiveGame(null);
        setMobilePanel('content');
    };
    const overviewActive =
        !activeSession &&
        !activeContent &&
        !activeAssessment &&
        !activeGame &&
        !showLeaderboard &&
        !showAnnouncements;
    const landIconButton = (active: boolean) =>
        `hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors land:inline-flex ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs} collapseSidebar>
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
                    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3 land:gap-1 land:py-1">
                        {/* The app bar is hidden on sideways phones, so its menu button lives here. */}
                        <SidebarTrigger className="hidden size-9 shrink-0 rounded-xl land:inline-flex" />
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
                            <h1 className="truncate font-display text-lg leading-tight font-extrabold tracking-[-0.02em] text-foreground sm:text-xl land:text-base">
                                {course.courseTitle}
                            </h1>
                            <WorldChip
                                world={courseWorld}
                                className="hidden sm:inline-flex"
                            />
                        </div>
                        {isStudent && courseItemProgress.total > 0 && (
                            <span className="hidden shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground tabular-nums lg:inline-flex">
                                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                                    <span
                                        className="block h-full rounded-full bg-primary"
                                        style={{
                                            width: `${Math.round((courseItemProgress.done / courseItemProgress.total) * 100)}%`,
                                        }}
                                    />
                                </span>
                                {courseItemProgress.done} of{' '}
                                {courseItemProgress.total} done
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => openPanel('overview')}
                            className={landIconButton(overviewActive)}
                            aria-label="Course overview"
                            title="Course overview"
                        >
                            <Info className="size-4" />
                        </button>
                        {courseId && (
                            <button
                                type="button"
                                onClick={() => openPanel('leaderboard')}
                                className={landIconButton(showLeaderboard)}
                                aria-label="Leaderboard"
                                title="Leaderboard"
                            >
                                <Trophy className="size-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => openPanel('announcements')}
                            className={`relative ${landIconButton(showAnnouncements)}`}
                            aria-label="Announcements"
                            title="Announcements"
                        >
                            <Megaphone className="size-4" />
                            {announcements.length > 0 && (
                                <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500" />
                            )}
                        </button>
                        {!effectiveEditMode && (
                            <Button
                                size="sm"
                                variant={focusMode ? 'default' : 'outline'}
                                className="hidden h-9 shrink-0 gap-1.5 md:inline-flex land:inline-flex land:px-2.5"
                                onClick={() => setFocusMode((on) => !on)}
                                aria-pressed={focusMode}
                                title={
                                    focusMode
                                        ? 'Exit focus mode (Esc)'
                                        : 'Focus mode: hide menus and give the lesson the whole screen'
                                }
                            >
                                {focusMode ? (
                                    <Minimize className="size-4" />
                                ) : (
                                    <Maximize className="size-4" />
                                )}
                                <span className="land:sr-only">
                                    {focusMode ? 'Exit focus' : 'Focus'}
                                </span>
                            </Button>
                        )}
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
                    <div className="flex border-t border-border md:hidden land:hidden">
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
                                className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-muted-foreground hover:text-violet-600"
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
                        className={`min-h-0 overflow-hidden border-r border-border bg-muted/50 ${mobilePanel === 'curriculum' ? 'flex' : 'hidden'} w-full transition-[width] duration-200 md:flex md:shrink-0 land:shrink-0 ${railOnly ? 'md:w-16 land:hidden' : 'md:w-80 land:flex land:w-64'}`}
                    >
                        {railOnly && (
                            <CourseRail
                                modules={course.modules}
                                showLeaderboard={!!courseId}
                                leaderboardActive={showLeaderboard}
                                announcementsActive={showAnnouncements}
                                onExpand={() => {
                                    setFocusMode(false);
                                    setPanelCollapsed(false);
                                }}
                                onOpenLeaderboard={() => {
                                    setShowLeaderboard(true);
                                    setShowAnnouncements(false);
                                    setActiveSession(null);
                                    setActiveContent(null);
                                    setActiveAssessment(null);
                                    setActiveGame(null);
                                }}
                                onOpenAnnouncements={() => {
                                    setShowAnnouncements(true);
                                    setShowLeaderboard(false);
                                    setActiveSession(null);
                                    setActiveContent(null);
                                    setActiveAssessment(null);
                                    setActiveGame(null);
                                }}
                            />
                        )}
                        <div
                            className={`flex min-h-0 w-full flex-1 flex-col ${railOnly ? 'md:hidden' : ''}`}
                        >
                            {/* Overview button (a header icon on sideways phones) */}
                            <div className="shrink-0 px-3 pt-3 pb-2 land:hidden">
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

                            <div className="flex shrink-0 items-center justify-between px-4 py-2 land:hidden">
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
                                    <button
                                        type="button"
                                        onClick={() => setPanelCollapsed(true)}
                                        className="ml-1 hidden size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
                                        aria-label="Hide lesson panel"
                                        title="Hide lesson panel"
                                    >
                                        <ChevronsLeft className="size-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-6 land:px-2 land:pt-2 land:pb-3">
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
                                        <FolderOpen className="h-10 w-10 text-muted-foreground/60 dark:text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            {effectiveEditMode
                                                ? 'Add your first module above.'
                                                : 'No modules yet.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer shortcuts (header icons on sideways phones) */}
                            <div className="contents land:hidden">
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
                        </div>
                    </aside>

                    {/* Right panel */}
                    <main
                        className={`flex-1 overflow-hidden bg-card ${mobilePanel === 'content' ? 'flex flex-col' : 'hidden'} md:flex md:flex-col land:flex land:flex-col`}
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
                            <Suspense
                                fallback={
                                    <div className="flex-1 animate-pulse bg-muted/40" />
                                }
                            >
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
                                        updateAssessment(
                                            liveActiveSession.id,
                                            a,
                                        )
                                    }
                                    onDeleteAssessment={(id) =>
                                        deleteAssessment(
                                            liveActiveSession.id,
                                            id,
                                        )
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
                            </Suspense>
                        ) : effectiveEditMode ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                                    <Pencil className="h-8 w-8 text-muted-foreground/60" />
                                </div>
                                <div className="max-w-xs">
                                    <h3 className="text-lg font-bold text-foreground dark:text-white">
                                        Select a lesson
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Click any lesson in the sidebar to
                                        manage its content and assessments here.
                                    </p>
                                </div>
                            </div>
                        ) : activeAssessment ? (
                            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-3xl">
                                {/* Breadcrumb */}
                                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
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
                                world={courseWorld}
                                insightsCourseId={
                                    !isStudent && courseId ? courseId : null
                                }
                            />
                        ) : activeContent ? (
                            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                {/* Fixed content header */}
                                <div className="shrink-0 border-b border-border bg-card px-4 pt-4 pb-3 sm:px-6">
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
                                            className="min-w-0 truncate text-base font-bold text-foreground sm:text-lg dark:text-white"
                                            title={activeContent.title}
                                        >
                                            {activeContent.title}
                                        </h2>
                                    </div>
                                </div>

                                {/* Scrollable body */}
                                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
                                    <div className="mx-auto w-full max-w-6xl flex-1">
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
                                            <div className="mt-6 flex justify-end border-t border-border pt-4">
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
                                    <BookOpen className="h-8 w-8 text-muted-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold tracking-wider text-primary/60 uppercase">
                                        Selected lesson
                                    </p>
                                    <h3 className="mt-1 text-xl font-bold text-foreground">
                                        {lessonLabel(activeSession.title)}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
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
                                                    <span className="font-mono text-xs text-muted-foreground">
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
                                                    <p className="text-xs text-muted-foreground">
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
                                            <p className="text-sm text-muted-foreground">
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
                                                                <span className="shrink-0 text-xs text-muted-foreground">
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
                                <div className="shrink-0 border-t border-border bg-card">
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
                                                <span className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase dark:text-muted-foreground">
                                                    Previous
                                                </span>
                                                <span className="max-w-[6.5rem] truncate text-xs font-medium sm:max-w-[12rem]">
                                                    {prevNav?.title ?? '—'}
                                                </span>
                                            </span>
                                        </Button>
                                        <span className="shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums dark:text-muted-foreground">
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
                                    className="truncate text-xs text-muted-foreground"
                                    title={upload?.filename}
                                >
                                    {upload?.filename}
                                </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-foreground/85 tabular-nums">
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
    const { auth } = usePage<SharedData>().props;
    return <TeacherCourseDetail isStudent={auth.user.role === 'student'} />;
}
