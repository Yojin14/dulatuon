import AppLogo from '@/components/app-logo';
import { LowPolyBlock, LowPolyClouds } from '@/components/game/low-poly-scene';
import { MotionRoot, Reveal } from '@/components/game/reveal';
import { XpBar } from '@/components/game/xp-bar';
import { HeroWorld } from '@/components/three/hero-world';
import { Button } from '@/components/ui/button';
import { WorldEmblem } from '@/components/world/world-scope';
import { computeLevel } from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { WORLDS, type Biome } from '@/lib/worlds';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, Lock, MessageCircle, Smartphone, Timer, Users, type LucideIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode } from 'react';

const earthLabs = [
    { name: 'Fault Lab', line: 'Pull, push and slide the crust until the fault gives way.' },
    { name: 'Shake Town', line: 'Same magnitude, different depth. See which town takes the damage.' },
    { name: 'Wave Tank', line: 'Race P waves against S waves through rock and water.' },
    { name: 'Quake Tracker', line: 'Trace real Philippine quakes back to their faults.' },
    { name: 'Ground Test', line: 'Soak the soil, steepen the slope, watch the hill let go.' },
    { name: 'Quake Ready', line: 'Make the right call before, during and after the shaking.' },
];

const upcoming: { label: string; biome: Biome }[] = [
    { label: 'Course 2', biome: 'weather' },
    { label: 'Course 3', biome: 'ocean' },
    { label: 'Course 4', biome: 'space' },
];

const climb = [
    { step: 'Lesson', detail: 'A short video or reading from your teacher.' },
    { step: 'Lab', detail: 'Run the experiment in 3D. Three hearts per run.' },
    { step: 'Checkpoint', detail: 'Timed questions unlock the next lesson.' },
    { step: 'Clear', detail: 'XP, a rank, and a certificate per module.' },
];

const studentPerks: { name: string; detail: string; icon: LucideIcon }[] = [
    { name: 'Works on the phone you already have', detail: 'Light enough for a budget Android on school Wi-Fi. Nothing to install.', icon: Smartphone },
    { name: 'Ten minutes at a time', detail: 'Short lessons that fit between classes. It remembers exactly where you stopped.', icon: Timer },
    { name: 'Your whole class, in the same course', detail: 'Climb the class board, race your classmates and see who earns the next medal.', icon: Users },
    { name: 'Stuck? Ask right there', detail: 'Message your teacher from inside the lesson instead of waiting for the next meeting.', icon: MessageCircle },
];

