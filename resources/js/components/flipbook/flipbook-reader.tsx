import { HudPill } from '@/components/game/hud-pill';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react';
import { FlipbookPageView } from './flipbook-page';
import { type FlipbookPage } from './flipbook-types';

const SPREAD_QUERY = '(min-width: 1024px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (notify) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', notify);
            return () => list.removeEventListener('change', notify);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}

type Turn = { dir: 'next' | 'prev'; to: number };

/**
 * Reads a flipbook like a book: a two-page spread with a 3D page turn on wide screens,
 * a single page on phones. Arrow keys, swipe and the page scrubber all turn pages.
 */
export function FlipbookReader({ pages, title, initialPage = 0, className }: { pages: FlipbookPage[]; title?: string; initialPage?: number; className?: string }) {
    const spread = useMediaQuery(SPREAD_QUERY);
    const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
    const step = spread ? 2 : 1;
    const total = pages.length;

    const [rawIndex, setRawIndex] = useState(() => Math.min(Math.max(initialPage, 0), Math.max(total - 1, 0)));
    const [turn, setTurn] = useState<Turn | null>(null);
    const pointerStart = useRef<number | null>(null);

    const index = Math.min(spread ? rawIndex - (rawIndex % 2) : rawIndex, Math.max(total - 1, 0));
    const lastIndex = spread ? Math.max(total - 1, 0) - (Math.max(total - 1, 0) % 2) : Math.max(total - 1, 0);

    const go = useCallback(
        (target: number) => {
            const to = Math.min(Math.max(spread ? target - (target % 2) : target, 0), lastIndex);
            if (turn || to === index) {
                return;
            }
            if (reducedMotion) {
                setRawIndex(to);
                return;
            }
            setTurn({ dir: to > index ? 'next' : 'prev', to });
        },
        [index, lastIndex, reducedMotion, spread, turn],
    );

    const finishTurn = () => {
        if (turn) {
            setRawIndex(turn.to);
            setTurn(null);
        }
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(index + step);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(index - step);
        }
    };

    const onPointerDown = (e: PointerEvent) => {
        pointerStart.current = e.pointerType === 'mouse' ? null : e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
        if (pointerStart.current === null) {
            return;
        }
        const delta = e.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(delta) > 50) {
            go(delta < 0 ? index + step : index - step);
        }
    };

    if (total === 0) {
        return (
            <div className={cn('flex flex-col items-center justify-center gap-3 rounded-3xl bg-muted/50 px-6 py-20 text-center', className)}>
                <BookOpen className="size-10 text-muted-foreground/50" aria-hidden />
                <p className="text-sm text-muted-foreground">This flipbook has no pages yet.</p>
            </div>
        );
    }

    const pageAt = (i: number) => (i >= 0 && i < total ? pages[i] : null);
    const numberAt = (i: number) => (i >= 0 && i < total ? i + 1 : undefined);
    const sheet = (i: number, extra?: string) => <FlipbookPageView page={pageAt(i)} number={numberAt(i)} className={extra} />;

    const visibleEnd = spread ? Math.min(index + 2, total) : index + 1;
    const label = spread && visibleEnd - index === 2 ? `Pages ${index + 1}–${visibleEnd} of ${total}` : `Page ${index + 1} of ${total}`;
    const stops = Array.from({ length: Math.floor(lastIndex / step) + 1 }, (_, i) => i * step);

    return (
        <section
            className={cn('flex flex-col gap-4 rounded-3xl bg-muted/60 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6', className)}
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-roledescription="flipbook"
            aria-label={title ? `${title} flipbook` : 'Flipbook'}
        >
            <div className="flex items-center justify-between gap-3 px-1">
                {title ? <h3 className="min-w-0 truncate font-display text-lg font-extrabold tracking-[-0.02em]">{title}</h3> : <span />}
                <HudPill tone="light" aria-live="polite">
                    <BookOpen />
                    {label}
                </HudPill>
            </div>

            <div
                className={cn(
                    'flipbook-stage relative mx-auto w-full touch-pan-y select-none',
                    spread ? 'h-[min(78vh,780px)] max-w-6xl' : 'h-[min(74vh,680px)] max-w-xl',
                )}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                <div className="relative grid h-full rounded-2xl shadow-[0_24px_60px_-24px_rgb(15_23_42/0.45)]" style={{ gridTemplateColumns: spread ? '1fr 1fr' : '1fr' }}>
                    {spread ? (
                        <>
                            <div className="relative h-full overflow-hidden rounded-l-2xl">
                                {sheet(turn?.dir === 'prev' ? turn.to : index)}
                                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-black/12 to-transparent" />
                            </div>
                            <div className="relative h-full overflow-hidden rounded-r-2xl">
                                {sheet(turn?.dir === 'next' ? turn.to + 1 : index + 1)}
                                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-black/12 to-transparent" />
                            </div>

                            {turn && (
                                <div
                                    key={`${turn.dir}-${turn.to}`}
                                    data-turn={turn.dir}
                                    onAnimationEnd={finishTurn}
                                    className={cn('flipbook-leaf absolute inset-y-0 z-10 w-1/2', turn.dir === 'next' ? 'left-1/2' : 'left-0')}
                                >
                                    <div className={cn('flipbook-face absolute inset-0 overflow-hidden', turn.dir === 'next' ? 'rounded-r-2xl' : 'rounded-l-2xl')}>
                                        {sheet(turn.dir === 'next' ? index + 1 : index)}
                                        <div className="flipbook-shade pointer-events-none absolute inset-0 bg-black/15" />
                                    </div>
                                    <div className={cn('flipbook-face flipbook-face-back absolute inset-0 overflow-hidden', turn.dir === 'next' ? 'rounded-l-2xl' : 'rounded-r-2xl')}>
                                        {sheet(turn.dir === 'next' ? turn.to : turn.to + 1)}
                                        <div className="flipbook-shade pointer-events-none absolute inset-0 bg-black/15" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="relative h-full overflow-hidden rounded-2xl">{sheet(turn?.dir === 'next' ? turn.to : index)}</div>
                            {turn && (
                                <div
                                    key={`${turn.dir}-${turn.to}`}
                                    data-turn={turn.dir === 'next' ? 'next' : 'in'}
                                    onAnimationEnd={finishTurn}
                                    className="flipbook-leaf absolute inset-0 z-10"
                                >
                                    <div className="flipbook-face absolute inset-0 overflow-hidden rounded-2xl">
                                        {sheet(turn.dir === 'next' ? index : turn.to)}
                                        <div className="flipbook-shade pointer-events-none absolute inset-0 bg-black/10" />
                                    </div>
                                    <div className="flipbook-face flipbook-face-back flipbook-paper absolute inset-0 rounded-2xl" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => go(index - step)} disabled={index === 0 || !!turn} aria-label="Previous page">
                    <ChevronLeft />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                {stops.length <= 16 ? (
                    <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Jump to page">
                        {stops.map((stop) => (
                            <button
                                key={stop}
                                type="button"
                                onClick={() => go(stop)}
                                aria-label={`Go to page ${stop + 1}`}
                                aria-current={stop === index ? 'page' : undefined}
                                className={cn(
                                    'h-2.5 cursor-pointer rounded-full transition-all',
                                    stop === index ? 'w-7 bg-primary' : 'w-2.5 bg-foreground/20 hover:bg-foreground/40',
                                )}
                            />
                        ))}
                    </div>
                ) : (
                    <input
                        type="range"
                        min={0}
                        max={lastIndex}
                        step={step}
                        value={index}
                        onChange={(e) => go(Number(e.target.value))}
                        aria-label="Jump to page"
                        className="w-full max-w-xs accent-primary"
                    />
                )}

                <Button onClick={() => go(index + step)} disabled={index >= lastIndex || !!turn} aria-label="Next page">
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight />
                </Button>
            </div>
        </section>
    );
}

export default FlipbookReader;
