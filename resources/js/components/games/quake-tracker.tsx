import { QuestionCard, type GameItem } from '@/components/games/question-card';
import { SimulationShell, StepHeading, useCheckpoints, useSimScene } from '@/components/games/simulation-shell';
import { Button } from '@/components/ui/button';
import { sfxCorrect, sfxPop } from '@/lib/game-audio';
import { CASES, QuakeTrackerScene, type LayerId, type StructureId } from '@/lib/quake-tracker-scene';
import { ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { useState } from 'react';

interface QuakeTrackerProps {
    /** Checkpoints in the fixed order defined by App\Support\QuakeTracker. */
    items: GameItem[];
    onFinish: (answers: Record<number, string>) => void;
}

type Step =
    | { type: 'layers' }
    | { type: 'case'; index: number }
    | { type: 'aftershocks' }
    | { type: 'question'; item: number; hint: string }
    | { type: 'summary' };

const STRUCTURE_IDS: Record<string, StructureId> = {
    'Philippine Fault Zone': 'pfz',
    'Philippine Trench': 'philippine_trench',
    'Manila Trench': 'manila_trench',
    'Cotabato Trench': 'cotabato_trench',
    'North Bohol Fault': 'north_bohol',
    'Bogo Bay Fault': 'bogo_bay',
    'Central Mindanao Fault': 'central_mindanao',
};

const LAYERS: { id: LayerId; label: string; swatch: string }[] = [
    { id: 'pfz', label: 'Philippine Fault Zone', swatch: 'bg-[#ff8a00]' },
    { id: 'faults', label: 'Other active faults', swatch: 'bg-[#d026e6]' },
    { id: 'trenches', label: 'Trenches', swatch: 'bg-[#ff2d2d]' },
];

/** Evidence shown for each case, taken from the lesson. */
const EVIDENCE: { facts: string[]; hint: string }[] = [
    {
        facts: ['16 July 1990 · Magnitude 7.8', 'The ground broke for about 125 km, from Dingalan, Aurora to Kayapa, Nueva Vizcaya.', 'The two sides slid sideways (strike-slip).'],
        hint: 'A 125 km break on land with sideways movement needs a long strike-slip fault that passes through this spot.',
    },
    {
        facts: ['2013 · Magnitude 7.2', 'The ground was pushed up by about 2 meters.', 'Movement type: reverse fault.'],
        hint: 'Look for the fault that is on Bohol itself. The Philippine Fault Zone does not pass through Bohol.',
    },
    {
        facts: ['6 July 2017 · Magnitude 6.5', 'On the island of Leyte.', 'Very shallow: about 2 km deep.', '297 aftershocks by the next afternoon.'],
        hint: 'It was on land and very shallow. Which long fault runs through Leyte?',
    },
    {
        facts: ['30 September 2025 · Magnitude 6.9', 'Northern Cebu.', 'Sideways movement on a fault that had not been mapped before.'],
        hint: 'Scientists found a new fault here. Which fault sits in northern Cebu?',
    },
    {
        facts: ['8 June 2026 · Magnitude 7.8', 'Under the sea, about 32 km west of Maasim, Sarangani.', 'About 33 km deep.', 'Caused by one plate sliding under another (subduction).'],
        hint: 'Subduction happens at a trench. Which trench is next to southern Mindanao?',
    },
];

const STEPS: Step[] = [
    { type: 'layers' },
    { type: 'case', index: 0 },
    { type: 'case', index: 1 },
    { type: 'case', index: 2 },
    { type: 'case', index: 3 },
    { type: 'case', index: 4 },
    { type: 'aftershocks' },
    { type: 'question', item: 6, hint: 'The mainshock is named for its size, not for when it happened.' },
    { type: 'question', item: 7, hint: 'Look at your map. Count how many different faults and trenches you pinned.' },
    { type: 'question', item: 8, hint: 'In the Bohol and Cebu cases, a different fault was the real source.' },
    { type: 'summary' },
];

const AFTERSHOCK_ITEM = 5;
const LAST_CASE = CASES.length - 1;

const TAKEAWAYS = [
    'The Philippines has many faults and trenches, from Luzon to Mindanao.',
    'Not every earthquake comes from the Philippine Fault Zone.',
    'Scientists use location, depth and how the ground moved to find the source.',
    'After a big earthquake, smaller aftershocks can follow for days or longer.',
];

export default function QuakeTracker({ items, onFinish }: QuakeTrackerProps) {
    const [stepIndex, setStepIndex] = useState(0);
    const [layers, setLayers] = useState<Record<LayerId, boolean>>({ faults: false, pfz: false, trenches: false });
    const [playing, setPlaying] = useState(false);
    const [played, setPlayed] = useState(false);
    const { answers, record } = useCheckpoints();
    const { mount, scene, unsupported } = useSimScene((container) => new QuakeTrackerScene(container));

    const step = STEPS[stepIndex];

    const goTo = (index: number) => {
        const next = STEPS[index];
        scene.current?.highlight(null);
        scene.current?.showCase(next.type === 'case' ? next.index : next.type === 'aftershocks' ? LAST_CASE : null);

        // Keep the map quiet: during a case, draw only the three possible sources.
        if (next.type === 'case') {
            const options = [items[next.index].answer, ...items[next.index].distractors];
            scene.current?.setCandidates(options.map((option) => STRUCTURE_IDS[option]).filter(Boolean));
            scene.current?.showPinLabels(false);
        } else if (next.type === 'aftershocks') {
            scene.current?.setCandidates(['cotabato_trench']);
            scene.current?.showPinLabels(false);
        } else {
            scene.current?.setCandidates(null);
            scene.current?.showPinLabels(true);
        }
        // Fault names stay off during the closing questions, which are about the earthquakes.
        scene.current?.showLabels(next.type !== 'question' && next.type !== 'summary');
        setStepIndex(index);
    };

    const toggleLayer = (id: LayerId) => {
        sfxPop();
        const next = { ...layers, [id]: !layers[id] };
        setLayers(next);
        scene.current?.setLayers(next);
    };

    const playAftershocks = () => {
        setPlaying(true);
        scene.current?.playAftershocks(LAST_CASE, () => {
            setPlaying(false);
            setPlayed(true);
        });
    };

    const continueButton = (onClick: () => void) => (
        <Button onClick={onClick} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
            Continue <ArrowRight className="h-4 w-4" />
        </Button>
    );

    const renderPanel = () => {
        switch (step.type) {
            case 'layers': {
                const allOn = LAYERS.every((layer) => layers[layer.id]);

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading
                            eyebrow="Get ready"
                            title="Turn on the map layers"
                            text="Earthquakes come from faults and trenches. Switch on each layer to see where they are."
                        />
                        <div className="flex flex-col gap-2">
                            {LAYERS.map((layer) => (
                                <button
                                    key={layer.id}
                                    type="button"
                                    aria-pressed={layers[layer.id]}
                                    onClick={() => toggleLayer(layer.id)}
                                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-bold transition ${layers[layer.id] ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'}`}
                                >
                                    <span className={`h-3 w-3 shrink-0 rounded-full ${layer.swatch}`} />
                                    <span className="flex-1">{layer.label}</span>
                                    {layers[layer.id] && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                </button>
                            ))}
                        </div>
                        {allOn && continueButton(() => goTo(stepIndex + 1))}
                    </div>
                );
            }

            case 'case': {
                const quake = CASES[step.index];
                const evidence = EVIDENCE[step.index];

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow={`Case ${step.index + 1} of ${CASES.length}`} title={`${quake.name} earthquake`} text="The yellow ring is the epicenter. The three labelled lines are the possible sources." />
                        <ul className="flex flex-col gap-1.5 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                            {evidence.facts.map((fact) => (
                                <li key={fact}>• {fact}</li>
                            ))}
                        </ul>
                        <QuestionCard
                            key={`case-${step.index}`}
                            item={items[step.index]}
                            mode="check"
                            hint={evidence.hint}
                            onPick={(option) => scene.current?.highlight(STRUCTURE_IDS[option] ?? null, option === items[step.index].answer)}
                            onDone={(firstPick) => {
                                record(step.index, firstPick);
                                sfxCorrect();
                                scene.current?.pinCase(step.index);
                                goTo(stepIndex + 1);
                            }}
                        />
                    </div>
                );
            }

            case 'aftershocks':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading
                            eyebrow="What happened next"
                            title="After the Sarangani earthquake"
                            text="PHIVOLCS recorded 138 more earthquakes within hours, from magnitude 1.3 to 6.7. Play them on the map."
                        />
                        <button
                            type="button"
                            disabled={playing}
                            onClick={playAftershocks}
                            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
                        >
                            <Play className="h-5 w-5" />
                            {playing ? 'Playing…' : played ? 'Play again' : 'Play what happened next'}
                        </button>
                        {played && (
                            <QuestionCard
                                key="aftershocks"
                                item={items[AFTERSHOCK_ITEM]}
                                mode="check"
                                hint="They came after the big one, in the same area."
                                onDone={(firstPick) => {
                                    record(AFTERSHOCK_ITEM, firstPick);
                                    goTo(stepIndex + 1);
                                }}
                            />
                        )}
                    </div>
                );

            case 'question':
                return (
                    <QuestionCard
                        key={`question-${step.item}`}
                        item={items[step.item]}
                        mode="check"
                        hint={step.hint}
                        onDone={(firstPick) => {
                            record(step.item, firstPick);
                            goTo(stepIndex + 1);
                        }}
                    />
                );

            case 'summary':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Map complete" title="What you found out" />
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
            name="Quake Tracker"
            viewHint="Drag to move · scroll or pinch to zoom"
            overlay={
                <ul className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 rounded-xl bg-slate-900/70 px-3 py-2 text-[11px] font-semibold text-white">
                    {LAYERS.map((layer) => (
                        <li key={layer.id} className="flex items-center gap-2">
                            <span className={`h-1.5 w-5 shrink-0 rounded-full ${layer.swatch}`} />
                            {layer.label}
                        </li>
                    ))}
                    <li className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-yellow-300" />
                        Epicenter
                    </li>
                </ul>
            }
        >
            {renderPanel()}
        </SimulationShell>
    );
}
