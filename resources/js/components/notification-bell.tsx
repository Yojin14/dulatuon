import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { type AppNotification, type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Award,
    Bell,
    BookOpen,
    Check,
    CheckCheck,
    ClipboardCheck,
    Megaphone,
    MessageCircle,
    Shield,
    ShieldCheck,
    ShieldOff,
    Trash2,
    Trophy,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ─── Type → icon/colour config ──────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: LucideIcon; tint: string }> = {
    chat_message: { icon: MessageCircle, tint: 'bg-cyan-500' },
    role_assigned: { icon: Shield, tint: 'bg-violet-500' },
    permission_granted: { icon: ShieldCheck, tint: 'bg-violet-500' },
    permission_revoked: { icon: ShieldOff, tint: 'bg-slate-500' },
    course_assigned: { icon: BookOpen, tint: 'bg-emerald-500' },
    new_content: { icon: BookOpen, tint: 'bg-violet-500' },
    rank_up: { icon: Trophy, tint: 'bg-amber-500' },
    assignment_graded: { icon: ClipboardCheck, tint: 'bg-emerald-500' },
    certificate: { icon: Award, tint: 'bg-emerald-500' },
    announcement: { icon: Megaphone, tint: 'bg-amber-500' },
    announcement_comment: { icon: MessageCircle, tint: 'bg-amber-500' },
};

function typeConfig(type: string) {
    return TYPE_CONFIG[type] ?? { icon: Bell, tint: 'bg-gray-500' };
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Header bell that opens a left side drawer listing the user's notifications.
 * The unread badge is kept live over the user's private broadcast channel; the
 * list is fetched lazily each time the drawer opens.
 */
export function NotificationBell() {
    const { auth, unreadNotificationCount } = usePage<SharedData>().props;

    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(unreadNotificationCount ?? 0);
    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    // Re-seed the badge from the server prop on navigation (adjust during render).
    const [seeded, setSeeded] = useState(unreadNotificationCount);
    if (unreadNotificationCount !== seeded) {
        setSeeded(unreadNotificationCount);
        setCount(unreadNotificationCount ?? 0);
    }

    // Live updates from the websocket.
    useEffect(() => {
        if (!window.Echo || !auth.user) {
            return;
        }

        const channel = window.Echo.private(`App.Models.User.${auth.user.id}`);
        const handler = (data: {
            notification: AppNotification;
            unread_count: number;
        }) => {
            setCount(data.unread_count);
            setItems((prev) => [
                data.notification,
                ...prev.filter((n) => n.id !== data.notification.id),
            ]);
        };
        channel.listen('.NotificationSent', handler);

        return () => {
            channel.stopListening('.NotificationSent', handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.user?.id]);

    const fetchList = async (): Promise<void> => {
        setLoading(true);
        try {
            const res = await axios.get<{
                notifications: AppNotification[];
                unreadCount: number;
            }>('/notifications');
            setItems(res.data.notifications);
            setCount(res.data.unreadCount);
        } catch {
            // ignore — keep whatever we already have
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (next: boolean): void => {
        setOpen(next);
        if (next) {
            fetchList();
        }
    };

    const markRead = async (n: AppNotification): Promise<void> => {
        if (n.read_at !== null) {
            return;
        }
        setItems((prev) =>
            prev.map((x) =>
                x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
            ),
        );
        setCount((c) => Math.max(0, c - 1));
        try {
            const res = await axios.post<{ unread_count: number }>(
                `/notifications/${n.id}/read`,
            );
            setCount(res.data.unread_count);
        } catch {
            // ignore
        }
    };

    const handleClick = async (n: AppNotification): Promise<void> => {
        await markRead(n);
        setOpen(false);
        if (n.link) {
            router.visit(n.link);
        }
    };

    const markAllRead = async (): Promise<void> => {
        setItems((prev) =>
            prev.map((n) =>
                n.read_at === null
                    ? { ...n, read_at: new Date().toISOString() }
                    : n,
            ),
        );
        setCount(0);
        try {
            await axios.post('/notifications/read-all');
        } catch {
            // ignore
        }
    };

    const remove = async (
        n: AppNotification,
        e: React.MouseEvent,
    ): Promise<void> => {
        e.stopPropagation();
        const wasUnread = n.read_at === null;
        setItems((prev) => prev.filter((x) => x.id !== n.id));
        if (wasUnread) {
            setCount((c) => Math.max(0, c - 1));
        }
        try {
            const res = await axios.delete<{ unread_count: number }>(
                `/notifications/${n.id}`,
            );
            setCount(res.data.unread_count);
        } catch {
            // ignore
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    aria-label="Notifications"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <Bell
                        className={`h-5 w-5 ${count > 0 ? 'animate-bell-ring' : ''}`}
                    />
                    {count > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white">
                                {count > 99 ? '99+' : count}
                            </span>
                        </span>
                    )}
                </button>
            </SheetTrigger>

            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 pr-12 dark:border-white/10">
                    <div>
                        <SheetTitle className="text-base font-bold text-foreground">
                            Notifications
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Your recent notifications
                        </SheetDescription>
                    </div>
                    <button
                        onClick={markAllRead}
                        disabled={count === 0}
                        className="flex items-center gap-1 text-xs font-medium text-violet-600 transition-colors hover:text-violet-700 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-violet-400 dark:disabled:text-gray-600"
                    >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading && items.length === 0 ? (
                        <div className="flex flex-col gap-3 p-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <Bell className="h-7 w-7 text-gray-400" />
                            </div>
                            <p className="text-sm font-semibold text-muted-foreground">
                                No notifications
                            </p>
                            <p className="text-xs text-gray-400">
                                You're all caught up.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-white/5">
                            {items.map((n) => {
                                const cfg = typeConfig(n.type);
                                const Icon = cfg.icon;
                                const isUnread = n.read_at === null;

                                return (
                                    <li key={n.id}>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleClick(n)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter')
                                                    handleClick(n);
                                            }}
                                            className={`group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors ${
                                                isUnread
                                                    ? 'bg-violet-50/60 dark:bg-violet-950/30'
                                                    : ''
                                            } hover:bg-gray-50 dark:hover:bg-white/5`}
                                        >
                                            <div
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${cfg.tint}`}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <p
                                                        className={`truncate text-sm ${
                                                            isUnread
                                                                ? 'font-semibold text-foreground'
                                                                : 'font-medium text-foreground/85'
                                                        }`}
                                                    >
                                                        {n.title}
                                                    </p>
                                                    {isUnread && (
                                                        <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                                                    )}
                                                </div>
                                                {n.body && (
                                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                        {n.body}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-[11px] text-muted-foreground/80">
                                                    {formatTimeAgo(
                                                        n.created_at,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                {isUnread && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markRead(n);
                                                        }}
                                                        title="Mark as read"
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-white/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) =>
                                                        remove(n, e)
                                                    }
                                                    title="Delete"
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
