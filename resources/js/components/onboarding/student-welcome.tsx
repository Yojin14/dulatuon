import { LowPolyBlock, LowPolyClouds } from '@/components/game/low-poly-scene';
import { RankLadder } from '@/components/game/xp-bar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    computeLevel,
    XP_PER_COURSE_CLEAR,
    XP_PER_ITEM,
} from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Box,
    ChevronRight,
    Compass,
    Flag,
    Play,
} from 'lucide-react';
import { useState } from 'react';

function storageKey(userId: number): string {
    return `dulatuon:onboarded:${userId}`;
}

function hasSeen(userId: number): boolean {
    try {
        return window.localStorage.getItem(storageKey(userId)) === '1';
    } catch {
        // No storage (private mode): don't nag on every visit.
        return true;
    }
}

function markSeen(userId: number): void {
    try {
        window.localStorage.setItem(storageKey(userId), '1');
    } catch {
        /* storage unavailable */
    }
}

/** `?welcome=1` replays the tour (from "How Dulatuon works" in the account menu). */
function replayRequested(): boolean {
    return (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('welcome') === '1'
    );
}

const STEPS = 3;

/**
 * First-visit welcome for students: what Dulatuon is, how XP and ranks work, and where to start.
 * Shown once per student per browser; replayable from the account menu.
 */
export function StudentWelcome({
    userId,
    continueCourse,
}: {
    userId: number;
    continueCourse: { id: number; title: string } | null;
}) {
    const [open, setOpen] = useState(
        () =>
            typeof window !== 'undefined' &&
            (replayRequested() || !hasSeen(userId)),
    );
    const [step, setStep] = useState(0);

    const close = () => {
        markSeen(userId);
        setOpen(false);
        setStep(0);
        if (replayRequested()) {
            window.history.replaceState(
                window.history.state,
                '',
                window.location.pathname,
            );
        }
    };

    const loops = [
        {
            icon: BookOpen,
            title: 'Lessons',
            text: 'Short readings, videos and flipbooks.',
        },
        {
            icon: Box,
            title: '3D labs',
            text: 'Shake a town, break a fault, send waves through rock.',
        },
        {
            icon: Flag,
            title: 'Checkpoints',
            text: 'Quick questions that prove you got it.',
        },
    ];

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => (value ? setOpen(true) : close())}
        >
            <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
                {step === 0 && (
                    <>
                        <div className="relative isolate grid place-items-center overflow-hidden bg-world-sky px-6 pt-8 pb-4">
                            <LowPolyClouds className="absolute inset-x-0 top-2 -z-10 opacity-80" />
                            <LowPolyBlock
                                variant="quake"
                                className="w-44 drop-shadow-[0_18px_18px_rgba(85,48,28,0.25)] motion-safe:animate-[pulse_3s_ease-in-out_infinite]"
                            />
                        </div>
                        <div className="px-6 pt-2 pb-1">
                            <DialogTitle className="font-display text-2xl font-extrabold tracking-[-0.03em]">
                                Welcome to Dulatuon
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-base">
                                Learn science by playing it. Every course is
                                built from three things:
                            </DialogDescription>
                            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                                {loops.map((loop) => (
                                    <li
                                        key={loop.title}
                                        className="rounded-2xl bg-muted/60 p-3"
                                    >
                                        <loop.icon
                                            className="size-5 text-primary"
                                            aria-hidden
                                        />
                                        <p className="mt-2 text-sm font-bold">
                                            {loop.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {loop.text}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/settings/profile"
                                onClick={close}
                                className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 text-sm transition-colors hover:bg-primary/10"
                            >
                                <img
                                    src="/avatars/pixel/girl-02.svg"
                                    alt=""
                                    className="size-9 rounded-xl"
                                />
                                <img
                                    src="/avatars/pixel/boy-03.svg"
                                    alt=""
                                    className="-ml-5 size-9 rounded-xl ring-2 ring-background"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-bold">
                                        Pick your character
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        Choose a pixel avatar or upload your
                                        photo.
                                    </span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </Link>
                        </div>
                    </>
                )}

                {step === 1 && (
                    <div className="px-6 pt-7 pb-1">
                        <DialogTitle className="font-display text-2xl font-extrabold tracking-[-0.03em]">
                            Climb from Bronze to Diamond
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-base">
                            Every lesson you read and every lab you clear earns{' '}
                            <strong className="text-foreground">
                                {XP_PER_ITEM} XP
                            </strong>
                            . Finish a whole course for a{' '}
                            <strong className="text-foreground">
                                {XP_PER_COURSE_CLEAR} XP
                            </strong>{' '}
                            bonus and a certificate.
                        </DialogDescription>
                        <div className="mt-5 rounded-3xl bg-game-night p-5 text-white">
                            <RankLadder player={computeLevel(0)} compact />
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            Your rank shows on your avatar, so your class sees
                            how far you've climbed.
                        </p>
                    </div>
                )}

                {step === 2 && (
                    <div className="px-6 pt-7 pb-1">
                        <DialogTitle className="font-display text-2xl font-extrabold tracking-[-0.03em]">
                            Ready? Start your first run
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-base">
                            {continueCourse
                                ? `You're already in ${continueCourse.title}. Jump in where you left off.`
                                : 'Pick a course to join. Your XP starts with your first lesson.'}
                        </DialogDescription>
                        <div className="mt-6 grid gap-3">
                            {continueCourse ? (
                                <Button
                                    asChild
                                    variant="play"
                                    size="lg"
                                    className="h-13 text-base"
                                >
                                    <Link
                                        href={`/my-course/${continueCourse.id}`}
                                        onClick={close}
                                    >
                                        <Play className="fill-current" />{' '}
                                        Continue {continueCourse.title}
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    asChild
                                    variant="play"
                                    size="lg"
                                    className="h-13 text-base"
                                >
                                    <Link href="/explore" onClick={close}>
                                        <Compass /> Explore courses
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 px-6 pt-3 pb-6">
                    <div
                        className="flex items-center gap-1.5"
                        aria-label={`Step ${step + 1} of ${STEPS}`}
                    >
                        {Array.from({ length: STEPS }, (_, i) => (
                            <span
                                key={i}
                                className={cn(
                                    'h-2 rounded-full transition-all',
                                    i === step
                                        ? 'w-6 bg-primary'
                                        : 'w-2 bg-foreground/20',
                                )}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {step > 0 ? (
                            <Button
                                variant="ghost"
                                onClick={() => setStep((s) => s - 1)}
                            >
                                <ArrowLeft /> Back
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={close}>
                                Skip
                            </Button>
                        )}
                        {step < STEPS - 1 ? (
                            <Button onClick={() => setStep((s) => s + 1)}>
                                Next <ArrowRight />
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={close}>
                                Done
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
