import { Button } from '@/components/ui/button';
import { FaultLabScene, type ForceKind } from '@/lib/fault-lab-scene';
import { QuestionCard, type GameItem } from '@/components/games/question-card';
import { RotatePrompt } from '@/components/games/rotate-prompt';
import { sfxPop, sfxQuake } from '@/lib/game-audio';
import { ArrowRight, CheckCircle2, Hand, Lightbulb, Rotate3d } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FaultLabProps {
    /** Checkpoints in the fixed order defined by App\Support\FaultLab. */
    items: GameItem[];
    onFinish: (answers: Record<number, string>) => void;
}

type Step =
    | { name: 'choose' }
    | { name: 'stress'; kind: ForceKind }
    | { name: 'predict'; kind: ForceKind }
    | { name: 'build'; kind: ForceKind }
    | { name: 'slipping'; kind: ForceKind }
    | { name: 'result'; kind: ForceKind }
    | { name: 'question'; index: number }
    | { name: 'summary' };

const KINDS: ForceKind[] = ['pull', 'push', 'slide'];

const EXPERIMENTS: Record<
    ForceKind,
    {
        label: string;
        glyph: string;
        action: string;
        stressItem: number;
        predictItem: number;
        fault: string;
        chain: string;
        explanation: string;
    }
> = {
    pull: {
        label: 'Pull apart',
        glyph: '← →',
        action: 'Pull the ground apart',
        stressItem: 0,
        predictItem: 1,
        fault: 'Normal fault',
        chain: 'Tension → pulled apart → normal fault',
        explanation: 'The ground stretched until the fault gave way. One block dropped down.',
    },
    push: {
        label: 'Push together',
        glyph: '→ ←',
        action: 'Push the ground together',
        stressItem: 2,
        predictItem: 3,
        fault: 'Reverse fault',
        chain: 'Compression → pushed together → reverse fault',
        explanation: 'The ground was squeezed until one block was pushed up over the other. If the fault is nearly flat, it is called a thrust fault.',
    },
    slide: {
        label: 'Slide past',
        glyph: '↑ ↓',
        action: 'Slide the blocks sideways',
        stressItem: 4,
        predictItem: 5,
        fault: 'Strike-slip fault',
        chain: 'Shear → sideways → strike-slip fault',
        explanation: 'The blocks slid sideways past each other. Look at the road: it is now broken and shifted. The Philippine Fault is a strike-slip fault.',
    },
};

const FRICTION_ITEM = 6;
const ENERGY_ITEM = 7;
const FOCUS_ITEM = 8;
const EPICENTER_ITEM = 9;
const RECAP_ITEMS = [10, 11, 12];

const HINTS: Record<number, string> = {
    0: 'Look at the arrows. Is the ground pulled apart, pushed together, or sliding sideways?',
    2: 'Look at the arrows. Is the ground pulled apart, pushed together, or sliding sideways?',
    4: 'Look at the arrows. Is the ground pulled apart, pushed together, or sliding sideways?',
    [FRICTION_ITEM]: 'What stops two rough surfaces from sliding?',
    [ENERGY_ITEM]: 'The road bent before it snapped. Bent rock holds energy like a stretched rubber band.',
    [FOCUS_ITEM]: 'Watch where the rings start.',
    [EPICENTER_ITEM]: 'The epicenter is on the surface, right above the focus.',
    10: 'Remember when you pulled the blocks apart.',
    11: 'Remember when you pushed the blocks together.',
    12: 'Remember when the blocks slid sideways.',
};

const SEQUENCE = [
    'The plates move',
    'Stress builds up',
    'Rocks bend and store energy',
    'Friction holds the fault',
    'The fault suddenly slips',
    'Energy spreads out as seismic waves',
];

function stressStatus(stress: number): { label: string; detail: string; tone: string } {
    if (stress >= 0.8) {
        return { label: 'Critical stress', detail: 'The fault is about to give way.', tone: 'text-red-600 dark:text-red-400' };
    }
    if (stress >= 0.3) {
        return { label: 'Fault locked', detail: 'Friction is holding it while the rocks keep bending.', tone: 'text-amber-600 dark:text-amber-400' };
    }
    if (stress > 0) {
        return { label: 'Stress building', detail: 'The rocks are starting to bend.', tone: 'text-sky-600 dark:text-sky-400' };
    }

    return { label: 'Fault stable', detail: 'No force yet.', tone: 'text-gray-500 dark:text-gray-400' };
}

