import { EmptyState } from '@/components/game/empty-state';
import { StatTile } from '@/components/game/stat-tile';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, RefreshCw, Target, Timer, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Checkpoint {
    index: number;
    prompt: string;
    answered: number;
    correct: number;
    correct_percent: number;
    common_wrong: { answer: string; count: number } | null;
}

interface InsightsData {
    players: number;
    attempts: number;
    average_attempts: number;
    average_score: number;
    cleared: number;
    median_time: number | null;
    checkpoints: Checkpoint[];
}

/** How many of the weakest checkpoints get a "Reteach" tag. */
const RETEACH_COUNT = 3;
const RETEACH_BELOW = 75;

function formatTime(seconds: number | null): string {
    if (seconds === null) {
        return '–';
    }
    const minutes = Math.floor(seconds / 60);

    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function barTone(percent: number): string {
    if (percent < 50) {
        return 'bg-red-500';
    }
    if (percent < 75) {
        return 'bg-amber-500';
    }

    return 'bg-emerald-500';
}

/**
 * Teacher view of one game: how the class did overall and which checkpoints they miss,
 * hardest first, so it is clear what to reteach. Each student's best attempt counts.
 */
export function GameInsights({
    courseId,
    gameId,
}: {
    courseId: number | string;
    gameId: number;
}) {
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/my-course/${courseId}/games/${gameId}/insights`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );
            if (!res.ok) {
                throw new Error('Could not load insights.');
            }
            setData((await res.json()) as InsightsData);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [courseId, gameId]);

    useEffect(() => {
        // Fetching on open; state is set once the response arrives.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (loading && !data) {
        return (
            <div className="grid gap-3" aria-busy>
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }, (_, i) => (
                        <div
                            key={i}
                            className="h-20 animate-pulse rounded-2xl bg-muted"
                        />
                    ))}
                </div>
                {Array.from({ length: 3 }, (_, i) => (
                    <div
                        key={i}
                        className="h-16 animate-pulse rounded-2xl bg-muted"
                    />
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <EmptyState
                title="Insights did not load"
                description={error ?? 'Try again in a moment.'}
                action={
                    <Button variant="outline" onClick={() => void load()}>
                        <RefreshCw />
                        Try again
                    </Button>
                }
            />
        );
    }

    if (data.players === 0) {
        return (
            <EmptyState
                title="No one has played yet"
                description="Results show here once students finish this game: which checkpoints they get right and the wrong answers they pick most."
            />
        );
    }

    const ranked = [...data.checkpoints]
        .filter((c) => c.answered > 0)
        .sort((a, b) => a.correct_percent - b.correct_percent);
    const reteach = new Set(
        ranked
            .filter((c) => c.correct_percent < RETEACH_BELOW)
            .slice(0, RETEACH_COUNT)
            .map((c) => c.index),
    );

    return (
        <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3">
                <StatTile
                    icon={Users}
                    label="Players"
                    value={data.players}
                    hint={`${data.average_attempts} ${data.average_attempts === 1 ? 'try' : 'tries'} each`}
                />
                <StatTile
                    icon={Target}
                    tone="sky"
                    label="Avg. score"
                    value={`${data.average_score}%`}
                    hint="Best try"
                />
                <StatTile
                    icon={CheckCircle2}
                    tone="emerald"
                    label="Cleared"
                    value={`${data.cleared} of ${data.players}`}
                    hint="60%+ correct"
                />
                <StatTile
                    icon={Timer}
                    tone="amber"
                    label="Typical time"
                    value={formatTime(data.median_time)}
                    hint="Median"
                />
            </div>

            <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                        <h3 className="font-display text-lg font-bold">
                            Checkpoints, hardest first
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Share of students who got each one right.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void load()}
                        disabled={loading}
                        className="shrink-0 text-muted-foreground"
                    >
                        <RefreshCw className={cn(loading && 'animate-spin')} />
                        <span className="sr-only sm:not-sr-only">Refresh</span>
                    </Button>
                </div>

                <ol className="grid gap-2">
                    {ranked.map((checkpoint) => (
                        <li
                            key={checkpoint.index}
                            className="rounded-2xl border bg-card p-4"
                        >
                            <div className="flex items-start gap-3">
                                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-muted-foreground tabular-nums">
                                    {checkpoint.index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="line-clamp-2 text-sm font-semibold">
                                            {checkpoint.prompt}
                                        </p>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {reteach.has(checkpoint.index) && (
                                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                                    Reteach
                                                </span>
                                            )}
                                            <span className="font-display text-base font-bold tabular-nums">
                                                {checkpoint.correct_percent}%
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                                        role="meter"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={
                                            checkpoint.correct_percent
                                        }
                                        aria-label={`${checkpoint.correct_percent}% correct`}
                                    >
                                        <div
                                            className={cn(
                                                'h-full rounded-full',
                                                barTone(
                                                    checkpoint.correct_percent,
                                                ),
                                            )}
                                            style={{
                                                width: `${Math.max(checkpoint.correct_percent, 2)}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {checkpoint.correct} of{' '}
                                        {checkpoint.answered} right
                                        {checkpoint.common_wrong && (
                                            <>
                                                {' · '}most picked wrong answer:{' '}
                                                <span className="font-semibold text-foreground">
                                                    “
                                                    {
                                                        checkpoint.common_wrong
                                                            .answer
                                                    }
                                                    ”
                                                </span>{' '}
                                                ({checkpoint.common_wrong.count}
                                                )
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
