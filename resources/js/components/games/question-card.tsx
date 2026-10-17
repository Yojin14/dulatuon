import { Button } from '@/components/ui/button';
import { sfxClick, sfxCorrect, sfxWrong } from '@/lib/game-audio';
import { ArrowRight, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface GameItem {
    prompt: string;
    answer: string;
    distractors: string[];
}

function shuffled<T>(values: T[]): T[] {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

/**
 * A checkpoint in a simulation game. In `check` mode a wrong pick shows a hint
 * and lets the student retry; in `predict` mode the pick is locked in without
 * feedback, so the simulation itself reveals the answer. Either way only the
 * first pick is reported.
 */
export function QuestionCard({
    item,
    mode,
    hint,
    onPick,
    onDone,
}: {
    item: GameItem;
    mode: 'check' | 'predict';
    hint?: string;
    /** Called on every pick, e.g. to highlight the chosen thing in the 3D scene. */
    onPick?: (option: string) => void;
    onDone: (firstPick: string) => void;
}) {
    const options = useMemo(() => {
        const all = [item.answer, ...item.distractors];

        return all.every((option) => option.length === 1) ? [...all].sort() : shuffled(all);
    }, [item]);
    const [firstPick, setFirstPick] = useState<string | null>(null);
    const [wrong, setWrong] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);

    const solved = mode === 'check' && selected === item.answer;

    const pick = (option: string) => {
        if (solved) {
            return;
        }
        if (firstPick === null) {
            setFirstPick(option);
        }
        setSelected(option);
        onPick?.(option);
        if (mode === 'predict') {
            sfxClick();

            return;
        }
        if (option === item.answer) {
            sfxCorrect();
        } else {
            sfxWrong();
            setWrong((previous) => [...previous, option]);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{item.prompt}</h2>
            <div className="flex flex-col gap-2">
                {options.map((option) => {
                    const isWrong = wrong.includes(option);
                    const isSelected = selected === option;
                    let tone = 'border-gray-200 bg-gray-50 hover:border-violet-400 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700';
                    if (solved && isSelected) {
                        tone = 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40';
                    } else if (isWrong) {
                        tone = 'border-red-300 bg-red-50 opacity-70 dark:border-red-500/60 dark:bg-red-950/40';
                    } else if (mode === 'predict' && isSelected) {
                        tone = 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-950/40';
                    }

                    return (
                        <button
                            key={option}
                            type="button"
                            disabled={isWrong || solved}
                            onClick={() => pick(option)}
                            className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold text-gray-800 transition dark:text-gray-100 ${tone}`}
                        >
                            {option}
                            {solved && isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                            {isWrong && <XCircle className="h-5 w-5 shrink-0 text-red-400" />}
                        </button>
                    );
                })}
            </div>

            {mode === 'check' && wrong.length > 0 && !solved && hint && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    {hint}
                </p>
            )}

            {mode === 'predict' ? (
                <Button
                    disabled={selected === null}
                    onClick={() => selected !== null && onDone(selected)}
                    className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700"
                >
                    Lock in my prediction
                </Button>
            ) : (
                solved && (
                    <Button onClick={() => firstPick !== null && onDone(firstPick)} className="h-11 bg-violet-600 font-bold text-white hover:bg-violet-700">
                        Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                )
            )}
        </div>
    );
}
