import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    BLOCK_GAP,
    type FlipbookSheet,
    KeyIdea,
    ProseBlock,
    SECTION_GAP,
    SHEET_CLASS,
    SHEET_CONTENT_CLASS,
    SHEET_STYLE,
    SheetContinued,
    SheetFigure,
    SheetHeading,
    SIDE_GRID_CLASS,
} from './flipbook-page';
import { type FlipbookPage, slotCount } from './flipbook-types';

export interface SheetSize {
    width: number;
    height: number;
}

/** Split editor HTML into top-level blocks (paragraphs, lists, quotes) that can flow between sheets. */
export function splitBody(html: string): string[] {
    if (!html.trim()) {
        return [];
    }
    if (typeof window === 'undefined') {
        return [html];
    }
    const doc = new DOMParser().parseFromString(
        `<div>${html}</div>`,
        'text/html',
    );
    const blocks: string[] = [];
    for (const node of Array.from(
        doc.body.firstElementChild?.childNodes ?? [],
    )) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.textContent?.trim() || element.querySelector('img')) {
                blocks.push(element.outerHTML);
            }
        } else if (node.textContent?.trim()) {
            blocks.push(`<p>${node.textContent}</p>`);
        }
    }
    return blocks;
}

export interface PageMeasure {
    available: number;
    continued: number;
    heading: number;
    figures: number;
    side: boolean;
    sideFigure: number;
    blocksFull: number[];
    blocksSide: number[];
    highlight: number;
}

/** One sheet per page, unmeasured: used for the very first paint and on the server. */
function naiveSheets(pages: FlipbookPage[]): FlipbookSheet[] {
    return pages.map((page, pageIndex) => ({
        pageIndex,
        layout: page.layout,
        heading: page.heading || null,
        images: page.images
            .filter((image) => image.url)
            .slice(0, slotCount(page.layout)),
        blocks: splitBody(page.body),
        highlight: page.highlight || null,
        continued: false,
        side: page.layout === 'image-right',
    }));
}

/**
 * Greedy book layout: fill each sheet top to bottom with the page's heading, images, text
 * blocks and key idea; whatever doesn't fit continues on the next sheet.
 */
export function paginate(
    pages: FlipbookPage[],
    measures: PageMeasure[],
    split: (html: string) => string[] = splitBody,
): FlipbookSheet[] {
    const sheets: FlipbookSheet[] = [];

    pages.forEach((page, pageIndex) => {
        const m = measures[pageIndex];
        const images = page.images
            .filter((image) => image.url)
            .slice(0, slotCount(page.layout));
        const blocks = split(page.body);

        if (page.layout === 'image-full' && images[0]) {
            sheets.push({
                pageIndex,
                layout: page.layout,
                heading: page.heading || null,
                images,
                blocks: [],
                highlight: page.highlight || null,
                continued: false,
                side: false,
            });
            return;
        }

        const side = page.layout === 'image-right' && !!images[0] && m.side;
        let next = 0;
        let highlightPlaced = !page.highlight;
        let first = true;

        while (first || next < blocks.length || !highlightPlaced) {
            let used = 0;
            const add = (height: number) => {
                used += (used > 0 ? SECTION_GAP : 0) + height;
            };
            const sheet: FlipbookSheet = {
                pageIndex,
                layout: page.layout,
                heading: null,
                images: [],
                blocks: [],
                highlight: null,
                continued: !first,
                side: false,
            };

            if (!first) {
                add(m.continued);
            } else {
                if (page.heading) {
                    sheet.heading = page.heading;
                    add(m.heading);
                }
                if (images.length > 0 && !side) {
                    sheet.images = images;
                    add(m.figures);
                }
            }

            // Text: beside the image on the first sheet of an image-right page, full width otherwise.
            const besideImage = first && side;
            const heights = besideImage ? m.blocksSide : m.blocksFull;
            let text = 0;
            const textFits = (extra: number) => {
                const groupHeight = text + (text > 0 ? BLOCK_GAP : 0) + extra;
                const sectionHeight = besideImage
                    ? Math.max(groupHeight, m.sideFigure)
                    : groupHeight;
                return (
                    used + (used > 0 ? SECTION_GAP : 0) + sectionHeight <=
                    m.available
                );
            };
            while (next < blocks.length && textFits(heights[next])) {
                text += (text > 0 ? BLOCK_GAP : 0) + heights[next];
                sheet.blocks.push(blocks[next]);
                next++;
            }
            if (besideImage) {
                sheet.images = images;
                sheet.side = true;
                add(Math.max(text, m.sideFigure));
            } else if (text > 0) {
                add(text);
            }

            // Never leave a sheet empty: a block taller than a whole sheet goes on its own.
            const sheetIsEmpty =
                !sheet.heading &&
                sheet.images.length === 0 &&
                sheet.blocks.length === 0;
            if (sheetIsEmpty && next < blocks.length) {
                const tooTall = (heights[next] ?? 0) > m.available - used;
                sheet.blocks.push(blocks[next]);
                sheet.overflow = tooTall;
                next++;
                add(m.available);
            }

            if (next >= blocks.length && !highlightPlaced) {
                const fits =
                    used + (used > 0 ? SECTION_GAP : 0) + m.highlight <=
                    m.available;
                const nothingElseHere =
                    !sheet.heading &&
                    sheet.images.length === 0 &&
                    sheet.blocks.length === 0;
                // Placed when it fits, or forced onto a sheet holding nothing else so the loop always ends.
                if (fits || nothingElseHere) {
                    sheet.highlight = page.highlight ?? null;
                    highlightPlaced = true;
                    add(m.highlight);
                }
            }

            sheets.push(sheet);
            first = false;
        }
    });

    return sheets;
}

