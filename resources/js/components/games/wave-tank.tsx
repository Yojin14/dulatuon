import { QuestionCard, type GameItem } from '@/components/games/question-card';
import { SimulationShell, StepHeading, useCheckpoints, useSimScene } from '@/components/games/simulation-shell';
import { Button } from '@/components/ui/button';
import { sfxPop } from '@/lib/game-audio';
import { WaveTankScene, type WaveResult, type WaveRun } from '@/lib/wave-tank-scene';
import { ArrowRight, CheckCircle2, Circle, Waves } from 'lucide-react';
import { useRef, useState } from 'react';

interface WaveTankProps {
    /** Checkpoints in the fixed order defined by App\Support\WaveTank. */
    items: GameItem[];
    onFinish: (answers: Record<number, string>) => void;
}

interface Finished {
    run: WaveRun;
    result: WaveResult;
}

type Step =
    | { type: 'question'; item: number; mode: 'check' | 'predict'; hint?: string; preview: WaveRun }
    | { type: 'race'; title: string; text: string; button: string; run: WaveRun }
    | { type: 'observe'; title: string; text: string; button: string; run: WaveRun; item: number; hint: string }
    | { type: 'distance'; title: string; text: string }
    | { type: 'summary' };

const RACE: WaveRun = { waves: ['P', 'S'], liquid: false, station: 1 };
const LIQUID_RACE: WaveRun = { waves: ['P', 'S'], liquid: true, station: 1 };

const STEPS: Step[] = [
    { type: 'question', item: 0, mode: 'predict', preview: RACE },
    { type: 'race', title: 'Wave race', text: 'Both waves start at the red source. Watch which one reaches the station first.', button: 'Start the race', run: RACE },
    {
        type: 'observe',
        title: 'Look closely: P wave',
        text: 'Send a P wave and watch how the dots move. You can send it again.',
        button: 'Send a P wave',
        run: { waves: ['P'], liquid: false, station: 1 },
        item: 1,
        hint: 'Pick one dot and watch it. Does it move along the bar, or across it?',
    },
    {
        type: 'observe',
        title: 'Look closely: S wave',
        text: 'Now send an S wave and watch the dots again.',
        button: 'Send an S wave',
        run: { waves: ['S'], liquid: false, station: 1 },
        item: 2,
        hint: 'Pick one dot and watch it. Does it move along the bar, or across it?',
    },
    { type: 'question', item: 3, mode: 'predict', preview: LIQUID_RACE },
    { type: 'race', title: 'Liquid test', text: 'The blue part is liquid. Send both waves and see which one gets through.', button: 'Send both waves', run: LIQUID_RACE },
    {
        type: 'observe',
        title: 'Mystery wave C',
        text: 'This wave travels along the surface. Drag the scene to see it from above.',
        button: 'Send wave C',
        run: { waves: ['Love'], labels: ['Wave C'], liquid: false, station: 1 },
        item: 4,
        hint: 'Look from above. The dots move side to side and do not go up or down.',
    },
    {
        type: 'observe',
        title: 'Mystery wave D',
        text: 'Another surface wave. Watch the dots near the top.',
        button: 'Send wave D',
        run: { waves: ['Rayleigh'], labels: ['Wave D'], liquid: false, station: 1 },
        item: 5,
        hint: 'The top dots move in small circles, like a floating ball on the sea.',
    },
    { type: 'question', item: 6, mode: 'predict', preview: RACE },
    { type: 'distance', title: 'Near and far', text: 'Move the station. Run the race once near the source and once far away. Compare the time gap.' },
    { type: 'question', item: 7, mode: 'check', hint: 'The gap grew when the station was farther away.', preview: RACE },
    { type: 'summary' },
];

const TAKEAWAYS = [
    'P waves are the fastest. The dots move back and forth, along the wave.',
    'S waves are slower. The dots move across the wave. S waves cannot pass through liquid.',
    'Love waves shake the surface side to side. Rayleigh waves make it roll.',
    'A bigger P–S time gap means the earthquake is farther away.',
];

function gap(result: WaveResult): string {
    const [p, s] = result.arrivals;
    if (p === null || s === null) {
        return 'no S wave';
    }

    return `${(s - p).toFixed(1)} s`;
}

