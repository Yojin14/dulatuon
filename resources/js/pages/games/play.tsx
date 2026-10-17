import { Button } from '@/components/ui/button';
import { isMuted, setMuted as setAudioMuted, sfxCorrect, sfxLose, sfxMedal, sfxPop, sfxWin, sfxWrong, startMusic, stopMusic, unlockAudio } from '@/lib/game-audio';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock, Eye, Heart, Lock, Medal, RotateCcw, Sparkles, Trophy, Users, Volume2, VolumeX, XCircle } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// three.js is only downloaded when a student opens the 3D simulation.
const SIMULATIONS = {
    fault_lab: lazy(() => import('@/components/games/fault-lab')),
    shake_town: lazy(() => import('@/components/games/shake-town')),
    wave_tank: lazy(() => import('@/components/games/wave-tank')),
    quake_tracker: lazy(() => import('@/components/games/quake-tracker')),
    ground_test: lazy(() => import('@/components/games/ground-test')),
    quake_ready: lazy(() => import('@/components/games/quake-ready')),
} satisfies Record<SimulationType, unknown>;

// ─── Types ──────────────────────────────────────────────────────────────────────
type SimulationType = 'fault_lab' | 'shake_town' | 'wave_tank' | 'quake_tracker' | 'ground_test' | 'quake_ready';
type GameType = 'quiz_quest' | 'memory_match' | 'word_scramble' | 'crossword' | 'hangman' | SimulationType;

// Ready-made 3D simulations: fixed checkpoints, so items are never shuffled.
const SIMULATION_GAMES: GameType[] = ['fault_lab', 'shake_town', 'wave_tank', 'quake_tracker', 'ground_test', 'quake_ready'];

interface GameItem {
    prompt: string;
    answer: string;
    distractors: string[];
}

interface GameProp {
    id: number;
    courseId: number;
    title: string;
    description: string;
    gameType: GameType;
    points: number;
    lives: number;
    items: GameItem[];
}

interface MeState {
    bestScore: number | null;
    bestTime: number | null;
    livesTotal: number;
    livesRemaining: number | null; // null = unlimited
    nextResetAt: string | null;
}

interface LeaderboardEntry {
    rank: number;
    userId: number;
    name: string;
    score: number;
    timeSpent: number | null;
}

interface Leaderboard {
    top: LeaderboardEntry[];
    me: { rank: number; score: number; timeSpent: number | null } | null;
    totalPlayers: number;
}

interface AttemptResponse {
    score: number;
    maxScore: number;
    correctCount: number;
    totalCount: number;
    me: MeState;
    leaderboard: Leaderboard;
}

const GAME_META: Record<GameType, { label: string; icon: string }> = {
    quiz_quest: { label: 'Quiz Quest', icon: '⚡' },
    memory_match: { label: 'Memory Match', icon: '🧠' },
    word_scramble: { label: 'Word Scramble', icon: '🔤' },
    crossword: { label: 'Crossword', icon: '🧩' },
    hangman: { label: 'Word Rescue', icon: '🪢' },
    fault_lab: { label: 'Fault Lab · 3D simulation', icon: '🌋' },
    shake_town: { label: 'Shake Town · 3D simulation', icon: '🏘️' },
    wave_tank: { label: 'Wave Tank · 3D simulation', icon: '🌊' },
    quake_tracker: { label: 'Quake Tracker · 3D simulation', icon: '🗺️' },
    ground_test: { label: 'Ground Test · 3D simulation', icon: '⛰️' },
    quake_ready: { label: 'Quake Ready · 3D simulation', icon: '🎒' },
};

