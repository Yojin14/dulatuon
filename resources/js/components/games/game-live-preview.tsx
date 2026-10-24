import type { GameType } from '@/components/course-player/types';
import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { AnswerTile } from '@/components/game/quiz/answer-tile';
import {
    canUseWebGL,
    isLowPowerDevice,
    prefersReducedMotion,
} from '@/lib/device';
import type { DemoGameType, GameDemo } from '@/lib/game-demos';
import { cn } from '@/lib/utils';
import type { Biome } from '@/lib/worlds';
import { Clock, Heart, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const LABS: DemoGameType[] = [
    'fault_lab',
    'shake_town',
    'wave_tank',
    'quake_tracker',
    'ground_test',
    'quake_ready',
];

/**
 * A moving preview of the game itself. 3D labs run their real scene on a loop;
 * word games play a short sample round (sample content, so no answers are given away).
 */
export function GameLivePreview({
    gameType,
    biome,
    className,
}: {
    gameType: GameType;
    biome: Biome;
    className?: string;
}) {
    if ((LABS as GameType[]).includes(gameType)) {
        return (
            <LabPreview
                type={gameType as DemoGameType}
                biome={biome}
                className={className}
            />
        );
    }

    return (
        <div
            className={cn(
                'relative grid place-items-center overflow-hidden bg-game-night px-4 pt-14 pb-8 sm:px-8',
                className,
            )}
        >
            <LiveBadge />
            <div className="w-full max-w-md" aria-hidden>
                {gameType === 'memory_match' ? (
                    <MemoryDemo />
                ) : gameType === 'word_scramble' ? (
                    <ScrambleDemo />
                ) : gameType === 'crossword' ? (
                    <CrosswordDemo />
                ) : gameType === 'hangman' ? (
                    <RescueDemo />
                ) : (
                    <QuizDemo />
                )}
            </div>
        </div>
    );
}

function LiveBadge({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
    return (
        <span
            className={cn(
                'absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur-sm',
                tone === 'light'
                    ? 'bg-slate-900/55 text-white'
                    : 'bg-white/10 text-white/80 ring-1 ring-white/10',
            )}
        >
            <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-75 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-rose-500" />
            </span>
            Preview
        </span>
    );
}

// ─── 3D labs ─────────────────────────────────────────────────────────────────

function LabPreview({
    type,
    biome,
    className,
}: {
    type: DemoGameType;
    biome: Biome;
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<'loading' | 'live' | 'static'>('loading');

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        if (prefersReducedMotion() || isLowPowerDevice() || !canUseWebGL()) {
            // Deciding after mount keeps server and client markup the same.
            queueMicrotask(() => setMode('static'));

            return;
        }

        let demo: GameDemo | null = null;
        let starting = false;
        let cancelled = false;
        const mount = async () => {
            if (demo || starting) {
                return;
            }
            starting = true;
            try {
                const { startGameDemo } = await import('@/lib/game-demos');
                if (cancelled) {
                    return;
                }
                demo = await startGameDemo(type, container);
                if (cancelled) {
                    demo.dispose();
                    demo = null;

                    return;
                }
                setMode('live');
            } catch {
                setMode('static');
            } finally {
                starting = false;
            }
        };
        const unmount = () => {
            demo?.dispose();
            demo = null;
        };

        // Only run while on screen, so a long lesson page does not keep a GPU loop going.
        const observer = new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? void mount() : unmount()),
            { rootMargin: '80px' },
        );
        observer.observe(container);

        return () => {
            cancelled = true;
            observer.disconnect();
            unmount();
        };
    }, [type]);

    return (
        <div className={cn('relative overflow-hidden bg-world-sky', className)}>
            {/* Display only: the preview cannot be dragged, so the page still scrolls on phones. */}
            <div
                ref={containerRef}
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-0 transition-opacity duration-700',
                    mode === 'live' ? 'opacity-100' : 'opacity-0',
                )}
            />
            {mode === 'loading' && (
                <div
                    aria-hidden
                    className="absolute inset-0 grid place-items-center"
                >
                    <div className="h-[14%] w-[50%] translate-y-[30%] animate-pulse rounded-[50%] bg-slate-900/10 blur-xl" />
                </div>
            )}
            {mode === 'static' && (
                <div
                    aria-hidden
                    className="absolute inset-0 grid place-items-center p-6"
                >
                    <LowPolyBlock
                        biome={biome}
                        variant={biome === 'earth' ? 'quake' : 'town'}
                        className="max-h-full max-w-xs drop-shadow-[0_18px_18px_rgba(0,0,0,0.25)]"
                    />
                </div>
            )}
            {mode === 'live' && <LiveBadge tone="light" />}
        </div>
    );
}

