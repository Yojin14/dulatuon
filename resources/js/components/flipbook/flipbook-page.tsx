import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';
import { type FlipbookImage, type FlipbookPage, pageHasContent, slotCount } from './flipbook-types';

function Figure({ image, className }: { image: FlipbookImage; className?: string }) {
    return (
        <figure className={cn('flex flex-col gap-2', className)}>
            <img
                src={image.url}
                alt={image.caption || ''}
                loading="lazy"
                decoding="async"
                className="max-h-80 w-full rounded-xl border border-black/5 bg-white object-contain dark:border-white/10 dark:bg-black/20"
            />
            {image.caption && <figcaption className="text-center text-sm leading-snug text-gray-500 dark:text-gray-400">{image.caption}</figcaption>}
        </figure>
    );
}

/**
 * One sheet of a flipbook, laid out by its page template. Sizes itself to its own width
 * (container queries) so it reads the same in a two-page spread, a phone or the editor preview.
 */
export function FlipbookPageView({ page, number, className }: { page: FlipbookPage | null; number?: number; className?: string }) {
    const images = page ? page.images.filter((image) => image.url).slice(0, slotCount(page.layout)) : [];
    const body = page?.body ? <div className="flipbook-prose" dangerouslySetInnerHTML={{ __html: page.body }} /> : null;
    const highlight = page?.highlight ? (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber-100 px-4 py-3 font-semibold text-amber-950 dark:bg-amber-400/15 dark:text-amber-100">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
            <span>{page.highlight}</span>
        </p>
    ) : null;

    if (page?.layout === 'image-full' && images[0]) {
        return (
            <article className={cn('flipbook-paper @container relative flex h-full flex-col overflow-hidden', className)}>
                {page.heading && (
                    <h2 className="shrink-0 px-6 pt-5 font-display text-lg leading-tight font-extrabold tracking-[-0.02em] text-balance">{page.heading}</h2>
                )}
                <div className="min-h-0 flex-1 p-3 @md:p-4">
                    <img src={images[0].url} alt={images[0].caption || page.heading || `Page ${number ?? ''}`} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                </div>
                {(images[0].caption || highlight) && (
                    <div className="flex shrink-0 flex-col gap-2 px-5 pb-2">
                        {images[0].caption && <p className="text-center text-sm text-gray-500 dark:text-gray-400">{images[0].caption}</p>}
                        {highlight}
                    </div>
                )}
                {number !== undefined && <footer className="shrink-0 pb-3 text-center text-xs font-semibold text-gray-400 tabular-nums">{number}</footer>}
            </article>
        );
    }

    return (
        <article className={cn('flipbook-paper @container relative flex h-full flex-col overflow-hidden', className)}>
            <div className="flex-1 overflow-y-auto px-6 pt-7 pb-4 @md:px-9 @md:pt-9">
                {!page || !pageHasContent(page) ? (
                    <div className="flex h-full min-h-40 items-center justify-center text-sm text-gray-400">{page ? 'This page is still blank.' : ''}</div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {page.heading && (
                            <h2 className="font-display text-xl leading-tight font-extrabold tracking-[-0.02em] text-balance @md:text-2xl">{page.heading}</h2>
                        )}

                        {page.layout === 'image-top' && images[0] && <Figure image={images[0]} />}
                        {page.layout === 'two-images' && images.length > 0 && (
                            <div className="grid gap-4 @md:grid-cols-2">
                                {images.map((image, i) => (
                                    <Figure key={i} image={image} />
                                ))}
                            </div>
                        )}

                        {page.layout === 'image-right' && images[0] ? (
                            <div className="grid items-start gap-5 @lg:grid-cols-[minmax(0,1fr)_42%]">
                                <div className="flex flex-col gap-5">{body}</div>
                                <Figure image={images[0]} className="@lg:sticky @lg:top-0" />
                            </div>
                        ) : (
                            body
                        )}

                        {highlight}
                    </div>
                )}
            </div>
            {number !== undefined && (
                <footer className="shrink-0 pb-4 text-center text-xs font-semibold text-gray-400 tabular-nums">{number}</footer>
            )}
        </article>
    );
}
