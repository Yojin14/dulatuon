import { type Editor } from '@/components/rich-text-editor';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Baseline,
    Bold,
    ClipboardPaste,
    Copy,
    Eraser,
    Highlighter,
    ImagePlus,
    Italic,
    Link2,
    List,
    Maximize2,
    PanelLeft,
    PanelRight,
    RefreshCw,
    RemoveFormatting,
    Scissors,
    Trash2,
    Underline,
} from 'lucide-react';
import { useRef } from 'react';
import {
    flipbookCommands as cmd,
    removeSelectedImageBackground,
} from './flipbook-commands';
import {
    FLIPBOOK_HIGHLIGHTS,
    FLIPBOOK_TEXT_COLORS,
    type ImageAlign,
    type ImageSize,
} from './flipbook-extensions';
import { IMAGE_ACCEPT } from './flipbook-upload';

export type ContextMenuKind = 'text' | 'image' | 'slot';

export interface ContextMenuState {
    x: number;
    y: number;
    kind: ContextMenuKind;
}

/** Asks the ribbon to open its link box (it owns the link input). */
export const OPEN_LINK_EVENT = 'flipbook:open-link';

const isMac =
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const key = (letter: string) => (isMac ? `⌘${letter}` : `Ctrl+${letter}`);

function Swatches({
    colors,
    onPick,
}: {
    colors: string[];
    onPick: (color: string) => void;
}) {
    return (
        <div className="grid grid-cols-5 gap-1.5 p-1.5">
            {colors.map((color) => (
                <DropdownMenuItem
                    key={color}
                    aria-label={color}
                    onSelect={() => onPick(color)}
                    className="size-7 cursor-pointer rounded-md p-0 ring-1 ring-black/10 focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
}

/**
 * Word-style right-click menu for a flipbook page. Text gets formatting; pictures get wrap,
 * size, Remove background, replace and delete. Shift + right-click shows the browser's own menu.
 */
export function FlipbookContextMenu({
    state,
    onClose,
    editor,
    onUploadImage,
    slot,
}: {
    state: ContextMenuState | null;
    onClose: () => void;
    editor: Editor | null;
    onUploadImage: (file: File) => Promise<string | null>;
    /** For a template picture spot (no editor involved). */
    slot?: {
        onReplace: () => void;
        onRemoveBackground: () => void;
        onRemove: () => void;
    };
}) {
    const fileInput = useRef<HTMLInputElement>(null);
    const fileMode = useRef<'insert' | 'replace'>('insert');

    const run = (action: (e: Editor) => unknown) => {
        if (editor) {
            action(editor);
        }
    };

    const clipboard = async (action: 'cut' | 'copy' | 'paste') => {
        if (!editor) {
            return;
        }
        editor.commands.focus();
        if (action === 'paste') {
            try {
                const text = await navigator.clipboard.readText();
                editor.chain().focus().insertContent(text).run();
            } catch {
                toast(`Press ${key('V')} to paste`, 'info');
            }
            return;
        }
        // execCommand still copies rich text; fall back to plain text if the browser refuses.
        if (!document.execCommand(action)) {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, '\n');
            try {
                await navigator.clipboard.writeText(text);
                if (action === 'cut') {
                    cmd.deleteSelection(editor);
                }
            } catch {
                toast(
                    `Press ${key(action === 'cut' ? 'X' : 'C')} to ${action}`,
                    'info',
                );
            }
        }
    };

    const removeBackground = async () => {
        if (!editor) {
            return;
        }
        try {
            await removeSelectedImageBackground(editor, onUploadImage);
            toast('Background removed. Press Ctrl+Z to undo.', 'success');
        } catch (e) {
            toast((e as Error).message, 'error', 5000);
        }
    };

    const pickFile = (mode: 'insert' | 'replace') => {
        fileMode.current = mode;
        fileInput.current?.click();
    };

    const onFile = async (file: File | undefined) => {
        if (!file || !editor) {
            return;
        }
        const src = await onUploadImage(file);
        if (!src) {
            return;
        }
        if (fileMode.current === 'replace') {
            editor.chain().focus().updateAttributes('image', { src }).run();
        } else {
            editor.chain().focus().setImage({ src }).run();
        }
    };

    const isActive = (name: string) => !!editor?.isActive(name);
    const image = (editor?.getAttributes('image') ?? {}) as {
        align?: ImageAlign;
        size?: ImageSize;
    };
    const row = 'cursor-pointer gap-2.5 py-2';
    const rowIcon = 'size-4 text-muted-foreground';

    return (
        <>
            <input
                ref={fileInput}
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                    void onFile(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
            <DropdownMenu
                open={state !== null}
                onOpenChange={(open) => !open && onClose()}
                modal={false}
            >
                <DropdownMenuTrigger asChild>
                    <span
                        aria-hidden
                        className="pointer-events-none fixed size-0"
                        style={{ left: state?.x ?? 0, top: state?.y ?? 0 }}
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    collisionPadding={12}
                    className="w-56 overflow-y-auto rounded-xl p-1.5 shadow-xl"
                    style={{
                        maxHeight:
                            'var(--radix-dropdown-menu-content-available-height)',
                    }}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    {state?.kind === 'text' && (
                        <>
                            {/* Quick formatting, like Word's mini toolbar */}
                            <div
                                role="group"
                                aria-label="Formatting"
                                className="mb-1 flex items-center justify-between rounded-lg bg-muted/60 p-1"
                            >
                                <ToolIcon
                                    label={`Bold (${key('B')})`}
                                    active={isActive('bold')}
                                    onSelect={() => run(cmd.bold)}
                                >
                                    <Bold className="size-4" />
                                </ToolIcon>
                                <ToolIcon
                                    label={`Italic (${key('I')})`}
                                    active={isActive('italic')}
                                    onSelect={() => run(cmd.italic)}
                                >
                                    <Italic className="size-4" />
                                </ToolIcon>
                                <ToolIcon
                                    label={`Underline (${key('U')})`}
                                    active={isActive('underline')}
                                    onSelect={() => run(cmd.underline)}
                                >
                                    <Underline className="size-4" />
                                </ToolIcon>
                                <ColorTool
                                    label="Text colour"
                                    icon={<Baseline className="size-4" />}
                                    colors={FLIPBOOK_TEXT_COLORS}
                                    onPick={(c) => run((e) => cmd.color(e, c))}
                                    clearLabel="Automatic"
                                />
                                <ColorTool
                                    label="Highlight"
                                    icon={<Highlighter className="size-4" />}
                                    colors={FLIPBOOK_HIGHLIGHTS}
                                    onPick={(c) =>
                                        run((e) => cmd.highlight(e, c))
                                    }
                                    clearLabel="No highlight"
                                />
                                <ToolIcon
                                    label="Bulleted list"
                                    active={isActive('bulletList')}
                                    onSelect={() => run(cmd.bulletList)}
                                >
                                    <List className="size-4" />
                                </ToolIcon>
                            </div>
                            <div
                                role="group"
                                aria-label="Alignment"
                                className="mb-1 flex items-center justify-between rounded-lg bg-muted/60 p-1"
                            >
                                {(
                                    [
                                        ['left', 'Align left', AlignLeft],
                                        ['center', 'Centre', AlignCenter],
                                        ['right', 'Align right', AlignRight],
                                        ['justify', 'Justify', AlignJustify],
                                    ] as const
                                ).map(([value, label, Icon]) => (
                                    <ToolIcon
                                        key={value}
                                        label={label}
                                        active={
                                            value !== 'left' &&
                                            !!editor?.isActive({
                                                textAlign: value,
                                            })
                                        }
                                        onSelect={() =>
                                            run((e) => cmd.align(e, value))
                                        }
                                    >
                                        <Icon className="size-4" />
                                    </ToolIcon>
                                ))}
                            </div>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => void clipboard('cut')}
                            >
                                <Scissors className={rowIcon} /> Cut
                                <DropdownMenuShortcut>
                                    {key('X')}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => void clipboard('copy')}
                            >
                                <Copy className={rowIcon} /> Copy
                                <DropdownMenuShortcut>
                                    {key('C')}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => void clipboard('paste')}
                            >
                                <ClipboardPaste className={rowIcon} /> Paste
                                <DropdownMenuShortcut>
                                    {key('V')}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className={row}
                                onSelect={() =>
                                    window.dispatchEvent(
                                        new Event(OPEN_LINK_EVENT),
                                    )
                                }
                            >
                                <Link2 className={rowIcon} /> Link
                                <DropdownMenuShortcut>
                                    {key('K')}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => pickFile('insert')}
                            >
                                <ImagePlus className={rowIcon} /> Insert picture
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => run(cmd.clearFormatting)}
                            >
                                <RemoveFormatting className={rowIcon} /> Clear
                                formatting
                            </DropdownMenuItem>
                        </>
                    )}

                    {state?.kind === 'image' && (
                        <>
                            {/* Wrap and size, like Word's picture mini toolbar */}
                            <div
                                role="group"
                                aria-label="Picture layout"
                                className="mb-1 flex flex-col gap-1 rounded-lg bg-muted/60 p-1"
                            >
                                <div className="flex items-center justify-between">
                                    <ToolIcon
                                        label="Wrap text, picture left"
                                        active={image.align === 'left'}
                                        onSelect={() =>
                                            run((e) =>
                                                cmd.imageAlign(e, 'left'),
                                            )
                                        }
                                    >
                                        <PanelLeft className="size-4" />
                                    </ToolIcon>
                                    <ToolIcon
                                        label="Centre, no wrap"
                                        active={image.align === 'center'}
                                        onSelect={() =>
                                            run((e) =>
                                                cmd.imageAlign(e, 'center'),
                                            )
                                        }
                                    >
                                        <AlignCenter className="size-4" />
                                    </ToolIcon>
                                    <ToolIcon
                                        label="Wrap text, picture right"
                                        active={image.align === 'right'}
                                        onSelect={() =>
                                            run((e) =>
                                                cmd.imageAlign(e, 'right'),
                                            )
                                        }
                                    >
                                        <PanelRight className="size-4" />
                                    </ToolIcon>
                                    <span className="mx-0.5 h-5 w-px bg-border" />
                                    {(
                                        [
                                            ['small', 'S'],
                                            ['medium', 'M'],
                                            ['large', 'L'],
                                        ] as const
                                    ).map(([size, label]) => (
                                        <ToolIcon
                                            key={size}
                                            label={`${label === 'S' ? 'Small' : label === 'M' ? 'Medium' : 'Large'} size`}
                                            active={image.size === size}
                                            onSelect={() =>
                                                run((e) =>
                                                    cmd.imageSize(e, size),
                                                )
                                            }
                                        >
                                            <span className="text-xs font-bold">
                                                {label}
                                            </span>
                                        </ToolIcon>
                                    ))}
                                </div>
                            </div>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => void removeBackground()}
                            >
                                <Eraser className={rowIcon} /> Remove background
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() => pickFile('replace')}
                            >
                                <RefreshCw className={rowIcon} /> Replace
                                picture
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={() =>
                                    run((e) => cmd.imageSize(e, 'full'))
                                }
                            >
                                <Maximize2 className={rowIcon} /> Full width
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className={cn(
                                    row,
                                    'text-destructive focus:text-destructive',
                                )}
                                onSelect={() => run(cmd.deleteSelection)}
                            >
                                <Trash2 className="size-4" /> Delete picture
                            </DropdownMenuItem>
                        </>
                    )}

                    {state?.kind === 'slot' && slot && (
                        <>
                            <DropdownMenuItem
                                className={row}
                                onSelect={slot.onRemoveBackground}
                            >
                                <Eraser className={rowIcon} /> Remove background
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={row}
                                onSelect={slot.onReplace}
                            >
                                <RefreshCw className={rowIcon} /> Replace
                                picture
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className={cn(
                                    row,
                                    'text-destructive focus:text-destructive',
                                )}
                                onSelect={slot.onRemove}
                            >
                                <Trash2 className="size-4" /> Remove picture
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

/** A square icon button inside the menu's quick-format row. */
function ToolIcon({
    label,
    active,
    onSelect,
    children,
}: {
    label: string;
    active?: boolean;
    onSelect: () => void;
    children: React.ReactNode;
}) {
    return (
        <DropdownMenuItem
            title={label}
            aria-label={label}
            onSelect={onSelect}
            className={cn(
                'size-8 shrink-0 cursor-pointer justify-center rounded-md p-0',
                active && 'bg-primary/12 text-primary focus:bg-primary/15',
            )}
        >
            {children}
        </DropdownMenuItem>
    );
}

/** Colour button in the quick-format row; opens a small swatch panel to the side. */
function ColorTool({
    label,
    icon,
    colors,
    onPick,
    clearLabel,
}: {
    label: string;
    icon: React.ReactNode;
    colors: string[];
    onPick: (color: string | null) => void;
    clearLabel: string;
}) {
    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger
                title={label}
                aria-label={label}
                className="size-8 shrink-0 cursor-pointer justify-center rounded-md p-0 [&>svg:last-child]:hidden"
            >
                {icon}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl p-1.5">
                <p className="px-1 pb-1.5 text-xs font-bold text-muted-foreground">
                    {label}
                </p>
                <Swatches colors={colors} onPick={onPick} />
                <DropdownMenuItem
                    className="mt-1 cursor-pointer justify-center text-xs font-semibold"
                    onSelect={() => onPick(null)}
                >
                    {clearLabel}
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}