// ─── Word games ──────────────────────────────────────────────────────────────

/** Steps through `frames` frames on a timer. Reduced motion holds on `restFrame`. */
function useDemoFrame(
    frames: number,
    interval: number,
    restFrame: number,
): number {
    const [frame, setFrame] = useState(0);
    const [still, setStill] = useState(false);

    useEffect(() => {
        if (prefersReducedMotion()) {
            queueMicrotask(() => setStill(true));

            return;
        }
        const id = window.setInterval(
            () => setFrame((current) => (current + 1) % frames),
            interval,
        );

        return () => window.clearInterval(id);
    }, [frames, interval]);

    return still ? restFrame : frame;
}

function DemoCard({
    eyebrow,
    eyebrowClass,
    title,
    children,
}: {
    eyebrow: string;
    eyebrowClass: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-3xl border bg-card p-4 text-card-foreground shadow-float sm:p-5">
            <p
                className={cn(
                    'text-center text-[11px] font-bold tracking-wider uppercase',
                    eyebrowClass,
                )}
            >
                {eyebrow}
            </p>
            <p className="mt-1 mb-4 text-center font-display text-base leading-snug font-bold text-balance sm:text-lg">
                {title}
            </p>
            {children}
        </div>
    );
}

const QUIZ_OPTIONS = ['S wave', 'P wave', 'Love wave', 'Rayleigh wave'];

function QuizDemo() {
    const frame = useDemoFrame(7, 850, 4);
    const picked = frame >= 3;
    const revealed = frame >= 4;

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <span
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors',
                        revealed
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-white/10 text-white/70',
                    )}
                >
                    <Zap className="size-3.5" />
                    Streak {revealed ? 3 : 2}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white tabular-nums">
                    <Clock className="size-3.5" />
                    {20 - Math.min(frame, 3)}s
                </span>
            </div>
            <DemoCard
                eyebrow="Question 3"
                eyebrowClass="text-violet-600 dark:text-violet-300"
                title="Which seismic wave reaches a station first?"
            >
                <div className="grid grid-cols-2 gap-2">
                    {QUIZ_OPTIONS.map((option, index) => (
                        <AnswerTile
                            key={option}
                            label={option}
                            tabIndex={-1}
                            className="min-h-10 px-3 py-2 text-sm"
                            state={
                                index === 1
                                    ? revealed
                                        ? 'correct'
                                        : picked
                                          ? 'selected'
                                          : 'idle'
                                    : 'idle'
                            }
                        />
                    ))}
                </div>
            </DemoCard>
        </div>
    );
}

/** Card faces, in grid order, with the pair each belongs to. */
const MEMORY_CARDS: { text: string; pair: number }[] = [
    { text: 'Magma', pair: 0 },
    { text: 'Point above the focus', pair: 1 },
    { text: 'Fault', pair: 2 },
    { text: 'Magma at the surface', pair: 3 },
    { text: 'Epicenter', pair: 1 },
    { text: 'Molten rock underground', pair: 0 },
    { text: 'Lava', pair: 3 },
    { text: 'Crack where rocks move', pair: 2 },
];

