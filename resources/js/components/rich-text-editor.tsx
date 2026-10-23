import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List, ListOrdered, Underline as UnderlineIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    editable?: boolean;
}

function ToolbarButton({
    active,
    onClick,
    label,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                active
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
        >
            {children}
        </button>
    );
}

export function RichTextEditor({ value, onChange, placeholder, editable = true }: RichTextEditorProps) {
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const openLinkRef = useRef<() => void>(() => {});

    const editor = useEditor({
        editable,
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                link: {
                    openOnClick: false,
                    autolink: true,
                    HTMLAttributes: { class: 'text-violet-600 underline dark:text-violet-400' },
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'rte-content min-h-[150px] px-3.5 py-3 text-sm leading-relaxed text-gray-800 focus:outline-none dark:text-gray-100',
            },
            handleKeyDown(_view, event) {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                    event.preventDefault();
                    openLinkRef.current();
                    return true;
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    const openLink = useCallback(() => {
        if (!editor) {
            return;
        }
        setLinkValue((editor.getAttributes('link').href as string) ?? '');
        setLinkOpen(true);
    }, [editor]);

    useEffect(() => {
        openLinkRef.current = openLink;
    }, [openLink]);

    // Sync external value changes (e.g. reset after submit, loading an existing draft).
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
    }, [value, editor]);

    const applyLink = () => {
        if (!editor) {
            return;
        }
        const url = linkValue.trim();
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            const href = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
            editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
        }
        setLinkOpen(false);
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/60 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/60">
                <ToolbarButton label="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton label="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton label="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                <ToolbarButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                <ToolbarButton label="Add link (Ctrl+K)" active={editor.isActive('link')} onClick={openLink}>
                    <Link2 className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {linkOpen && (
                <div className="flex items-center gap-2 border-b border-gray-100 bg-amber-50/40 px-2.5 py-2 dark:border-gray-800 dark:bg-amber-950/20">
                    <input
                        autoFocus
                        type="text"
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
                        placeholder="Paste a link and press Enter…"
                        className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <button type="button" onClick={applyLink} className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600">
                        Apply
                    </button>
                    <button type="button" onClick={() => setLinkOpen(false)} className="rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        Cancel
                    </button>
                </div>
            )}

            <div className="relative">
                {editor.isEmpty && placeholder && (
                    <p className="pointer-events-none absolute left-3.5 top-3 text-sm text-gray-400">{placeholder}</p>
                )}
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

export type { Editor };
