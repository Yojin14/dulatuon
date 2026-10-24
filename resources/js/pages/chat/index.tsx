import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    ChevronDown,
    MessageCircle,
    MoreVertical,
    Paperclip,
    Plus,
    Search,
    Send,
    Settings,
    Smile,
    Users,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Chat', href: '/chat' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatUser {
    id: number;
    name: string;
    avatar?: string | null;
}

interface ChatMessage {
    id: number;
    body: string;
    created_at: string;
    user: ChatUser;
}

interface ChatRoom {
    id: number;
    name: string;
    type: 'course' | 'global';
    description: string | null;
    participantsCount: number;
    lastMessage: string | null;
    lastMessageBy: string | null;
    lastActivity: string;
    unread_count: number;
}

interface Reader {
    user_id: number;
    name: string;
    last_read_at: string;
}

interface Props {
    rooms: ChatRoom[];
    messages: ChatMessage[];
    readers: Reader[];
    selectedRoom: ChatRoom | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function avatarColor(name: string) {
    const colors = [
        'bg-violet-500',
        'bg-violet-500',
        'bg-emerald-500',
        'bg-rose-500',
        'bg-amber-500',
        'bg-cyan-500',
        'bg-violet-500',
        'bg-pink-500',
        'bg-teal-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++)
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDateDivider(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

// ─── Room type config ─────────────────────────────────────────────────────────

const ROOM_TYPE = {
    course: { icon: MessageCircle, dot: 'bg-violet-500', label: 'Course' },
    global: { icon: Users, dot: 'bg-emerald-500', label: 'Global' },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoomListItem({
    room,
    isActive,
    onClick,
    canManage,
}: {
    room: ChatRoom;
    isActive: boolean;
    onClick: () => void;
    canManage: boolean;
}) {
    const unread = room.unread_count ?? 0;

    return (
        <button
            onClick={onClick}
            aria-current={isActive ? 'true' : undefined}
            className={`group relative w-full cursor-pointer rounded-2xl px-3 py-3 text-left transition-colors ${
                isActive ? 'bg-primary/10' : 'hover:bg-muted/60'
            }`}
        >
            <div className="flex items-center gap-3">
                {/* Avatar with optional unread badge */}
                <div className="relative shrink-0">
                    <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(room.name)}`}
                    >
                        {initials(room.name)}
                    </div>
                    {/* Unread count badge */}
                    {unread > 0 && !isActive && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-white shadow">
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                        <p
                            className={`truncate text-sm font-semibold ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}
                        >
                            {room.name}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground/80">
                            {formatTimeAgo(room.lastActivity)}
                        </span>
                    </div>
                    <p
                        className={`truncate text-xs ${unread > 0 && !isActive ? 'font-semibold text-foreground/85' : 'text-muted-foreground'}`}
                    >
                        {room.lastMessage
                            ? room.lastMessageBy
                                ? `${room.lastMessageBy}: ${room.lastMessage}`
                                : room.lastMessage
                            : (room.description ?? 'No messages yet')}
                    </p>
                </div>

                {/* Manage menu — desktop only */}
                {canManage && (
                    <button
                        onClick={(e) => e.stopPropagation()}
                        className="hidden shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-muted-foreground sm:flex"
                    >
                        <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </button>
    );
}

function MessageBubble({
    message,
    isOwn,
    showAvatar,
    showName,
    showTime,
    seenBy,
}: {
    message: ChatMessage;
    isOwn: boolean;
    showAvatar: boolean;
    showName: boolean;
    showTime: boolean;
    seenBy: Reader[];
}) {
    return (
        <div
            className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
        >
            {/* Avatar slot — always reserves space so bubbles align */}
            <div className="w-8 shrink-0">
                {showAvatar && !isOwn && (
                    <Avatar className="size-8">
                        <AvatarImage
                            src={message.user.avatar ?? undefined}
                            alt=""
                        />
                        <AvatarFallback
                            className={`text-[11px] font-bold text-white ${avatarColor(message.user.name)}`}
                        >
                            {initials(message.user.name)}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>

            <div
                className={`flex max-w-[72%] flex-col gap-0.5 sm:max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}
            >
                {showName && !isOwn && (
                    <p className="px-1 text-[11px] font-semibold text-muted-foreground">
                        {message.user.name}
                    </p>
                )}

                <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                        isOwn
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-bl-sm bg-card text-foreground ring-1 ring-border'
                    }`}
                >
                    {message.body}
                </div>

                {/* Meta row: timestamp + seen avatars on the same line */}
                {(showTime || (isOwn && seenBy.length > 0)) && (
                    <div
                        className={`flex items-center gap-1.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                        {showTime && (
                            <span className="text-[10px] text-muted-foreground/80">
                                {formatTime(message.created_at)}
                            </span>
                        )}
                        {isOwn && seenBy.length > 0 && (
                            <div
                                className={`flex items-center gap-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                            >
                                {seenBy.slice(0, 5).map((r) => (
                                    <div
                                        key={r.user_id}
                                        title={`Seen by ${r.name}`}
                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold text-white ring-1 ring-white ${avatarColor(r.name)}`}
                                    >
                                        {initials(r.name)}
                                    </div>
                                ))}
                                {seenBy.length > 5 && (
                                    <span className="text-[9px] text-muted-foreground/80">
                                        +{seenBy.length - 5}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatIndex({
    rooms: initialRooms,
    messages: initialMessages,
    readers: initialReaders,
    selectedRoom: initialRoom,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    const [rooms, setRooms] = useState<ChatRoom[]>(initialRooms);
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(
        initialRoom,
    );
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [readers, setReaders] = useState<Reader[]>(initialReaders);
    const [messageInput, setMessageInput] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showSidebar, setShowSidebar] = useState(true); // mobile: toggle
    const [atBottom, setAtBottom] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const atBottomRef = useRef(true);
    const selectedRoomRef = useRef<ChatRoom | null>(initialRoom);

    // Keep ref in sync so Echo closures can read the current room without stale closure
    useEffect(() => {
        selectedRoomRef.current = selectedRoom;
    }, [selectedRoom]);

    const canManage = user.role === 'admin' || user.role === 'teacher';

    // Scroll only the message list (scrollIntoView would also nudge the whole page).
    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
        const el = messagesAreaRef.current;
        el?.scrollTo({ top: el.scrollHeight, behavior });
    };

    // Scroll to bottom on new messages if already at bottom
    useEffect(() => {
        if (atBottom) {
            const el = messagesAreaRef.current;
            el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, atBottom]);

    // Track scroll position to show/hide scroll-to-bottom button
    const handleScroll = () => {
        const el = messagesAreaRef.current;
        if (!el) return;
        const isAtBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        setAtBottom(isAtBottom);
        atBottomRef.current = isAtBottom;
    };

    // Subscribe to every room channel on mount so the sidebar updates for all rooms.
    // Uses selectedRoomRef so the closure never goes stale when the active room changes.
    useEffect(() => {
        if (!window.Echo) return;

        // Store channel references so cleanup can stop individual listeners before leaving,
        // preventing duplicate callbacks when React StrictMode remounts effects.
        const channels = initialRooms.map((room) => {
            const channel = window.Echo.private(`chat.${room.id}`);

            const onMessageSent = (data: ChatMessage) => {
                if (data.user.id === user.id) return; // own messages handled optimistically

                const isActive = selectedRoomRef.current?.id === room.id;

                setRooms((prev) =>
                    prev.map((r) =>
                        r.id === room.id
                            ? {
                                  ...r,
                                  lastMessage: data.body,
                                  lastMessageBy: data.user.name,
                                  lastActivity: data.created_at,
                                  unread_count: isActive
                                      ? r.unread_count
                                      : r.unread_count + 1,
                              }
                            : r,
                    ),
                );

                if (isActive) {
                    setMessages((prev) => [...prev, data]);
                    if (atBottomRef.current) {
                        axios
                            .post(`/chat/${room.id}/mark-read`)
                            .catch(() => {});
                    }
                }
            };

            const onMessageRead = (data: Reader) => {
                if (selectedRoomRef.current?.id === room.id) {
                    setReaders((prev) => {
                        const without = prev.filter(
                            (r) => r.user_id !== data.user_id,
                        );
                        return [...without, data];
                    });
                }
            };

            channel.listen('.MessageSent', onMessageSent);
            channel.listen('.MessageRead', onMessageRead);

            return { roomId: room.id, channel };
        });

        return () => {
            channels.forEach(({ roomId, channel }) => {
                channel.stopListening('.MessageSent');
                channel.stopListening('.MessageRead');
                window.Echo.leave(`chat.${roomId}`);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mark the newly selected room as read each time the active room changes
    const selectedRoomId = selectedRoom?.id;
    useEffect(() => {
        if (!selectedRoomId) return;
        axios.post(`/chat/${selectedRoomId}/mark-read`).catch(() => {});
    }, [selectedRoomId]);

    const handleRoomSelect = async (room: ChatRoom) => {
        if (room.id === selectedRoom?.id) {
            // Already loaded (phones pre-select the first room): just open it.
            setShowSidebar(false);
            return;
        }

        // Clear unread badge immediately
        setRooms((prev) =>
            prev.map((r) => (r.id === room.id ? { ...r, unread_count: 0 } : r)),
        );
        setSelectedRoom(room);
        setShowSidebar(false); // on mobile: hide sidebar, show messages
        setLoading(true);
        setReaders([]);

        try {
            const res = await axios.get<{
                messages: ChatMessage[];
                readers: Reader[];
            }>(`/chat/${room.id}/messages`);
            setMessages(res.data.messages);
            setReaders(res.data.readers);
        } catch {
            setMessages([]);
        } finally {
            setLoading(false);
            setTimeout(() => scrollToBottom(), 50);
        }
        inputRef.current?.focus();
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedRoom) return;

        const body = messageInput.trim();
        setMessageInput('');

        const optimistic: ChatMessage = {
            id: Date.now(),
            body,
            created_at: new Date().toISOString(),
            user: { id: user.id, name: user.name, avatar: user.avatar ?? null },
        };
        setMessages((prev) => [...prev, optimistic]);
        setAtBottom(true);

        try {
            const res = await axios.post<ChatMessage>(
                `/chat/${selectedRoom.id}/messages`,
                { body },
            );
            setMessages((prev) =>
                prev.map((m) => (m.id === optimistic.id ? res.data : m)),
            );
            setRooms((prev) =>
                prev.map((r) =>
                    r.id === selectedRoom.id
                        ? {
                              ...r,
                              lastMessage: body,
                              lastMessageBy: user.name,
                              lastActivity: new Date().toISOString(),
                          }
                        : r,
                ),
            );
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setMessageInput(body);
        }
    };

    // For each reader, find the index of the last message they've seen
    // (last message whose created_at <= reader's last_read_at)
    const seenByMessageId = (() => {
        const map = new Map<number, Reader[]>();
        readers.forEach((reader) => {
            const readAt = new Date(reader.last_read_at).getTime();
            // Walk messages in reverse to find the last one this reader has seen
            for (let i = messages.length - 1; i >= 0; i--) {
                const msgTs = new Date(messages[i].created_at).getTime();
                if (msgTs <= readAt) {
                    const id = messages[i].id;
                    if (!map.has(id)) map.set(id, []);
                    map.get(id)!.push(reader);
                    break;
                }
            }
        });
        return map;
    })();

    // Build message list with date dividers and grouping metadata
    const renderedMessages = (() => {
        type Item =
            | { kind: 'divider'; key: string; label: string }
            | {
                  kind: 'message';
                  msg: ChatMessage;
                  showAvatar: boolean;
                  showName: boolean;
                  showTime: boolean;
              };

        const items: Item[] = [];
        let lastDate = '';
        let lastUserId: number | null = null;
        let lastTs = 0;

        messages.forEach((msg, i) => {
            const dateLabel = formatDateDivider(msg.created_at);
            if (dateLabel !== lastDate) {
                items.push({
                    kind: 'divider',
                    key: `div-${i}`,
                    label: dateLabel,
                });
                lastDate = dateLabel;
                lastUserId = null;
            }

            const ts = new Date(msg.created_at).getTime();
            const gap = ts - lastTs > 5 * 60 * 1000; // 5 min gap breaks group
            const nextMsg = messages[i + 1];
            const isLastInGroup =
                !nextMsg ||
                nextMsg.user.id !== msg.user.id ||
                new Date(nextMsg.created_at).getTime() - ts > 5 * 60 * 1000;

            items.push({
                kind: 'message',
                msg,
                showAvatar: isLastInGroup,
                showName: msg.user.id !== lastUserId || gap,
                showTime: isLastInGroup,
            });

            lastUserId = msg.user.id;
            lastTs = ts;
        });

        return items;
    })();

    const filteredRooms = rooms.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()),
    );

    // Group rooms by type for sidebar sections
    const courseRooms = filteredRooms.filter((r) => r.type === 'course');
    const globalRooms = filteredRooms.filter((r) => r.type === 'global');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat" />

            {/* Full-height panel inside AppLayout's content area */}
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] px-5 py-5 sm:px-8 sm:py-8">
                <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border bg-card shadow-panel">
                    {/* ── Sidebar ──────────────────────────────────────────────── */}
                    <aside
                        className={`w-full shrink-0 flex-col border-border sm:w-72 sm:border-r md:w-80 ${
                            showSidebar ? 'flex' : 'hidden sm:flex'
                        }`}
                    >
                        {/* Sidebar header */}
                        <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
                            <h2 className="flex-1 text-base font-bold text-foreground">
                                Messages
                            </h2>
                            {canManage && (
                                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground/85 dark:text-muted-foreground dark:hover:text-white">
                                    <Plus className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        <div className="px-3 py-2.5">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search…"
                                    className="h-8 rounded-lg border-0 bg-muted pl-8 text-sm ring-0 focus-visible:ring-1"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Room list */}
                        <div className="flex-1 overflow-y-auto">
                            {globalRooms.length > 0 && (
                                <RoomSection
                                    label="General"
                                    rooms={globalRooms}
                                    selectedRoom={selectedRoom}
                                    onSelect={handleRoomSelect}
                                    canManage={canManage}
                                />
                            )}
                            {courseRooms.length > 0 && (
                                <RoomSection
                                    label="Courses"
                                    rooms={courseRooms}
                                    selectedRoom={selectedRoom}
                                    onSelect={handleRoomSelect}
                                    canManage={canManage}
                                />
                            )}
                            {filteredRooms.length === 0 && (
                                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    No rooms found.
                                </p>
                            )}
                        </div>
                    </aside>

                    {/* ── Chat Area ────────────────────────────────────────────── */}
                    <div
                        className={`min-w-0 flex-1 flex-col ${showSidebar ? 'hidden sm:flex' : 'flex'}`}
                    >
                        {selectedRoom ? (
                            <>
                                {/* Chat header */}
                                <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
                                    {/* Back button — mobile only */}
                                    <button
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted sm:hidden dark:text-muted-foreground"
                                        onClick={() => setShowSidebar(true)}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>

                                    {/* Room avatar */}
                                    <div className="relative shrink-0">
                                        <div
                                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(selectedRoom.name)}`}
                                        >
                                            {initials(selectedRoom.name)}
                                        </div>
                                        <span
                                            className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${ROOM_TYPE[selectedRoom.type].dot}`}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-foreground">
                                            {selectedRoom.name}
                                        </p>
                                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            {
                                                selectedRoom.participantsCount
                                            }{' '}
                                            participants
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground"
                                        >
                                            {isMuted ? (
                                                <VolumeX className="h-4 w-4" />
                                            ) : (
                                                <Volume2 className="h-4 w-4" />
                                            )}
                                        </button>
                                        {canManage && (
                                            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground">
                                                <Settings className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Messages */}
                                <div
                                    ref={messagesAreaRef}
                                    onScroll={handleScroll}
                                    className="relative flex-1 overflow-y-auto bg-muted/50 px-4 py-4"
                                >
                                    {loading ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`flex w-full gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}
                                                >
                                                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                                                    <div
                                                        className={`h-10 animate-pulse rounded-2xl bg-muted ${i % 2 === 0 ? 'w-40' : 'w-56'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : renderedMessages.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                                <MessageCircle className="h-7 w-7 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-muted-foreground">
                                                    No messages yet
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Be the first to say hello!
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {renderedMessages.map((item) =>
                                                item.kind === 'divider' ? (
                                                    <div
                                                        key={item.key}
                                                        className="my-4 flex items-center gap-3"
                                                    >
                                                        <div className="h-px flex-1 bg-muted" />
                                                        <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground dark:text-muted-foreground">
                                                            {item.label}
                                                        </span>
                                                        <div className="h-px flex-1 bg-muted" />
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={item.msg.id}
                                                        className={
                                                            item.showAvatar
                                                                ? 'mb-3'
                                                                : 'mb-0.5'
                                                        }
                                                    >
                                                        <MessageBubble
                                                            message={item.msg}
                                                            isOwn={
                                                                item.msg.user
                                                                    .id ===
                                                                user.id
                                                            }
                                                            showAvatar={
                                                                item.showAvatar
                                                            }
                                                            showName={
                                                                item.showName
                                                            }
                                                            showTime={
                                                                item.showTime
                                                            }
                                                            seenBy={
                                                                seenByMessageId.get(
                                                                    item.msg.id,
                                                                ) ?? []
                                                            }
                                                        />
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />

                                    {/* Scroll-to-bottom FAB */}
                                    {!atBottom && (
                                        <button
                                            onClick={() => {
                                                setAtBottom(true);
                                                scrollToBottom('smooth');
                                            }}
                                            className="absolute right-4 bottom-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
                                        >
                                            <ChevronDown className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Input */}
                                <div className="border-t border-border bg-card px-3 py-3">
                                    <form
                                        onSubmit={handleSendMessage}
                                        className="flex items-end gap-2"
                                    >
                                        <button
                                            type="button"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </button>

                                        <div className="relative flex-1">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                placeholder="Type a message…"
                                                value={messageInput}
                                                onChange={(e) =>
                                                    setMessageInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' &&
                                                        !e.shiftKey
                                                    ) {
                                                        e.preventDefault();
                                                        handleSendMessage(
                                                            e as unknown as React.FormEvent,
                                                        );
                                                    }
                                                }}
                                                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-violet-400 focus:bg-card focus:ring-2 focus:ring-violet-100 dark:text-white dark:placeholder:text-muted-foreground dark:focus:bg-white/10 dark:focus:ring-violet-900/40"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                                        >
                                            <Smile className="h-4 w-4" />
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={!messageInput.trim()}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            /* Empty state — desktop only (mobile stays on sidebar) */
                            <div className="hidden flex-1 flex-col items-center justify-center gap-4 bg-muted/40 sm:flex">
                                <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                                    <MessageCircle className="size-9" />
                                </div>
                                <div className="text-center">
                                    <p className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
                                        Pick a conversation
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Choose a room from the list to start
                                        chatting
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ─── Room Section ─────────────────────────────────────────────────────────────

function RoomSection({
    label,
    rooms,
    selectedRoom,
    onSelect,
    canManage,
}: {
    label: string;
    rooms: ChatRoom[];
    selectedRoom: ChatRoom | null;
    onSelect: (room: ChatRoom) => void;
    canManage: boolean;
}) {
    return (
        <div className="mb-1">
            <p className="px-4 pt-3 pb-1 text-xs font-bold text-muted-foreground">
                {label}
            </p>
            {rooms.map((room) => (
                <RoomListItem
                    key={room.id}
                    room={room}
                    isActive={selectedRoom?.id === room.id}
                    onClick={() => onSelect(room)}
                    canManage={canManage}
                />
            ))}
        </div>
    );
}
