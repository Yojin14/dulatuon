import { QuestionCard, type GameItem } from '@/components/games/question-card';
import { SimulationShell, StepHeading, useCheckpoints, useSimScene } from '@/components/games/simulation-shell';
import { Button } from '@/components/ui/button';
import { sfxCorrect, sfxQuake, sfxWrong } from '@/lib/game-audio';
import { QuakeReadyScene, type TargetId } from '@/lib/quake-ready-scene';
import { ArrowRight, CheckCircle2, Circle, Hand, Lightbulb, Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface QuakeReadyProps {
    /** Checkpoints in the fixed order defined by App\Support\QuakeReady. */
    items: GameItem[];
    onFinish: (answers: Record<number, string>) => void;
}

type Findable = Exclude<TargetId, 'student'>;

type Step =
    | { type: 'prepare' }
    | { type: 'first-move' }
    | { type: 'act' }
    | { type: 'calm' }
    | { type: 'question'; item: number; eyebrow: string; hint: string; aftershock?: boolean }
    | { type: 'summary' };

const SOLVED = 'Solved';
const NOT_SOLVED = 'Not solved';
const PREPARE_SECONDS = 60;
const HOLD_SECONDS = 3.5;

const DANGERS: { id: Findable; label: string }[] = [
    { id: 'shelf', label: 'Bookshelf that could fall' },
    { id: 'box', label: 'Heavy box up high' },
    { id: 'exit', label: 'Blocked exit' },
    { id: 'window', label: 'Glass window' },
];

const SAFETY: { id: Findable; label: string }[] = [
    { id: 'kit', label: 'Emergency kit' },
    { id: 'desk', label: 'Sturdy desk to hide under' },
    { id: 'door', label: 'Way out' },
];

const STEPS: Step[] = [
    { type: 'prepare' },
    { type: 'first-move' },
    { type: 'act' },
    { type: 'calm' },
    { type: 'question', item: 4, eyebrow: 'After the earthquake', hint: 'People come first. Help if it is safe, and get an adult.' },
    { type: 'question', item: 5, eyebrow: 'After the earthquake', hint: 'A live wire can kill. Keep away and tell someone in charge.' },
    { type: 'question', item: 6, eyebrow: 'After the earthquake', hint: 'A damaged building can fall in an aftershock.' },
    { type: 'question', item: 7, eyebrow: 'After the earthquake', hint: 'No one can predict the exact time of an earthquake. Trust official sources.' },
    { type: 'question', item: 8, eyebrow: 'It is shaking again', hint: 'Smaller earthquakes often follow a big one. Protect yourself the same way.', aftershock: true },
    { type: 'question', item: 9, eyebrow: 'Where you are matters', hint: 'Shaking can loosen soil and rocks on a steep slope.' },
    { type: 'question', item: 10, eyebrow: 'Where you are matters', hint: 'Loose, soaked ground can act like a liquid when shaken.' },
    { type: 'question', item: 11, eyebrow: 'Where you are matters', hint: 'A strong, long earthquake near the coast can cause a tsunami.' },
    { type: 'summary' },
];

const TAKEAWAYS = [
    'Before: fix dangers, know the safe spots and the way out.',
    'During: drop, cover and hold on. Do not run while it shakes.',
    'After: check for injuries, stay away from damage, expect aftershocks.',
    'Follow PHIVOLCS and official advice. Do not spread rumors.',
];

export default function QuakeReady({ items, onFinish }: QuakeReadyProps) {
    const [stepIndex, setStepIndex] = useState(0);
    const [found, setFound] = useState<Findable[]>([]);
    const [seconds, setSeconds] = useState(PREPARE_SECONDS);
    const [stage, setStage] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [holding, setHolding] = useState(false);
    const [held, setHeld] = useState(0);
    const { answers, record } = useCheckpoints();

    const pick = useRef<(id: TargetId) => void>(() => undefined);
    const { mount, scene, unsupported } = useSimScene((container) => new QuakeReadyScene(container, { onPick: (id) => pick.current(id) }));

    const step = STEPS[stepIndex];

    const goTo = (index: number) => {
        const next = STEPS[index];
        setMessage(null);
        if (next.type === 'first-move') {
            sfxQuake();
            scene.current?.startShaking();
        } else if (next.type === 'question' && next.aftershock) {
            sfxQuake();
            scene.current?.startShaking(2.6);
        }
        setStepIndex(index);
    };

    const finishPreparing = () => {
        record(0, DANGERS.every((danger) => found.includes(danger.id)) ? SOLVED : NOT_SOLVED);
        record(1, SAFETY.every((item) => found.includes(item.id)) ? SOLVED : NOT_SOLVED);
        goTo(1);
    };

    const handlePick = (id: TargetId) => {
        if (step.type === 'prepare') {
            if (id === 'student' || found.includes(id)) {
                return;
            }
            sfxCorrect();
            scene.current?.setFound(id);
            setFound((previous) => [...previous, id]);

            return;
        }

        if (step.type !== 'act' || stage >= 2) {
            return;
        }
        if (stage === 0 && id === 'student') {
            sfxCorrect();
            scene.current?.studentDrop();
            setStage(1);
            setMessage(null);
        } else if (stage === 1 && id === 'desk') {
            sfxCorrect();
            scene.current?.studentCover();
            setStage(2);
            setMessage(null);
        } else {
            sfxWrong();
            setMistakes((count) => count + 1);
            setMessage(
                id === 'door' || id === 'exit'
                    ? 'Do not run while the room is shaking. You could fall or be hit.'
                    : id === 'window'
                      ? 'Stay away from the glass. It can break.'
                      : stage === 0
                        ? 'Drop first. Tap yourself to get down low.'
                        : 'Now take cover. Tap a sturdy desk.',
            );
        }
    };

    // The scene calls back through a ref so it always sees the latest step and state.
    useEffect(() => {
        pick.current = handlePick;
    });

    // Preparation countdown.
    useEffect(() => {
        if (step.type !== 'prepare' || seconds <= 0) {
            return;
        }
        const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000);

        return () => window.clearTimeout(id);
    }, [step.type, seconds]);

    // Holding on fills a bar; letting go empties it.
    useEffect(() => {
        if (step.type !== 'act' || stage !== 2) {
            return;
        }
        const id = window.setInterval(() => {
            setHeld((value) => Math.max(0, Math.min(1, value + (holding ? 0.1 : -0.15) / HOLD_SECONDS)));
        }, 100);

        return () => window.clearInterval(id);
    }, [step.type, stage, holding]);

    const holdDone = held >= 1;
    const allFound = found.length === DANGERS.length + SAFETY.length;
    const timeUp = seconds <= 0;

    const checklist = (title: string, entries: { id: Findable; label: string }[]) => (
        <div>
            <p className="mb-1 text-xs font-bold text-gray-600 dark:text-gray-300">
                {title} · {entries.filter((entry) => found.includes(entry.id)).length} of {entries.length}
            </p>
            <ul className="flex flex-col gap-1">
                {entries.map((entry) => {
                    const done = found.includes(entry.id);

                    return (
                        <li key={entry.id} className={`flex items-center gap-2 text-sm font-medium ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {done ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                            {done || timeUp ? entry.label : '?'}
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    const continueButton = (label: string, onClick: () => void) => (
        <Button onClick={onClick} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
            {label} <ArrowRight className="h-4 w-4" />
        </Button>
    );

    const renderPanel = () => {
        switch (step.type) {
            case 'prepare':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading
                            eyebrow="Before the earthquake"
                            title="Get the classroom ready"
                            text="Tap things in the room. Fix 4 dangers and find 3 things that keep you safe."
                        />
                        <p className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-bold tabular-nums ${seconds <= 10 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>
                            <Timer className="h-4 w-4" />
                            {timeUp ? 'Time is up' : `${seconds} s left`}
                        </p>
                        {checklist('Dangers fixed', DANGERS)}
                        {checklist('Safety things found', SAFETY)}
                        {(allFound || timeUp) && continueButton('I am ready', finishPreparing)}
                    </div>
                );

            case 'first-move':
                return (
                    <QuestionCard
                        key="first-move"
                        item={items[2]}
                        mode="check"
                        hint="Protect yourself first. Running while the ground shakes is how people get hurt."
                        onDone={(firstPick) => {
                            record(2, firstPick);
                            goTo(stepIndex + 1);
                        }}
                    />
                );

            case 'act': {
                const actions = ['DROP: tap yourself to get down low', 'COVER: tap a sturdy desk to hide under it', 'HOLD ON: hold the button until it is full'];

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Earthquake!" title="Drop, cover and hold on" text="Do the three moves in the room." />
                        <ol className="flex flex-col gap-1.5">
                            {actions.map((action, index) => (
                                <li
                                    key={action}
                                    className={`flex items-center gap-2 text-sm font-semibold ${index < stage || (index === 2 && holdDone) ? 'text-emerald-600 dark:text-emerald-400' : index === stage ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
                                >
                                    {index < stage || (index === 2 && holdDone) ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                                    {action}
                                </li>
                            ))}
                        </ol>

                        {message && (
                            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                                {message}
                            </p>
                        )}

                        {stage === 2 && !holdDone && (
                            <>
                                <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="meter" aria-label="Holding on" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(held * 100)}>
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${held * 100}%` }} />
                                </div>
                                <button
                                    type="button"
                                    onPointerDown={(event) => {
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                        setHolding(true);
                                    }}
                                    onPointerUp={() => setHolding(false)}
                                    onPointerCancel={() => setHolding(false)}
                                    onLostPointerCapture={() => setHolding(false)}
                                    onKeyDown={(event) => {
                                        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                                            event.preventDefault();
                                            setHolding(true);
                                        }
                                    }}
                                    onKeyUp={() => setHolding(false)}
                                    onBlur={() => setHolding(false)}
                                    onContextMenu={(event) => event.preventDefault()}
                                    className="flex h-14 touch-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-base font-extrabold text-white shadow-lg transition select-none active:scale-[0.98]"
                                >
                                    <Hand className="h-5 w-5" />
                                    Hold on
                                </button>
                            </>
                        )}

                        {holdDone &&
                            continueButton('The shaking stopped', () => {
                                record(3, mistakes === 0 ? SOLVED : NOT_SOLVED);
                                scene.current?.stopShaking();
                                goTo(stepIndex + 1);
                            })}
                    </div>
                );
            }

            case 'calm': {
                const notes = [
                    found.includes('shelf') ? 'The bookshelf stayed up because you strapped it.' : 'The bookshelf fell over.',
                    found.includes('box') ? 'The heavy box was already down low.' : 'The heavy box crashed to the floor.',
                    found.includes('exit') ? 'The exit is clear.' : 'The exit is still blocked. That costs time.',
                    'The window broke. Glass is on the floor.',
                ];

                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="The shaking stopped" title="Look at the room" text="You were safe under the desk. But it is not over yet." />
                        <ul className="flex flex-col gap-1.5 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                            {notes.map((note) => (
                                <li key={note}>• {note}</li>
                            ))}
                        </ul>
                        {continueButton('Check the room', () => {
                            scene.current?.studentStand();
                            scene.current?.showAftermath();
                            goTo(stepIndex + 1);
                        })}
                    </div>
                );
            }

            case 'question':
                return (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-bold tracking-wider text-violet-600 uppercase dark:text-violet-300">{step.eyebrow}</p>
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
                    </div>
                );

            case 'summary':
                return (
                    <div className="flex flex-col gap-4">
                        <StepHeading eyebrow="Quake ready" title="What to remember" />
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
            name="Quake Ready"
        >
            {renderPanel()}
        </SimulationShell>
    );
}
