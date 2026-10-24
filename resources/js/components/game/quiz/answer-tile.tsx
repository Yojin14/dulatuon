import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';
import { type ComponentProps } from 'react';

export type AnswerTileState = 'idle' | 'selected' | 'correct' | 'wrong';

const states: Record<AnswerTileState, string> = {
    idle: 'border-slate-200 bg-white text-slate-800 hover:border-violet-400 hover:bg-violet-50/50 dark:border-white/10 dark:bg-card dark:text-foreground dark:hover:border-violet-400/60 dark:hover:bg-violet-500/10',
    selected:
        'border-violet-500 bg-violet-50 text-violet-900 dark:border-violet-400 dark:bg-violet-500/15 dark:text-violet-100',
    correct:
        'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-100',
    wrong: 'border-red-300 bg-red-50 text-red-900 dark:border-red-400/60 dark:bg-red-500/10 dark:text-red-200',
};

/**
 * One answer option, styled like the answer list in the 3D simulation panels:
 * a clean outlined row. Shared by checkpoints, in-game quizzes and course quizzes.
 */
export function AnswerTile({
    label,
    index,
    state = 'idle',
    className,
    ...props
}: ComponentProps<'button'> & {
    label: string;
    index?: number;
    state?: AnswerTileState;
}) {
    return (
        <button
            type="button"
            aria-pressed={state === 'selected' || state === 'correct'}
            aria-label={
                index !== undefined
                    ? `Option ${String.fromCharCode(65 + index)}: ${label}`
                    : undefined
            }
            className={cn(
                'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-[15px] font-semibold transition-colors duration-150 disabled:cursor-default',
                states[state],
                className,
            )}
            {...props}
        >
            <span className="min-w-0 flex-1">{label}</span>
            {state === 'correct' && (
                <CheckCircle2
                    className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                />
            )}
            {state === 'wrong' && (
                <XCircle className="size-5 shrink-0 text-red-500" aria-hidden />
            )}
        </button>
    );
}
