import { type Editor } from '@/components/rich-text-editor';
import {
    type ImageAlign,
    type ImageSize,
    type TextAlignment,
} from './flipbook-extensions';

/**
 * Editing actions shared by the ribbon and the right-click menu, so both behave the same.
 */
export const flipbookCommands = {
    bold: (e: Editor) => e.chain().focus().toggleBold().run(),
    italic: (e: Editor) => e.chain().focus().toggleItalic().run(),
    underline: (e: Editor) => e.chain().focus().toggleUnderline().run(),
    bulletList: (e: Editor) => e.chain().focus().toggleBulletList().run(),
    orderedList: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
    paragraph: (e: Editor) => e.chain().focus().setParagraph().run(),
    heading: (e: Editor, level: 3 | 4) =>
        e.chain().focus().setHeading({ level }).run(),
    font: (e: Editor, family: string) =>
        family
            ? e.chain().focus().setFontFamily(family).run()
            : e.chain().focus().unsetFontFamily().run(),
    weight: (e: Editor, weight: string) =>
        e
            .chain()
            .focus()
            .setMark('textStyle', { fontWeight: weight || null })
            .removeEmptyTextStyle()
            .run(),
    color: (e: Editor, color: string | null) =>
        color
            ? e.chain().focus().setColor(color).run()
            : e.chain().focus().unsetColor().run(),
    highlight: (e: Editor, color: string | null) =>
        color
            ? e.chain().focus().setBackgroundColor(color).run()
            : e.chain().focus().unsetBackgroundColor().run(),
    align: (e: Editor, alignment: TextAlignment) =>
        alignment === 'left'
            ? e.chain().focus().unsetTextAlign().run()
            : e.chain().focus().setTextAlign(alignment).run(),
    size: (e: Editor, size: string) =>
        size
            ? e.chain().focus().setFontSize(size).run()
            : e.chain().focus().unsetFontSize().removeEmptyTextStyle().run(),
    clearFormatting: (e: Editor) =>
        e.chain().focus().unsetAllMarks().clearNodes().run(),
    imageAlign: (e: Editor, align: ImageAlign) =>
        e.chain().focus().updateAttributes('image', { align }).run(),
    imageSize: (e: Editor, size: ImageSize) =>
        e.chain().focus().updateAttributes('image', { size }).run(),
    deleteSelection: (e: Editor) => e.chain().focus().deleteSelection().run(),
};

/**
 * Cut a plain background out of the selected picture, upload the cut-out and swap it in.
 * Ctrl+Z brings the original back. Throws with a friendly message when it can't.
 */
export async function removeSelectedImageBackground(
    editor: Editor,
    upload: (file: File) => Promise<string | null>,
): Promise<void> {
    const src = editor.getAttributes('image').src as string | undefined;
    if (!src) {
        return;
    }
    const { removePlainBackground } = await import('./remove-background');
    const url = await upload(await removePlainBackground(src));
    if (url) {
        editor.chain().focus().updateAttributes('image', { src: url }).run();
    }
}
