import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    ArrowDown,
    ArrowUp,
    BookOpenCheck,
    Copy,
    Eye,
    FileUp,
    ImagePlus,
    Lightbulb,
    Loader2,
    PenLine,
    Plus,
    RefreshCw,
    Trash2,
    X,
} from 'lucide-react';
import { lazy, Suspense, useRef, useState } from 'react';
import { type SheetSize, useFlipbookSheets } from './flipbook-layout';
import { FlipbookReader } from './flipbook-reader';
import {
    FLIPBOOK_LAYOUTS,
    type FlipbookImage,
    type FlipbookLayout,
    type FlipbookPage,
    MAX_FLIPBOOK_PAGES,
    newPage,
    pageHasContent,
    slotCount,
} from './flipbook-types';

const RichTextEditor = lazy(() =>
    import('@/components/rich-text-editor').then((m) => ({
        default: m.RichTextEditor,
    })),
);

export type FlipbookImageUploader = (
    file: File,
    onProgress: (percent: number) => void,
) => Promise<string>;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Small wireframe of each page template, drawn like the page itself. */
/** A typical page of the two-page book on a laptop, used to check whether a page fits. */
const TYPICAL_SHEET: SheetSize = { width: 540, height: 700 };

/**
 * Tells the teacher whether the page fits on one sheet of the book. Long pages still work
 * (they continue on the next sheet) but read better when trimmed or split.
 */
function PageFitNote({ page }: { page: FlipbookPage }) {
    const { sheets, measurer, ready } = useFlipbookSheets(
        [page],
        TYPICAL_SHEET,
    );
    const extra = sheets.length - 1;

    return (
        <>
            {measurer}
            {ready && pageHasContent(page) && (
                <p
                    className={cn(
                        'flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
                        extra > 0
                            ? 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100'
                            : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
                    )}
                    aria-live="polite"
                >
                    <BookOpenCheck
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                    />
                    {extra > 0
                        ? `This page is long, so it continues onto ${extra} more ${extra === 1 ? 'sheet' : 'sheets'} in the book. Shorten the text or move part of it to a new page for a cleaner read.`
                        : 'Fits on one sheet of the book.'}
                </p>
            )}
        </>
    );
}

function LayoutGlyph({ layout }: { layout: FlipbookLayout }) {
    const line = 'fill-current opacity-35';
    const img = 'fill-current opacity-70';
    return (
        <svg viewBox="0 0 48 60" className="h-12 w-10" aria-hidden>
            <rect
                x="1"
                y="1"
                width="46"
                height="58"
                rx="5"
                className="fill-white stroke-current opacity-90 dark:fill-white/5"
                strokeWidth="1.5"
            />
            <rect
                x="7"
                y="7"
                width="22"
                height="4"
                rx="2"
                className="fill-current"
            />
            {layout === 'text' &&
                [16, 22, 28, 34, 40, 46].map((y) => (
                    <rect
                        key={y}
                        x="7"
                        y={y}
                        width={y === 46 ? 20 : 34}
                        height="2.5"
                        rx="1.25"
                        className={line}
                    />
                ))}
            {layout === 'image-right' && (
                <>
                    {[16, 22, 28, 34, 40].map((y) => (
                        <rect
                            key={y}
                            x="7"
                            y={y}
                            width="18"
                            height="2.5"
                            rx="1.25"
                            className={line}
                        />
                    ))}
                    <rect
                        x="28"
                        y="16"
                        width="13"
                        height="16"
                        rx="2"
                        className={img}
                    />
                </>
            )}
            {layout === 'image-top' && (
                <>
                    <rect
                        x="7"
                        y="15"
                        width="34"
                        height="17"
                        rx="2"
                        className={img}
                    />
                    {[37, 43, 49].map((y) => (
                        <rect
                            key={y}
                            x="7"
                            y={y}
                            width="34"
                            height="2.5"
                            rx="1.25"
                            className={line}
                        />
                    ))}
                </>
            )}
            {layout === 'image-full' && (
                <rect
                    x="7"
                    y="15"
                    width="34"
                    height="38"
                    rx="2"
                    className={img}
                />
            )}
            {layout === 'two-images' && (
                <>
                    <rect
                        x="7"
                        y="15"
                        width="16"
                        height="14"
                        rx="2"
                        className={img}
                    />
                    <rect
                        x="25"
                        y="15"
                        width="16"
                        height="14"
                        rx="2"
                        className={img}
                    />
                    {[35, 41, 47].map((y) => (
                        <rect
                            key={y}
                            x="7"
                            y={y}
                            width="34"
                            height="2.5"
                            rx="1.25"
                            className={line}
                        />
                    ))}
                </>
            )}
        </svg>
    );
}