const QUIZ_SECONDS = 20;
const HANGMAN_MAX_WRONG = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formatTime(seconds: number | null): string {
    if (seconds === null || seconds < 0) { return '—'; }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

async function postAttempt(gameId: number, answers: Record<number, string>, timeSpent: number): Promise<AttemptResponse> {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const res = await fetch(`/games/${gameId}/attempts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ answers, timeSpent }),
    });
    if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        throw new OutOfLivesError(body.nextResetAt ?? null);
    }
    if (!res.ok) { throw new Error('Failed to record attempt'); }
    return res.json();
}

class OutOfLivesError extends Error {
    constructor(public nextResetAt: string | null) {
        super('Out of lives');
    }
}

// ─── Confetti engine (dependency-free, canvas-based) ────────────────────────────
interface Particle {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; rot: number; vrot: number;
    life: number; maxLife: number;
}

interface ConfettiOrigin {
    x: number; y: number; count: number;
    angle: number; spread: number; power: number;
}

const CONFETTI_COLORS = ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#22d3ee', '#fde047'];

let confettiCanvas: HTMLCanvasElement | null = null;
let confettiCtx: CanvasRenderingContext2D | null = null;
let confettiParticles: Particle[] = [];
let confettiRaf = 0;

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function ensureConfettiCanvas(): void {
    if (confettiCanvas) { return; }
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) { return; }
    ctx.scale(dpr, dpr);
    document.body.appendChild(canvas);
    confettiCanvas = canvas;
    confettiCtx = ctx;
}

function tickConfetti(): void {
    if (!confettiCtx || !confettiCanvas) { return; }
    const w = window.innerWidth;
    const h = window.innerHeight;
    confettiCtx.clearRect(0, 0, w, h);

    confettiParticles = confettiParticles.filter((p) => p.life > 0 && p.y < h + 40);
    for (const p of confettiParticles) {
        p.vy += 0.18;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= 1;

        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        confettiCtx.save();
        confettiCtx.globalAlpha = alpha;
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        confettiCtx.restore();
    }

    if (confettiParticles.length > 0) {
        confettiRaf = requestAnimationFrame(tickConfetti);
    } else {
        cancelAnimationFrame(confettiRaf);
        confettiRaf = 0;
        confettiCanvas?.remove();
        confettiCanvas = null;
        confettiCtx = null;
    }
}

function fireConfetti(origins: ConfettiOrigin[]): void {
    if (prefersReducedMotion()) { return; }
    ensureConfettiCanvas();
    if (!confettiCtx) { return; }

    for (const o of origins) {
        for (let i = 0; i < o.count; i++) {
            const a = o.angle + (Math.random() - 0.5) * o.spread;
            const speed = o.power * (0.5 + Math.random() * 0.7);
            const maxLife = 90 + Math.random() * 50;
            confettiParticles.push({
                x: o.x, y: o.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                size: 6 + Math.random() * 8,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                rot: Math.random() * Math.PI,
                vrot: (Math.random() - 0.5) * 0.3,
                life: maxLife,
                maxLife,
            });
        }
    }

    if (!confettiRaf) { confettiRaf = requestAnimationFrame(tickConfetti); }
}

function celebrateConfetti(level: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const base = 40 + level * 35;
    fireConfetti([
        { x: 0, y: h, count: base, angle: -Math.PI / 3, spread: 0.9, power: 17 },
        { x: w, y: h, count: base, angle: -(Math.PI * 2) / 3, spread: 0.9, power: 17 },
    ]);
    if (level >= 2) {
        window.setTimeout(() => fireConfetti([{ x: w / 2, y: h * 0.2, count: base, angle: Math.PI / 2, spread: Math.PI, power: 9 }]), 250);
    }
}

function popConfetti(xRatio = 0.5, yRatio = 0.5): void {
    fireConfetti([{ x: window.innerWidth * xRatio, y: window.innerHeight * yRatio, count: 26, angle: -Math.PI / 2, spread: Math.PI, power: 10 }]);
}

// ─── Shared HUD ────────────────────────────────────────────────────────────────
function useStopwatch(active: boolean): number {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!active) { return; }
        setElapsed(0);
        const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => window.clearInterval(id);
    }, [active]);
    return elapsed;
}

function LivesPips({ remaining, total }: { remaining: number | null; total: number }) {
    if (remaining === null) {
        return <span className="inline-flex items-center gap-1 text-xs font-bold text-white/80"><Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />∞</span>;
    }
    return (
        <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: total }).map((_, i) => (
                <Heart key={i} className={`h-3.5 w-3.5 ${i < remaining ? 'fill-rose-500 text-rose-500' : 'fill-white/10 text-white/20'}`} />
            ))}
        </span>
    );
}

// ─── Quiz Quest ─────────────────────────────────────────────────────────────────
function QuizQuest({ items, onFinish }: { items: GameItem[]; onFinish: (answers: Record<number, string>) => void }) {
    const rounds = useMemo(() => items.map((it, idx) => {
        let opts = [it.answer, ...it.distractors.filter(Boolean)];
        if (opts.length < 4) {
            const pool = items.filter((_, i) => i !== idx).map((o) => o.answer).filter((a) => !opts.includes(a));
            opts = [...opts, ...shuffle(pool).slice(0, 4 - opts.length)];
        }
        return { ...it, index: idx, options: shuffle(opts.slice(0, 4)) };
    }), [items]);

    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [picked, setPicked] = useState<string | null>(null);
    const [streak, setStreak] = useState(0);
    const [seconds, setSeconds] = useState(QUIZ_SECONDS);

    const round = rounds[current];

    const advance = useCallback((answer: string | null) => {
        const correct = answer === round.answer;
        if (correct) { popConfetti(0.5, 0.4); sfxCorrect(); } else { sfxWrong(); }
        setStreak((s) => (correct ? s + 1 : 0));
        setPicked(answer ?? '__timeout__');
        window.setTimeout(() => {
            const finalAnswers = { ...answers, [round.index]: answer ?? '' };
            setAnswers(finalAnswers);
            if (current + 1 >= rounds.length) {
                onFinish(finalAnswers);
            } else {
                setCurrent((c) => c + 1);
                setPicked(null);
                setSeconds(QUIZ_SECONDS);
            }
        }, 1100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round, current, rounds.length, answers]);

    useEffect(() => {
        if (picked !== null) { return; }
        if (seconds <= 0) { advance(null); return; }
        const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => window.clearTimeout(id);
    }, [seconds, picked, advance]);

    const pct = ((current + (picked !== null ? 1 : 0)) / rounds.length) * 100;

    return (
        <div className="mx-auto w-full max-w-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 text-sm font-semibold text-white/80">{current + 1}/{rounds.length}</span>
            </div>

            <div className="mb-4 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${streak >= 2 ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-white/70'}`}>
                    🔥 Streak {streak}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${seconds <= 5 ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>
                    <Clock className="h-3.5 w-3.5" />{seconds}s
                </span>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 sm:p-8">
                <h2 className="mb-6 text-center text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{round.prompt}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {round.options.map((opt, i) => {
                        const isPicked = picked === opt;
                        const isAnswer = opt === round.answer;
                        const reveal = picked !== null;
                        let cls = 'border-gray-200 bg-gray-50 hover:border-violet-400 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700';
                        if (reveal && isAnswer) { cls = 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40'; }
                        else if (reveal && isPicked && !isAnswer) { cls = 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/40'; }
                        return (
                            <button
                                key={i}
                                disabled={reveal}
                                onClick={() => advance(opt)}
                                className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-medium text-gray-800 transition-all dark:text-gray-100 ${cls}`}
                            >
                                <span>{opt}</span>
                                {reveal && isAnswer && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                                {reveal && isPicked && !isAnswer && <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Memory Match ────────────────────────────────────────────────────────────────
interface Card { key: string; itemIndex: number; text: string; }

function MemoryMatch({ items, onFinish }: { items: GameItem[]; onFinish: (answers: Record<number, string>) => void }) {
    const cards = useMemo<Card[]>(() => shuffle(
        items.flatMap((it, idx) => [
            { key: `${idx}-p`, itemIndex: idx, text: it.prompt },
            { key: `${idx}-a`, itemIndex: idx, text: it.answer },
        ]),
    ), [items]);

    const [flipped, setFlipped] = useState<string[]>([]);
    const [matched, setMatched] = useState<Set<number>>(new Set());
    const [wrong, setWrong] = useState<string[]>([]);
    const [moves, setMoves] = useState(0);
    const lock = wrong.length > 0;

    const finish = useCallback(() => {
        const answers: Record<number, string> = {};
        items.forEach((it, idx) => { answers[idx] = it.answer; });
        onFinish(answers);
    }, [items, onFinish]);

    const flip = (card: Card) => {
        if (lock || flipped.includes(card.key) || matched.has(card.itemIndex)) { return; }
        const next = [...flipped, card.key];
        if (next.length < 2) { setFlipped(next); return; }

        setMoves((m) => m + 1);
        const [aKey, bKey] = next;
        const a = cards.find((c) => c.key === aKey)!;
        const b = cards.find((c) => c.key === bKey)!;
        if (a.itemIndex === b.itemIndex) {
            const newMatched = new Set(matched).add(a.itemIndex);
            setMatched(newMatched);
            setFlipped([]);
            popConfetti(0.5, 0.45);
            sfxCorrect();
            if (newMatched.size === items.length) { window.setTimeout(finish, 600); }
        } else {
            setFlipped(next);
            setWrong(next);
            sfxWrong();
            window.setTimeout(() => { setWrong([]); setFlipped([]); }, 900);
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl">
            <div className="mb-5 flex items-center justify-center gap-3 text-sm font-semibold text-white/80">
                <span className="rounded-full bg-white/10 px-3 py-1">Pairs {matched.size}/{items.length}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Moves {moves}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                {cards.map((card) => {
                    const isUp = flipped.includes(card.key) || matched.has(card.itemIndex);
                    const isWrong = wrong.includes(card.key);
                    const isMatched = matched.has(card.itemIndex);
                    return (
                        <button
                            key={card.key}
                            onClick={() => flip(card)}
                            disabled={isUp || lock}
                            className={`flex aspect-[3/4] items-center justify-center rounded-2xl p-2 text-center text-sm font-semibold shadow-lg transition-all duration-200 ${
                                isMatched
                                    ? 'scale-95 bg-emerald-400/90 text-emerald-950'
                                    : isWrong
                                        ? 'bg-red-400 text-white'
                                        : isUp
                                            ? 'bg-white text-gray-900 dark:bg-gray-100'
                                            : 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white/30 hover:from-violet-400 hover:to-fuchsia-500'
                            }`}
                        >
                            {isUp ? <span className="leading-snug">{card.text}</span> : <Sparkles className="h-6 w-6" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Word Scramble ───────────────────────────────────────────────────────────────
function scrambleWord(word: string): string {
    const letters = word.replace(/\s+/g, '').split('');
    if (letters.length < 2) { return word.toUpperCase(); }
    let out = word;
    for (let attempt = 0; attempt < 8 && out.replace(/\s+/g, '').toUpperCase() === word.replace(/\s+/g, '').toUpperCase(); attempt++) {
        out = shuffle(letters).join('');
    }
    return out.toUpperCase();
}

function WordScramble({ items, onFinish }: { items: GameItem[]; onFinish: (answers: Record<number, string>) => void }) {
    const scrambles = useMemo(() => items.map((it) => scrambleWord(it.answer)), [items]);
    const [current, setCurrent] = useState(0);
    const [value, setValue] = useState('');
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const item = items[current];

    const submit = () => {
        if (!value.trim() || feedback) { return; }
        const correct = value.trim().toLowerCase() === item.answer.trim().toLowerCase();
        if (correct) { popConfetti(0.5, 0.4); sfxCorrect(); } else { sfxWrong(); }
        setFeedback(correct ? 'correct' : 'wrong');
        const nextAnswers = { ...answers, [current]: value.trim() };
        setAnswers(nextAnswers);
        window.setTimeout(() => {
            if (current + 1 >= items.length) {
                onFinish(nextAnswers);
            } else {
                setCurrent((c) => c + 1);
                setValue('');
                setFeedback(null);
            }
        }, 1200);
    };

    return (
        <div className="mx-auto w-full max-w-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{ width: `${(current / items.length) * 100}%` }} />
                </div>
                <span className="shrink-0 text-sm font-semibold text-white/80">{current + 1}/{items.length}</span>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 sm:p-8">
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-cyan-500">Clue</p>
                <h2 className="mb-6 text-center text-lg font-bold text-gray-900 dark:text-white">{item.prompt}</h2>

                <div className="mb-6 flex flex-wrap justify-center gap-1.5">
                    {scrambles[current].split('').map((ch, i) => (
                        <span key={i} className={`flex h-10 w-9 items-center justify-center rounded-lg text-lg font-extrabold ${ch === ' ' ? 'w-3' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'}`}>
                            {ch === ' ' ? '' : ch}
                        </span>
                    ))}
                </div>

                <input
                    autoFocus
                    value={value}
                    disabled={!!feedback}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { submit(); } }}
                    placeholder="Type your answer…"
                    className={`mb-4 w-full rounded-2xl border-2 px-4 py-3 text-center text-lg font-semibold outline-none transition-all dark:bg-gray-800 dark:text-white ${
                        feedback === 'correct' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                            : feedback === 'wrong' ? 'border-red-400 bg-red-50 dark:bg-red-950/40'
                                : 'border-gray-200 focus:border-cyan-400 dark:border-gray-700'
                    }`}
                />
                {feedback === 'wrong' && <p className="mb-4 text-center text-sm font-medium text-red-500">Answer: <strong>{item.answer}</strong></p>}
                {feedback === 'correct' && <p className="mb-4 text-center text-sm font-medium text-emerald-500">Correct! 🎉</p>}

                <Button onClick={submit} disabled={!value.trim() || !!feedback} className="h-11 w-full bg-cyan-600 text-base hover:bg-cyan-700">
                    {current + 1 >= items.length ? 'Finish' : 'Submit'}
                </Button>
            </div>
        </div>
    );
}

