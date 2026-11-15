import { type Editor } from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Transaction } from '@tiptap/pm/state';
import { ArrowLeft, FileUp, Loader2, PenLine, Plus, X } from 'lucide-react';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useFlipbookHistory } from './flipbook-history';
import { splitBody } from './flipbook-layout';
import { type FlipbookSheet, FlipbookSheetView } from './flipbook-page';
import { FlipbookPageCanvas } from './flipbook-page-canvas';
import { FlipbookReader } from './flipbook-reader';
import { FlipbookRibbon } from './flipbook-ribbon';
import {
    type FlipbookBackground,
    type FlipbookPage,
    MAX_FLIPBOOK_PAGES,
    newPage,
    pageHasContent,
    slotCount,
} from './flipbook-types';
import { type FlipbookImageUploader, MAX_IMAGE_BYTES } from './flipbook-upload';

export type { FlipbookImageUploader } from './flipbook-upload';

/** Body typing within this time is one undo step (the text editor's own grouping). */
const BODY_GROUP_MS = 500;
const THUMB_WIDTH = 132;
const THUMB_SHEET = { width: 540, height: 745 };

/** A small, true-to-life picture of a page for the page list (first sheet only). */
function PageThumb({ page }: { page: FlipbookPage }) {
    const sheet: FlipbookSheet = {
        pageIndex: 0,
        layout: page.layout,
        heading: page.heading || null,
        images: page.images
            .filter((image) => image.url)
            .slice(0, slotCount(page.layout)),
        blocks: splitBody(page.body),
        highlight: page.highlight || null,
        continued: false,
        side: page.layout === 'image-right',
        background: page.background,
        spacing: page.spacing,
    };
    const scale = THUMB_WIDTH / THUMB_SHEET.width;

    return (
        <div
            className="pointer-events-none relative overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5"
            style={{ width: THUMB_WIDTH, height: THUMB_SHEET.height * scale }}
            aria-hidden
        >
            <div
                style={{
                    width: THUMB_SHEET.width,
                    height: THUMB_SHEET.height,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            >
                <FlipbookSheetView sheet={sheet} />
            </div>
        </div>
    );
}

/**
 * Teacher-facing flipbook builder. Pages are edited right on the paper, like a word
 * processor: a page list on the left, a ribbon of tools, and the live page in the middle.
 */
export function FlipbookEditor({
    pages,
    onChange,
    uploadImage,
    title,
}: {
    pages: FlipbookPage[];
    onChange: (pages: FlipbookPage[]) => void;
    uploadImage: FlipbookImageUploader;
    title?: string;
}) {
    const [activeId, setActiveId] = useState(pages[0]?.id ?? '');
    const [view, setView] = useState<'build' | 'preview'>('build');
    const [pdfImport, setPdfImport] = useState<{
        fileName: string;
        done: number;
        total: number;
    } | null>(null);
    const [importNotice, setImportNotice] = useState<{
        tone: 'info' | 'error';
        text: string;
    } | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const importAbort = useRef<AbortController | null>(null);
    const [editor, setEditor] = useState<Editor | null>(null);
    const history = useFlipbookHistory();
    // When body-text changes happened (one per typing burst), to order undo with page history.
    const bodyUndoTimes = useRef<number[]>([]);
    const bodyRedoTimes = useRef<number[]>([]);
    useEffect(() => {
        bodyUndoTimes.current = [];
        bodyRedoTimes.current = [];
        if (!editor) {
            return;
        }
        const onUpdate = ({ transaction }: { transaction: Transaction }) => {
            // Undo/redo steps from the editor itself are not new changes.
            if (!transaction.docChanged || transaction.getMeta('history$')) {
                return;
            }
            const now = Date.now();
            const last = bodyUndoTimes.current.at(-1) ?? 0;
            if (now - last > BODY_GROUP_MS) {
                bodyUndoTimes.current.push(now);
            } else {
                bodyUndoTimes.current[bodyUndoTimes.current.length - 1] = now;
            }
            bodyRedoTimes.current = [];
        };
        editor.on('update', onUpdate);
        return () => {
            editor.off('update', onUpdate);
        };
    }, [editor]);
    const [keyIdeaFor, setKeyIdeaFor] = useState<string | null>(null);
    const [sheetCount, setSheetCount] = useState(1);
    const onSheetCount = useCallback(
        (count: number) => setSheetCount(count),
        [],
    );

    const isFresh = pages.length === 1 && !pageHasContent(pages[0]);

    const importPdf = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
            setImportNotice({ tone: 'error', text: 'Choose a PDF file.' });
            return;
        }
        const base = isFresh ? [] : pages;
        const room = MAX_FLIPBOOK_PAGES - base.length;
        if (room <= 0) {
            setImportNotice({
                tone: 'error',
                text: `A flipbook can hold up to ${MAX_FLIPBOOK_PAGES} pages.`,
            });
            return;
        }

        const controller = new AbortController();
        importAbort.current = controller;
        setImportNotice(null);
        setPdfImport({ fileName: file.name, done: 0, total: 0 });
        setView('build');

        let built = [...base];
        let firstImportedId: string | null = null;
        try {
            const { renderPdfPages } = await import('./pdf-to-images');
            const imported = await renderPdfPages(file, {
                maxPages: room,
                signal: controller.signal,
                onPage: async (image, pageNumber, total) => {
                    setPdfImport({
                        fileName: file.name,
                        done: pageNumber - 1,
                        total,
                    });
                    const url = await uploadImage(image, () => {});
                    const page: FlipbookPage = {
                        ...newPage('image-full'),
                        images: [{ url, caption: '' }],
                    };
                    firstImportedId ??= page.id;
                    built = [...built, page];
                    onChange(built);
                    setPdfImport({
                        fileName: file.name,
                        done: pageNumber,
                        total,
                    });
                },
            });
            if (firstImportedId) {
                setActiveId(firstImportedId);
            }
            setImportNotice({
                tone: 'info',
                text: `Imported ${imported} ${imported === 1 ? 'page' : 'pages'} from ${file.name}. Add a topic or key idea to any page, or insert your own pages in between.`,
            });
        } catch (e) {
            const cancelled = controller.signal.aborted;
            const added = built.length - base.length;
            if (firstImportedId) {
                setActiveId(firstImportedId);
            }
            setImportNotice({
                tone: cancelled ? 'info' : 'error',
                text: cancelled
                    ? `Import stopped. ${added} ${added === 1 ? 'page was' : 'pages were'} kept.`
                    : `Could not finish the import: ${(e as Error).message || 'the PDF could not be read'}. ${added > 0 ? `${added} pages were kept.` : ''}`,
            });
        } finally {
            importAbort.current = null;
            setPdfImport(null);
        }
    };

    const activeIndex = Math.max(
        pages.findIndex((p) => p.id === activeId),
        0,
    );
    const page = pages[activeIndex];

    const updatePage = (patch: Partial<FlipbookPage>) => {
        if (!page) {
            return;
        }
        // Body text is undone by the text editor itself; everything else goes in page history.
        const fields = (Object.keys(patch) as (keyof FlipbookPage)[]).filter(
            (field) => field !== 'body' && field !== 'id',
        );
        if (fields.length > 0) {
            const before: Record<string, unknown> = {};
            const after: Record<string, unknown> = {};
            fields.forEach((field) => {
                before[field] = page[field];
                after[field] = patch[field];
            });
            history.record({ type: 'patch', pageId: page.id, before, after });
        }
        onChange(
            pages.map((p, i) => (i === activeIndex ? { ...p, ...patch } : p)),
        );
    };

    const addPage = () => {
        const next = newPage(page?.layout ?? 'image-right');
        const copy = [...pages];
        copy.splice(activeIndex + 1, 0, next);
        history.record({ type: 'insert', page: next, index: activeIndex + 1 });
        onChange(copy);
        setActiveId(next.id);
    };

    const duplicatePage = () => {
        if (!page) {
            return;
        }
        const dup = {
            ...page,
            id: newPage().id,
            images: page.images.map((img) => ({ ...img })),
        };
        const copy = [...pages];
        copy.splice(activeIndex + 1, 0, dup);
        history.record({ type: 'insert', page: dup, index: activeIndex + 1 });
        onChange(copy);
        setActiveId(dup.id);
    };

    const movePage = (dir: -1 | 1) => {
        const target = activeIndex + dir;
        if (target < 0 || target >= pages.length || !page) {
            return;
        }
        const copy = [...pages];
        [copy[activeIndex], copy[target]] = [copy[target], copy[activeIndex]];
        history.record({
            type: 'move',
            pageId: page.id,
            from: activeIndex,
            to: target,
        });
        onChange(copy);
    };

    const deletePage = () => {
        if (!page) {
            return;
        }
        if (pages.length <= 1) {
            const fresh = newPage(page.layout);
            history.record({
                type: 'batch',
                entries: [
                    { type: 'remove', page, index: 0 },
                    { type: 'insert', page: fresh, index: 0 },
                ],
            });
            onChange([fresh]);
            return;
        }
        const copy = pages.filter((_, i) => i !== activeIndex);
        history.record({ type: 'remove', page, index: activeIndex });
        onChange(copy);
        setActiveId(copy[Math.min(activeIndex, copy.length - 1)].id);
    };

    const setBackground = (
        background: FlipbookBackground,
        everyPage: boolean,
    ) => {
        if (!everyPage) {
            updatePage({ background });
            return;
        }
        history.record({
            type: 'batch',
            entries: pages.map((p) => ({
                type: 'patch' as const,
                pageId: p.id,
                before: { background: p.background },
                after: { background },
            })),
        });
        onChange(pages.map((p) => ({ ...p, background })));
    };

    // ── Undo / redo: one timeline across page changes and body text (like Word) ──
    const undoAll = () => {
        const bodyCan = !!editor?.can().undo();
        const bodyAt = bodyUndoTimes.current.at(-1) ?? (bodyCan ? 1 : 0);
        if (editor && bodyCan && bodyAt >= history.lastUndoAt()) {
            editor.chain().focus().undo().run();
            bodyUndoTimes.current.pop();
            bodyRedoTimes.current.push(Date.now());
            return;
        }
        const result = history.undo(pages);
        if (result) {
            onChange(result.pages);
            if (result.focus) {
                setActiveId(result.focus);
            }
        } else if (editor && bodyCan) {
            editor.chain().focus().undo().run();
        }
    };

    const redoAll = () => {
        const bodyCan = !!editor?.can().redo();
        const bodyAt = bodyRedoTimes.current.at(-1) ?? (bodyCan ? 1 : 0);
        if (editor && bodyCan && bodyAt >= history.lastRedoAt()) {
            editor.chain().focus().redo().run();
            bodyRedoTimes.current.pop();
            bodyUndoTimes.current.push(Date.now());
            return;
        }
        const result = history.redo(pages);
        if (result) {
            onChange(result.pages);
            if (result.focus) {
                setActiveId(result.focus);
            }
        } else if (editor && bodyCan) {
            editor.chain().focus().redo().run();
        }
    };

    const undoKeys = (event: KeyboardEvent | ReactKeyboardEvent) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) {
            return;
        }
        const key = event.key.toLowerCase();
        if (key !== 'z' && key !== 'y') {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (key === 'y' || event.shiftKey) {
            redoAll();
        } else {
            undoAll();
        }
    };
    const undoKeysRef = useRef(undoKeys);
    useEffect(() => {
        undoKeysRef.current = undoKeys;
    });
    // Ctrl+Z also works when nothing on the page has focus (e.g. right after closing a menu).
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.target === document.body) {
                undoKeysRef.current(event);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Pictures inserted from the ribbon go straight into the text.
    const uploadIntoText = async (file: File): Promise<string | null> => {
        if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
            setImportNotice({
                tone: 'error',
                text: 'Choose a JPG, PNG, WebP or GIF picture up to 8 MB.',
            });
            return null;
        }
        try {
            return await uploadImage(file, () => {});
        } catch (e) {
            setImportNotice({
                tone: 'error',
                text:
                    (e as Error).message ||
                    'The picture could not be uploaded.',
            });
            return null;
        }
    };

    const insertKeyIdea = () => {
        if (page) {
            setKeyIdeaFor(page.id);
        }
    };

    return (
        <div className="flex flex-col gap-4" onKeyDownCapture={undoKeys}>
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                    void importPdf(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />

            {pdfImport ? (
                <div
                    className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-10 text-center"
                    role="status"
                    aria-live="polite"
                >
                    <Loader2
                        className="size-7 animate-spin text-primary"
                        aria-hidden
                    />
                    <div>
                        <p className="font-display text-lg font-extrabold tracking-[-0.02em]">
                            {pdfImport.total === 0
                                ? 'Opening your PDF…'
                                : `Turning page ${Math.min(pdfImport.done + 1, pdfImport.total)} of ${pdfImport.total} into a flipbook page`}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                            {pdfImport.fileName}
                        </p>
                    </div>
                    <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-primary/15">
                        <div
                            className="h-full rounded-full bg-primary transition-[width] duration-300"
                            style={{
                                width: pdfImport.total
                                    ? `${(pdfImport.done / pdfImport.total) * 100}%`
                                    : '4%',
                            }}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => importAbort.current?.abort()}
                    >
                        Stop import
                    </Button>
                </div>
            ) : view === 'preview' ? (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setView('build')}
                        >
                            <ArrowLeft />
                            Back to editing
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            This is exactly what students see.
                        </p>
                    </div>
                    <FlipbookReader
                        key={`preview-${activeIndex}`}
                        pages={pages.filter(pageHasContent)}
                        title={title}
                        initialPage={activeIndex}
                    />
                </div>
            ) : (
                <>
                    {importNotice && (
                        <div
                            className={cn(
                                'flex items-start gap-3 rounded-2xl px-4 py-3 text-sm',
                                importNotice.tone === 'error'
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
                            )}
                            role={
                                importNotice.tone === 'error'
                                    ? 'alert'
                                    : 'status'
                            }
                        >
                            <p className="flex-1">{importNotice.text}</p>
                            <button
                                type="button"
                                onClick={() => setImportNotice(null)}
                                className="cursor-pointer opacity-70 hover:opacity-100"
                                aria-label="Dismiss"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {isFresh && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => pdfInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    void importPdf(e.dataTransfer.files?.[0]);
                                }}
                                className="group flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-4 text-left transition-colors hover:border-primary"
                            >
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                    <FileUp className="size-5" />
                                </span>
                                <span>
                                    <span className="block font-extrabold text-foreground">
                                        Import a PDF
                                    </span>
                                    <span className="block text-sm text-muted-foreground">
                                        Each PDF page becomes a flipbook page.
                                        Click or drop the file.
                                    </span>
                                </span>
                            </button>
                            <div className="flex items-center gap-4 rounded-2xl border-2 border-border p-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                    <PenLine className="size-5" />
                                </span>
                                <span>
                                    <span className="block font-extrabold text-foreground">
                                        Or type right on the page
                                    </span>
                                    <span className="block text-sm text-muted-foreground">
                                        Click the title or text on page 1 below
                                        and start writing.
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}

                    {page && (
                        <FlipbookRibbon
                            editor={editor}
                            layout={page.layout}
                            onLayout={(layout) => updatePage({ layout })}
                            background={page.background ?? 'paper'}
                            onBackground={setBackground}
                            spacing={page.spacing ?? 'normal'}
                            onSpacing={(spacing) => updatePage({ spacing })}
                            onUndo={undoAll}
                            onRedo={redoAll}
                            historyCanUndo={history.canUndo}
                            historyCanRedo={history.canRedo}
                            onUploadImage={uploadIntoText}
                            onInsertKeyIdea={insertKeyIdea}
                            keyIdeaShown={
                                (page.highlight ?? '') !== '' ||
                                keyIdeaFor === page.id
                            }
                            onAddPage={addPage}
                            onDuplicate={duplicatePage}
                            onMove={movePage}
                            onDelete={deletePage}
                            canMoveUp={activeIndex > 0}
                            canMoveDown={activeIndex < pages.length - 1}
                            onRead={() => setView('preview')}
                            onImportPdf={() => pdfInputRef.current?.click()}
                            sheetCount={sheetCount}
                        />
                    )}

                    <div className="grid gap-4 lg:grid-cols-[10.5rem_minmax(0,1fr)]">
                        {/* Page list */}
                        <nav
                            aria-label="Pages"
                            className="flex gap-3 overflow-x-auto pb-1 lg:max-h-[48rem] lg:flex-col lg:overflow-y-auto lg:pr-1 lg:pb-0"
                        >
                            {pages.map((p, i) => {
                                const active = i === activeIndex;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setActiveId(p.id)}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        aria-label={`Page ${i + 1}${p.heading ? `: ${p.heading}` : ''}`}
                                        className={cn(
                                            'flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors',
                                            active
                                                ? 'bg-primary/10'
                                                : 'hover:bg-muted',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'rounded-md ring-2 ring-offset-2 ring-offset-background',
                                                active
                                                    ? 'ring-primary'
                                                    : 'ring-transparent',
                                            )}
                                        >
                                            <PageThumb page={p} />
                                        </span>
                                        <span
                                            className={cn(
                                                'max-w-[8.5rem] truncate text-xs font-semibold',
                                                active
                                                    ? 'text-primary'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {i + 1}. {p.heading || 'Untitled'}
                                        </span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={addPage}
                                className="flex w-[8.25rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/35 px-3 py-6 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary/5 lg:w-full"
                            >
                                <Plus className="size-5" />
                                Add page
                            </button>
                        </nav>

                        {/* The page, on a desk */}
                        <div className="min-w-0 rounded-3xl bg-muted/50 px-3 py-6 sm:px-8 sm:py-8">
                            {page && (
                                <FlipbookPageCanvas
                                    key={page.id}
                                    page={page}
                                    number={activeIndex + 1}
                                    onPatch={updatePage}
                                    uploadImage={uploadImage}
                                    onEditor={setEditor}
                                    keyIdeaOpen={keyIdeaFor === page.id}
                                    onCloseKeyIdea={() => setKeyIdeaFor(null)}
                                    onSheetCount={onSheetCount}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default FlipbookEditor;
