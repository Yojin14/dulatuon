export type FlipbookLayout =
    | 'text'
    | 'image-right'
    | 'image-top'
    | 'two-images'
    | 'image-full';

export interface FlipbookImage {
    url: string;
    caption?: string;
}

export interface FlipbookPage {
    id: string;
    layout: FlipbookLayout;
    heading: string;
    body: string;
    highlight?: string;
    images: FlipbookImage[];
    /** Page background: a colour or a paper template (see FLIPBOOK_BACKGROUNDS). */
    background?: FlipbookBackground;
    /** Line and paragraph spacing for the text, like Word's spacing menu. */
    spacing?: FlipbookSpacing;
}

export type FlipbookSpacing = 'single' | 'normal' | 'relaxed' | 'double';

/** Word-style spacing choices. "normal" (1.15) is the default. Mirrors the server list. */
export const FLIPBOOK_SPACINGS: { value: FlipbookSpacing; label: string }[] = [
    { value: 'single', label: 'Single' },
    { value: 'normal', label: '1.15' },
    { value: 'relaxed', label: '1.5' },
    { value: 'double', label: 'Double' },
];

/** CSS class for a page's spacing (none for the default). */
export function spacingClass(spacing?: FlipbookSpacing): string {
    return spacing && spacing !== 'normal' ? `fb-sp-${spacing}` : '';
}

export type FlipbookBackground =
    | 'paper'
    | 'white'
    | 'sky'
    | 'mint'
    | 'lemon'
    | 'blush'
    | 'lavender'
    | 'lined'
    | 'grid'
    | 'dots'
    | 'sky-fade'
    | 'sunrise';

/** Backgrounds a teacher can pick: plain colours, then paper templates. Mirrors the server list. */
export const FLIPBOOK_BACKGROUNDS: {
    value: FlipbookBackground;
    label: string;
    kind: 'colour' | 'template';
}[] = [
    { value: 'paper', label: 'Paper', kind: 'colour' },
    { value: 'white', label: 'White', kind: 'colour' },
    { value: 'sky', label: 'Sky', kind: 'colour' },
    { value: 'mint', label: 'Mint', kind: 'colour' },
    { value: 'lemon', label: 'Lemon', kind: 'colour' },
    { value: 'blush', label: 'Blush', kind: 'colour' },
    { value: 'lavender', label: 'Lavender', kind: 'colour' },
    { value: 'lined', label: 'Lined', kind: 'template' },
    { value: 'grid', label: 'Graph', kind: 'template' },
    { value: 'dots', label: 'Dots', kind: 'template' },
    { value: 'sky-fade', label: 'Sky fade', kind: 'template' },
    { value: 'sunrise', label: 'Sunrise', kind: 'template' },
];

/** CSS class for a page background (none for the default paper). */
export function backgroundClass(background?: FlipbookBackground): string {
    return background && background !== 'paper' ? `fb-bg-${background}` : '';
}

export const FLIPBOOK_LAYOUTS: {
    value: FlipbookLayout;
    label: string;
    slots: number;
}[] = [
    { value: 'text', label: 'Free page', slots: 0 },
    { value: 'image-right', label: 'Text + image', slots: 1 },
    { value: 'image-top', label: 'Image on top', slots: 1 },
    { value: 'two-images', label: 'Two images', slots: 2 },
    { value: 'image-full', label: 'Full page', slots: 1 },
];

/** Most pages a single flipbook may hold (matches the server limit). */
export const MAX_FLIPBOOK_PAGES = 200;

export function slotCount(layout: FlipbookLayout): number {
    return FLIPBOOK_LAYOUTS.find((l) => l.value === layout)?.slots ?? 0;
}

export function newPage(layout: FlipbookLayout = 'text'): FlipbookPage {
    return {
        id: Math.random().toString(36).slice(2, 10),
        layout,
        heading: '',
        body: '',
        highlight: '',
        images: [],
    };
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

export function pageHasContent(page: FlipbookPage): boolean {
    return (
        page.heading.trim() !== '' ||
        stripHtml(page.body) !== '' ||
        /<img\s/i.test(page.body) ||
        (page.highlight ?? '').trim() !== '' ||
        page.images.length > 0
    );
}

/** The shape sent to the server: images trimmed to what the layout shows, empty pages dropped. */
export function pagesForSave(pages: FlipbookPage[]): FlipbookPage[] {
    return pages.filter(pageHasContent).map((page) => ({
        ...page,
        heading: page.heading.trim(),
        highlight: (page.highlight ?? '').trim(),
        images: page.images
            .filter((image) => image.url !== '')
            .slice(0, slotCount(page.layout)),
    }));
}
