import { AnswerTile, type AnswerTileState } from '@/components/game/quiz/answer-tile';
import { Button } from '@/components/ui/button';
import { sfxClick, sfxCorrect, sfxWrong } from '@/lib/game-audio';
import { ArrowRight, Lightbulb } from 'lucide-react';
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
        <div className="flex flex-col gap-5">
            <h2 className="font-display text-xl leading-snug font-bold tracking-[-0.02em] text-foreground">{item.prompt}</h2>
            <div className="flex flex-col gap-2.5">
                {options.map((option, index) => {
                    const isWrong = wrong.includes(option);
                    const isSelected = selected === option;
                    let state: AnswerTileState = 'idle';
                    if (solved && isSelected) {
                        state = 'correct';
                    } else if (isWrong) {
                        state = 'wrong';
                    } else if (mode === 'predict' && isSelected) {
                        state = 'selected';
                    }

                    return <AnswerTile key={option} label={option} index={index} state={state} disabled={isWrong || solved} onClick={() => pick(option)} />;
                })}
            </div>

            {mode === 'check' && wrong.length > 0 && !solved && hint && (
                <p className="flex animate-pop-in items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-sm font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <Lightbulb className="mt-0.5 size-4 shrink-0" />
                    {hint}
                </p>
            )}

            {mode === 'predict' ? (
                <Button size="lg" disabled={selected === null} onClick={() => selected !== null && onDone(selected)} className="w-full">
                    Lock in my prediction
                </Button>
            ) : (
                solved && (
                    <Button size="lg" onClick={() => firstPick !== null && onDone(firstPick)} className="w-full animate-pop-in">
                        Continue <ArrowRight />
                    </Button>
                )
            )}
        </div>
    );
}
