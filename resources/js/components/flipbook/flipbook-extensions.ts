import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {
    BackgroundColor,
    Color,
    FontFamily,
    FontSize,
    TextStyle,
} from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/react';

/** Fonts a teacher can pick. An empty value means the book's normal font (Figtree). */
export const FLIPBOOK_FONTS = [
    { label: 'Default', value: '' },
    { label: 'Bricolage Grotesque', value: 'Bricolage Grotesque' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
] as const;

/** Text sizes that fit the book's pages. Empty means the normal size. Mirrors the server allow-list. */
export const FLIPBOOK_SIZES = [
    { label: 'Small', value: '0.875rem' },
    { label: 'Normal', value: '' },
    { label: 'Large', value: '1.25rem' },
    { label: 'Extra large', value: '1.6rem' },
] as const;

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export const FLIPBOOK_WEIGHTS = [
    { label: 'Regular', value: '' },
    { label: 'Medium', value: '500' },
    { label: 'Semibold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Extra bold', value: '800' },
] as const;

/** Text colours and highlight colours that read well on the book's paper. */
export const FLIPBOOK_TEXT_COLORS = [
    '#1f2937',
    '#6b7280',
    '#dc2626',
    '#ea580c',
    '#ca8a04',
    '#16a34a',
    '#0284c7',
    '#7c3aed',
    '#db2777',
];
export const FLIPBOOK_HIGHLIGHTS = [
    '#fef08a',
    '#fed7aa',
    '#fecaca',
    '#bbf7d0',
    '#bae6fd',
    '#ddd6fe',
    '#fbcfe8',
    '#e5e7eb',
];

export type ImageAlign = 'left' | 'center' | 'right';
export type ImageSize = 'small' | 'medium' | 'large' | 'full';

/** Font weight as a text style, like font family and colour. */
const FontWeight = Extension.create({
    name: 'fontWeight',
    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    fontWeight: {
                        default: null,
                        parseHTML: (element) =>
                            element.style.fontWeight || null,
                        renderHTML: (attributes) =>
                            attributes.fontWeight
                                ? {
                                      style: `font-weight: ${attributes.fontWeight}`,
                                  }
                                : {},
                    },
                },
            },
        ];
    },
});

/**
 * A picture inside the text. `align` makes text wrap around it (left/right) or centres it;
 * `size` sets its width as a share of the page.
 */
const FlipbookImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: 'right',
                parseHTML: (element) =>
                    element.getAttribute('data-align') || 'center',
                renderHTML: (attributes) => ({
                    'data-align': attributes.align,
                }),
            },
            size: {
                default: 'medium',
                parseHTML: (element) =>
                    element.getAttribute('data-size') || 'medium',
                renderHTML: (attributes) => ({ 'data-size': attributes.size }),
            },
        };
    },
}).configure({ inline: false, allowBase64: false });

/** Everything the flipbook page editor adds on top of the basic rich-text editor. */
export const FLIPBOOK_EXTENSIONS = [
    TextStyle,
    Color,
    BackgroundColor,
    FontFamily,
    FontSize,
    FontWeight,
    FlipbookImage,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
];
