import { Input } from '@/components/ui/input';
import axios from 'axios';
import { ChevronRight, Megaphone, Send } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';

// ─── Announcements ────────────────────────────────────────────────────────────

export interface AnnouncementAuthor {
    id: number;
    name: string;
}
export interface AnnouncementCommentData {
    id: number;
    author: AnnouncementAuthor | null;
    body: string;
    created_at: string;
}
export interface AnnouncementData {
    id: number;
    author: AnnouncementAuthor | null;
    body: string;
    created_at: string;
    comments: AnnouncementCommentData[];
}

export function acInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function announcementTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Sticky button pinned to the bottom of the curriculum sidebar. Shows the latest
 * announcement as a teaser and a count badge; clicking opens the full feed in the
 * main content panel.
 */
export function AnnouncementFooterButton({
    announcements,
    active,
    onOpen,
}: {
    announcements: AnnouncementData[];
    active: boolean;
    onOpen: () => void;
}) {
    const latest = announcements[0];

    return (
        <button
            onClick={onOpen}
            className={`mb-[max(10px,env(safe-area-inset-bottom))] flex w-full shrink-0 items-center gap-2.5 border-t border-border px-4 py-3 text-left transition-colors ${
                active
                    ? 'bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-card hover:bg-muted/50'
            }`}
        >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-muted-foreground">
                    Announcements
                </p>
                {latest ? (
                    <p className="truncate text-xs text-muted-foreground">
                        {latest.body}
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Nothing posted yet
                    </p>
                )}
            </div>
            {announcements.length > 0 && (
                <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {announcements.length}
                </span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
    );
}

/**
 * Full announcement feed rendered in the main content panel. Read + comment for
 * everyone with course access (Google-Classroom style).
 */
export function AnnouncementsPanel({
    announcements,
    setAnnouncements,
}: {
    announcements: AnnouncementData[];
    setAnnouncements: Dispatch<SetStateAction<AnnouncementData[]>>;
}) {
    const [drafts, setDrafts] = useState<Record<number, string>>({});

    function submitComment(id: number) {
        const body = drafts[id]?.trim();
        if (!body) return;
        axios
            .post(`/announcements/${id}/comments`, { body })
            .then((r) => {
                setAnnouncements((prev) =>
                    prev.map((a) =>
                        a.id === id
                            ? {
                                  ...a,
                                  comments: [...a.comments, r.data.comment],
                              }
                            : a,
                    ),
                );
                setDrafts((p) => ({ ...p, [id]: '' }));
            })
            .catch(() => {});
    }

    return (
        <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Megaphone className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">
                        Announcements
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Updates from your instructor
                    </p>
                </div>
            </div>

            {announcements.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                    <Megaphone className="h-10 w-10 text-gray-200 dark:text-foreground/85" />
                    <p className="text-sm text-muted-foreground">
                        No announcements yet.
                    </p>
                </div>
            ) : (
                <div className="w-full space-y-4">
                    {announcements.map((a) => (
                        <div
                            key={a.id}
                            className="overflow-hidden rounded-3xl border bg-card shadow-panel"
                        >
                            <div className="flex items-start gap-3 p-4 sm:p-5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white">
                                    {acInitials(a.author?.name ?? '?')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {a.author?.name ?? 'Unknown'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {announcementTime(a.created_at)}
                                        </p>
                                    </div>
                                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
                                        {a.body}
                                    </p>
                                </div>
                            </div>

                            {a.comments.length > 0 && (
                                <div className="space-y-3 border-t border-border bg-gray-50/60 px-4 py-3.5 sm:px-5">
                                    {a.comments.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-start gap-2.5"
                                        >
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-300 text-[9px] font-bold text-foreground/85">
                                                {acInitials(
                                                    c.author?.name ?? '?',
                                                )}
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                <span className="font-semibold text-foreground/85">
                                                    {c.author?.name ??
                                                        'Unknown'}
                                                </span>{' '}
                                                {c.body}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
                                <Input
                                    placeholder="Add a comment…"
                                    value={drafts[a.id] ?? ''}
                                    onChange={(e) =>
                                        setDrafts((p) => ({
                                            ...p,
                                            [a.id]: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            submitComment(a.id);
                                        }
                                    }}
                                    className="h-8 text-xs"
                                />
                                <button
                                    onClick={() => submitComment(a.id)}
                                    disabled={!drafts[a.id]?.trim()}
                                    className="shrink-0 p-1.5 text-violet-600 transition-colors hover:text-violet-700 disabled:text-muted-foreground/60"
                                    aria-label="Send comment"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
