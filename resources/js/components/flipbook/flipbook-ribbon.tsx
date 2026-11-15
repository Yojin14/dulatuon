import { type Editor } from '@/components/rich-text-editor';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    ArrowDown,
    ArrowUp,
    Baseline,
    Bold,
    BookOpen,
    ChevronDown,
    Copy,
    Eraser,
    FileUp,
    Highlighter,
    ImagePlus,
    Italic,
    LayoutTemplate,
    Lightbulb,
    Link2,
    List,
    ListOrdered,
    Loader2,
    PaintBucket,
    PanelLeft,
    PanelRight,
    Plus,
    Redo2,
    Trash2,
    Underline,
    Undo2,
    UnfoldVertical,
} from 'lucide-react';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import {
    flipbookCommands,
    removeSelectedImageBackground,
} from './flipbook-commands';
import { OPEN_LINK_EVENT } from './flipbook-context-menu';
import {
    FLIPBOOK_FONTS,
    FLIPBOOK_HIGHLIGHTS,
    FLIPBOOK_SIZES,
    FLIPBOOK_TEXT_COLORS,
    FLIPBOOK_WEIGHTS,
    type ImageAlign,
    type ImageSize,
    type TextAlignment,
} from './flipbook-extensions';
import {
    backgroundClass,
    FLIPBOOK_BACKGROUNDS,
    FLIPBOOK_LAYOUTS,
    FLIPBOOK_SPACINGS,
    type FlipbookBackground,
    type FlipbookLayout,
    type FlipbookSpacing,
} from './flipbook-types';
import { IMAGE_ACCEPT } from './flipbook-upload';

function RibbonButton({
    label,
    onClick,
    active,
    disabled,
    children,
    tone,
    wide,
}: {
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: ReactNode;
    tone?: 'danger';
    wide?: boolean;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={wide ? undefined : label}
            aria-pressed={active}
            disabled={disabled}
            // Keep the cursor in the text while formatting.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn(
                'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                wide ? 'px-2.5' : 'w-9',
                active
                    ? 'bg-primary/12 text-primary'
                    : tone === 'danger'
                      ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {children}
        </button>
    );
}

const isMacPlatform =
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

const ALIGN_BUTTONS: {
    value: TextAlignment;
    label: string;
    shortcut: string;
    Icon: typeof AlignLeft;
}[] = [
    { value: 'left', label: 'Align left', shortcut: 'L', Icon: AlignLeft },
    { value: 'center', label: 'Centre', shortcut: 'E', Icon: AlignCenter },
    { value: 'right', label: 'Align right', shortcut: 'R', Icon: AlignRight },
    { value: 'justify', label: 'Justify', shortcut: 'J', Icon: AlignJustify },
];

function Divider() {
    return <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />;
}

/** A compact dropdown trigger showing the current value, like Word's font box. */
function MenuTrigger({
    label,
    value,
    disabled,
    className,
    children,
}: {
    label: string;
    value: ReactNode;
    disabled?: boolean;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <DropdownMenuTrigger asChild disabled={disabled}>
            <button
                type="button"
                title={label}
                onMouseDown={(e) => e.preventDefault()}
                className={cn(
                    'inline-flex h-9 max-w-44 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35',
                    className,
                )}
            >
                {children}
                <span className="truncate">{value}</span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
        </DropdownMenuTrigger>
    );
}

