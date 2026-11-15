import { cn } from '@/lib/utils';
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const POSES = [1, 2, 3, 4, 5, 6, 7, 8];
const MS_PER_CHARACTER = 24;

interface Speech {
    text: string;
    /** Picks her pose; use the step title so each step keeps its own. */
    seed: string;
}

interface GuideContextValue {
    speech: Speech | null;
    setSpeech: (speech: Speech | null) => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

/** A stable pose for a step, so it never changes while the step is on screen. */
function poseFor(seed: string): number {
    let hash = 0;
    for (const char of seed) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    return POSES[hash % POSES.length];
}

/** Lets a step's heading speak through Professor Sheng in the 3D view. Wrap the whole simulation layout. */
export function GuideProvider({ children }: { children: ReactNode }) {
    const [speech, setSpeech] = useState<Speech | null>(null);
    const value = useMemo(() => ({ speech, setSpeech }), [speech]);

    return (
        <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
    );
}

/** Make Professor Sheng say `text` while the calling step is on screen. */
export function useGuideSpeech(text: string | undefined, seed: string): void {
    const setSpeech = useContext(GuideContext)?.setSpeech;

    useEffect(() => {
        if (!setSpeech || !text) {
            return;
        }
        setSpeech({ text, seed });

        return () => setSpeech(null);
    }, [setSpeech, text, seed]);
}

/** Reveal `text` a letter at a time; `done` flips once the whole line is shown. */
function useTypewriter(text: string): { shown: string; done: boolean } {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCount(text.length);

            return;
        }
        setCount(0);
        const timer = window.setInterval(() => {
            setCount((current) => {
                if (current >= text.length) {
                    window.clearInterval(timer);

                    return current;
                }

                return current + 1;
            });
        }, MS_PER_CHARACTER);

        return () => window.clearInterval(timer);
    }, [text]);

    return { shown: text.slice(0, count), done: count >= text.length };
}

function SpeechBubble({ speech }: { speech: Speech }) {
    const { shown, done } = useTypewriter(speech.text);
    const pose = poseFor(speech.seed);

    return (
        <div className="pointer-events-none relative h-(--s) w-full [--s:8rem] sm:[--s:12rem] lg:[--s:16rem]">
            <img
                key={pose}
                src={`/avatars/pixel/pose${pose}.webp`}
                alt="Professor Sheng"
                width={640}
                height={640}
                className={cn(
                    'absolute -bottom-3 left-0 size-(--s) object-contain object-bottom drop-shadow-[0_8px_8px_rgba(0,0,0,0.25)] [image-rendering:pixelated]',
                    !done &&
                        'motion-safe:animate-[sheng-talk_0.45s_ease-in-out_infinite]',
                )}
            />
            <div
                key={speech.text}
                className="absolute top-[42%] left-[calc(var(--s)*0.82)] w-fit max-w-[min(28rem,calc(100%-var(--s)*0.82))] -translate-y-1/2 motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-3"
            >
                <div className="relative rounded-2xl border border-violet-200 bg-white/95 px-4 py-3 shadow-float backdrop-blur-sm dark:border-violet-400/30 dark:bg-slate-900/90">
                    <span
                        aria-hidden
                        className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-violet-200 bg-white dark:border-violet-400/30 dark:bg-slate-900"
                    />
                    <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
                        Professor Sheng
                    </p>
                    <p className="sr-only">{speech.text}</p>
                    <p
                        aria-hidden
                        className="text-sm leading-relaxed text-slate-800 dark:text-slate-100"
                    >
                        {shown}
                        {!done && (
                            <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 bg-violet-600 motion-safe:animate-pulse dark:bg-violet-300" />
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

/** Professor Sheng and her speech bubble, drawn over the bottom-left of the 3D view. */
export function GuideOverlay({ className }: { className?: string }) {
    const speech = useContext(GuideContext)?.speech;

    if (!speech) {
        return null;
    }

    return (
        <div
            role="status"
            className={cn(
                'absolute right-3 bottom-0 left-4 max-lg:landscape:hidden',
                className,
            )}
        >
            <SpeechBubble speech={speech} />
        </div>
    );
}
