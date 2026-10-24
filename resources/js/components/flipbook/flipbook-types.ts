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
}

export const FLIPBOOK_LAYOUTS: {
    value: FlipbookLayout;
    label: string;
    slots: number;
}[] = [
    { value: 'text', label: 'Text only', slots: 0 },
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

export function newPage(layout: FlipbookLayout = 'image-right'): FlipbookPage {
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
