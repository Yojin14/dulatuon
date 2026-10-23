import { RotatePrompt } from '@/components/games/rotate-prompt';
import { Rotate3d } from 'lucide-react';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';

/**
 * Create a three.js scene inside a mounted element and dispose of it on
 * unmount. `create` is only read once, so it should close over stable values
 * (state setters), not over changing state.
 */
export function useSimScene<T extends { dispose: () => void }>(create: (container: HTMLDivElement) => T) {
    const mount = useRef<HTMLDivElement>(null);
    const scene = useRef<T | null>(null);
    const factory = useRef(create);
    const [unsupported, setUnsupported] = useState(false);

    useEffect(() => {
        if (!mount.current) {
            return;
        }
        try {
            scene.current = factory.current(mount.current);
        } catch {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUnsupported(true);
        }

        return () => {
            scene.current?.dispose();
            scene.current = null;
        };
    }, []);

    return { mount, scene, unsupported };
}

/** Collect the first answer given at each checkpoint. */
export function useCheckpoints() {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const record = (index: number, value: string) => setAnswers((previous) => (index in previous ? previous : { ...previous, [index]: value }));

    return { answers, record };
}

interface SimulationShellProps {
    mount: RefObject<HTMLDivElement | null>;
    stepLabel: string;
    checkpoint: number;
    total: number;
    unsupported: boolean;
    name: string;
    /** Tip shown in the corner of the 3D view. */
    viewHint?: string;
    /** Extra elements drawn on top of the 3D view. */
    overlay?: ReactNode;
    children: ReactNode;
}

/** Checkpoint progress as segmented pips, like a level map. */
function CheckpointPips({ checkpoint, total }: { checkpoint: number; total: number }) {
    const reached = Math.min(total, checkpoint);

    return (
        <div className="flex items-center gap-3" aria-label={`Checkpoint ${reached} of ${total}`}>
            <div className="hidden items-center gap-1 sm:flex" aria-hidden>
                {Array.from({ length: total }, (_, i) => (
                    <span key={i} className={`h-2 w-5 rounded-full transition-colors duration-300 ${i < reached ? 'bg-amber-400' : 'bg-white/15'}`} />
                ))}
            </div>
            <span className="text-xs font-bold text-white/80 tabular-nums">
                Checkpoint {reached} of {total}
            </span>
        </div>
    );
}

/** Shared layout for the simulation games: big 3D view, question panel beside it. */
export function SimulationShell({ mount, stepLabel, checkpoint, total, unsupported, name, viewHint = 'Drag to look around', overlay, children }: SimulationShellProps) {
    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
            <RotatePrompt />
            <div className="flex flex-wrap items-center justify-between gap-2 max-lg:landscape:hidden">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/10">{stepLabel}</span>
                <CheckpointPips checkpoint={checkpoint} total={total} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] max-lg:landscape:grid-cols-[minmax(0,1fr)_300px] max-lg:landscape:gap-3">
                <div className="relative overflow-hidden rounded-4xl bg-world-sky ring-1 ring-white/20">
                    <div
                        ref={mount}
                        className="h-[50svh] min-h-72 w-full lg:h-[calc(100svh-11rem)] lg:min-h-[520px] max-lg:landscape:h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48"
                    />
                    <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                        <Rotate3d className="size-3.5" />
                        {viewHint}
                    </p>
                    {overlay}
                </div>

                <div className="rounded-4xl border bg-card p-5 text-card-foreground shadow-float sm:p-7 max-lg:landscape:max-h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48 max-lg:landscape:overflow-y-auto max-lg:landscape:p-4">
                    {unsupported ? (
                        <p className="text-sm text-muted-foreground">This device cannot show 3D graphics, so {name} cannot run here. Try another browser or device.</p>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </div>
    );
}

/** Small heading block used at the top of each step in the side panel. */
export function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
    return (
        <div>
            <p className="text-eyebrow text-violet-600 dark:text-violet-300">{eyebrow}</p>
            <h2 className="mt-1.5 font-display text-xl leading-snug font-bold tracking-[-0.02em] text-foreground">{title}</h2>
            {text && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>}
        </div>
    );
}