function PrimaryLink({ href, children, tone = 'violet' }: { href: ComponentProps<typeof Link>['href']; children: ReactNode; tone?: 'violet' | 'light' }) {
    return (
        <Button
            asChild
            size="lg"
            className={cn('h-14 rounded-2xl px-7 text-base', tone === 'light' && 'bg-white text-violet-900 shadow-none hover:bg-violet-50')}
        >
            <Link href={href}>
                {children}
                <ArrowRight className="size-5" />
            </Link>
        </Button>
    );
}

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const isSignedIn = Boolean(auth.user);

    const primaryAction = isSignedIn
        ? { href: dashboard(), label: 'Go to your dashboard' }
        : canRegister
          ? { href: register(), label: 'Start your first course' }
          : { href: login(), label: 'Log in' };

    const showLoginLink = !isSignedIn && canRegister;
    const examplePlayer = computeLevel(410);
    const earth = WORLDS.earth;

    return (
        <MotionRoot>
            <Head title="Learn science by playing it">
                <meta
                    name="description"
                    content="Learn science by playing it. Every course on Dulatuon is built from 3D labs, short lessons and checkpoints, with XP, badges and a class leaderboard. The first course is Earthquakes."
                />
            </Head>

            <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
                <a href="#main" className="sr-only z-50 rounded-xl bg-primary px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
                    Skip to content
                </a>

                {/* Hero: the sky and a live world are the image */}
                <div className="relative isolate overflow-hidden bg-world-sky text-slate-900">
                    <LowPolyClouds className="absolute inset-x-0 top-16 -z-10 w-[140%] max-w-none opacity-90 sm:w-full" />

                    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-5 sm:gap-4 sm:px-8">
                        <Link href="/" className="flex min-w-0 items-center rounded-xl focus-visible:ring-4 focus-visible:ring-violet-500/30 focus-visible:outline-none">
                            <AppLogo />
                        </Link>
                        <nav aria-label="Account" className="flex shrink-0 items-center gap-1 text-sm font-bold whitespace-nowrap">
                            {isSignedIn ? (
                                <Link href={dashboard()} className="inline-flex h-10 items-center rounded-xl bg-white/70 px-4 ring-1 ring-black/5 hover:bg-white">
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href={login()} className="inline-flex h-10 items-center rounded-xl px-2.5 hover:bg-white/60 sm:px-3">
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link href={register()} className="inline-flex h-10 items-center rounded-xl bg-white/70 px-3.5 ring-1 ring-black/5 hover:bg-white sm:px-4">
                                            <span className="sm:hidden">Sign up</span>
                                            <span className="hidden sm:inline">Create account</span>
                                        </Link>
                                    )}
                                </>
                            )}
                        </nav>
                    </header>

                    <main id="main" className="relative mx-auto grid max-w-7xl gap-6 px-5 pt-12 pb-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:pt-8 lg:pb-0">
                        <div className="lg:col-span-5 lg:pb-24">
                            <Reveal>
                                <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] text-balance">
                                    Learn science by playing it.
                                </h1>
                            </Reveal>
                            <Reveal delay={0.12}>
                                <p className="mt-6 max-w-[36ch] text-lg leading-relaxed font-medium text-slate-700">
                                    Every course on Dulatuon is built from 3D labs, short lessons and checkpoints. Run the experiment, then prove you understand it.
                                </p>
                            </Reveal>
                            <Reveal delay={0.22} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                                <PrimaryLink href={primaryAction.href}>{primaryAction.label}</PrimaryLink>
                                {showLoginLink && (
                                    <Link href={login()} className="font-bold underline decoration-current/30 decoration-2 underline-offset-[6px] hover:decoration-current">
                                        I already have a class
                                    </Link>
                                )}
                            </Reveal>
                        </div>

                        <div className="relative -mx-5 sm:-mx-8 lg:col-span-7 lg:mx-0 lg:-mr-24">
                            <HeroWorld className="aspect-[5/4] w-full lg:aspect-square" />
                            <p className="pointer-events-none absolute bottom-4 left-5 max-w-[32ch] text-xs font-semibold text-slate-700 sm:left-8 lg:bottom-20 lg:left-6">
                                Live from the Earthquakes course, Shake Town lab.<span className="hidden pointer-fine:inline"> Drag to look around.</span>
                            </p>
                        </div>
                    </main>

                    <div aria-hidden className="h-6 bg-[linear-gradient(180deg,#6fbf5a_0_45%,#4f9a43_45%_60%,transparent_60%)]" />
                </div>

                {/* Course map */}
                <section aria-labelledby="worlds" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
                    <Reveal className="max-w-2xl">
                        <h2 id="worlds" className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
                            Pick a course. Play your way through it.
                        </h2>
                        <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
                            Every topic is its own course with its own labs. Clear one and the next opens up, and your rank and badges come with you.
                        </p>
                    </Reveal>

                    <div className="mt-12 grid gap-6 lg:grid-cols-12">
                        {/* Course 1, open */}
                        <Reveal className="lg:col-span-8">
                            <article className="overflow-hidden rounded-4xl border bg-card shadow-panel">
                                <div
                                    className="relative grid gap-4 px-6 pt-6 pb-2 text-slate-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-8 sm:pt-8"
                                    style={{ backgroundImage: `linear-gradient(180deg, var(--color-sky) 0%, var(--color-sky-soft) 50%, ${earth.accentSoft} 100%)` }}
                                >
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <WorldEmblem world={earth} />
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: earth.accentInk }}>
                                                    Course 1 · Open now
                                                </p>
                                                <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">{earth.name}</h3>
                                            </div>
                                        </div>
                                        <p className="mt-3 max-w-[44ch] font-medium text-slate-700">Faults, seismic waves, intensity and staying safe, set in the Philippines.</p>
                                    </div>
                                    <LowPolyBlock variant="quake" biome="earth" className="hidden w-48 drop-shadow-[0_16px_16px_rgba(85,48,28,0.25)] sm:block" />
                                </div>
                                {/* The earth world's own signature: strata depth markers */}
                                <div aria-hidden className="flex h-2">
                                    <span className="flex-1 bg-[#c99a6b]" />
                                    <span className="flex-1 bg-[#a3623f]" />
                                    <span className="flex-1 bg-[#6f3b2a]" />
                                </div>
                                <ol className="grid sm:grid-cols-2">
                                    {earthLabs.map((lab, index) => (
                                        <li key={lab.name} className="flex gap-4 border-t px-6 py-5 sm:px-8 sm:[&:nth-child(even)]:border-l">
                                            <span className="font-display text-sm font-bold tabular-nums" style={{ color: earth.accentInk }}>
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <div>
                                                <p className="font-display text-lg font-bold tracking-[-0.01em]">{lab.name}</p>
                                                <p className="mt-0.5 text-sm text-muted-foreground">{lab.line}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </article>
                        </Reveal>

                        {/* Next courses, locked */}
                        <div className="grid gap-4 lg:col-span-4">
                            {upcoming.map((world, index) => (
                                <Reveal key={world.label} delay={index * 0.06}>
                                    <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed bg-card/60 p-4">
                                        <LowPolyBlock biome={world.biome} className="w-24 shrink-0 opacity-60 grayscale" />
                                        <div>
                                            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                                                <Lock className="size-4" />
                                                {world.label}
                                            </p>
                                            <p className="mt-0.5 text-sm text-muted-foreground">In development</p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How a course works: game-night mode */}
                <section aria-labelledby="climb" className="bg-game-night text-white">
                    <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
                        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
                            <Reveal className="lg:col-span-7">
                                <h2 id="climb" className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
                                    Every lesson is a short climb, and you feel every step.
                                </h2>
                            </Reveal>
                            <p className="max-w-[40ch] leading-relaxed text-white/75 lg:col-span-5">
                                No grinding for points. XP comes from finishing real work, ranks follow mastery, and checkpoints decide when you move on.
                            </p>
                        </div>

                        <ol className="relative mt-14 grid gap-8 sm:grid-cols-4 sm:gap-6">
                            <span aria-hidden className="absolute top-[11px] right-0 left-0 hidden h-[3px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.5)_0_14px,transparent_14px_22px)] sm:block" />
                            {climb.map((item, index) => (
                                <Reveal as="li" key={item.step} delay={index * 0.08} className="relative flex gap-4 sm:block">
                                    <span
                                        className={cn(
                                            'relative z-10 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-[#1e1b4b]',
                                            index === climb.length - 1 ? 'bg-amber-300 text-amber-950' : 'bg-white text-violet-900',
                                        )}
                                    >
                                        <Check className="size-3.5" strokeWidth={3} />
                                    </span>
                                    <div className="sm:mt-5">
                                        <p className="font-display text-xl font-bold">{item.step}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-white/70">{item.detail}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </ol>

                        <div className="mt-16 grid gap-6 lg:grid-cols-12 lg:items-center">
                            <Reveal className="lg:col-span-6">
                                <figure className="rounded-3xl bg-white p-6 text-slate-900 shadow-float sm:p-7">
                                    <p className="text-eyebrow text-violet-600">Checkpoint · Earthquakes</p>
                                    <p className="mt-2 font-display text-xl leading-snug font-bold tracking-[-0.02em]">
                                        Two earthquakes have the same magnitude. One starts 10 km deep, the other 300 km deep. Which shakes the town above it more?
                                    </p>
                                    <div className="mt-5 grid gap-2.5 text-[15px] font-semibold">
                                        <span className="rounded-xl border-2 border-violet-500 bg-violet-50 px-4 py-3 text-violet-900">The shallow one (10 km)</span>
                                        <span className="rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-700">Both the same</span>
                                        <span className="rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-700">The deep one (300 km)</span>
                                    </div>
                                    <figcaption className="sr-only">A checkpoint question from the Shake Town lab.</figcaption>
                                </figure>
                            </Reveal>
                            <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
                                <p className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none font-extrabold tracking-[-0.04em] text-amber-300">+50 XP</p>
                                <p className="mt-3 max-w-[34ch] leading-relaxed text-white/75">Right answer, first try. The run keeps its hearts and the next lesson unlocks.</p>
                                <div className="dark mt-6 max-w-sm rounded-2xl bg-white/6 p-4 ring-1 ring-white/10 [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-white/65">
                                    <XpBar player={examplePlayer} />
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* For students */}
                <section aria-labelledby="students" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:py-28">
                    <div className="lg:col-span-5">
                        <Reveal>
                            <h2 id="students" className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
                                Made for the way you actually study.
                            </h2>
                        </Reveal>
                        <p className="mt-5 max-w-[38ch] leading-relaxed text-muted-foreground">
                            No thick modules to scroll through. You play a lab, answer a few questions, and you're done until next time.
                        </p>
                    </div>
                    <ul className="lg:col-span-6 lg:col-start-7">
                        {studentPerks.map(({ name, detail, icon: Icon }, index) => (
                            <Reveal as="li" key={name} delay={index * 0.06} className="flex gap-4 border-t py-6 last:border-b">
                                <Icon className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
                                <div>
                                    <h3 className="font-display text-xl font-bold tracking-[-0.02em]">{name}</h3>
                                    <p className="mt-1.5 max-w-[46ch] leading-relaxed text-muted-foreground">{detail}</p>
                                </div>
                            </Reveal>
                        ))}
                    </ul>
                </section>

                {/* Call to action: brand drench */}
                <section aria-labelledby="start" className="relative isolate overflow-hidden bg-[radial-gradient(120%_120%_at_85%_100%,#8b5cf6_0%,#6d28d9_40%,#2e1065_100%)] text-white">
                    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:items-end lg:py-32">
                        <div className="lg:col-span-8">
                            <Reveal>
                                <h2 id="start" className="max-w-[16ch] font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
                                    Your first course is waiting.
                                </h2>
                            </Reveal>
                            <Reveal delay={0.12} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                                <PrimaryLink href={primaryAction.href} tone="light">
                                    {primaryAction.label}
                                </PrimaryLink>
                                {showLoginLink && (
                                    <Link href={login()} className="font-bold underline decoration-white/40 decoration-2 underline-offset-[6px] hover:decoration-white">
                                        Log in
                                    </Link>
                                )}
                            </Reveal>
                        </div>
                        <LowPolyBlock biome="default" className="hidden w-64 justify-self-end drop-shadow-[0_24px_24px_rgba(20,0,60,0.45)] lg:col-span-4 lg:block" />
                    </div>

                    <footer className="border-t border-white/15">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-white/75 sm:px-8">
                            <span className="font-display text-base font-bold text-white">Dulatuon</span>
                            <span>Dula, to play. Tuon, to study. © {new Date().getFullYear()}</span>
                        </div>
                    </footer>
                </section>
            </div>
        </MotionRoot>
    );
}