// ─── Crossword ───────────────────────────────────────────────────────────────────
interface PlacedWord { oi: number; word: string; clue: string; row: number; col: number; dir: 'across' | 'down'; num: number; }

function generateCrossword(entries: { oi: number; word: string; clue: string }[]): { placed: PlacedWord[]; rows: number; cols: number } {
    const words = entries
        .map((e) => ({ ...e, word: e.word.toUpperCase().replace(/[^A-Z]/g, '') }))
        .filter((e) => e.word.length > 1)
        .sort((a, b) => b.word.length - a.word.length);

    const grid = new Map<string, string>();
    const placed: PlacedWord[] = [];
    const key = (r: number, c: number) => `${r},${c}`;

    const cellsFor = (word: string, r: number, c: number, dir: 'across' | 'down') =>
        word.split('').map((ch, i) => ({ ch, r: dir === 'across' ? r : r + i, c: dir === 'across' ? c + i : c }));

    const canPlace = (word: string, r: number, c: number, dir: 'across' | 'down'): boolean => {
        const cells = cellsFor(word, r, c, dir);
        const before = dir === 'across' ? key(r, c - 1) : key(r - 1, c);
        const after = dir === 'across' ? key(r, c + word.length) : key(r + word.length, c);
        if (grid.has(before) || grid.has(after)) { return false; }
        for (const cell of cells) {
            const existing = grid.get(key(cell.r, cell.c));
            if (existing) {
                if (existing !== cell.ch) { return false; }
                continue; // valid intersection
            }
            // empty cell: perpendicular neighbours must be empty to avoid run-ons
            if (dir === 'across') {
                if (grid.has(key(cell.r - 1, cell.c)) || grid.has(key(cell.r + 1, cell.c))) { return false; }
            } else {
                if (grid.has(key(cell.r, cell.c - 1)) || grid.has(key(cell.r, cell.c + 1))) { return false; }
            }
        }
        return true;
    };

    const doPlace = (entry: { oi: number; word: string; clue: string }, r: number, c: number, dir: 'across' | 'down') => {
        cellsFor(entry.word, r, c, dir).forEach((cell) => grid.set(key(cell.r, cell.c), cell.ch));
        placed.push({ oi: entry.oi, word: entry.word, clue: entry.clue, row: r, col: c, dir, num: 0 });
    };

    words.forEach((entry, idx) => {
        if (idx === 0) { doPlace(entry, 0, 0, 'across'); return; }

        let best: { r: number; c: number; dir: 'across' | 'down' } | null = null;
        for (let li = 0; li < entry.word.length && !best; li++) {
            const letter = entry.word[li];
            for (const p of placed) {
                for (let pi = 0; pi < p.word.length; pi++) {
                    if (p.word[pi] !== letter) { continue; }
                    const pr = p.dir === 'across' ? p.row : p.row + pi;
                    const pc = p.dir === 'across' ? p.col + pi : p.col;
                    const dir: 'across' | 'down' = p.dir === 'across' ? 'down' : 'across';
                    const r = dir === 'across' ? pr : pr - li;
                    const c = dir === 'across' ? pc - li : pc;
                    if (canPlace(entry.word, r, c, dir)) { best = { r, c, dir }; break; }
                }
                if (best) { break; }
            }
        }

        if (best) {
            doPlace(entry, best.r, best.c, best.dir);
        } else {
            // Fallback: drop it on its own row two cells below the lowest used row.
            const maxRow = placed.reduce((m, p) => Math.max(m, p.dir === 'down' ? p.row + p.word.length - 1 : p.row), 0);
            doPlace(entry, maxRow + 2, 0, 'across');
        }
    });

    // Normalise coordinates to start at 0,0 and number the starting cells.
    const minR = Math.min(...placed.map((p) => p.row));
    const minC = Math.min(...placed.map((p) => p.col));
    placed.forEach((p) => { p.row -= minR; p.col -= minC; });

    const starts = new Map<string, number>();
    let num = 1;
    [...placed].sort((a, b) => (a.row - b.row) || (a.col - b.col)).forEach((p) => {
        const k = key(p.row, p.col);
        if (!starts.has(k)) { starts.set(k, num++); }
        p.num = starts.get(k)!;
    });

    const rows = Math.max(...placed.map((p) => (p.dir === 'down' ? p.row + p.word.length : p.row + 1))) ;
    const cols = Math.max(...placed.map((p) => (p.dir === 'across' ? p.col + p.word.length : p.col + 1)));

    return { placed, rows, cols };
}