/** Hidden copies of every page at the real sheet size, with each part tagged for measuring. */
function Measurer({ pages, size }: { pages: FlipbookPage[]; size: SheetSize }) {
    return (
        <div
            aria-hidden
            className="pointer-events-none invisible fixed top-0 left-[-10000px]"
        >
            {pages.map((page, pageIndex) => {
                const images = page.images
                    .filter((image) => image.url)
                    .slice(0, slotCount(page.layout));
                const blocks = splitBody(page.body);
                return (
                    <article
                        key={pageIndex}
                        data-page={pageIndex}
                        className={SHEET_CLASS}
                        style={{
                            ...SHEET_STYLE,
                            width: size.width,
                            height: size.height,
                        }}
                    >
                        <div data-m="content" className={SHEET_CONTENT_CLASS}>
                            <div data-m="continued">
                                <SheetContinued />
                            </div>
                            {page.heading && (
                                <div data-m="heading">
                                    <SheetHeading>{page.heading}</SheetHeading>
                                </div>
                            )}
                            {images.length === 1 && (
                                <div data-m="figures">
                                    <SheetFigure
                                        image={images[0]}
                                        variant="top"
                                    />
                                </div>
                            )}
                            {images.length === 2 && (
                                <div
                                    data-m="figures"
                                    className="grid grid-cols-2 gap-4"
                                >
                                    {images.map((image, i) => (
                                        <SheetFigure
                                            key={i}
                                            image={image}
                                            variant="pair"
                                        />
                                    ))}
                                </div>
                            )}
                            {page.layout === 'image-right' && images[0] && (
                                <div className={SIDE_GRID_CLASS}>
                                    <div
                                        data-m="side-text"
                                        className="flex min-w-0 flex-col gap-3"
                                    >
                                        {blocks.map((html, i) => (
                                            <div key={i} data-m="side-block">
                                                <ProseBlock html={html} />
                                            </div>
                                        ))}
                                    </div>
                                    <div data-m="side-figure">
                                        <SheetFigure
                                            image={images[0]}
                                            variant="side"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex min-w-0 flex-col gap-3">
                                {blocks.map((html, i) => (
                                    <div key={i} data-m="block">
                                        <ProseBlock html={html} />
                                    </div>
                                ))}
                            </div>
                            {page.highlight && (
                                <div data-m="highlight">
                                    <KeyIdea text={page.highlight} />
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function measure(root: HTMLElement, pageCount: number): PageMeasure[] {
    return Array.from({ length: pageCount }, (_, pageIndex) => {
        const article = root.querySelector<HTMLElement>(
            `[data-page="${pageIndex}"]`,
        )!;
        const height = (selector: string) =>
            article.querySelector<HTMLElement>(selector)?.offsetHeight ?? 0;
        const content =
            article.querySelector<HTMLElement>('[data-m="content"]')!;
        const style = getComputedStyle(content);
        const sideText = article.querySelector<HTMLElement>(
            '[data-m="side-text"]',
        );
        const sideFigure = article.querySelector<HTMLElement>(
            '[data-m="side-figure"]',
        );

        return {
            available:
                content.clientHeight -
                parseFloat(style.paddingTop) -
                parseFloat(style.paddingBottom),
            continued: height('[data-m="continued"]'),
            heading: height('[data-m="heading"]'),
            figures: height('[data-m="figures"]'),
            // Two columns only when the figure sits to the right of the text.
            side:
                !!sideText &&
                !!sideFigure &&
                sideFigure.offsetLeft > sideText.offsetLeft + 10,
            sideFigure: sideFigure?.offsetHeight ?? 0,
            blocksFull: Array.from(
                article.querySelectorAll<HTMLElement>('[data-m="block"]'),
            ).map((el) => el.offsetHeight),
            blocksSide: Array.from(
                article.querySelectorAll<HTMLElement>('[data-m="side-block"]'),
            ).map((el) => el.offsetHeight),
            highlight: height('[data-m="highlight"]'),
        };
    });
}

/**
 * Lay a flipbook's pages out onto fixed-size sheets so nothing ever scrolls. Returns the
 * sheets plus a hidden measuring element that must be rendered somewhere on the page.
 */
export function useFlipbookSheets(
    pages: FlipbookPage[],
    size: SheetSize | null,
) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [measured, setMeasured] = useState<{
        key: string;
        sheets: FlipbookSheet[];
    } | null>(null);
    const key = useMemo(
        () =>
            size
                ? `${Math.round(size.width)}x${Math.round(size.height)}|${JSON.stringify(pages)}`
                : '',
        [pages, size],
    );

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!size || !root || size.width < 50 || size.height < 50) {
            return;
        }
        const run = () => {
            // Layout has to be read from the DOM, so the result is stored once measured.
            setMeasured({
                key,
                sheets: paginate(pages, measure(root, pages.length)),
            });
        };
        run();

        // Fonts arriving late change text height; measure again once they're ready.
        let cancelled = false;
        void document.fonts?.ready.then(() => {
            if (!cancelled) {
                run();
            }
        });
        return () => {
            cancelled = true;
        };
        // `key` captures the pages' content and the sheet size; callers often pass fresh
        // arrays and size objects each render, which must not re-run the layout.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const sheets = measured?.key === key ? measured.sheets : naiveSheets(pages);
    const measurer = size ? (
        <div ref={rootRef}>
            <Measurer pages={pages} size={size} />
        </div>
    ) : null;

    return { sheets, measurer, ready: measured?.key === key };
}