/** Swatch grid for text and highlight colours. */
function ColorMenu({
    label,
    icon,
    colors,
    current,
    disabled,
    onPick,
    onClear,
    clearLabel,
}: {
    label: string;
    icon: ReactNode;
    colors: string[];
    current: string | null;
    disabled: boolean;
    onPick: (color: string) => void;
    onClear: () => void;
    clearLabel: string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    title={label}
                    aria-label={label}
                    onMouseDown={(e) => e.preventDefault()}
                    className="inline-flex h-9 w-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                >
                    {icon}
                    <span
                        className="h-1 w-5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: current ?? 'transparent' }}
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 p-2">
                <p className="px-1 pb-2 text-xs font-bold text-muted-foreground">
                    {label}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                    {colors.map((color) => (
                        <DropdownMenuItem
                            key={color}
                            onSelect={() => onPick(color)}
                            className="size-7 cursor-pointer rounded-md p-0 ring-1 ring-black/10 focus:ring-2 focus:ring-primary"
                            style={{ backgroundColor: color }}
                            aria-label={color}
                        />
                    ))}
                </div>
                <DropdownMenuItem
                    onSelect={onClear}
                    className="mt-2 cursor-pointer justify-center text-xs font-semibold"
                >
                    {clearLabel}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Page background: plain colours and paper templates, shown as little paper tiles. */
function BackgroundMenu({
    value,
    onPick,
}: {
    value: FlipbookBackground;
    onPick: (background: FlipbookBackground, everyPage: boolean) => void;
}) {
    const [everyPage, setEveryPage] = useState(false);
    const current = FLIPBOOK_BACKGROUNDS.find((b) => b.value === value);
    const tile = (option: (typeof FLIPBOOK_BACKGROUNDS)[number]) => (
        <DropdownMenuItem
            key={option.value}
            onSelect={() => onPick(option.value, everyPage)}
            title={option.label}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1 focus:bg-muted"
        >
            <span
                className={cn(
                    'flipbook-paper block h-12 w-10 rounded-md ring-1 ring-black/10',
                    backgroundClass(option.value),
                    option.value === value &&
                        'ring-2 ring-primary ring-offset-1 ring-offset-popover',
                )}
                aria-hidden
            />
            <span className="w-14 truncate text-center text-[11px] leading-tight text-muted-foreground">
                {option.label}
            </span>
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu>
            <MenuTrigger
                label="Page background"
                value={current?.label ?? 'Paper'}
            >
                <PaintBucket className="size-4 text-muted-foreground" />
            </MenuTrigger>
            <DropdownMenuContent align="start" className="w-72 rounded-xl p-2">
                <p className="px-1 pb-1 text-xs font-bold text-muted-foreground">
                    Colour
                </p>
                <div className="grid grid-cols-4 gap-1">
                    {FLIPBOOK_BACKGROUNDS.filter(
                        (b) => b.kind === 'colour',
                    ).map(tile)}
                </div>
                <p className="px-1 pt-2 pb-1 text-xs font-bold text-muted-foreground">
                    Template
                </p>
                <div className="grid grid-cols-4 gap-1">
                    {FLIPBOOK_BACKGROUNDS.filter(
                        (b) => b.kind === 'template',
                    ).map(tile)}
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-muted">
                    <input
                        type="checkbox"
                        checked={everyPage}
                        onChange={(e) => setEveryPage(e.target.checked)}
                        className="size-4 accent-[var(--color-primary)]"
                    />
                    Use on every page
                </label>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const SIZE_LABELS: { value: ImageSize; label: string }[] = [
    { value: 'small', label: 'S' },
    { value: 'medium', label: 'M' },
    { value: 'large', label: 'L' },
    { value: 'full', label: 'Full' },
];

/**
 * Word-style toolbar above the page: text style, font, weight, colours and lists for the
 * text; pictures that text wraps around; the page layout; key idea; page actions; and
 * reading the book as a student.
 */
export function FlipbookRibbon({
    editor,
    layout,
    onLayout,
    background,
    onBackground,
    spacing,
    onSpacing,
    onUndo,
    onRedo,
    historyCanUndo,
    historyCanRedo,
    onUploadImage,
    onInsertKeyIdea,
    keyIdeaShown,
    onAddPage,
    onDuplicate,
    onMove,
    onDelete,
    canMoveUp,
    canMoveDown,
    onRead,
    onImportPdf,
    sheetCount,
}: {
    editor: Editor | null;
    layout: FlipbookLayout;
    onLayout: (layout: FlipbookLayout) => void;
    background: FlipbookBackground;
    /** Set the background of this page, or of every page. */
    onBackground: (background: FlipbookBackground, everyPage: boolean) => void;
    spacing: FlipbookSpacing;
    onSpacing: (spacing: FlipbookSpacing) => void;
    onUndo: () => void;
    onRedo: () => void;
    /** Page history (layout, background, pages…); body text history is read from the editor. */
    historyCanUndo: boolean;
    historyCanRedo: boolean;
    onUploadImage: (file: File) => Promise<string | null>;
    onInsertKeyIdea: () => void;
    keyIdeaShown: boolean;
    onAddPage: () => void;
    onDuplicate: () => void;
    onMove: (dir: -1 | 1) => void;
    onDelete: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onRead: () => void;
    onImportPdf: () => void;
    sheetCount: number;
}) {
    // Re-render on every editor change so the buttons show the current formatting.
    const [, refresh] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (!editor) {
            return;
        }
        editor.on('transaction', refresh);
        return () => {
            editor.off('transaction', refresh);
        };
    }, [editor]);

    const [linkOpen, setLinkOpen] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    // "Link…" in the right-click menu opens this link box.
    useEffect(() => {
        const open = () => {
            setLinkValue((editor?.getAttributes('link').href as string) ?? '');
            setLinkOpen(true);
        };
        window.addEventListener(OPEN_LINK_EVENT, open);
        return () => window.removeEventListener(OPEN_LINK_EVENT, open);
    }, [editor]);
    const [uploading, setUploading] = useState(false);
    const imageInput = useRef<HTMLInputElement>(null);
    const ready = !!editor;
    const run = (command: (e: Editor) => void) => {
        if (editor) {
            command(editor);
        }
    };
    const applyLink = () => {
        run((e) => {
            const url = linkValue.trim();
            if (url === '') {
                e.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
                const href = /^(https?:\/\/|mailto:)/i.test(url)
                    ? url
                    : `https://${url}`;
                e.chain()
                    .focus()
                    .extendMarkRange('link')
                    .setLink({ href })
                    .run();
            }
        });
        setLinkOpen(false);
    };

    const insertImage = async (file: File | undefined) => {
        if (!file || !editor) {
            return;
        }
        setUploading(true);
        try {
            const src = await onUploadImage(file);
            if (src) {
                editor.chain().focus().setImage({ src }).run();
            }
        } finally {
            setUploading(false);
        }
    };

    const textStyle = (editor?.getAttributes('textStyle') ?? {}) as {
        fontFamily?: string;
        fontWeight?: string;
        fontSize?: string;
        color?: string;
        backgroundColor?: string;
    };
    const blockStyle = editor?.isActive('heading', { level: 3 })
        ? 'Heading'
        : editor?.isActive('heading', { level: 4 })
          ? 'Subheading'
          : 'Normal text';
    const fontLabel =
        FLIPBOOK_FONTS.find((f) => f.value === (textStyle.fontFamily ?? ''))
            ?.label ?? 'Default';
    const weightLabel =
        FLIPBOOK_WEIGHTS.find((w) => w.value === (textStyle.fontWeight ?? ''))
            ?.label ?? 'Regular';
    const sizeLabel =
        FLIPBOOK_SIZES.find((size) => size.value === (textStyle.fontSize ?? ''))
            ?.label ?? 'Normal';
    const imageSelected = !!editor?.isActive('image');
    const image = (editor?.getAttributes('image') ?? {}) as {
        align?: ImageAlign;
        size?: ImageSize;
        src?: string;
    };
    const setImage = (attrs: { align?: ImageAlign; size?: ImageSize }) =>
        run((e) => e.chain().focus().updateAttributes('image', attrs).run());

    // Plain-background removal: cut out the picture, upload the cut-out, swap it in (Ctrl+Z undoes).
    const [removingBg, setRemovingBg] = useState(false);
    const [bgError, setBgError] = useState<string | null>(null);
    const removeBackground = async () => {
        if (!editor || !image.src || removingBg) {
            return;
        }
        setRemovingBg(true);
        setBgError(null);
        try {
            await removeSelectedImageBackground(editor, onUploadImage);
        } catch (e) {
            setBgError((e as Error).message);
        } finally {
            setRemovingBg(false);
        }
    };
    const currentLayout = FLIPBOOK_LAYOUTS.find((l) => l.value === layout);

    return (
        <div className="sticky top-0 z-20 rounded-2xl border bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <input
                ref={imageInput}
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                    void insertImage(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
            <div
                role="toolbar"
                aria-label="Page editing tools"
                className="flex [scrollbar-width:none] items-center gap-0.5 overflow-x-auto px-2 py-1.5 sm:flex-wrap sm:overflow-visible"
            >
                <RibbonButton
                    label={`Undo (${isMacPlatform ? '⌘Z' : 'Ctrl+Z'})`}
                    disabled={!historyCanUndo && !editor?.can().undo()}
                    onClick={onUndo}
                >
                    <Undo2 className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label={`Redo (${isMacPlatform ? '⇧⌘Z' : 'Ctrl+Y'})`}
                    disabled={!historyCanRedo && !editor?.can().redo()}
                    onClick={onRedo}
                >
                    <Redo2 className="size-4" />
                </RibbonButton>
                <Divider />
                {/* Paragraph style, font and weight */}
                <DropdownMenu>
                    <MenuTrigger
                        label="Text style"
                        value={blockStyle}
                        disabled={!ready}
                    />
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() => run(flipbookCommands.paragraph)}
                        >
                            Normal text
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer font-display text-lg font-extrabold"
                            onSelect={() =>
                                run((e) =>
                                    e
                                        .chain()
                                        .focus()
                                        .setHeading({ level: 3 })
                                        .run(),
                                )
                            }
                        >
                            Heading
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer font-display font-bold"
                            onSelect={() =>
                                run((e) =>
                                    e
                                        .chain()
                                        .focus()
                                        .setHeading({ level: 4 })
                                        .run(),
                                )
                            }
                        >
                            Subheading
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <MenuTrigger
                        label="Font"
                        value={fontLabel}
                        disabled={!ready}
                    />
                    <DropdownMenuContent align="start" className="w-52">
                        {FLIPBOOK_FONTS.map((font) => (
                            <DropdownMenuItem
                                key={font.label}
                                className="cursor-pointer"
                                style={{
                                    fontFamily: font.value || undefined,
                                }}
                                onSelect={() =>
                                    run((e) =>
                                        font.value
                                            ? e
                                                  .chain()
                                                  .focus()
                                                  .setFontFamily(font.value)
                                                  .run()
                                            : e
                                                  .chain()
                                                  .focus()
                                                  .unsetFontFamily()
                                                  .run(),
                                    )
                                }
                            >
                                {font.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <MenuTrigger
                        label="Font weight"
                        value={weightLabel}
                        disabled={!ready}
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        {FLIPBOOK_WEIGHTS.map((weight) => (
                            <DropdownMenuItem
                                key={weight.label}
                                className="cursor-pointer"
                                style={{
                                    fontWeight: weight.value || undefined,
                                }}
                                onSelect={() =>
                                    run((e) =>
                                        e
                                            .chain()
                                            .focus()
                                            .setMark('textStyle', {
                                                fontWeight:
                                                    weight.value || null,
                                            })
                                            .removeEmptyTextStyle()
                                            .run(),
                                    )
                                }
                            >
                                {weight.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <MenuTrigger
                        label="Font size"
                        value={sizeLabel}
                        disabled={!ready}
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        {FLIPBOOK_SIZES.map((size) => (
                            <DropdownMenuItem
                                key={size.label}
                                className="cursor-pointer"
                                style={{ fontSize: size.value || undefined }}
                                onSelect={() =>
                                    run((e) =>
                                        flipbookCommands.size(e, size.value),
                                    )
                                }
                            >
                                {size.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Divider />
                <RibbonButton
                    label="Bold (Ctrl+B)"
                    disabled={!ready}
                    active={editor?.isActive('bold')}
                    onClick={() => run(flipbookCommands.bold)}
                >
                    <Bold className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label="Italic (Ctrl+I)"
                    disabled={!ready}
                    active={editor?.isActive('italic')}
                    onClick={() => run(flipbookCommands.italic)}
                >
                    <Italic className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label="Underline (Ctrl+U)"
                    disabled={!ready}
                    active={editor?.isActive('underline')}
                    onClick={() => run(flipbookCommands.underline)}
                >
                    <Underline className="size-4" />
                </RibbonButton>
                <ColorMenu
                    label="Text colour"
                    icon={<Baseline className="size-4" />}
                    colors={FLIPBOOK_TEXT_COLORS}
                    current={textStyle.color ?? null}
                    disabled={!ready}
                    onPick={(color) =>
                        run((e) => e.chain().focus().setColor(color).run())
                    }
                    onClear={() =>
                        run((e) => e.chain().focus().unsetColor().run())
                    }
                    clearLabel="Automatic colour"
                />
                <ColorMenu
                    label="Highlight colour"
                    icon={<Highlighter className="size-4" />}
                    colors={FLIPBOOK_HIGHLIGHTS}
                    current={textStyle.backgroundColor ?? null}
                    disabled={!ready}
                    onPick={(color) =>
                        run((e) =>
                            e.chain().focus().setBackgroundColor(color).run(),
                        )
                    }
                    onClear={() =>
                        run((e) =>
                            e.chain().focus().unsetBackgroundColor().run(),
                        )
                    }
                    clearLabel="No highlight"
                />
                <RibbonButton
                    label="Bulleted list"
                    disabled={!ready}
                    active={editor?.isActive('bulletList')}
                    onClick={() => run(flipbookCommands.bulletList)}
                >
                    <List className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label="Numbered list"
                    disabled={!ready}
                    active={editor?.isActive('orderedList')}
                    onClick={() => run(flipbookCommands.orderedList)}
                >
                    <ListOrdered className="size-4" />
                </RibbonButton>
                {ALIGN_BUTTONS.map(({ value, label, shortcut, Icon }) => (
                    <RibbonButton
                        key={value}
                        label={`${label} (${isMacPlatform ? '⇧⌘' : 'Ctrl+Shift+'}${shortcut})`}
                        disabled={!ready}
                        active={
                            value === 'left'
                                ? !ALIGN_BUTTONS.some(
                                      (a) =>
                                          a.value !== 'left' &&
                                          editor?.isActive({
                                              textAlign: a.value,
                                          }),
                                  )
                                : editor?.isActive({ textAlign: value })
                        }
                        onClick={() =>
                            run((e) => flipbookCommands.align(e, value))
                        }
                    >
                        <Icon className="size-4" />
                    </RibbonButton>
                ))}
                <RibbonButton
                    label="Link (Ctrl+K)"
                    disabled={!ready}
                    active={editor?.isActive('link') || linkOpen}
                    onClick={() => {
                        setLinkValue(
                            (editor?.getAttributes('link').href as string) ??
                                '',
                        );
                        setLinkOpen((open) => !open);
                    }}
                >
                    <Link2 className="size-4" />
                </RibbonButton>

                <Divider />
                <RibbonButton
                    label="Insert a picture into the text"
                    wide
                    disabled={!ready || uploading}
                    onClick={() => imageInput.current?.click()}
                >
                    {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <ImagePlus className="size-4" />
                    )}
                    <span className="hidden sm:inline">Picture</span>
                </RibbonButton>
                <RibbonButton
                    label="Key idea"
                    wide
                    active={keyIdeaShown}
                    onClick={onInsertKeyIdea}
                >
                    <Lightbulb className="size-4" />
                    <span className="hidden sm:inline">Key idea</span>
                </RibbonButton>
                <DropdownMenu>
                    <MenuTrigger
                        label="Line and paragraph spacing"
                        value={
                            FLIPBOOK_SPACINGS.find((s) => s.value === spacing)
                                ?.label ?? '1.15'
                        }
                    >
                        <UnfoldVertical className="size-4 text-muted-foreground" />
                    </MenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <p className="px-2 pt-1 pb-1.5 text-xs font-bold text-muted-foreground">
                            Spacing for this page
                        </p>
                        {FLIPBOOK_SPACINGS.map((option) => (
                            <DropdownMenuItem
                                key={option.value}
                                className={cn(
                                    'cursor-pointer',
                                    option.value === spacing &&
                                        'font-bold text-primary',
                                )}
                                onSelect={() => onSpacing(option.value)}
                            >
                                {option.label}
                                {option.value === 'normal' && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        default
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}
                        <p className="px-2 pt-1.5 pb-1 text-[11px] leading-snug text-muted-foreground">
                            Tip: Shift+Enter starts a new line with no gap.
                        </p>
                    </DropdownMenuContent>
                </DropdownMenu>
                <BackgroundMenu value={background} onPick={onBackground} />
                <DropdownMenu>
                    <MenuTrigger
                        label="Page layout"
                        value={currentLayout?.label}
                    >
                        <LayoutTemplate className="size-4 text-muted-foreground" />
                    </MenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        {FLIPBOOK_LAYOUTS.map((option) => (
                            <DropdownMenuItem
                                key={option.value}
                                onSelect={() => onLayout(option.value)}
                                className={cn(
                                    'cursor-pointer',
                                    option.value === layout &&
                                        'font-bold text-primary',
                                )}
                            >
                                {option.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Divider />
                <RibbonButton
                    label="Add page after this one"
                    wide
                    onClick={onAddPage}
                >
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">Page</span>
                </RibbonButton>
                <RibbonButton label="Duplicate page" onClick={onDuplicate}>
                    <Copy className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label="Move page earlier"
                    disabled={!canMoveUp}
                    onClick={() => onMove(-1)}
                >
                    <ArrowUp className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label="Move page later"
                    disabled={!canMoveDown}
                    onClick={() => onMove(1)}
                >
                    <ArrowDown className="size-4" />
                </RibbonButton>
                <RibbonButton
                    label="Delete page"
                    tone="danger"
                    onClick={onDelete}
                >
                    <Trash2 className="size-4" />
                </RibbonButton>

                <span className="ml-auto flex shrink-0 items-center gap-1 pl-2">
                    <span
                        className={cn(
                            'hidden rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap md:inline',
                            sheetCount > 1
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                        )}
                        title={
                            sheetCount > 1
                                ? 'Long pages continue onto the next sheet of the book'
                                : 'This page fits on one sheet'
                        }
                    >
                        {sheetCount > 1
                            ? `${sheetCount} sheets`
                            : 'Fits 1 sheet'}
                    </span>
                    <RibbonButton
                        label="Add pages from a PDF"
                        onClick={onImportPdf}
                    >
                        <FileUp className="size-4" />
                    </RibbonButton>
                    <button
                        type="button"
                        onClick={onRead}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                    >
                        <BookOpen className="size-4" />
                        <span className="hidden sm:inline">
                            Read like a student
                        </span>
                        <span className="sm:hidden">Read</span>
                    </button>
                </span>
            </div>

            {/* Picture tools, shown while a picture in the text is selected */}
            {imageSelected && (
                <div
                    role="toolbar"
                    aria-label="Picture tools"
                    className="flex flex-wrap items-center gap-0.5 border-t bg-primary/5 px-2 py-1.5"
                >
                    <span className="px-1.5 text-xs font-bold text-primary">
                        Picture
                    </span>
                    <RibbonButton
                        label="Wrap text, picture on the left"
                        active={image.align === 'left'}
                        onClick={() => setImage({ align: 'left' })}
                    >
                        <PanelLeft className="size-4" />
                    </RibbonButton>
                    <RibbonButton
                        label="Centre, no wrap"
                        active={image.align === 'center'}
                        onClick={() => setImage({ align: 'center' })}
                    >
                        <AlignCenter className="size-4" />
                    </RibbonButton>
                    <RibbonButton
                        label="Wrap text, picture on the right"
                        active={image.align === 'right'}
                        onClick={() => setImage({ align: 'right' })}
                    >
                        <PanelRight className="size-4" />
                    </RibbonButton>
                    <Divider />
                    {SIZE_LABELS.map((size) => (
                        <RibbonButton
                            key={size.value}
                            label={`${size.value[0].toUpperCase()}${size.value.slice(1)} size`}
                            wide
                            active={image.size === size.value}
                            onClick={() => setImage({ size: size.value })}
                        >
                            {size.label}
                        </RibbonButton>
                    ))}
                    <Divider />
                    <RibbonButton
                        label="Remove a plain (white or single-colour) background"
                        wide
                        disabled={removingBg}
                        onClick={() => void removeBackground()}
                    >
                        {removingBg ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Eraser className="size-4" />
                        )}
                        <span className="hidden sm:inline">
                            {removingBg ? 'Removing…' : 'Remove background'}
                        </span>
                    </RibbonButton>
                    <Divider />
                    <RibbonButton
                        label="Remove picture"
                        tone="danger"
                        onClick={() =>
                            run((e) =>
                                e.chain().focus().deleteSelection().run(),
                            )
                        }
                    >
                        <Trash2 className="size-4" />
                    </RibbonButton>
                    {bgError && (
                        <p
                            role="alert"
                            className="basis-full px-1.5 pt-1 text-xs font-medium text-destructive"
                        >
                            {bgError}
                        </p>
                    )}
                </div>
            )}

            {linkOpen && (
                <div className="flex items-center gap-2 border-t px-3 py-2">
                    <input
                        autoFocus
                        value={linkValue}
                        onChange={(e) => setLinkValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                applyLink();
                            } else if (e.key === 'Escape') {
                                setLinkOpen(false);
                            }
                        }}
                        placeholder="Paste a link and press Enter (leave empty to remove)"
                        className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <button
                        type="button"
                        onClick={applyLink}
                        className="h-9 cursor-pointer rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
                    >
                        Apply
                    </button>
                </div>
            )}
        </div>
    );
}
