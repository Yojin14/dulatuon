import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';
import { type FlipbookImage, type FlipbookLayout } from './flipbook-types';

/**
 * One printed sheet of a flipbook. A teacher's page can flow over several sheets when its
 * text is long; the sheet only carries the parts that landed on it, so it never scrolls.
 */
export interface FlipbookSheet {
    /** Index of the teacher's page this sheet belongs to. */
    pageIndex: number;
    layout: FlipbookLayout;
    heading: string | null;
    images: FlipbookImage[];
    /** Body HTML blocks (paragraphs, lists) placed on this sheet. */
    blocks: string[];
    highlight: string | null;
    /** True for the sheets after the first one of a page. */
    continued: boolean;
    /**
     * A single text block taller than a whole sheet (huge paragraph on a small screen).
     * Only then may the sheet scroll, so no text is ever cut off.
     */
    overflow?: boolean;
    /** Text sits beside the image (image-right on a wide enough sheet). */
    side: boolean;
}

/** The sheet is a size container so images can be sized in `cqh` and stay predictable. */
export const SHEET_STYLE: CSSProperties = { containerType: 'size' };
export const SHEET_CLASS =
    'flipbook-paper @container relative flex h-full flex-col overflow-hidden';
export const SHEET_CONTENT_CLASS =
    'flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-6 pt-7 pb-3 @md:px-9 @md:pt-9';
/** Vertical gap between sections (`gap-5`) and between text blocks (`gap-3`), in px. */
export const SECTION_GAP = 20;
export const BLOCK_GAP = 12;

const FIGURE_HEIGHT: Record<'top' | 'pair' | 'side', string> = {
    top: 'h-[32cqh]',
    pair: 'h-[24cqh]',
    side: 'h-[40cqh]',
};

export function SheetFigure({
    image,
    variant,
    className,
}: {
    image: FlipbookImage;
    variant: keyof typeof FIGURE_HEIGHT;
    className?: string;
}) {
    return (
        <figure className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <img
                src={image.url}
                alt={image.caption || ''}
                loading="lazy"
                decoding="async"
                className={cn(
                    'w-full rounded-xl border border-black/5 bg-white object-contain dark:border-white/10 dark:bg-black/20',
                    FIGURE_HEIGHT[variant],
                )}
            />
            {image.caption && (
                <figcaption className="line-clamp-2 text-center text-sm leading-snug text-gray-500 dark:text-gray-400">
                    {image.caption}
                </figcaption>
            )}
        </figure>
    );
}

export function SheetHeading({ children }: { children: ReactNode }) {
    return (
        <h2 className="font-display text-xl leading-tight font-extrabold tracking-[-0.02em] text-balance @md:text-2xl">
            {children}
        </h2>
    );
}

export function SheetContinued() {
    return (
        <p className="text-xs font-bold tracking-wide text-gray-400">
            Continued
        </p>
    );
}

export function ProseBlock({ html }: { html: string }) {
    return (
        <div
            className="flipbook-prose"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export function TextGroup({ blocks }: { blocks: string[] }) {
    return (
        <div className="flex min-w-0 flex-col gap-3">
            {blocks.map((html, i) => (
                <ProseBlock key={i} html={html} />
            ))}
        </div>
    );
}

export function KeyIdea({ text }: { text: string }) {
    return (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber-100 px-4 py-3 font-semibold text-amber-950 dark:bg-amber-400/15 dark:text-amber-100">
            <Lightbulb
                className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300"
                aria-hidden
            />
            <span>{text}</span>
        </p>
    );
}

export const SIDE_GRID_CLASS =
    'grid items-start gap-5 @lg:grid-cols-[minmax(0,1fr)_42%]';

function PageNumber({ number }: { number?: number }) {
    return number !== undefined ? (
        <footer className="shrink-0 pb-3 text-center text-xs font-semibold text-gray-400 tabular-nums">
            {number}
        </footer>
    ) : null;
}

/** Renders one sheet. Everything on it was measured to fit, so there is no scrolling. */
export function FlipbookSheetView({
    sheet,
    number,
    className,
}: {
    sheet: FlipbookSheet | null;
    number?: number;
    className?: string;
}) {
    if (!sheet) {
        return (
            <article
                className={cn(SHEET_CLASS, className)}
                style={SHEET_STYLE}
            />
        );
    }

    if (sheet.layout === 'image-full' && sheet.images[0]) {
        const image = sheet.images[0];
        return (
            <article className={cn(SHEET_CLASS, className)} style={SHEET_STYLE}>
                {sheet.heading && (
                    <h2 className="shrink-0 px-6 pt-5 font-display text-lg leading-tight font-extrabold tracking-[-0.02em] text-balance">
                        {sheet.heading}
                    </h2>
                )}
                <div className="min-h-0 flex-1 p-3 @md:p-4">
                    <img
                        src={image.url}
                        alt={
                            image.caption ||
                            sheet.heading ||
                            `Page ${number ?? ''}`
                        }
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                    />
                </div>
                {(image.caption || sheet.highlight) && (
                    <div className="flex shrink-0 flex-col gap-2 px-5 pb-2">
                        {image.caption && (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                {image.caption}
                            </p>
                        )}
                        {sheet.highlight && <KeyIdea text={sheet.highlight} />}
                    </div>
                )}
                <PageNumber number={number} />
            </article>
        );
    }

    const empty =
        !sheet.heading &&
        sheet.images.length === 0 &&
        sheet.blocks.length === 0 &&
        !sheet.highlight;
    const sideImage = sheet.side ? sheet.images[0] : null;
    const stackedImages = sheet.side ? [] : sheet.images;

    return (
        <article className={cn(SHEET_CLASS, className)} style={SHEET_STYLE}>
            <div
                className={cn(
                    SHEET_CONTENT_CLASS,
                    sheet.overflow && 'overflow-y-auto',
                )}
            >
                {empty ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        This page is still blank.
                    </div>
                ) : (
                    <>
                        {sheet.continued && <SheetContinued />}
                        {sheet.heading && (
                            <SheetHeading>{sheet.heading}</SheetHeading>
                        )}
                        {stackedImages.length === 1 && (
                            <SheetFigure
                                image={stackedImages[0]}
                                variant="top"
                            />
                        )}
                        {stackedImages.length === 2 && (
                            <div className="grid grid-cols-2 gap-4">
                                {stackedImages.map((image, i) => (
                                    <SheetFigure
                                        key={i}
                                        image={image}
                                        variant="pair"
                                    />
                                ))}
                            </div>
                        )}
                        {sideImage ? (
                            <div className={SIDE_GRID_CLASS}>
                                <TextGroup blocks={sheet.blocks} />
                                <SheetFigure image={sideImage} variant="side" />
                            </div>
                        ) : (
                            sheet.blocks.length > 0 && (
                                <TextGroup blocks={sheet.blocks} />
                            )
                        )}
                        {sheet.highlight && <KeyIdea text={sheet.highlight} />}
                    </>
                )}
            </div>
            <PageNumber number={number} />
        </article>
    );
}