export default function WaveTank({ items, onFinish }: WaveTankProps) {
    const seismogram = useRef<HTMLCanvasElement>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState<Finished[]>([]);
    const [station, setStation] = useState(1);
    const { answers, record } = useCheckpoints();
    const pending = useRef<WaveRun | null>(null);

    const { mount, scene, unsupported } = useSimScene(
        (container) =>
            new WaveTankScene(container, seismogram.current as HTMLCanvasElement, {
                onDone: (result) => {
                    const run = pending.current;
                    pending.current = null;
                    setRunning(false);
                    if (run) {
                        setFinished((previous) => [...previous, { run, result }]);
                    }
                },
            }),
    );

    const step = STEPS[stepIndex];

    const send = (run: WaveRun) => {
        if (running) {
            return;
        }
        sfxPop();
        pending.current = run;
        setRunning(true);
        scene.current?.send(run);
    };

    const goTo = (index: number) => {
        const next = STEPS[index];
        setFinished([]);
        setStation(1);
        if (next.type === 'question') {
            scene.current?.configure(next.preview);
        } else if (next.type === 'race' || next.type === 'observe') {
            scene.current?.configure(next.run);
        } else if (next.type === 'distance') {
            scene.current?.configure(RACE);
        }
        setStepIndex(index);
    };

    const next = () => goTo(stepIndex + 1);
    const last = finished[finished.length - 1];

    const continueButton = (
        <Button onClick={next} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
            Continue <ArrowRight className="h-4 w-4" />
        </Button>
    );

    const sendButton = (label: string, run: WaveRun) => (
        <button
            type="button"
            disabled={running}
            onClick={() => send(run)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
        >
            <Waves className="h-5 w-5" />
            {running ? 'Wave travelling…' : label}
        </button>
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
                            next();
                        }}
                    />
                );

            case 'race':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Experiment" title={step.title} text={step.text} />
                        {sendButton(step.button, step.run)}
                        {last && !running && (
                            <>
                                <ul className="flex flex-col gap-1 rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                                    {last.run.waves.map((wave, i) => (
                                        <li key={wave}>
                                            {wave} wave: {last.result.arrivals[i] === null ? 'never reached the station' : `reached the station in ${last.result.arrivals[i]?.toFixed(1)} s`}
                                        </li>
                                    ))}
                                </ul>
                                {continueButton}
                            </>
                        )}
                    </div>
                );

            case 'observe':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Observe" title={step.title} text={step.text} />
                        {sendButton(step.button, step.run)}
                        {finished.length > 0 && (
                            <QuestionCard
                                key={`observe-${step.item}`}
                                item={items[step.item]}
                                mode="check"
                                hint={step.hint}
                                onDone={(firstPick) => {
                                    record(step.item, firstPick);
                                    next();
                                }}
                            />
                        )}
                    </div>
                );

            case 'distance': {
                const near = finished.some((entry) => entry.run.station <= 0.3);
                const far = finished.some((entry) => entry.run.station >= 0.7);

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Experiment" title={step.title} text={step.text} />
                        <ul className="flex flex-col gap-1.5">
                            {[
                                { label: 'Run with the station near', met: near },
                                { label: 'Run with the station far', met: far },
                            ].map((goal) => (
                                <li key={goal.label} className={`flex items-center gap-2 text-sm font-medium ${goal.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                    {goal.met ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                                    {goal.label}
                                </li>
                            ))}
                        </ul>
                        <label className="block">
                            <span className="mb-1 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                                <span>Station distance</span>
                                <span>{station <= 0.3 ? 'Near' : station >= 0.7 ? 'Far' : 'Middle'}</span>
                            </span>
                            <input
                                id="wave-tank-station"
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={station}
                                disabled={running}
                                onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setStation(value);
                                    scene.current?.configure({ ...RACE, station: value });
                                }}
                                className="w-full accent-violet-600 disabled:opacity-50"
                            />
                        </label>
                        {sendButton('Start the race', { ...RACE, station })}
                        {finished.length > 0 && (
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-gray-500 dark:text-gray-400">
                                        <th className="py-1 font-semibold">Station</th>
                                        <th className="py-1 font-semibold">P arrives</th>
                                        <th className="py-1 font-semibold">S arrives</th>
                                        <th className="py-1 font-semibold">Gap</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finished.slice(-3).map((entry, index) => (
                                        <tr key={index} className="border-t border-gray-100 font-semibold text-gray-700 tabular-nums dark:border-gray-800 dark:text-gray-200">
                                            <td className="py-1.5">{entry.run.station <= 0.3 ? 'Near' : entry.run.station >= 0.7 ? 'Far' : 'Middle'}</td>
                                            <td className="py-1.5">{entry.result.arrivals[0]?.toFixed(1)} s</td>
                                            <td className="py-1.5">{entry.result.arrivals[1]?.toFixed(1)} s</td>
                                            <td className="py-1.5 text-violet-700 dark:text-violet-300">{gap(entry.result)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {near && far && !running && continueButton}
                    </div>
                );
            }

            case 'summary':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Waves tested" title="What you found out" />
                        <ul className="flex flex-col gap-2">
                            {TAKEAWAYS.map((line) => (
                                <li key={line} className="flex items-start gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                        <Button onClick={() => onFinish(answers)} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
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
            name="Wave Tank"
            overlay={<canvas ref={seismogram} className="pointer-events-none absolute inset-x-3 bottom-12 h-24 w-[calc(100%-1.5rem)] rounded-2xl bg-slate-900/70 max-lg:landscape:h-16" />}
        >
            {renderPanel()}
        </SimulationShell>
    );
}
