import { HudPill } from '@/components/game/hud-pill';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
} from 'react';
import { useFlipbookSheets, type SheetSize } from './flipbook-layout';
import { FlipbookSheetView } from './flipbook-page';
import { type FlipbookPage } from './flipbook-types';

/** Every sheet is landscape, one at a time, on every screen. */
const SHEET_ASPECT = 1.6;
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

/** Live size of an element, for laying sheets out at their real size. */
function useElementSize<T extends HTMLElement>() {
    const [element, setElement] = useState<T | null>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(
        null,
    );

    useEffect(() => {
        if (!element) {
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize((prev) =>
                prev &&
                Math.abs(prev.width - width) < 1 &&
                Math.abs(prev.height - height) < 1
                    ? prev
                    : { width, height },
            );
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [element]);

    return [setElement, size] as const;
}

/**
 * Reads a flipbook one landscape page at a time with a page-turn animation.
 * Arrow keys, swipe and the page scrubber all turn pages.
 */
export function FlipbookReader({
    pages,
    title,
    initialPage = 0,
    className,
    fill = false,
    eyebrow,
    note,
    finish,
}: {
    pages: FlipbookPage[];
    title?: string;
    initialPage?: number;
    className?: string;
    /** Stretch to the parent's height so the book fills the space and nothing scrolls. */
    fill?: boolean;
    eyebrow?: string;
    note?: string;
    /** Replaces the Next button once the reader reaches the last page. */
    finish?: ReactNode;
}) {
    const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
    const step = 1;

    // Pages flow onto fixed-size sheets (long pages continue on the next sheet), so nothing scrolls.
    const [bookRef, bookSize] = useElementSize<HTMLDivElement>();
    const sheetSize: SheetSize | null = bookSize
        ? { width: bookSize.width, height: bookSize.height }
        : null;
    const { sheets, measurer } = useFlipbookSheets(pages, sheetSize);
    const total = sheets.length;

    // Until the reader turns a page, open on the first sheet of the requested page.
    const [turnedTo, setRawIndex] = useState<number | null>(null);
    const startSheet = Math.max(
        sheets.findIndex((sheet) => sheet.pageIndex === initialPage),
        0,
    );
    const rawIndex = Math.min(turnedTo ?? startSheet, Math.max(total - 1, 0));
    const [turn, setTurn] = useState<Turn | null>(null);
    const pointerStart = useRef<number | null>(null);

    const index = rawIndex;
    const lastIndex = Math.max(total - 1, 0);

    const go = useCallback(
        (target: number) => {
            const to = Math.min(Math.max(target, 0), lastIndex);
            if (turn || to === index) {
                return;
            }
            if (reducedMotion) {
                setRawIndex(to);
                return;
            }
            setTurn({ dir: to > index ? 'next' : 'prev', to });
        },
        [index, lastIndex, reducedMotion, turn],
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

    if (pages.length === 0) {
        return (
            <div
                className={cn(
                    'flex flex-col items-center justify-center gap-3 rounded-3xl bg-muted/50 px-6 py-20 text-center',
                    className,
                )}
            >
                <BookOpen
                    className="size-10 text-muted-foreground/50"
                    aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                    This flipbook has no pages yet.
                </p>
            </div>
        );
    }

    const sheetAt = (i: number) => (i >= 0 && i < total ? sheets[i] : null);
    const numberAt = (i: number) => (i >= 0 && i < total ? i + 1 : undefined);
    const sheet = (i: number, extra?: string) => (
        <FlipbookSheetView
            sheet={sheetAt(i)}
            number={numberAt(i)}
            className={extra}
        />
    );

    const label = `Page ${index + 1} of ${total}`;
    const stops = Array.from(
        { length: Math.floor(lastIndex / step) + 1 },
        (_, i) => i * step,
    );

    return (
        <section
            className={cn(
                'flex flex-col bg-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                fill
                    ? 'h-full min-h-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-4'
                    : 'gap-4 rounded-3xl p-3 sm:p-6',
                className,
            )}
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-roledescription="flipbook"
            aria-label={title ? `${title} flipbook` : 'Flipbook'}
        >
            <div className="flex items-center justify-between gap-3 px-1">
                {title ? (
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                <BookOpen className="size-3 shrink-0" />
                                {eyebrow}
                            </p>
                        )}
                        <h3 className="truncate font-display text-lg font-extrabold tracking-[-0.02em]">
                            {title}
                        </h3>
                        {note && (
                            <p className="truncate text-xs text-muted-foreground">
                                {note}
                            </p>
                        )}
                    </div>
                ) : (
                    <span />
                )}
                <HudPill tone="light" aria-live="polite">
                    <BookOpen />
                    {label}
                </HudPill>
            </div>

            <div
                className={cn(
                    'flipbook-stage relative mx-auto flex w-full touch-pan-y items-center justify-center select-none',
                    fill ? 'min-h-0 flex-1' : 'max-w-5xl',
                )}
                style={fill ? { containerType: 'size' } : undefined}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                <div
                    ref={bookRef}
                    className="relative rounded-2xl shadow-[0_24px_60px_-24px_rgb(15_23_42/0.45)]"
                    style={
                        fill
                            ? {
                                  width: `min(100cqw, calc(100cqh * ${SHEET_ASPECT}))`,
                                  aspectRatio: SHEET_ASPECT,
                              }
                            : { width: '100%', aspectRatio: SHEET_ASPECT }
                    }
                >
                    <div className="relative h-full overflow-hidden rounded-2xl">
                        {sheet(turn?.dir === 'next' ? turn.to : index)}
                    </div>
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
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="outline"
                    onClick={() => go(index - step)}
                    disabled={index === 0 || !!turn}
                    aria-label="Previous page"
                >
                    <ChevronLeft />
                    <span className="hidden sm:inline">Previous</span>
                </Button>

                {stops.length <= 16 ? (
                    <div
                        className="flex flex-wrap items-center justify-center gap-1.5"
                        role="group"
                        aria-label="Jump to page"
                    >
                        {stops.map((stop) => (
                            <button
                                key={stop}
                                type="button"
                                onClick={() => go(stop)}
                                aria-label={`Go to page ${stop + 1}`}
                                aria-current={
                                    stop === index ? 'page' : undefined
                                }
                                className={cn(
                                    'h-2.5 cursor-pointer rounded-full transition-all',
                                    stop === index
                                        ? 'w-7 bg-primary'
                                        : 'w-2.5 bg-foreground/20 hover:bg-foreground/40',
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

                {finish && index >= lastIndex && !turn ? (
                    finish
                ) : (
                    <Button
                        onClick={() => go(index + step)}
                        disabled={index >= lastIndex || !!turn}
                        aria-label="Next page"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight />
                    </Button>
                )}
            </div>
            {measurer}
        </section>
    );
}

export default FlipbookReader;
