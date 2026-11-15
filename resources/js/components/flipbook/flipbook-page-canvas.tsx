import { type Editor } from '@/components/rich-text-editor';
import { cn } from '@/lib/utils';
import {
    Eraser,
    ImagePlus,
    Lightbulb,
    Loader2,
    RefreshCw,
    X,
} from 'lucide-react';
import {
    type CSSProperties,
    lazy,
    type MouseEvent,
    Suspense,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {
    type ContextMenuState,
    FlipbookContextMenu,
} from './flipbook-context-menu';
import { FLIPBOOK_EXTENSIONS } from './flipbook-extensions';
import { groupBlocks, useFlipbookSheets } from './flipbook-layout';
import { SIDE_GRID_CLASS } from './flipbook-page';
import {
    backgroundClass,
    type FlipbookImage,
    type FlipbookPage,
    slotCount,
    spacingClass,
} from './flipbook-types';
import {
    type FlipbookImageUploader,
    IMAGE_ACCEPT,
    MAX_IMAGE_BYTES,
    useImageUpload,
} from './flipbook-upload';

const RichTextEditor = lazy(() =>
    import('@/components/rich-text-editor').then((m) => ({
        default: m.RichTextEditor,
    })),
);

/** Sheet height for a given width; close to the student's two-page book on a laptop. */
const SHEET_RATIO = 1.38;
const MAX_SHEET_WIDTH = 600;
/** Image heights as a share of the sheet, the same as the reader's `cqh` sizes. */
const FIGURE_SHARE = { top: 0.32, pair: 0.24, side: 0.4, full: 0.78 };
/** The reader puts text beside the image from 32rem of sheet width (`@lg`). */
const SIDE_MIN_WIDTH = 512;

function useWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const observer = new ResizeObserver(([entry]) =>
            setWidth(Math.round(entry.contentRect.width)),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return [ref, width] as const;
}

/** A borderless text area that grows with its text, styled by the caller. */
function InlineText({
    value,
    onChange,
    placeholder,
    className,
    maxLength,
    autoFocus,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
    maxLength: number;
    autoFocus?: boolean;
    label: string;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    useLayoutEffect(() => {
        const element = ref.current;
        if (element) {
            element.style.height = '0px';
            element.style.height = `${element.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            aria-label={label}
            className={cn(
                'flipbook-inline w-full resize-none overflow-hidden bg-transparent outline-none',
                className,
            )}
        />
    );
}

/** One image spot on the page: an "Add image" target when empty, the picture when filled. */
function CanvasImage({
    image,
    height,
    slot,
    pageId,
    uploadImage,
    onChange,
    onRemove,
}: {
    image: FlipbookImage | undefined;
    height: number;
    slot: number;
    pageId: string;
    uploadImage: FlipbookImageUploader;
    onChange: (image: FlipbookImage) => void;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, progress, error, setError } = useImageUpload(uploadImage);
    const [removingBg, setRemovingBg] = useState(false);
    const [slotMenu, setSlotMenu] = useState<ContextMenuState | null>(null);

    const removeBackground = async () => {
        if (!image?.url || removingBg) {
            return;
        }
        setRemovingBg(true);
        setError(null);
        try {
            const { removePlainBackground } =
                await import('./remove-background');
            const url = await upload(await removePlainBackground(image.url));
            if (url) {
                onChange({ ...image, url });
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setRemovingBg(false);
        }
    };
    const [dragging, setDragging] = useState(false);

    const take = async (file: File | undefined) => {
        const url = await upload(file);
        if (url) {
            onChange({ url, caption: image?.caption ?? '' });
        }
    };

    const picker = (
        <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
                void take(e.target.files?.[0]);
                e.target.value = '';
            }}
        />
    );
    const style: CSSProperties = { height };

    if (progress !== null) {
        return (
            <div
                style={style}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
            >
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-xs font-semibold text-primary tabular-nums">
                    Uploading {progress}%
                </span>
            </div>
        );
    }

    if (!image?.url) {
        return (
            <div className="min-w-0">
                {picker}
                <button
                    type="button"
                    data-empty-slot={pageId}
                    data-slot={slot}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        void take(e.dataTransfer.files?.[0]);
                    }}
                    style={style}
                    className={cn(
                        'flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 text-center transition-colors',
                        dragging
                            ? 'border-primary bg-primary/10'
                            : 'border-black/15 bg-black/2 hover:border-primary/60 hover:bg-primary/5 dark:border-white/20',
                    )}
                >
                    <ImagePlus className="size-6 text-primary" aria-hidden />
                    <span className="text-sm font-bold">Add image</span>
                    <span className="text-xs opacity-60">
                        Click or drop · up to 8 MB
                    </span>
                </button>
                {error && (
                    <p className="mt-1 text-xs font-medium text-destructive">
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <figure className="group/img flex min-w-0 flex-col gap-1.5">
            {picker}
            <FlipbookContextMenu
                state={slotMenu}
                onClose={() => setSlotMenu(null)}
                editor={null}
                onUploadImage={async () => null}
                slot={{
                    onReplace: () => inputRef.current?.click(),
                    onRemoveBackground: () => void removeBackground(),
                    onRemove,
                }}
            />
            <div
                className="relative"
                onContextMenu={(event) => {
                    const native = event.nativeEvent as PointerEvent;
                    if (event.shiftKey || native.pointerType === 'touch') {
                        return;
                    }
                    event.preventDefault();
                    setSlotMenu({
                        x: event.clientX,
                        y: event.clientY,
                        kind: 'slot',
                    });
                }}
            >
                <img
                    src={image.url}
                    alt={image.caption || ''}
                    style={style}
                    className="w-full rounded-xl border border-black/5 bg-white object-contain dark:border-white/10 dark:bg-black/20"
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/img:opacity-100 sm:group-hover/img:opacity-100">
                    <button
                        type="button"
                        onClick={() => void removeBackground()}
                        disabled={removingBg}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-slate-900/75 text-white backdrop-blur-sm hover:bg-slate-900 disabled:cursor-wait"
                        aria-label="Remove plain background"
                        title="Remove plain background"
                    >
                        {removingBg ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Eraser className="size-3.5" />
                        )}
                    </button>
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
            <InlineText
                value={image.caption ?? ''}
                onChange={(caption) => onChange({ ...image, caption })}
                placeholder="Add a caption (optional)"
                maxLength={255}
                label="Image caption"
                className="text-center text-sm leading-snug text-gray-500 dark:text-gray-400"
            />
            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
        </figure>
    );
}

/**
 * The page exactly as students will see it, but editable in place: type the title and text
 * on the paper, drop images into their spots, and see where the page breaks onto the next sheet.
 */
export function FlipbookPageCanvas({
    page,
    number,
    onPatch,
    uploadImage,
    onEditor,
    keyIdeaOpen,
    onCloseKeyIdea,
    onSheetCount,
}: {
    page: FlipbookPage;
    number: number;
    onPatch: (patch: Partial<FlipbookPage>) => void;
    uploadImage: FlipbookImageUploader;
    onEditor: (editor: Editor | null) => void;
    keyIdeaOpen: boolean;
    onCloseKeyIdea: () => void;
    onSheetCount: (count: number) => void;
}) {
    const [wrapRef, wrapWidth] = useWidth<HTMLDivElement>();
    const width = Math.min(wrapWidth, MAX_SHEET_WIDTH);
    const sheetHeight = Math.round(width * SHEET_RATIO);
    const paperRef = useRef<HTMLElement>(null);
    const keyRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<Editor | null>(null);
    const [breaks, setBreaks] = useState<{ top: number; sheet: number }[]>([]);
    const [menu, setMenu] = useState<ContextMenuState | null>(null);

    const slots = slotCount(page.layout);
    const showKeyIdea = (page.highlight ?? '') !== '' || keyIdeaOpen;
    const side = page.layout === 'image-right' && width >= SIDE_MIN_WIDTH;

    // Lay the page out exactly as the reader will, to find where it breaks onto new sheets.
    const { sheets, measurer, ready } = useFlipbookSheets(
        [page],
        width > 0 ? { width, height: sheetHeight } : null,
    );

    useEffect(() => {
        if (ready) {
            onSheetCount(sheets.length);
        }
    }, [ready, sheets.length, onSheetCount]);

    useLayoutEffect(() => {
        const paper = paperRef.current;
        if (!paper || !ready || sheets.length < 2) {
            // Layout is read from the DOM after render, so the markers are stored in state.
            setBreaks((prev) => (prev.length === 0 ? prev : []));
            return;
        }
        const paperTop = paper.getBoundingClientRect().top;
        // Text blocks in the editor, skipping empty lines just as the reader does.
        // Text blocks in the editor, grouped exactly as the reader groups them.
        const blocks = editor
            ? groupBlocks(Array.from(editor.view.dom.children)).map(
                  (group) => group[0],
              )
            : [];
        const found: { top: number; sheet: number }[] = [];
        let blocksBefore = 0;
        sheets.forEach((sheet, i) => {
            if (i > 0) {
                const anchor =
                    sheet.blocks.length > 0
                        ? blocks[blocksBefore]
                        : sheet.highlight
                          ? keyRef.current
                          : null;
                if (anchor) {
                    found.push({
                        top: anchor.getBoundingClientRect().top - paperTop - 10,
                        sheet: i + 1,
                    });
                }
            }
            blocksBefore += sheet.blocks.length;
        });
        setBreaks((prev) =>
            JSON.stringify(prev) === JSON.stringify(found) ? prev : found,
        );
    }, [ready, sheets, editor, width]);

    const setImage = (slot: number, image: FlipbookImage | null) => {
        const images = [...page.images];
        if (image) {
            images[slot] = image;
        } else {
            images.splice(slot, 1);
        }
        onPatch({ images: images.filter(Boolean) });
    };

    const imageSpot = (slot: number, share: number) => (
        <CanvasImage
            key={`${page.id}-${slot}`}
            image={page.images[slot]}
            height={Math.round(sheetHeight * share)}
            slot={slot}
            pageId={page.id}
            uploadImage={uploadImage}
            onChange={(image) => setImage(slot, image)}
            onRemove={() => setImage(slot, null)}
        />
    );

    // Pictures pasted or dropped into the text.
    const uploadInline = async (file: File): Promise<string | null> => {
        if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
            return null;
        }
        try {
            return await uploadImage(file, () => {});
        } catch {
            return null;
        }
    };

    const openMenu = (event: MouseEvent<HTMLDivElement>) => {
        const native = event.nativeEvent as PointerEvent;
        // Shift keeps the browser's menu (spelling); touch keeps the system long-press menu.
        if (event.shiftKey || native.pointerType === 'touch' || !editor) {
            return;
        }
        event.preventDefault();
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG') {
            const position = editor.view.posAtDOM(target, 0);
            editor.chain().focus().setNodeSelection(position).run();
            setMenu({ x: event.clientX, y: event.clientY, kind: 'image' });
            return;
        }
        if (editor.state.selection.empty) {
            const at = editor.view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
            });
            if (at) {
                editor.chain().focus().setTextSelection(at.pos).run();
            }
        } else {
            editor.commands.focus();
        }
        setMenu({ x: event.clientX, y: event.clientY, kind: 'text' });
    };

    const body = (
        <Suspense
            fallback={
                <div className="h-24 animate-pulse rounded-lg bg-black/5" />
            }
        >
            <div className="flipbook-prose min-w-0" onContextMenu={openMenu}>
                <RichTextEditor
                    key={page.id}
                    bare
                    value={page.body}
                    onChange={(html) => onPatch({ body: html })}
                    placeholder="Start typing your lesson here…"
                    contentClassName="flipbook-body-editor min-h-[6rem] outline-none"
                    extensions={FLIPBOOK_EXTENSIONS}
                    uploadImage={uploadInline}
                    onEditor={(instance) => {
                        setEditor(instance);
                        onEditor(instance);
                    }}
                />
            </div>
        </Suspense>
    );

    const keyIdea = showKeyIdea && (
        <div
            ref={keyRef}
            className="group/key relative flex items-start gap-2.5 rounded-xl bg-amber-100 px-4 py-3 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100"
        >
            <Lightbulb
                className="mt-1 size-4 shrink-0 text-amber-600 dark:text-amber-300"
                aria-hidden
            />
            <InlineText
                value={page.highlight ?? ''}
                onChange={(highlight) => onPatch({ highlight })}
                placeholder="Key idea, e.g. Tension pulls rocks apart → normal fault"
                maxLength={500}
                autoFocus={keyIdeaOpen && !page.highlight}
                label="Key idea"
                className="font-semibold placeholder:text-amber-900/50 dark:placeholder:text-amber-100/50"
            />
            <button
                type="button"
                onClick={() => {
                    onPatch({ highlight: '' });
                    onCloseKeyIdea();
                }}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-amber-800 opacity-60 hover:bg-amber-200 hover:opacity-100 dark:text-amber-200 dark:hover:bg-amber-400/20"
                aria-label="Remove key idea"
                title="Remove key idea"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );

    const heading = (
        <InlineText
            value={page.heading}
            onChange={(value) => onPatch({ heading: value })}
            placeholder="Page title"
            maxLength={255}
            label="Page title"
            className={cn(
                'font-display leading-tight font-extrabold tracking-[-0.02em] text-balance placeholder:opacity-35',
                page.layout === 'image-full'
                    ? 'text-lg'
                    : 'text-xl @md:text-2xl',
            )}
        />
    );

    return (
        <div ref={wrapRef} className="flipbook-editing mx-auto w-full">
            {measurer}
            {width > 0 && (
                <div className="mx-auto" style={{ width }}>
                    <article
                        ref={paperRef}
                        className={cn(
                            'flipbook-paper relative rounded-md shadow-[0_24px_48px_-28px_rgba(46,16,101,0.45),0_0_0_1px_rgba(0,0,0,0.04)]',
                            backgroundClass(page.background),
                            spacingClass(page.spacing),
                        )}
                        style={{
                            minHeight: sheetHeight,
                            containerType: 'inline-size',
                            // Pictures in the text are capped like in the book (55% of a sheet).
                            ['--fb-img-max' as string]: `${Math.round(sheetHeight * 0.55)}px`,
                        }}
                    >
                        {page.layout === 'image-full' ? (
                            <div className="flex flex-col gap-3 px-5 pt-5 pb-5">
                                {heading}
                                {imageSpot(0, FIGURE_SHARE.full)}
                                {keyIdea}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5 px-6 pt-7 pb-8 @md:px-9 @md:pt-9">
                                {heading}
                                {page.layout === 'image-top' &&
                                    imageSpot(0, FIGURE_SHARE.top)}
                                {page.layout === 'two-images' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {imageSpot(0, FIGURE_SHARE.pair)}
                                        {imageSpot(1, FIGURE_SHARE.pair)}
                                    </div>
                                )}
                                {page.layout === 'image-right' &&
                                    !side &&
                                    imageSpot(0, FIGURE_SHARE.top)}
                                {side ? (
                                    <div className={SIDE_GRID_CLASS}>
                                        {body}
                                        {imageSpot(0, FIGURE_SHARE.side)}
                                    </div>
                                ) : (
                                    body
                                )}
                                {keyIdea}
                            </div>
                        )}

                        {/* Where the page continues onto the next sheet of the book. */}
                        {breaks.map((mark) => (
                            <div
                                key={mark.sheet}
                                className="pointer-events-none absolute inset-x-0 flex items-center gap-2 px-3"
                                style={{ top: mark.top }}
                                aria-hidden
                            >
                                <span className="h-px flex-1 border-t-2 border-dashed border-primary/45" />
                                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                                    Sheet {mark.sheet} starts here
                                </span>
                                <span className="h-px flex-1 border-t-2 border-dashed border-primary/45" />
                            </div>
                        ))}
                    </article>
                    <FlipbookContextMenu
                        state={menu}
                        onClose={() => setMenu(null)}
                        editor={editor}
                        onUploadImage={uploadInline}
                    />
                    <p className="mt-2 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                        Page {number}
                        {slots > 0 &&
                            page.images.length < slots &&
                            ' · click the dashed box to add an image'}
                    </p>
                </div>
            )}
        </div>
    );
}