export default function FaultLab({ items, onFinish }: FaultLabProps) {
    const mount = useRef<HTMLDivElement>(null);
    const scene = useRef<FaultLabScene | null>(null);

    const [step, setStep] = useState<Step>({ name: 'choose' });
    const [completed, setCompleted] = useState<ForceKind[]>([]);
    const [queue, setQueue] = useState<number[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [stress, setStress] = useState(0);
    const [unsupported, setUnsupported] = useState(false);

    useEffect(() => {
        if (!mount.current) {
            return;
        }
        try {
            scene.current = new FaultLabScene(mount.current, {
                onStress: setStress,
                onSlip: () => {
                    sfxQuake();
                    setStep((current) => (current.name === 'build' ? { name: 'slipping', kind: current.kind } : current));
                },
                onSettled: () => {
                    setStep((current) => (current.name === 'slipping' ? { name: 'result', kind: current.kind } : current));
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

    const startExperiment = (kind: ForceKind) => {
        sfxPop();
        setStress(0);
        scene.current?.setExperiment(kind);
        setStep({ name: 'stress', kind });
    };

    const openQuestion = (index: number, rest: number[]) => {
        if (index === FOCUS_ITEM) {
            scene.current?.setExperiment(null);
            scene.current?.setMarkers('points');
        } else if (index === RECAP_ITEMS[0]) {
            scene.current?.setExperiment(null);
        }
        setQueue(rest);
        setStep({ name: 'question', index });
    };

    const advance = (pending: number[], done: ForceKind[]) => {
        if (pending.length > 0) {
            openQuestion(pending[0], pending.slice(1));

            return;
        }
        setStep(done.length >= KINDS.length ? { name: 'summary' } : { name: 'choose' });
    };

    const finishExperiment = (kind: ForceKind) => {
        const done = completed.includes(kind) ? completed : [...completed, kind];
        setCompleted(done);
        if (done.length === 1) {
            advance([FRICTION_ITEM, ENERGY_ITEM], done);
        } else if (done.length >= KINDS.length) {
            advance([FOCUS_ITEM, EPICENTER_ITEM, ...RECAP_ITEMS], done);
        } else {
            advance([], done);
        }
    };

    const answerQuestion = (index: number, firstPick: string) => {
        record(index, firstPick);
        if (index === EPICENTER_ITEM) {
            scene.current?.showFocalDepth();
        }
        advance(queue, completed);
    };

    const push = (pushing: boolean) => scene.current?.setPushing(pushing);

    const status = stressStatus(stress);
    const checkpoint = Math.min(items.length, Object.keys(answers).length + 1);
    const activeKind = 'kind' in step ? step.kind : null;

    const renderPanel = () => {
        if (unsupported) {
            return <p className="text-sm text-gray-600 dark:text-gray-300">This device cannot show 3D graphics, so Fault Lab cannot run here. Try another browser or device.</p>;
        }

        switch (step.name) {
            case 'choose':
                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs font-bold tracking-wider text-violet-600 uppercase dark:text-violet-300">
                                Experiment {completed.length + 1} of {KINDS.length}
                            </p>
                            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Choose a force</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The fault is calm. Add a force and make an earthquake.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {KINDS.map((kind) => {
                                const done = completed.includes(kind);

                                return (
                                    <button
                                        key={kind}
                                        type="button"
                                        disabled={done}
                                        onClick={() => startExperiment(kind)}
                                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${done ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/30' : 'border-gray-200 bg-gray-50 hover:border-violet-400 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-mono text-base font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                            {EXPERIMENTS[kind].glyph}
                                        </span>
                                        <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100">{EXPERIMENTS[kind].label}</span>
                                        {done && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'stress':
                return (
                    <QuestionCard
                        key={`stress-${step.kind}`}
                        item={items[EXPERIMENTS[step.kind].stressItem]}
                        mode="check"
                        hint={HINTS[EXPERIMENTS[step.kind].stressItem]}
                        onDone={(firstPick) => {
                            record(EXPERIMENTS[step.kind].stressItem, firstPick);
                            setStep({ name: 'predict', kind: step.kind });
                        }}
                    />
                );

            case 'predict':
                return (
                    <QuestionCard
                        key={`predict-${step.kind}`}
                        item={items[EXPERIMENTS[step.kind].predictItem]}
                        mode="predict"
                        onDone={(firstPick) => {
                            record(EXPERIMENTS[step.kind].predictItem, firstPick);
                            setStep({ name: 'build', kind: step.kind });
                        }}
                    />
                );

            case 'build':
            case 'slipping':
                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs font-bold tracking-wider text-violet-600 uppercase dark:text-violet-300">Build the stress</p>
                            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{EXPERIMENTS[step.kind].action}</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Hold the button and watch the road bend.</p>
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                                <span className="tracking-wider text-gray-500 uppercase dark:text-gray-400">Fault stress</span>
                                <span className="text-gray-700 tabular-nums dark:text-gray-200">{Math.round(stress * 100)}%</span>
                            </div>
                            <div
                                role="meter"
                                aria-label="Fault stress"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(stress * 100)}
                                className="h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                            >
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-red-500"
                                    style={{ width: `${stress * 100}%` }}
                                />
                            </div>
                        </div>

                        {step.name === 'slipping' ? (
                            <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-950/40">
                                <p className="text-xl font-extrabold tracking-wide text-red-600 dark:text-red-400">FAULT SLIP!</p>
                                <p className="mt-1 text-sm text-red-700/80 dark:text-red-200/80">The stored energy is spreading out as seismic waves.</p>
                            </div>
                        ) : (
                            <>
                                <div aria-live="polite">
                                    <p className={`text-sm font-bold ${status.tone}`}>{status.label}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{status.detail}</p>
                                </div>
                                <button
                                    type="button"
                                    onPointerDown={(event) => {
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                        push(true);
                                    }}
                                    onPointerUp={() => push(false)}
                                    onPointerCancel={() => push(false)}
                                    onLostPointerCapture={() => push(false)}
                                    onKeyDown={(event) => {
                                        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                                            event.preventDefault();
                                            push(true);
                                        }
                                    }}
                                    onKeyUp={(event) => {
                                        if (event.key === ' ' || event.key === 'Enter') {
                                            push(false);
                                        }
                                    }}
                                    onBlur={() => push(false)}
                                    onContextMenu={(event) => event.preventDefault()}
                                    className="flex h-14 touch-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-base font-extrabold text-white shadow-lg transition select-none active:scale-[0.98] active:from-amber-600 active:to-orange-700"
                                >
                                    <Hand className="h-5 w-5" />
                                    Hold to add force
                                </button>
                            </>
                        )}
                    </div>
                );

            case 'result': {
                const experiment = EXPERIMENTS[step.kind];
                const prediction = answers[experiment.predictItem];
                const correct = prediction === items[experiment.predictItem].answer;

                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs font-bold tracking-wider text-violet-600 uppercase dark:text-violet-300">You made a</p>
                            <h2 className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">{experiment.fault}</h2>
                        </div>
                        <p className="rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">{experiment.chain}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{experiment.explanation}</p>
                        <p
                            className={`flex items-start gap-2 rounded-xl p-3 text-sm ${correct ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}`}
                        >
                            {correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />}
                            <span>
                                You predicted: <strong>{prediction}</strong>.{' '}
                                {correct ? 'That is what happened.' : `What really happened: ${items[experiment.predictItem].answer.toLowerCase()}.`}
                            </span>
                        </p>
                        <Button onClick={() => finishExperiment(step.kind)} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
                            Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                );
            }

            case 'question':
                return (
                    <QuestionCard
                        key={`question-${step.index}`}
                        item={items[step.index]}
                        mode="check"
                        hint={HINTS[step.index]}
                        onDone={(firstPick) => answerQuestion(step.index, firstPick)}
                    />
                );

            case 'summary':
                return (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs font-bold tracking-wider text-violet-600 uppercase dark:text-violet-300">Earthquake built</p>
                            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Every earthquake follows these steps</h2>
                        </div>
                        <ol className="flex flex-col gap-2">
                            {SEQUENCE.map((line, index) => (
                                <li key={line} className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                                        {index + 1}
                                    </span>
                                    {line}
                                </li>
                            ))}
                        </ol>
                        <Button onClick={() => onFinish(answers)} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
                            See my score <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                );
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
            <RotatePrompt />
            <div className="flex flex-wrap items-center justify-between gap-2 max-lg:landscape:hidden">
                <div className="flex flex-wrap gap-2">
                    {KINDS.map((kind) => {
                        const done = completed.includes(kind);
                        const active = activeKind === kind;

                        return (
                            <span
                                key={kind}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${done ? 'bg-emerald-400/20 text-emerald-200' : active ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-white/60'}`}
                            >
                                {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {EXPERIMENTS[kind].label}
                            </span>
                        );
                    })}
                </div>
                <span className="text-xs font-semibold text-white/70">
                    Checkpoint {checkpoint} of {items.length}
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:landscape:grid-cols-[minmax(0,1fr)_300px] max-lg:landscape:gap-3">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300 via-sky-100 to-amber-100 ring-1 ring-white/20">
                    <div ref={mount} className="h-[50svh] min-h-72 w-full lg:h-[calc(100svh-11rem)] lg:min-h-[520px] max-lg:landscape:h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48" />
                    <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Rotate3d className="h-3.5 w-3.5" />
                        Drag to look around
                    </p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-gray-900 max-lg:landscape:max-h-[calc(100svh-7.5rem)] max-lg:landscape:min-h-48 max-lg:landscape:overflow-y-auto max-lg:landscape:p-4">{renderPanel()}</div>
            </div>
        </div>
    );
}
