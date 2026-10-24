import { EmptyState } from '@/components/game/empty-state';
import { HudPill } from '@/components/game/hud-pill';
import { RankAvatar } from '@/components/game/rank-avatar';
import { ProgressTrack } from '@/components/game/xp-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    BellRing,
    ChevronRight,
    Crown,
    FlaskConical,
    RefreshCw,
    Trophy,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface LeaderboardRow {
    rank: number;
    user_id: number;
    name: string;
    is_me: boolean;
    xp: number;
    progress: number;
    labs_cleared: number;
    labs_total: number;
    complete: boolean;
    items_done?: number;
    items_total?: number;
    modules_cleared?: number;
    modules_total?: number;
    game_points?: number;
    /** Overall XP across all their courses, for the rank frame on their avatar. */
    total_xp?: number;
    avatar?: string | null;
    last_active?: string | null;
}

interface Nudge {
    user_id: number;
    name: string;
    progress: number;
    reason: string;
}

type LeaderboardData =
    | {
          viewer: 'teacher';
          class_size: number;
          rows: LeaderboardRow[];
          nudges: Nudge[];
      }
    | {
          viewer: 'student';
          class_size: number;
          rows: LeaderboardRow[];
          me: LeaderboardRow | null;
      };

const MEDALS = [
    {
        ring: 'from-amber-300 to-amber-500 text-amber-950',
        edge: 'var(--color-amber-700)',
        label: '1st',
    },
    {
        ring: 'from-slate-200 to-slate-400 text-slate-900',
        edge: 'var(--color-slate-500)',
        label: '2nd',
    },
    {
        ring: 'from-orange-300 to-orange-600 text-orange-950',
        edge: 'var(--color-orange-800)',
        label: '3rd',
    },
];

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

/** Hexagon rank token: medal colours for the podium, quiet for everyone else. */
function RankHex({ rank, size = 'md' }: { rank: number; size?: 'md' | 'lg' }) {
    const medal = MEDALS[rank - 1];
    return (
        <span
            className={cn(
                'grid shrink-0 place-items-center font-display font-extrabold tabular-nums [clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
                size === 'lg' ? 'size-14 text-xl' : 'size-9 text-sm',
                medal
                    ? `bg-linear-to-b ${medal.ring}`
                    : 'bg-muted text-muted-foreground',
            )}
        >
            {rank}
        </span>
    );
}

function Avatar({ name, me }: { name: string; me?: boolean }) {
    return (
        <span
            className={cn(
                'grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold',
                me
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
            )}
        >
            {initials(name)}
        </span>
    );
}

function Podium({ rows }: { rows: LeaderboardRow[] }) {
    const top = rows.slice(0, 3);
    if (top.length === 0) {
        return null;
    }
    // Classic podium order: 2nd, 1st, 3rd.
    const order = [top[1], top[0], top[2]].filter(Boolean) as LeaderboardRow[];

    return (
        <ol
            className="grid grid-cols-3 items-end gap-2 sm:gap-4"
            aria-label="Top of the class"
        >
            {order.map((row) => {
                const first = row === top[0];
                return (
                    <li
                        key={row.user_id}
                        className={cn(
                            'flex flex-col items-center gap-2 rounded-3xl border bg-card px-2 pt-4 pb-3 text-center shadow-panel',
                            first
                                ? 'border-amber-300/80 pb-6 dark:border-amber-400/40'
                                : '',
                            row.is_me && 'ring-2 ring-primary',
                        )}
                    >
                        {first && (
                            <Crown
                                className="size-5 text-amber-500"
                                aria-hidden
                            />
                        )}
                        <RankHex rank={row.rank} size={first ? 'lg' : 'md'} />
                        <p className="w-full truncate text-sm font-bold">
                            {row.is_me ? 'You' : row.name}
                        </p>
                        <HudPill tone={first ? 'yellow' : 'light'}>
                            {row.xp} XP
                        </HudPill>
                    </li>
                );
            })}
        </ol>
    );
}