function ImageSlot({
    image,
    index,
    uploadImage,
    onChange,
    onRemove,
}: {
    image: FlipbookImage | undefined;
    index: number;
    uploadImage: FlipbookImageUploader;
    onChange: (image: FlipbookImage) => void;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    const upload = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Choose an image file (JPG, PNG, WebP or GIF).');
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setError('That image is over 8 MB. Try a smaller one.');
            return;
        }
        setError(null);
        setProgress(0);
        try {
            const url = await uploadImage(file, setProgress);
            onChange({ url, caption: image?.caption ?? '' });
        } catch (e) {
            setError((e as Error).message || 'Upload failed. Try again.');
        } finally {
            setProgress(null);
        }
    };

    const picker = (
        <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = '';
            }}
        />
    );

    if (progress !== null) {
        return (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4">
                <Loader2
                    className="size-5 animate-spin text-primary"
                    aria-hidden
                />
                <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-primary/15">
                    <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs font-semibold text-primary tabular-nums">
                    Uploading {progress}%
                </p>
            </div>
        );
    }

    if (!image?.url) {
        return (
            <div>
                {picker}
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        void upload(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                        'flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-center transition-colors',
                        dragging
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5',
                    )}
                >
                    <ImagePlus className="size-6 text-primary" aria-hidden />
                    <span className="text-sm font-bold text-foreground">
                        Add image {index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Click or drop · JPG, PNG, WebP up to 8 MB
                    </span>
                </button>
                {error && (
                    <p className="mt-1.5 text-xs font-medium text-destructive">
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 rounded-2xl border bg-background p-2.5">
            {picker}
            <div className="relative overflow-hidden rounded-xl bg-muted">
                <img
                    src={image.url}
                    alt={image.caption || `Image ${index + 1}`}
                    className="h-36 w-full object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-slate-900/75 text-white backdrop-blur-sm hover:bg-slate-900"
                        aria-label="Replace image"
                        title="Replace image"
                    >
                        <RefreshCw className="size-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-slate-900/75 text-white backdrop-blur-sm hover:bg-red-600"
                        aria-label="Remove image"
                        title="Remove image"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>
            <Input
                value={image.caption ?? ''}
                onChange={(e) =>
                    onChange({ ...image, caption: e.target.value })
                }
                placeholder="Caption (optional), e.g. Convergent boundary"
                maxLength={255}
                className="h-10"
            />
            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
        </div>
    );
}

/**
 * Teacher-facing flipbook builder: a page rail on the left, the selected page's
 * template, topic, text, key idea and images on the right, plus a live book preview.
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

    const updatePage = (patch: Partial<FlipbookPage>) =>
        onChange(
            pages.map((p, i) => (i === activeIndex ? { ...p, ...patch } : p)),
        );

    const addPage = () => {
        const next = newPage(page?.layout ?? 'image-right');
        const copy = [...pages];
        copy.splice(activeIndex + 1, 0, next);
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
        onChange(copy);
        setActiveId(dup.id);
    };

    const movePage = (dir: -1 | 1) => {
        const target = activeIndex + dir;
        if (target < 0 || target >= pages.length) {
            return;
        }
        const copy = [...pages];
        [copy[activeIndex], copy[target]] = [copy[target], copy[activeIndex]];
        onChange(copy);
    };

    const deletePage = () => {
        if (pages.length <= 1) {
            onChange([newPage(page?.layout)]);
            return;
        }
        const copy = pages.filter((_, i) => i !== activeIndex);
        onChange(copy);
        setActiveId(copy[Math.min(activeIndex, copy.length - 1)].id);
    };

    const setImage = (slot: number, image: FlipbookImage | null) => {
        if (!page) {
            return;
        }
        const images = [...page.images];
        if (image) {
            images[slot] = image;
        } else {
            images.splice(slot, 1);
        }
        updatePage({ images: images.filter(Boolean) });
    };

    const iconButton =
        'flex size-9 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">
                        {pages.length}
                    </span>{' '}
                    {pages.length === 1 ? 'page' : 'pages'} · Students turn
                    through them like a book.
                </p>
                <div
                    className="inline-flex rounded-xl bg-muted p-1"
                    role="tablist"
                    aria-label="Flipbook view"
                >
                    {(
                        [
                            ['build', 'Build', PenLine],
                            ['preview', 'Preview', Eye],
                        ] as const
                    ).map(([value, label, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={view === value}
                            onClick={() => setView(value)}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-bold transition-colors',
                                view === value
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

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

                    {isFresh && view === 'build' && (
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
                                        Or build it page by page
                                    </span>
                                    <span className="block text-sm text-muted-foreground">
                                        Start with page 1 below, then add the
                                        next.
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {pdfImport ? null : view === 'preview' ? (
                <FlipbookReader
                    key={`preview-${activeIndex}`}
                    pages={pages.filter(pageHasContent)}
                    title={title}
                    initialPage={activeIndex}
                />
            ) : (
                <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
                    {/* Page rail */}
                    <nav
                        aria-label="Pages"
                        className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[42rem] lg:flex-col lg:overflow-y-auto lg:pb-0"
                    >
                        {pages.map((p, i) => {
                            const active = i === activeIndex;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setActiveId(p.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex w-44 shrink-0 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card p-2.5 text-left transition-colors lg:w-full',
                                        active
                                            ? 'border-primary'
                                            : 'border-transparent hover:border-border',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold tabular-nums',
                                            active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                'block truncate text-sm font-bold',
                                                p.heading
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground italic',
                                            )}
                                        >
                                            {p.heading || 'Untitled page'}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {
                                                FLIPBOOK_LAYOUTS.find(
                                                    (l) => l.value === p.layout,
                                                )?.label
                                            }
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={addPage}
                            className="flex w-44 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/35 px-3 py-3 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary/5 lg:w-full"
                        >
                            <Plus className="size-4" />
                            Add page
                        </button>
                        {!isFresh && (
                            <button
                                type="button"
                                onClick={() => pdfInputRef.current?.click()}
                                className="flex w-44 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:w-full"
                            >
                                <FileUp className="size-4" />
                                Add pages from PDF
                            </button>
                        )}
                    </nav>

                    {/* Page editor */}
                    {page && (
                        <div className="flex min-w-0 flex-col gap-5 rounded-3xl border bg-card p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-display text-lg font-extrabold tracking-[-0.02em]">
                                    Page {activeIndex + 1}{' '}
                                    <span className="font-semibold text-muted-foreground">
                                        of {pages.length}
                                    </span>
                                </h4>
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        className={iconButton}
                                        onClick={() => movePage(-1)}
                                        disabled={activeIndex === 0}
                                        aria-label="Move page earlier"
                                        title="Move earlier"
                                    >
                                        <ArrowUp className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        className={iconButton}
                                        onClick={() => movePage(1)}
                                        disabled={
                                            activeIndex === pages.length - 1
                                        }
                                        aria-label="Move page later"
                                        title="Move later"
                                    >
                                        <ArrowDown className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        className={iconButton}
                                        onClick={duplicatePage}
                                        aria-label="Duplicate page"
                                        title="Duplicate"
                                    >
                                        <Copy className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            iconButton,
                                            'hover:bg-destructive/10 hover:text-destructive',
                                        )}
                                        onClick={deletePage}
                                        aria-label="Delete page"
                                        title="Delete page"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>

                            <fieldset className="flex flex-col gap-2">
                                <legend className="mb-2 text-sm font-bold">
                                    Page layout
                                </legend>
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                    {FLIPBOOK_LAYOUTS.map((l) => {
                                        const selected =
                                            page.layout === l.value;
                                        return (
                                            <button
                                                key={l.value}
                                                type="button"
                                                onClick={() =>
                                                    updatePage({
                                                        layout: l.value,
                                                    })
                                                }
                                                aria-pressed={selected}
                                                className={cn(
                                                    'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-xs font-bold transition-colors',
                                                    selected
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                                                )}
                                            >
                                                <LayoutGlyph layout={l.value} />
                                                {l.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor={`fb-heading-${page.id}`}>
                                    Topic
                                </Label>
                                <Input
                                    id={`fb-heading-${page.id}`}
                                    value={page.heading}
                                    onChange={(e) =>
                                        updatePage({ heading: e.target.value })
                                    }
                                    placeholder="e.g. Earth Is Made of Moving Plates"
                                    maxLength={255}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Text</Label>
                                <Suspense
                                    fallback={
                                        <div className="h-[196px] animate-pulse rounded-xl bg-muted" />
                                    }
                                >
                                    <RichTextEditor
                                        key={page.id}
                                        value={page.body}
                                        onChange={(html) =>
                                            updatePage({ body: html })
                                        }
                                        placeholder="Write the explanation for this page…"
                                    />
                                </Suspense>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label
                                    htmlFor={`fb-highlight-${page.id}`}
                                    className="flex items-center gap-1.5"
                                >
                                    <Lightbulb
                                        className="size-4 text-amber-500"
                                        aria-hidden
                                    />
                                    Key idea{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (optional, shown highlighted)
                                    </span>
                                </Label>
                                <Input
                                    id={`fb-highlight-${page.id}`}
                                    value={page.highlight ?? ''}
                                    onChange={(e) =>
                                        updatePage({
                                            highlight: e.target.value,
                                        })
                                    }
                                    placeholder="e.g. Tension → rocks are pulled apart → normal fault"
                                    maxLength={500}
                                />
                            </div>

                            {slotCount(page.layout) > 0 && (
                                <div className="flex flex-col gap-2">
                                    <Label>
                                        {slotCount(page.layout) === 1
                                            ? 'Image'
                                            : 'Images'}
                                    </Label>
                                    <div
                                        className={cn(
                                            'grid gap-3',
                                            slotCount(page.layout) === 2 &&
                                                'sm:grid-cols-2',
                                        )}
                                    >
                                        {Array.from(
                                            { length: slotCount(page.layout) },
                                            (_, slot) => (
                                                <ImageSlot
                                                    key={`${page.id}-${slot}`}
                                                    image={page.images[slot]}
                                                    index={slot}
                                                    uploadImage={uploadImage}
                                                    onChange={(image) =>
                                                        setImage(slot, image)
                                                    }
                                                    onRemove={() =>
                                                        setImage(slot, null)
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            <PageFitNote page={page} />

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setView('preview')}
                                >
                                    <Eye />
                                    Preview this page
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addPage}
                                >
                                    <Plus />
                                    Add page after
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FlipbookEditor;
