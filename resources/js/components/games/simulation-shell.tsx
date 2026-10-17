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

/** Shared layout for the simulation games: big 3D view, question panel beside it. */
export function SimulationShell({ mount, stepLabel, checkpoint, total, unsupported, name, viewHint = 'Drag to look around', overlay, children }: SimulationShellProps) {
    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
            <RotatePrompt />
            <div className="flex flex-wrap items-center justify-between gap-2 max-lg:landscape:hidden">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">{stepLabel}</span>
                <span className="text-xs font-semibold text-white/70">
                    Checkpoint {Math.min(total, checkpoint)} of {total}
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:landscape:grid-cols-[minmax(0,1fr)_300px] max-lg:landscape:gap-3">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 via-sky-100 to-amber-100 ring-1 ring-white/20">
                    <div
                        ref={mount}
                        className="h-[50svh] min-h-72 w-full lg:h-[calc(100svh-11rem)] lg:min-h-[520px] max-lg:landscape:h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48"
                    />
                    <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Rotate3d className="h-3.5 w-3.5" />
                        {viewHint}
                    </p>
                    {overlay}
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-gray-900 max-lg:landscape:max-h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48 max-lg:landscape:overflow-y-auto max-lg:landscape:p-4">
                    {unsupported ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">This device cannot show 3D graphics, so {name} cannot run here. Try another browser or device.</p>
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
            <p className="text-xs font-bold tracking-wider text-violet-600 uppercase dark:text-violet-300">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            {text && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>}
        </div>
    );
}
