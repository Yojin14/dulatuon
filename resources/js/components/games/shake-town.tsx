import { QuestionCard, type GameItem } from '@/components/games/question-card';
import { RotatePrompt } from '@/components/games/rotate-prompt';
import { Button } from '@/components/ui/button';
import { sfxCorrect, sfxPop, sfxQuake, sfxWrong } from '@/lib/game-audio';
import {
    depthToSlider,
    depthZone,
    MAX_MAGNITUDE,
    MIN_MAGNITUDE,
    PEIS,
    roman,
    sliderToDepth,
    TOWNS,
} from '@/lib/shake-town-model';
import { ShakeTownScene } from '@/lib/shake-town-scene';
import { ArrowRight, CheckCircle2, Circle, Lightbulb, Rotate3d, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ShakeTownProps {
    /** Checkpoints in the fixed order defined by App\Support\ShakeTown. */
    items: GameItem[];
    onFinish: (answers: Record<number, string>) => void;
}

interface Run {
    magnitude: number;
    depthKm: number;
    results: number[];
}

interface Goal {
    label: string;
    met: (run: Run) => boolean;
}

interface Preset {
    label: string;
    magnitude: number;
    depthKm: number;
}

type Step =
    | { type: 'question'; item: number; mode: 'check' | 'predict'; hint?: string }
    | { type: 'run'; title: string; instruction: string; lockedMagnitude?: number; presets?: Preset[]; goals: Goal[] }
    | { type: 'challenge'; item: number; hint: string; solved: (run: Run) => boolean }
    | { type: 'summary' };

const SOLVED = 'Solved';
const NOT_SOLVED = 'Not solved';
const CHALLENGE_TRIES = 3;

const TOWN_A = 0;
const TOWN_D = 3;

const STEPS: Step[] = [
    { type: 'question', item: 0, mode: 'predict' },
    {
        type: 'run',
        title: 'Try it: same magnitude, different depth',
        instruction: 'Magnitude stays at 6.0. Move the depth slider. Run one shallow earthquake and one deep earthquake.',
        lockedMagnitude: 6,
        goals: [
            { label: 'Shallow: 20 km or less', met: (run) => run.depthKm <= 20 },
            { label: 'Deep: 250 km or more', met: (run) => run.depthKm >= 250 },
        ],
    },
    { type: 'question', item: 1, mode: 'check', hint: 'The magnitude was the same. Only the distance the waves travelled changed.' },
    { type: 'question', item: 2, mode: 'predict' },
    {
        type: 'run',
        title: 'Try it: small and shallow, or big and deep',
        instruction: 'Run both earthquakes. Watch Town A.',
        presets: [
            { label: 'M 5.5 at 8 km', magnitude: 5.5, depthKm: 8 },
            { label: 'M 6.5 at 250 km', magnitude: 6.5, depthKm: 250 },
        ],
        goals: [
            { label: 'Magnitude 5.5 at 8 km', met: (run) => run.magnitude === 5.5 && run.depthKm === 8 },
            { label: 'Magnitude 6.5 at 250 km', met: (run) => run.magnitude === 6.5 && run.depthKm === 250 },
        ],
    },
    { type: 'question', item: 3, mode: 'check', hint: 'Look at the table. Compare the four towns for the 250 km earthquake.' },
    { type: 'question', item: 4, mode: 'predict' },
    {
        type: 'run',
        title: 'Try it: one earthquake, four towns',
        instruction: 'Run the earthquake. Watch each town when the waves arrive.',
        presets: [{ label: 'M 6.4 at 12 km', magnitude: 6.4, depthKm: 12 }],
        goals: [{ label: 'Magnitude 6.4 at 12 km', met: (run) => run.magnitude === 6.4 && run.depthKm === 12 }],
    },
    { type: 'question', item: 5, mode: 'check', hint: 'You set one magnitude. Did that number change from town to town?' },
    { type: 'question', item: 6, mode: 'check', hint: 'Each town got its own number. What does that number describe?' },
    { type: 'question', item: 7, mode: 'check', hint: 'Look under Town C. The ground there is a different colour.' },
    {
        type: 'challenge',
        item: 8,
        hint: 'Town A is right above the focus. Town D is far away. Try a small earthquake near the surface.',
        solved: (run) => run.results[TOWN_A] >= 7 && run.results[TOWN_D] <= 4,
    },
    {
        type: 'challenge',
        item: 9,
        hint: 'Try a bigger earthquake that starts very deep. Then the waves travel about the same distance to every town.',
        solved: (run) => run.results.every((intensity) => intensity >= 3 && intensity < 6),
    },
    { type: 'summary' },
];

const TAKEAWAYS = [
    'Magnitude: one number for the whole earthquake. It is the energy at the source.',
    'Intensity: different in each place. It is how strong the shaking feels there.',
    'Shallow earthquakes hit hard nearby. Deep ones are felt far away, but weakly.',
    'Soft ground shakes more than solid rock.',
];

function intensityTone(intensity: number): string {
    if (intensity >= 8) {
        return 'bg-red-600 text-white';
    }
    if (intensity >= 6) {
        return 'bg-orange-500 text-white';
    }
    if (intensity >= 4) {
        return 'bg-yellow-400 text-yellow-950';
    }

    return 'bg-sky-500 text-white';
}

function RunTable({ runs }: { runs: Run[] }) {
    if (runs.length === 0) {
        return null;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
                <thead>
                    <tr className="text-muted-foreground">
                        <th className="py-1 pr-2 font-semibold">Earthquake</th>
                        {TOWNS.map((town) => (
                            <th key={town.id} className="px-1 py-1 text-center font-semibold">
                                {town.id}
                                <span className="block text-[10px] font-normal">
                                    {town.distanceKm} km{town.soft ? ' · soft' : ''}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {runs.slice(-3).map((run, index) => (
                        <tr key={index} className="border-t border-border">
                            <td className="py-1.5 pr-2 font-semibold text-gray-700 tabular-nums dark:text-gray-200">
                                M {run.magnitude.toFixed(1)} · {run.depthKm} km
                            </td>
                            {run.results.map((intensity, town) => (
                                <td key={town} className="px-1 py-1.5 text-center">
                                    <span
                                        title={PEIS[intensity]}
                                        className={`inline-flex min-w-9 justify-center rounded-md px-1.5 py-0.5 font-bold ${intensityTone(intensity)}`}
                                    >
                                        {roman(intensity)}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ShakeTown({ items, onFinish }: ShakeTownProps) {
    const mount = useRef<HTMLDivElement>(null);
    const scene = useRef<ShakeTownScene | null>(null);

    const [stepIndex, setStepIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [magnitude, setMagnitude] = useState(6);
    const [depthKm, setDepthKm] = useState(10);
    const [running, setRunning] = useState(false);
    const [runs, setRuns] = useState<Run[]>([]);
    const [unsupported, setUnsupported] = useState(false);

    const step = STEPS[stepIndex];

    useEffect(() => {
        if (!mount.current) {
            return;
        }
        try {
            scene.current = new ShakeTownScene(mount.current, {
                onDone: (run) => {
                    setRunning(false);
                    setRuns((previous) => [...previous, run]);
                },
            });
        } catch {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUnsupported(true);
        }

        return () => {
            scene.current?.dispose();
            scene.current = null;
        };
    }, []);

    const record = (index: number, value: string) => setAnswers((previous) => (index in previous ? previous : { ...previous, [index]: value }));

    const setQuake = (nextMagnitude: number, nextDepth: number) => {
        setMagnitude(nextMagnitude);
        setDepthKm(nextDepth);
        scene.current?.setQuake(nextMagnitude, nextDepth);
    };

    const release = (nextMagnitude = magnitude, nextDepth = depthKm) => {
        if (running) {
            return;
        }
        sfxQuake();
        setQuake(nextMagnitude, nextDepth);
        setRunning(true);
        scene.current?.release();
    };

    const goTo = (index: number) => {
        const next = STEPS[index];
        setRuns([]);
        scene.current?.reset();
        if (next.type === 'run' && next.lockedMagnitude !== undefined) {
            setQuake(next.lockedMagnitude, depthKm);
        }
        setStepIndex(index);
    };

    const nextStep = () => {
        sfxPop();
        goTo(stepIndex + 1);
    };

    const checkpoint = Math.min(items.length, Object.keys(answers).length + 1);
    const latest = runs[runs.length - 1];

    const renderControls = (lockedMagnitude?: number) => (
        <div className="flex flex-col gap-3">
            <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>Magnitude{lockedMagnitude !== undefined ? ' (locked)' : ''}</span>
                    <span className="tabular-nums">{magnitude.toFixed(1)}</span>
                </span>
                <input
                    id="shake-town-magnitude"
                    type="range"
                    min={MIN_MAGNITUDE}
                    max={MAX_MAGNITUDE}
                    step={0.1}
                    value={magnitude}
                    disabled={running || lockedMagnitude !== undefined}
                    onChange={(event) => setQuake(Number(event.target.value), depthKm)}
                    className="h-2 w-full cursor-pointer accent-violet-600 disabled:opacity-50"
                />
            </label>
            <label className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>Focal depth</span>
                    <span className="tabular-nums">
                        {depthKm} km · {depthZone(depthKm)}
                    </span>
                </span>
                <input
                    id="shake-town-depth"
                    type="range"
                    min={0}
                    max={1}
                    step={0.005}
                    value={depthToSlider(depthKm)}
                    disabled={running}
                    onChange={(event) => setQuake(magnitude, sliderToDepth(Number(event.target.value)))}
                    className="h-2 w-full cursor-pointer accent-violet-600 disabled:opacity-50"
                />
            </label>
            <button
                type="button"
                disabled={running}
                onClick={() => release()}
                className="pressable flex h-14 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-500 to-orange-600 text-base font-extrabold text-white [--press:var(--color-orange-800)] hover:brightness-105 disabled:opacity-60"
            >
                <Zap className="h-5 w-5" />
                {running ? 'Waves travelling…' : 'Release the earthquake'}
            </button>
        </div>
    );

    const renderPanel = () => {
        if (unsupported) {
            return <p className="text-sm text-muted-foreground">This device cannot show 3D graphics, so Shake Town cannot run here. Try another browser or device.</p>;
        }

        switch (step.type) {
            case 'question':
                return (
                    <QuestionCard
                        key={`question-${step.item}`}
                        item={items[step.item]}
                        mode={step.mode}
                        hint={step.hint}
                        onDone={(firstPick) => {
                            record(step.item, firstPick);
                            goTo(stepIndex + 1);
                        }}
                    />
                );

            case 'run': {
                const done = step.goals.every((goal) => runs.some(goal.met));

                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-eyebrow text-violet-600 dark:text-violet-300">Experiment</p>
                            <h2 className="mt-1.5 font-display text-xl leading-snug font-bold tracking-[-0.02em] text-foreground">{step.title}</h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.instruction}</p>
                        </div>

                        <ul className="flex flex-col gap-1.5">
                            {step.goals.map((goal) => {
                                const met = runs.some(goal.met);

                                return (
                                    <li key={goal.label} className={`flex items-center gap-2 text-sm font-medium ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                        {met ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                                        {goal.label}
                                    </li>
                                );
                            })}
                        </ul>

                        {step.presets ? (
                            <div className="flex flex-col gap-2">
                                {step.presets.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        disabled={running}
                                        onClick={() => release(preset.magnitude, preset.depthKm)}
                                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 text-sm font-extrabold text-white shadow transition active:scale-[0.98] disabled:opacity-60"
                                    >
                                        <Zap className="h-4 w-4" />
                                        Release {preset.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            renderControls(step.lockedMagnitude)
                        )}

                        <RunTable runs={runs} />

                        {done && !running && (
                            <Button onClick={nextStep} className="h-12 w-full text-base">
                                Continue <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }

            case 'challenge': {
                const solved = runs.some(step.solved);
                const scored = step.item in answers;
                const triesLeft = Math.max(0, CHALLENGE_TRIES - runs.length);

                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-eyebrow text-violet-600 dark:text-violet-300">Challenge</p>
                            <h2 className="mt-1.5 font-display text-xl leading-snug font-bold tracking-[-0.02em] text-foreground">{items[step.item].prompt.replace(/^Challenge:\s*/, '')}</h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                {solved
                                    ? 'You did it.'
                                    : scored
                                      ? 'No points now, but keep trying.'
                                      : `Set the magnitude and depth. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left for points.`}
                            </p>
                        </div>

                        {!solved && renderControls()}

                        <RunTable runs={runs} />

                        {!solved && runs.length > 0 && !running && (
                            <p className="flex animate-pop-in items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-sm font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                                {step.hint}
                            </p>
                        )}

                        {solved && !running && (
                            <Button onClick={nextStep} className="h-12 w-full text-base">
                                Continue <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }

            case 'summary':
                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-eyebrow text-violet-600 dark:text-violet-300">Town tested</p>
                            <h2 className="mt-1.5 font-display text-xl leading-snug font-bold tracking-[-0.02em] text-foreground">What you found out</h2>
                        </div>
                        <ul className="flex flex-col gap-2">
                            {TAKEAWAYS.map((line) => (
                                <li key={line} className="flex items-start gap-2 text-sm font-medium text-foreground/85">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                        <Button onClick={() => onFinish(answers)} className="h-12 w-full text-base">
                            See my score <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                );
        }
    };

    // Score a challenge as soon as it is solved, or once the scored tries run out.
    useEffect(() => {
        if (step.type !== 'challenge' || step.item in answers || runs.length === 0) {
            return;
        }
        const solved = runs.some(step.solved);
        if (solved || runs.length >= CHALLENGE_TRIES) {
            if (solved) {
                sfxCorrect();
            } else {
                sfxWrong();
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAnswers((previous) => ({ ...previous, [step.item]: solved ? SOLVED : NOT_SOLVED }));
        }
    }, [runs, step, answers]);

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
            <RotatePrompt />
            <div className="flex flex-wrap items-center justify-between gap-2 max-lg:landscape:hidden">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                    Step {Math.min(stepIndex + 1, STEPS.length - 1)} of {STEPS.length - 1}
                </span>
                <span className="text-xs font-semibold text-white/70">
                    Checkpoint {checkpoint} of {items.length}
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] max-lg:landscape:grid-cols-[minmax(0,1fr)_300px] max-lg:landscape:gap-3">
                <div className="relative overflow-hidden rounded-4xl bg-world-sky ring-1 ring-white/20">
                    <div ref={mount} className="h-[50svh] min-h-72 w-full lg:h-[calc(100svh-11rem)] lg:min-h-[520px] max-lg:landscape:h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48" />
                    <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                        <Rotate3d className="h-3.5 w-3.5" />
                        Drag to look around
                    </p>
                    {latest && !running && (
                        <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                            Town A: Intensity {roman(latest.results[TOWN_A])} · {PEIS[latest.results[TOWN_A]]}
                        </p>
                    )}
                </div>

                <div className="rounded-4xl border bg-card p-5 text-card-foreground shadow-float sm:p-7 max-lg:landscape:max-h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48 max-lg:landscape:overflow-y-auto max-lg:landscape:p-4">{renderPanel()}</div>
            </div>
        </div>
    );
}