function TeacherTable({ rows }: { rows: LeaderboardRow[] }) {
    return (
        <div className="overflow-hidden rounded-3xl border bg-card shadow-panel">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b text-left text-xs font-bold text-muted-foreground">
                            <th scope="col" className="w-14 py-3 pl-4">
                                Rank
                            </th>
                            <th scope="col" className="py-3">
                                Student
                            </th>
                            <th scope="col" className="py-3 text-right">
                                XP
                            </th>
                            <th scope="col" className="w-44 py-3 pl-6">
                                Progress
                            </th>
                            <th scope="col" className="py-3 text-right">
                                Labs
                            </th>
                            <th scope="col" className="py-3 text-right">
                                Game pts
                            </th>
                            <th
                                scope="col"
                                className="py-3 pr-4 pl-6 text-right"
                            >
                                Last active
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.map((row) => (
                            <tr
                                key={row.user_id}
                                className="transition-colors hover:bg-muted/40"
                            >
                                <td className="py-2.5 pl-4">
                                    <RankHex rank={row.rank} />
                                </td>
                                <td className="py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <RankAvatar
                                            name={row.name}
                                            src={row.avatar}
                                            xp={row.total_xp ?? 0}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate font-bold">
                                                {row.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {row.modules_cleared}/
                                                {row.modules_total} modules
                                                {row.complete && (
                                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {' '}
                                                        · Course clear
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2.5 text-right font-display font-extrabold tabular-nums">
                                    {row.xp}
                                </td>
                                <td className="py-2.5 pl-6">
                                    <div className="flex items-center gap-2">
                                        <ProgressTrack value={row.progress} />
                                        <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums">
                                            {row.progress}%
                                        </span>
                                    </div>
                                </td>
                                <td className="py-2.5 text-right tabular-nums">
                                    {row.labs_cleared}/{row.labs_total}
                                </td>
                                <td className="py-2.5 text-right tabular-nums">
                                    {row.game_points}
                                </td>
                                <td
                                    className={cn(
                                        'py-2.5 pr-4 pl-6 text-right text-xs',
                                        row.last_active
                                            ? 'text-muted-foreground'
                                            : 'font-semibold text-amber-700 dark:text-amber-400',
                                    )}
                                >
                                    {row.last_active ?? 'Not started'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StudentRow({ row }: { row: LeaderboardRow }) {
    return (
        <li
            className={cn(
                'flex items-center gap-3 px-4 py-2.5',
                row.is_me && 'bg-primary/8',
            )}
        >
            <RankHex rank={row.rank} />
            <RankAvatar
                name={row.name}
                src={row.avatar}
                xp={row.total_xp ?? 0}
            />
            <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                    {row.is_me ? `${row.name} (you)` : row.name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                    <ProgressTrack value={row.progress} />
                    <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums">
                        {row.progress}%
                    </span>
                </div>
            </div>
            <span className="shrink-0 text-right">
                <span className="block font-display font-extrabold tabular-nums">
                    {row.xp}
                </span>
                <span className="text-[11px] text-muted-foreground">XP</span>
            </span>
        </li>
    );
}

/**
 * Class leaderboard for one course. Teachers see the whole class with activity and a
 * "needs a nudge" list; students see the podium, the top of the class and their own place.
 */
export function CourseLeaderboard({ courseId }: { courseId: string }) {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/my-course/${courseId}/leaderboard`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) {
                throw new Error(`Request failed (${res.status})`);
            }
            setData((await res.json()) as LeaderboardData);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        // Fetching on open; state is set once the response arrives.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return (
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Trophy className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
                        Class leaderboard
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {data
                            ? `${data.class_size} ${data.class_size === 1 ? 'student' : 'students'} · `
                            : ''}
                        XP from lessons read and 3D labs cleared
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void load()}
                    disabled={loading}
                    aria-label="Refresh leaderboard"
                >
                    <RefreshCw className={cn(loading && 'animate-spin')} />
                    <span className="hidden sm:inline">Refresh</span>
                </Button>
            </div>

            {loading && !data && (
                <div className="space-y-3" aria-hidden>
                    <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-32 animate-pulse rounded-3xl bg-muted"
                            />
                        ))}
                    </div>
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-14 animate-pulse rounded-2xl bg-muted"
                        />
                    ))}
                </div>
            )}

            {error && !data && (
                <EmptyState
                    title="Couldn't load the leaderboard"
                    description={error}
                    action={
                        <Button onClick={() => void load()}>
                            <RefreshCw /> Try again
                        </Button>
                    }
                />
            )}

            {data && data.rows.length === 0 && (
                <EmptyState
                    title="No students yet"
                    description="Once students join this course, their XP and labs cleared will rank here."
                />
            )}

            {data && data.rows.length > 0 && data.viewer === 'student' && (
                <>
                    {data.me && (
                        <div className="flex items-center gap-4 rounded-3xl bg-game-night p-4 text-white">
                            <RankHex rank={data.me.rank} size="lg" />
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-lg font-extrabold">
                                    You're #{data.me.rank} of {data.class_size}
                                </p>
                                <p className="text-sm text-white/70">
                                    {data.me.xp} XP · {data.me.labs_cleared} of{' '}
                                    {data.me.labs_total} labs cleared
                                </p>
                            </div>
                            <FlaskConical
                                className="hidden size-6 text-white/50 sm:block"
                                aria-hidden
                            />
                        </div>
                    )}
                    <Podium rows={data.rows} />
                    <ol className="divide-y overflow-hidden rounded-3xl border bg-card shadow-panel">
                        {data.rows.map((row) => (
                            <StudentRow key={row.user_id} row={row} />
                        ))}
                        {data.me && !data.rows.some((row) => row.is_me) && (
                            <>
                                <li
                                    className="px-4 py-1.5 text-center text-xs text-muted-foreground"
                                    aria-hidden
                                >
                                    ···
                                </li>
                                <StudentRow row={data.me} />
                            </>
                        )}
                    </ol>
                </>
            )}

            {data && data.rows.length > 0 && data.viewer === 'teacher' && (
                <>
                    <Podium rows={data.rows} />

                    {data.nudges.length > 0 && (
                        <section
                            aria-labelledby="nudges"
                            className="rounded-3xl bg-amber-50 p-4 dark:bg-amber-400/10"
                        >
                            <h3
                                id="nudges"
                                className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100"
                            >
                                <BellRing className="size-4 text-amber-600 dark:text-amber-300" />
                                Needs a nudge
                                <span className="font-normal text-amber-800/80 dark:text-amber-200/70">
                                    · no activity in the last week
                                </span>
                            </h3>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {data.nudges.map((nudge) => (
                                    <li
                                        key={nudge.user_id}
                                        className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-sm"
                                    >
                                        <Avatar name={nudge.name} />
                                        <span>
                                            <span className="block text-sm font-bold">
                                                {nudge.name}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {nudge.reason} ·{' '}
                                                {nudge.progress}%
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <TeacherTable rows={data.rows} />
                </>
            )}
        </div>
    );
}

/** Sidebar entry that opens the leaderboard, styled like the Announcements entry. */
export function LeaderboardFooterButton({
    active,
    onOpen,
}: {
    active: boolean;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            aria-pressed={active}
            className={cn(
                'flex w-full shrink-0 cursor-pointer items-center gap-2.5 border-t border-gray-200 px-4 py-3 text-left transition-colors dark:border-gray-800',
                active
                    ? 'bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-white hover:bg-muted/50 dark:bg-transparent dark:hover:bg-gray-800/50',
            )}
        >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Trophy className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-muted-foreground">
                    Leaderboard
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                    Class ranking by XP
                </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-400" />
        </button>
    );
}