/** Each frame: cards face up, pairs already matched, and whether the open two are a miss. */
const MEMORY_SCRIPT: { up: number[]; matched: number[]; miss?: boolean }[] = [
    { up: [], matched: [] },
    { up: [0], matched: [] },
    { up: [0, 5], matched: [] },
    { up: [], matched: [0] },
    { up: [1, 2], matched: [0], miss: true },
    { up: [], matched: [0] },
    { up: [1, 4], matched: [0] },
    { up: [], matched: [0, 1] },
    { up: [7, 2], matched: [0, 1] },
    { up: [], matched: [0, 1, 2] },
    { up: [3, 6], matched: [0, 1, 2] },
    { up: [], matched: [0, 1, 2, 3] },
    { up: [], matched: [0, 1, 2, 3] },
];

function MemoryDemo() {
    const frame = useDemoFrame(
        MEMORY_SCRIPT.length,
        750,
        MEMORY_SCRIPT.length - 1,
    );
    const step = MEMORY_SCRIPT[frame];

    return (
        <div>
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-white/80">
                <span className="rounded-full bg-white/10 px-2.5 py-1">
                    Pairs {step.matched.length}/4
                </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {MEMORY_CARDS.map((card, index) => {
                    const matched = step.matched.includes(card.pair);
                    const up = matched || step.up.includes(index);
                    const miss = Boolean(step.miss) && step.up.includes(index);

                    return (
                        <div
                            key={card.text}
                            className={cn(
                                'flex aspect-3/4 items-center justify-center rounded-xl p-1.5 text-center text-[11px] leading-tight font-semibold shadow-lg transition-all duration-200 sm:text-xs',
                                matched
                                    ? 'scale-95 bg-emerald-400/90 text-emerald-950'
                                    : miss
                                      ? 'bg-red-400 text-white'
                                      : up
                                        ? 'bg-white text-slate-900'
                                        : 'bg-linear-to-br from-violet-500 to-fuchsia-600 text-white/30',
                            )}
                        >
                            {up ? card.text : <Sparkles className="size-5" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const SCRAMBLE_ANSWER = 'MAGMA';
const SCRAMBLED = 'GAMAM';

function ScrambleDemo() {
    const frames = SCRAMBLE_ANSWER.length + 4;
    const frame = useDemoFrame(frames, 600, frames - 2);
    const typed = SCRAMBLE_ANSWER.slice(0, Math.max(0, frame - 1));
    const solved = frame > SCRAMBLE_ANSWER.length;

    return (
        <DemoCard
            eyebrow="Clue"
            eyebrowClass="text-cyan-500"
            title="Molten rock beneath Earth's surface"
        >
            <div className="mb-4 flex justify-center gap-1.5">
                {SCRAMBLED.split('').map((letter, index) => (
                    <span
                        key={index}
                        className="flex h-9 w-8 items-center justify-center rounded-lg bg-cyan-100 text-base font-extrabold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                    >
                        {letter}
                    </span>
                ))}
            </div>
            <div
                className={cn(
                    'flex h-11 items-center justify-center rounded-2xl border-2 text-base font-semibold tracking-[0.2em] transition-colors',
                    solved
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-border',
                )}
            >
                {typed}
                {!solved && (
                    <span className="ml-0.5 h-5 w-0.5 animate-pulse bg-cyan-500" />
                )}
            </div>
            <p
                className={cn(
                    'mt-2 text-center text-xs font-bold text-emerald-600 transition-opacity dark:text-emerald-400',
                    solved ? 'opacity-100' : 'opacity-0',
                )}
            >
                Correct.
            </p>
        </DemoCard>
    );
}

const RESCUE_WORD = 'FAULT';
const RESCUE_GUESSES = ['E', 'A', 'T', 'L', 'U', 'F'];

function RescueDemo() {
    const frames = RESCUE_GUESSES.length + 3;
    const frame = useDemoFrame(frames, 700, frames - 1);
    const guessed = RESCUE_GUESSES.slice(
        0,
        Math.min(frame, RESCUE_GUESSES.length),
    );
    const misses = guessed.filter(
        (letter) => !RESCUE_WORD.includes(letter),
    ).length;

    return (
        <div>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-white/80">
                <span className="rounded-full bg-white/10 px-2.5 py-1">
                    Word 2/5
                </span>
                <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: 6 }, (_, index) => (
                        <Heart
                            key={index}
                            className={cn(
                                'size-3.5',
                                index < 6 - misses
                                    ? 'fill-rose-500 text-rose-500'
                                    : 'fill-white/10 text-white/20',
                            )}
                        />
                    ))}
                </span>
            </div>
            <DemoCard
                eyebrow="Clue"
                eyebrowClass="text-amber-500"
                title="A crack in Earth's crust where rocks move"
            >
                <div className="mb-4 flex justify-center gap-1.5">
                    {RESCUE_WORD.split('').map((letter, index) => (
                        <span
                            key={index}
                            className="flex h-10 w-8 items-center justify-center border-b-4 border-slate-300 text-lg font-extrabold dark:border-white/20"
                        >
                            {guessed.includes(letter) ? letter : ''}
                        </span>
                    ))}
                </div>
                <div className="flex flex-wrap justify-center gap-1">
                    {RESCUE_GUESSES.map((letter) => {
                        const used = guessed.includes(letter);
                        const hit = RESCUE_WORD.includes(letter);

                        return (
                            <span
                                key={letter}
                                className={cn(
                                    'grid size-7 place-items-center rounded-md text-xs font-bold transition-colors',
                                    !used
                                        ? 'bg-muted text-muted-foreground'
                                        : hit
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-red-400 text-white',
                                )}
                            >
                                {letter}
                            </span>
                        );
                    })}
                </div>
            </DemoCard>
        </div>
    );
}

/** FAULT across row 1 and LAVA down column 3, sharing the L. */
const CROSSWORD_CELLS: { row: number; col: number; letter: string }[] = [
    { row: 1, col: 0, letter: 'F' },
    { row: 1, col: 1, letter: 'A' },
    { row: 1, col: 2, letter: 'U' },
    { row: 1, col: 3, letter: 'L' },
    { row: 1, col: 4, letter: 'T' },
    { row: 2, col: 3, letter: 'A' },
    { row: 3, col: 3, letter: 'V' },
    { row: 4, col: 3, letter: 'A' },
];

function CrosswordDemo() {
    const frames = CROSSWORD_CELLS.length + 4;
    const frame = useDemoFrame(frames, 550, frames - 1);
    const filled = Math.min(frame, CROSSWORD_CELLS.length);
    const done = frame >= CROSSWORD_CELLS.length;

    return (
        <DemoCard
            eyebrow="1 Across"
            eyebrowClass="text-emerald-500"
            title="A crack where rocks move"
        >
            <div className="mx-auto grid w-fit grid-cols-5 gap-1">
                {Array.from({ length: 25 }, (_, index) => {
                    const row = Math.floor(index / 5);
                    const col = index % 5;
                    const cellIndex = CROSSWORD_CELLS.findIndex(
                        (cell) => cell.row === row && cell.col === col,
                    );
                    if (cellIndex === -1) {
                        return (
                            <span key={index} className="size-8 sm:size-9" />
                        );
                    }
                    const isFilled = cellIndex < filled;

                    return (
                        <span
                            key={index}
                            className={cn(
                                'relative grid size-8 place-items-center rounded-md border-2 text-sm font-extrabold transition-colors sm:size-9',
                                done
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                    : isFilled
                                      ? 'border-emerald-300 bg-card'
                                      : 'border-border bg-muted/50',
                            )}
                        >
                            {(cellIndex === 0 || cellIndex === 3) && (
                                <span className="absolute top-0 left-0.5 text-[8px] font-bold text-muted-foreground">
                                    {cellIndex === 0 ? 1 : 2}
                                </span>
                            )}
                            {isFilled ? CROSSWORD_CELLS[cellIndex].letter : ''}
                        </span>
                    );
                })}
            </div>
        </DemoCard>
    );
}