function Crossword({ items, onFinish }: { items: GameItem[]; onFinish: (answers: Record<number, string>) => void }) {
    const { placed, rows, cols } = useMemo(
        () => generateCrossword(items.map((it, oi) => ({ oi, word: it.answer, clue: it.prompt }))),
        [items],
    );

    // Map of "r,c" -> { answer letter, list of word ids occupying it }
    const cellMeta = useMemo(() => {
        const map = new Map<string, { letter: string; num?: number }>();
        for (const p of placed) {
            p.word.split('').forEach((ch, i) => {
                const r = p.dir === 'across' ? p.row : p.row + i;
                const c = p.dir === 'across' ? p.col + i : p.col;
                const k = `${r},${c}`;
                const prev = map.get(k);
                map.set(k, { letter: ch, num: i === 0 ? p.num : prev?.num });
            });
        }
        return map;
    }, [placed]);

    const [entries, setEntries] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const inputs = useRef<Record<string, HTMLInputElement | null>>({});

    const setCell = (k: string, v: string) => setEntries((prev) => ({ ...prev, [k]: v.toUpperCase().slice(-1).replace(/[^A-Z]/g, '') }));

    const handleSubmit = () => {
        if (submitted) { return; }
        setSubmitted(true);
        const answers: Record<number, string> = {};
        let anyCorrect = false;
        for (const p of placed) {
            const typed = p.word.split('').map((_, i) => {
                const r = p.dir === 'across' ? p.row : p.row + i;
                const c = p.dir === 'across' ? p.col + i : p.col;
                return entries[`${r},${c}`] ?? '';
            }).join('');
            answers[p.oi] = typed;
            if (typed === p.word) { anyCorrect = true; }
        }
        if (anyCorrect) { celebrateConfetti(1); }
        window.setTimeout(() => onFinish(answers), 900);
    };

    const acrossClues = placed.filter((p) => p.dir === 'across').sort((a, b) => a.num - b.num);
    const downClues = placed.filter((p) => p.dir === 'down').sort((a, b) => a.num - b.num);
    const filledCount = cellMeta.size === 0 ? 0 : [...cellMeta.keys()].filter((k) => entries[k]).length;

    return (
        <>
        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
            <div className="hidden lg:block" />
            <div className="flex flex-col items-center overflow-auto">
                <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {Array.from({ length: rows * cols }).map((_, idx) => {
                        const r = Math.floor(idx / cols);
                        const c = idx % cols;
                        const k = `${r},${c}`;
                        const meta = cellMeta.get(k);
                        if (!meta) { return <div key={k} className="h-9 w-9" />; }
                        const correct = submitted && entries[k] === meta.letter;
                        const wrong = submitted && entries[k] !== meta.letter;
                        return (
                            <div key={k} className="relative h-9 w-9">
                                {meta.num && <span className="absolute left-0.5 top-0 z-10 text-[8px] font-bold text-gray-500">{meta.num}</span>}
                                <input
                                    ref={(el) => { inputs.current[k] = el; }}
                                    value={entries[k] ?? ''}
                                    disabled={submitted}
                                    onChange={(e) => setCell(k, e.target.value)}
                                    className={`h-9 w-9 rounded-md border text-center text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-400 ${
                                        correct ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                                            : wrong ? 'border-red-400 bg-red-100 text-red-600'
                                                : 'border-gray-300 bg-white text-gray-900'
                                    }`}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4">
                    <Button onClick={() => setConfirming(true)} disabled={submitted} className="h-11 w-full bg-emerald-600 hover:bg-emerald-700">Check Answers</Button>
                    <p className="mt-2 text-center text-xs text-white/50">{filledCount}/{cellMeta.size} cells filled</p>
                </div>
            </div>

            <div className="space-y-4 text-sm text-white/90">
                {[{ label: 'Across', list: acrossClues }, { label: 'Down', list: downClues }].map(({ label, list }) => list.length > 0 && (
                    <div key={label}>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">{label}</p>
                        <ul className="space-y-1">
                            {list.map((p) => (
                                <li key={`${p.dir}-${p.num}`} className="leading-snug"><span className="font-bold text-white">{p.num}.</span> {p.clue}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>

        {confirming && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setConfirming(false)}>
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-2 text-4xl">🧩</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Submit your answers?</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        You've filled {filledCount} of {cellMeta.size} cells. This will lock in your crossword and use one heart.
                    </p>
                    <div className="mt-5 flex gap-2">
                        <Button variant="outline" className="h-11 flex-1" onClick={() => setConfirming(false)}>Keep Editing</Button>
                        <Button className="h-11 flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setConfirming(false); handleSubmit(); }}>Check Answers</Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

// ─── Hangman ─────────────────────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function Hangman({ items, onFinish }: { items: GameItem[]; onFinish: (answers: Record<number, string>) => void }) {
    const [current, setCurrent] = useState(0);
    const [guessed, setGuessed] = useState<Set<string>>(new Set());
    const [wrongCount, setWrongCount] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

    const item = items[current];
    const target = item.answer.toUpperCase();
    const targetLetters = useMemo(() => new Set(target.split('').filter((ch) => /[A-Z]/.test(ch))), [target]);

    const next = useCallback((won: boolean) => {
        const nextAnswers = { ...answers, [current]: won ? item.answer : '' };
        setAnswers(nextAnswers);
        window.setTimeout(() => {
            if (current + 1 >= items.length) {
                onFinish(nextAnswers);
            } else {
                setCurrent((c) => c + 1);
                setGuessed(new Set());
                setWrongCount(0);
                setStatus('playing');
            }
        }, 1300);
    }, [answers, current, item.answer, items.length, onFinish]);

    const guess = (letter: string) => {
        if (status !== 'playing' || guessed.has(letter)) { return; }
        const next2 = new Set(guessed).add(letter);
        setGuessed(next2);
        if (targetLetters.has(letter)) {
            const solved = [...targetLetters].every((l) => next2.has(l));
            if (solved) { popConfetti(0.5, 0.35); sfxCorrect(); setStatus('won'); next(true); } else { sfxPop(); }
        } else {
            sfxWrong();
            const w = wrongCount + 1;
            setWrongCount(w);
            if (w >= HANGMAN_MAX_WRONG) { setStatus('lost'); next(false); }
        }
    };

    const livesLeft = HANGMAN_MAX_WRONG - wrongCount;

    return (
        <div className="mx-auto w-full max-w-2xl">
            <div className="mb-5 flex items-center justify-between text-sm font-semibold text-white/80">
                <span className="rounded-full bg-white/10 px-3 py-1">Word {current + 1}/{items.length}</span>
                <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: HANGMAN_MAX_WRONG }).map((_, i) => (
                        <Heart key={i} className={`h-4 w-4 ${i < livesLeft ? 'fill-rose-500 text-rose-500' : 'fill-white/10 text-white/20'}`} />
                    ))}
                </span>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 sm:p-8">
                <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-amber-500">Clue</p>
                <h2 className="mb-6 text-center text-lg font-bold text-gray-900 dark:text-white">{item.prompt}</h2>

                <div className="mb-7 flex flex-wrap justify-center gap-1.5">
                    {target.split('').map((ch, i) => {
                        if (!/[A-Z]/.test(ch)) { return <span key={i} className="w-3" />; }
                        const reveal = guessed.has(ch) || status !== 'playing';
                        return (
                            <span key={i} className={`flex h-11 w-9 items-center justify-center border-b-4 text-xl font-extrabold ${
                                status === 'lost' && !guessed.has(ch) ? 'border-red-300 text-red-400' : 'border-amber-300 text-gray-900 dark:text-white'
                            }`}>
                                {reveal ? ch : ''}
                            </span>
                        );
                    })}
                </div>

                {status === 'won' && <p className="mb-4 text-center text-sm font-bold text-emerald-500">Solved! 🎉</p>}
                {status === 'lost' && <p className="mb-4 text-center text-sm font-bold text-red-500">The word was “{target}”.</p>}

                <div className="flex flex-wrap justify-center gap-1.5">
                    {ALPHABET.map((letter) => {
                        const used = guessed.has(letter);
                        const isRight = used && targetLetters.has(letter);
                        const isWrong = used && !targetLetters.has(letter);
                        return (
                            <button
                                key={letter}
                                disabled={used || status !== 'playing'}
                                onClick={() => guess(letter)}
                                className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${
                                    isRight ? 'bg-emerald-500 text-white'
                                        : isWrong ? 'bg-gray-200 text-gray-300 dark:bg-gray-800 dark:text-gray-600'
                                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300'
                                }`}
                            >
                                {letter}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Medals (top 5) ──────────────────────────────────────────────────────────────
interface Medal { name: string; emoji: string; chip: string; glow: string; }

const MEDALS: Record<number, Medal> = {
    1: { name: 'Crown', emoji: '👑', chip: 'from-yellow-300 via-amber-400 to-fuchsia-500 text-white', glow: 'shadow-amber-400/60' },
    2: { name: 'Gold', emoji: '🥇', chip: 'from-amber-300 via-yellow-400 to-amber-500 text-amber-950', glow: 'shadow-amber-400/50' },
    3: { name: 'Silver', emoji: '🥈', chip: 'from-slate-200 via-gray-300 to-slate-400 text-slate-800', glow: 'shadow-slate-300/50' },
    4: { name: 'Bronze', emoji: '🥉', chip: 'from-orange-300 via-amber-600 to-amber-800 text-white', glow: 'shadow-orange-500/50' },
    5: { name: 'Copper', emoji: '🟤', chip: 'from-orange-400 via-rose-500 to-rose-700 text-white', glow: 'shadow-rose-500/50' },
};

function medalFor(rank: number | null | undefined): Medal | null {
    return rank != null ? MEDALS[rank] ?? null : null;
}

function rankBadge(rank: number): string {
    return MEDALS[rank]?.emoji ?? `#${rank}`;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────────
function LeaderboardPanel({ leaderboard, myId }: { leaderboard: Leaderboard; myId: number | null }) {
    const meInTop = leaderboard.top.some((e) => e.userId === myId);
    return (
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Trophy className="h-4 w-4 text-amber-400" />Leaderboard</h3>
                <span className="inline-flex items-center gap-1 text-xs text-white/50"><Users className="h-3.5 w-3.5" />{leaderboard.totalPlayers}</span>
            </div>
            {leaderboard.top.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/50">No scores yet — be the first!</p>
            ) : (
                <ol className="space-y-1">
                    {leaderboard.top.map((e) => {
                        const isMe = e.userId === myId;
                        return (
                            <li key={e.userId} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-violet-500/20 ring-1 ring-violet-400/40' : ''}`}>
                                <span className="w-7 shrink-0 text-center text-base font-bold text-white/80">{rankBadge(e.rank)}</span>
                                <span className={`flex-1 truncate ${isMe ? 'font-bold text-white' : 'text-white/80'}`}>{e.name}{isMe && ' (you)'}</span>
                                <span className="shrink-0 font-bold tabular-nums text-amber-300">{e.score}</span>
                                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-white/40">{formatTime(e.timeSpent)}</span>
                            </li>
                        );
                    })}
                </ol>
            )}
            {leaderboard.me && !meInTop && (
                <div className="mt-2 flex items-center gap-3 rounded-lg bg-violet-500/20 px-3 py-2 text-sm ring-1 ring-violet-400/40">
                    <span className="w-7 shrink-0 text-center font-bold text-white/80">{rankBadge(leaderboard.me.rank)}</span>
                    <span className="flex-1 font-bold text-white">You</span>
                    <span className="shrink-0 font-bold tabular-nums text-amber-300">{leaderboard.me.score}</span>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-white/40">{formatTime(leaderboard.me.timeSpent)}</span>
                </div>
            )}
        </div>
    );
}

// ─── Lockout countdown ───────────────────────────────────────────────────────────
function useCountdown(target: string | null): string | null {
    const [, force] = useState(0);
    useEffect(() => {
        if (!target) { return; }
        const id = window.setInterval(() => force((n) => n + 1), 1000);
        return () => window.clearInterval(id);
    }, [target]);
    if (!target) { return null; }
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) { return null; }
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Intro ───────────────────────────────────────────────────────────────────────
function IntroScreen({ game, me, leaderboard, myId, onStart }: { game: GameProp; me: MeState; leaderboard: Leaderboard; myId: number | null; onStart: () => void }) {
    const meta = GAME_META[game.gameType];
    const locked = me.livesRemaining !== null && me.livesRemaining <= 0;
    const countdown = useCountdown(locked ? me.nextResetAt : null);

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 sm:p-8">
                <div className="mb-3 text-5xl">{meta.icon}</div>
                <h1 className="text-2xl font-extrabold text-white">{game.title}</h1>
                <p className="mt-1 text-sm text-white/60">{meta.label}</p>
                {game.description && <p className="mt-3 text-sm text-white/70">{game.description}</p>}

                <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white"><Trophy className="h-4 w-4 text-amber-400" />{game.points} pts</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white"><LivesPips remaining={me.livesRemaining} total={me.livesTotal} /></span>
                    {me.bestScore !== null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white">Best {me.bestScore} · {formatTime(me.bestTime)}</span>
                    )}
                </div>

                {locked ? (
                    <div className="mt-6 rounded-2xl bg-rose-500/15 p-4 ring-1 ring-rose-400/30">
                        <p className="flex items-center justify-center gap-2 text-sm font-bold text-rose-300"><Lock className="h-4 w-4" />Out of lives</p>
                        <p className="mt-1 text-xs text-white/60">{countdown ? <>Next life in <span className="font-mono font-bold text-white">{countdown}</span></> : 'Refreshing…'}</p>
                    </div>
                ) : (
                    <Button onClick={onStart} className="mt-6 h-12 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-bold hover:from-violet-500 hover:to-fuchsia-500">
                        Start Game
                    </Button>
                )}
                <p className="mt-3 text-xs text-white/40">{SIMULATION_GAMES.includes(game.gameType) ? 'Your first answer at each checkpoint is the one that counts.' : 'Questions are shuffled every match.'}</p>
            </div>

            <LeaderboardPanel leaderboard={leaderboard} myId={myId} />
        </div>
    );
}

// ─── Leaderboard view (for already-completed games) ─────────────────────────────
function LeaderboardScreen({ game, me, leaderboard, myId, courseId, onPlay }: { game: GameProp; me: MeState; leaderboard: Leaderboard; myId: number | null; courseId: number; onPlay: () => void }) {
    const meta = GAME_META[game.gameType];
    const canPlay = me.livesRemaining === null || me.livesRemaining > 0;
    const countdown = useCountdown(!canPlay ? me.nextResetAt : null);

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 sm:p-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-200 ring-1 ring-violet-400/40">
                    <CheckCircle2 className="h-3.5 w-3.5" />Completed
                </div>
                <div className="mb-2 text-5xl">{meta.icon}</div>
                <h1 className="text-2xl font-extrabold text-white">{game.title}</h1>
                <p className="mt-1 text-sm text-white/60">{meta.label}</p>

                <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
                    {me.bestScore !== null && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white"><Trophy className="h-4 w-4 text-amber-400" />Best {me.bestScore} · {formatTime(me.bestTime)}</span>
                    )}
                    {leaderboard.me && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white"><Medal className="h-4 w-4 text-amber-400" />Rank #{leaderboard.me.rank}</span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white"><LivesPips remaining={me.livesRemaining} total={me.livesTotal} /></span>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                    {canPlay ? (
                        <Button onClick={onPlay} className="h-11 gap-2 bg-violet-600 hover:bg-violet-700"><RotateCcw className="h-4 w-4" />Play Again</Button>
                    ) : (
                        <div className="rounded-2xl bg-rose-500/15 p-3 text-sm ring-1 ring-rose-400/30">
                            <p className="flex items-center justify-center gap-2 font-bold text-rose-300"><Lock className="h-4 w-4" />Out of lives</p>
                            {countdown && <p className="mt-1 text-xs text-white/60">Next life in <span className="font-mono font-bold text-white">{countdown}</span></p>}
                        </div>
                    )}
                    <Link href={`/my-course/${courseId}`}>
                        <Button variant="outline" className="h-11 w-full gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Back to Course</Button>
                    </Link>
                </div>
            </div>

            <LeaderboardPanel leaderboard={leaderboard} myId={myId} />
        </div>
    );
}

// ─── Result ───────────────────────────────────────────────────────────────────
function ResultScreen({ result, leaderboard, me, myId, courseId, onReplay }: { result: AttemptResponse; leaderboard: Leaderboard; me: MeState; myId: number | null; courseId: number; onReplay: () => void }) {
    const ratio = result.totalCount > 0 ? result.correctCount / result.totalCount : 0;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
    const heading = ratio >= 0.9 ? 'Outstanding! 🏆' : ratio >= 0.6 ? 'Well done! 🎉' : ratio > 0 ? 'Good effort! 💪' : 'Keep practicing! 📚';
    const rank = leaderboard.me?.rank ?? null;
    const canReplay = me.livesRemaining === null || me.livesRemaining > 0;
    const countdown = useCountdown(!canReplay ? me.nextResetAt : null);

    useEffect(() => {
        if (stars === 0) { sfxLose(); return; }
        sfxWin();
        celebrateConfetti(stars);
        const id = window.setTimeout(() => celebrateConfetti(stars), 700);
        return () => window.clearTimeout(id);
    }, [stars]);

    return (
        <div className="mx-auto grid w-full max-w-3xl gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 sm:p-8">
                <div className="mb-3 flex justify-center gap-1.5 text-4xl">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className={i < stars ? 'animate-bounce' : 'opacity-20'} style={{ animationDelay: `${i * 120}ms` }}>⭐</span>
                    ))}
                </div>
                <h1 className="text-2xl font-extrabold text-white">{heading}</h1>

                <div className="my-5 flex flex-wrap items-center justify-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-white shadow-lg">
                        <Trophy className="h-6 w-6" />
                        <span className="text-3xl font-black tabular-nums">{result.score}</span>
                        <span className="text-sm font-medium opacity-80">/ {result.maxScore}</span>
                    </div>
                    {rank !== null && (medalFor(rank) ? (
                        <div className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br px-5 py-3 shadow-lg ${medalFor(rank)!.chip}`}>
                            <span className="text-2xl">{medalFor(rank)!.emoji}</span>
                            <span className="text-lg font-black">{medalFor(rank)!.name}</span>
                            <span className="text-sm font-bold opacity-70">#{rank}</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-white">
                            <Medal className="h-6 w-6 text-amber-400" />
                            <span className="text-2xl font-black">#{rank}</span>
                        </div>
                    ))}
                </div>

                <p className="mb-1 text-sm text-white/60">
                    {result.correctCount} of {result.totalCount} correct
                </p>
                <p className="mb-5 inline-flex items-center justify-center gap-1.5 text-sm text-white/60">
                    Lives left: <LivesPips remaining={me.livesRemaining} total={me.livesTotal} />
                </p>

                <div className="flex flex-col gap-2">
                    {canReplay ? (
                        <Button onClick={onReplay} className="h-11 gap-2 bg-violet-600 hover:bg-violet-700"><RotateCcw className="h-4 w-4" />Play Again</Button>
                    ) : (
                        <div className="rounded-2xl bg-rose-500/15 p-3 text-sm ring-1 ring-rose-400/30">
                            <p className="flex items-center justify-center gap-2 font-bold text-rose-300"><Lock className="h-4 w-4" />Out of lives</p>
                            {countdown && <p className="mt-1 text-xs text-white/60">Next life in <span className="font-mono font-bold text-white">{countdown}</span></p>}
                        </div>
                    )}
                    <Link href={`/my-course/${courseId}`}>
                        <Button variant="outline" className="h-11 w-full gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Back to Course</Button>
                    </Link>
                </div>
            </div>

            <LeaderboardPanel leaderboard={leaderboard} myId={myId} />
        </div>
    );
}

// ─── Medal celebration popup ─────────────────────────────────────────────────────
function MedalPopup({ rank, onClose }: { rank: number; onClose: () => void }) {
    const medal = MEDALS[rank];

    useEffect(() => {
        if (!medal) { return; }
        sfxMedal();
        celebrateConfetti(3);
        const id = window.setTimeout(() => celebrateConfetti(3), 600);
        return () => window.clearTimeout(id);
    }, [medal]);

    if (!medal) { return null; }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 p-8 text-center shadow-2xl ring-1 ring-white/15"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'medalPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                <style>{`@keyframes medalPop{0%{transform:scale(0.5);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes medalSpin{0%{transform:rotate(-8deg) scale(1)}50%{transform:rotate(8deg) scale(1.08)}100%{transform:rotate(-8deg) scale(1)}}`}</style>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">Congratulations!</p>
                <div className={`mx-auto mt-5 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br text-6xl shadow-2xl ${medal.chip} ${medal.glow}`} style={{ animation: 'medalSpin 2s ease-in-out infinite' }}>
                    {medal.emoji}
                </div>
                <h1 className="mt-6 text-3xl font-extrabold text-white">{medal.name} Medal!</h1>
                <p className="mt-2 text-sm text-white/70">You reached <span className="font-bold text-white">rank #{rank}</span> on the leaderboard. Keep it up! 🎉</p>
                <Button onClick={onClose} className={`mt-6 h-12 w-full bg-gradient-to-r text-base font-bold ${medal.chip}`}>
                    Awesome!
                </Button>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'leaderboard' | 'playing' | 'result';

export default function GamePlay() {
    const { game, me: initialMe, leaderboard: initialLeaderboard, auth, isPreview = false } = usePage<{ game: GameProp; me: MeState; leaderboard: Leaderboard; auth: { user: { id: number } | null }; isPreview?: boolean }>().props;
    const myId = auth.user?.id ?? null;

    const initialPhase: Phase = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'leaderboard'
        ? 'leaderboard'
        : 'intro';
    const [phase, setPhase] = useState<Phase>(initialPhase);
    const [me, setMe] = useState<MeState>(initialMe);
    const [leaderboard, setLeaderboard] = useState<Leaderboard>(initialLeaderboard);
    const [result, setResult] = useState<AttemptResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [matchKey, setMatchKey] = useState(0);
    const [muted, setMutedState] = useState(isMuted());
    const [medalRank, setMedalRank] = useState<number | null>(null);

    const meta = GAME_META[game.gameType];
    const elapsed = useStopwatch(phase === 'playing');
    const startedAt = useRef(0);

    // Background music (per game mode) plays only while actively playing a match.
    useEffect(() => {
        if (phase === 'playing') { startMusic(game.gameType); } else { stopMusic(); }
        return () => stopMusic();
    }, [phase, game.gameType]);

    // Live leaderboard — other players' attempts push updates over the course channel.
    useEffect(() => {
        if (!window.Echo) { return; }
        const channel = window.Echo.private(`course.${game.courseId}`);
        const handler = (e: { gameId: number; leaderboard: { top: LeaderboardEntry[]; totalPlayers: number } }) => {
            if (e.gameId !== game.id) { return; }
            setLeaderboard((prev) => {
                const mine = e.leaderboard.top.find((t) => t.userId === myId);
                return {
                    top: e.leaderboard.top,
                    totalPlayers: e.leaderboard.totalPlayers,
                    me: mine ? { rank: mine.rank, score: mine.score, timeSpent: mine.timeSpent } : prev.me,
                };
            });
        };
        channel.listen('.GameLeaderboardUpdated', handler);
        return () => {
            channel.stopListening('.GameLeaderboardUpdated', handler);
            window.Echo.leave(`course.${game.courseId}`);
        };
    }, [game.courseId, game.id, myId]);

    const toggleMute = () => {
        const next = !muted;
        setAudioMuted(next);
        setMutedState(next);
    };

    // Shuffle item order for every match; remember the mapping back to original indices.
    const { order, shuffledItems } = useMemo(() => {
        const ord = shuffle(game.items.map((_, i) => i));
        return { order: ord, shuffledItems: ord.map((i) => game.items[i]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchKey, game.items]);

    const startMatch = useCallback(() => {
        unlockAudio(); // satisfy the browser's autoplay gesture requirement
        setResult(null);
        setMatchKey((k) => k + 1);
        startedAt.current = Date.now();
        setPhase('playing');
    }, []);

    const handleFinish = useCallback(async (localAnswers: Record<number, string>) => {
        setSubmitting(true);
        const serverAnswers: Record<number, string> = {};
        Object.entries(localAnswers).forEach(([li, val]) => { serverAnswers[order[Number(li)]] = val; });
        const time = Math.round((Date.now() - startedAt.current) / 1000);
        try {
            const res = await postAttempt(game.id, serverAnswers, time);
            setResult(res);
            setMe(res.me);
            setLeaderboard(res.leaderboard);
            setPhase('result');
            const rank = res.leaderboard.me?.rank ?? null;
            if (rank !== null && rank <= 5) { setMedalRank(rank); }
        } catch (e) {
            if (e instanceof OutOfLivesError) {
                setMe((prev) => ({ ...prev, livesRemaining: 0, nextResetAt: e.nextResetAt }));
                setPhase('intro');
            } else {
                setPhase('intro');
            }
        } finally {
            setSubmitting(false);
        }
    }, [game.id, order]);

    const renderPlayer = () => {
        const props = { items: shuffledItems, onFinish: handleFinish };
        switch (game.gameType) {
            case 'quiz_quest': return <QuizQuest key={matchKey} {...props} />;
            case 'memory_match': return <MemoryMatch key={matchKey} {...props} />;
            case 'word_scramble': return <WordScramble key={matchKey} {...props} />;
            case 'crossword': return <Crossword key={matchKey} {...props} />;
            case 'hangman': return <Hangman key={matchKey} {...props} />;
            case 'fault_lab':
            case 'shake_town':
            case 'wave_tank':
            case 'quake_tracker':
            case 'ground_test':
            case 'quake_ready': {
                // Simulations key their answers by the original checkpoint order.
                const Simulation = SIMULATIONS[game.gameType];
                return (
                    <Suspense fallback={<p className="text-sm font-medium text-white/80">Loading the simulation…</p>}>
                        <Simulation
                            key={matchKey}
                            items={game.items}
                            onFinish={(answers) => handleFinish(Object.fromEntries(Object.entries(answers).map(([index, value]) => [order.indexOf(Number(index)), value])))}
                        />
                    </Suspense>
                );
            }
        }
    };

    return (
        <div className="min-h-svh bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
            <Head title={`${game.title} — Game`} />

            <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
                <Link href={`/my-course/${game.courseId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white">
                    <ArrowLeft className="h-4 w-4" />Exit
                </Link>
                {phase === 'playing' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold tabular-nums text-white">
                        <Clock className="h-3.5 w-3.5" />{formatTime(elapsed)}
                    </span>
                ) : (
                    <div className="flex items-center gap-2 text-white">
                        <span className="text-lg">{meta.icon}</span>
                        <span className="text-sm font-bold sm:text-base">{game.title}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMute}
                        aria-label={muted ? 'Unmute' : 'Mute'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                    >
                        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                        <LivesPips remaining={me.livesRemaining} total={me.livesTotal} />
                    </span>
                </div>
            </header>

            {isPreview && (
                <div className="flex items-center justify-center gap-2 border-y border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-xs font-semibold text-amber-200">
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    Preview mode — you're testing this game as an instructor. Your scores won't appear on the student leaderboard.
                </div>
            )}

            <main className="flex min-h-[calc(100svh-72px)] items-center justify-center px-4 py-6 sm:px-6">
                {submitting ? (
                    <div className="text-center text-white/80">
                        <Sparkles className="mx-auto mb-3 h-10 w-10 animate-pulse" />
                        <p className="text-sm font-medium">Tallying your score…</p>
                    </div>
                ) : game.items.length === 0 ? (
                    <div className="text-center text-white/70"><p className="text-sm">This game has no questions yet.</p></div>
                ) : phase === 'leaderboard' ? (
                    <LeaderboardScreen game={game} me={me} leaderboard={leaderboard} myId={myId} courseId={game.courseId} onPlay={startMatch} />
                ) : phase === 'intro' ? (
                    <IntroScreen game={game} me={me} leaderboard={leaderboard} myId={myId} onStart={startMatch} />
                ) : phase === 'result' && result ? (
                    <ResultScreen result={result} leaderboard={leaderboard} me={me} myId={myId} courseId={game.courseId} onReplay={startMatch} />
                ) : (
                    renderPlayer()
                )}
            </main>

            {medalRank !== null && <MedalPopup rank={medalRank} onClose={() => setMedalRank(null)} />}
        </div>
    );
}
