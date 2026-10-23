import { QuestionCard, type GameItem } from '@/components/games/question-card';
import { SimulationShell, StepHeading, useCheckpoints, useSimScene } from '@/components/games/simulation-shell';
import { Button } from '@/components/ui/button';
import { sfxCorrect, sfxQuake, sfxWrong } from '@/lib/game-audio';
import { DEFAULT_CONFIG, type GroundConfig, type GroundResult } from '@/lib/ground-test-model';
import { GroundTestScene } from '@/lib/ground-test-scene';
import { ArrowRight, CheckCircle2, Lightbulb, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface GroundTestProps {
    /** Checkpoints in the fixed order defined by App\Support\GroundTest. */
    items: GameItem[];
    onFinish: (answers: Record<number, string>) => void;
}

interface Run {
    config: GroundConfig;
    result: GroundResult;
}

type Step =
    | { type: 'question'; item: number; mode: 'check' | 'predict'; hint?: string; setup?: GroundConfig }
    | { type: 'make'; title: string; text: string; hint: string; start: GroundConfig; met: (run: Run) => boolean; success: string }
    | { type: 'challenge'; item: number; hint: string; start: GroundConfig; solved: (run: Run) => boolean }
    | { type: 'summary' };

const SOLVED = 'Solved';
const NOT_SOLVED = 'Not solved';
const CHALLENGE_TRIES = 3;

const SOAKED_SAND: GroundConfig = { slope: 0, loose: true, wet: true, strong: true, surfaceFault: false };

const STEPS: Step[] = [
    { type: 'question', item: 0, mode: 'predict', setup: { ...DEFAULT_CONFIG, slope: 2 } },
    {
        type: 'make',
        title: 'Make a landslide',
        text: 'Change the land and the shaking until part of the hill slides down.',
        hint: 'Make the slope steep and the shaking strong.',
        start: DEFAULT_CONFIG,
        met: (run) => run.result.landslide,
        success: 'Landslide! Soil and rocks slid down the slope and piled up at the bottom.',
    },
    { type: 'question', item: 1, mode: 'check', hint: 'Think about what you had to change before the hill gave way.' },
    { type: 'question', item: 2, mode: 'predict', setup: { ...SOAKED_SAND, strong: false } },
    {
        type: 'make',
        title: 'Make liquefaction',
        text: 'Change the ground until the flat land turns soft and the buildings sink.',
        hint: 'You need loose soil, soaked ground and strong shaking, all three.',
        start: { ...DEFAULT_CONFIG, slope: 0 },
        met: (run) => run.result.liquefaction,
        success: 'Liquefaction! The wet, loose ground acted like a liquid. Buildings sank and tilted, and sand and water came up.',
    },
    { type: 'question', item: 3, mode: 'check', hint: 'Look at the three settings you had switched on when it happened.' },
    {
        type: 'challenge',
        item: 4,
        hint: 'Liquefaction needs three things. Take away the loose soil or the water.',
        start: SOAKED_SAND,
        solved: (run) => run.config.strong && !run.result.liquefaction,
    },
    { type: 'question', item: 5, mode: 'predict', setup: { ...DEFAULT_CONFIG, slope: 0 } },
    {
        type: 'make',
        title: 'Make the ground break',
        text: 'There is a fault under the land. Make its movement reach the surface.',
        hint: 'Switch the fault to "Breaks the surface".',
        start: { ...DEFAULT_CONFIG, slope: 0 },
        met: (run) => run.result.rupture,
        success: 'Ground rupture! The land is cut and shifted along the fault. Look at the road.',
    },
    { type: 'question', item: 6, mode: 'check', hint: 'You could shake the land many times with no break. What did you have to switch on?' },
    {
        type: 'challenge',
        item: 7,
        hint: 'Avoid a steep slope. Avoid loose, soaked ground. Keep the fault from breaking the surface.',
        start: { slope: 2, loose: true, wet: true, strong: true, surfaceFault: true },
        solved: (run) => run.config.strong && !run.result.landslide && !run.result.liquefaction && !run.result.rupture,
    },
    { type: 'summary' },
];

const TAKEAWAYS = [
    'Landslide: strong shaking on a steep slope.',
    'Liquefaction: loose soil, lots of water and strong shaking together.',
    'Ground rupture: only when the fault movement reaches the surface.',
    'The same earthquake can do different things in different places.',
];

function describe(result: GroundResult): string[] {
    const lines: string[] = [];
    if (result.landslide) {
        lines.push('Landslide');
    }
    if (result.liquefaction) {
        lines.push('Liquefaction');
    }
    if (result.rupture) {
        lines.push('Ground rupture');
    }

    return lines.length > 0 ? lines : ['Only shaking. The land stayed in place.'];
}

function Choice<T extends string | number | boolean>({
    label,
    value,
    options,
    disabled,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    disabled: boolean;
    onChange: (value: T) => void;
}) {
    return (
        <div>
            <p className="mb-1 text-xs font-bold text-muted-foreground">{label}</p>
            <div className="flex gap-1 rounded-2xl bg-muted p-1" role="group" aria-label={label}>
                {options.map((option) => (
                    <button
                        key={String(option.value)}
                        type="button"
                        disabled={disabled}
                        aria-pressed={option.value === value}
                        onClick={() => onChange(option.value)}
                        className={`min-h-9 flex-1 rounded-xl px-2 py-1.5 text-xs font-bold transition disabled:opacity-60 ${option.value === value ? 'bg-violet-600 text-white shadow-[0_2px_0_0_var(--color-violet-800)]' : 'text-gray-600 hover:bg-card dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function GroundTest({ items, onFinish }: GroundTestProps) {
    const [stepIndex, setStepIndex] = useState(0);
    const [config, setConfig] = useState<GroundConfig>({ ...DEFAULT_CONFIG, slope: 2 });
    const [running, setRunning] = useState(false);
    const [runs, setRuns] = useState<Run[]>([]);
    const { answers, record } = useCheckpoints();
    const pending = useRef<GroundConfig | null>(null);

    const { mount, scene, unsupported } = useSimScene((container) => {
        const created = new GroundTestScene(container, {
            onDone: (result) => {
                const used = pending.current;
                pending.current = null;
                setRunning(false);
                if (used) {
                    setRuns((previous) => [...previous, { config: used, result }]);
                }
            },
        });
        created.setConfig({ ...DEFAULT_CONFIG, slope: 2 });

        return created;
    });

    const step = STEPS[stepIndex];
    const last = runs[runs.length - 1];

    const change = (next: GroundConfig) => {
        setConfig(next);
        scene.current?.setConfig(next);
    };

    const shake = () => {
        if (running) {
            return;
        }
        sfxQuake();
        pending.current = config;
        setRunning(true);
        scene.current?.shake();
    };

    const goTo = (index: number) => {
        const next = STEPS[index];
        setRuns([]);
        if (next.type === 'question' && next.setup) {
            change(next.setup);
        } else if (next.type === 'make' || next.type === 'challenge') {
            change(next.start);
        }
        setStepIndex(index);
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
            record(step.item, solved ? SOLVED : NOT_SOLVED);
        }
    }, [runs, step, answers, record]);

    const controls = (
        <div className="flex flex-col gap-2.5">
            <Choice
                label="Slope"
                value={config.slope}
                disabled={running}
                options={[
                    { value: 0, label: 'Flat' },
                    { value: 1, label: 'Hill' },
                    { value: 2, label: 'Steep' },
                ]}
                onChange={(slope) => change({ ...config, slope })}
            />
            <Choice
                label="Ground"
                value={config.loose}
                disabled={running}
                options={[
                    { value: false, label: 'Solid rock' },
                    { value: true, label: 'Loose soil' },
                ]}
                onChange={(loose) => change({ ...config, loose })}
            />
            <Choice
                label="Water in the ground"
                value={config.wet}
                disabled={running}
                options={[
                    { value: false, label: 'Dry' },
                    { value: true, label: 'Soaked' },
                ]}
                onChange={(wet) => change({ ...config, wet })}
            />
            <Choice
                label="Shaking"
                value={config.strong}
                disabled={running}
                options={[
                    { value: false, label: 'Weak' },
                    { value: true, label: 'Strong' },
                ]}
                onChange={(strong) => change({ ...config, strong })}
            />
            <Choice
                label="Fault movement"
                value={config.surfaceFault}
                disabled={running}
                options={[
                    { value: false, label: 'Stays underground' },
                    { value: true, label: 'Breaks the surface' },
                ]}
                onChange={(surfaceFault) => change({ ...config, surfaceFault })}
            />
            <button
                type="button"
                disabled={running}
                onClick={shake}
                className="mt-1 pressable flex h-14 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-500 to-orange-600 text-base font-extrabold text-white [--press:var(--color-orange-800)] hover:brightness-105 disabled:opacity-60"
            >
                <Zap className="h-5 w-5" />
                {running ? 'Shaking…' : 'Shake the land'}
            </button>
        </div>
    );

    const outcome = last && !running && (
        <p className="rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
            Result: {describe(last.result).join(' + ')}
        </p>
    );

    const hintBox = (hint: string) => (
        <p className="flex animate-pop-in items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-sm font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            {hint}
        </p>
    );

    const continueButton = (
        <Button onClick={() => goTo(stepIndex + 1)} className="h-12 w-full text-base">
            Continue <ArrowRight className="h-4 w-4" />
        </Button>
    );

    const renderPanel = () => {
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

            case 'make': {
                const done = runs.some(step.met);

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Experiment" title={step.title} text={done ? step.success : step.text} />
                        {!done && controls}
                        {!done && outcome}
                        {!done && runs.length > 0 && !running && hintBox(step.hint)}
                        {done && !running && continueButton}
                    </div>
                );
            }

            case 'challenge': {
                const solved = runs.some(step.solved);
                const scored = step.item in answers;
                const triesLeft = Math.max(0, CHALLENGE_TRIES - runs.length);

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading
                            eyebrow="Challenge"
                            title={items[step.item].prompt.replace(/^Challenge:\s*/, '')}
                            text={solved ? 'You did it.' : scored ? 'No points now, but keep trying.' : `${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left for points.`}
                        />
                        {!solved && controls}
                        {outcome}
                        {!solved && runs.length > 0 && !running && hintBox(step.hint)}
                        {solved && !running && continueButton}
                    </div>
                );
            }

            case 'summary':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Land tested" title="What you found out" />
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

    return (
        <SimulationShell
            mount={mount}
            stepLabel={`Step ${Math.min(stepIndex + 1, STEPS.length - 1)} of ${STEPS.length - 1}`}
            checkpoint={Object.keys(answers).length + 1}
            total={items.length}
            unsupported={unsupported}
            name="Ground Test"
        >
            {renderPanel()}
        </SimulationShell>
    );
}
