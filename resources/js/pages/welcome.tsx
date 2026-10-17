import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type CSSProperties, type ReactNode } from 'react';

const lessonSteps = [
    {
        text: 'Watch the video or read the notes your teacher posted.',
        done: true,
    },
    {
        text: 'Play the game for that session. You get three lives.',
        done: true,
    },
    { text: 'Take the quiz and hand in your assignment.', done: false },
    { text: 'Finish the module and download your certificate.', done: false },
];

const leaderboard = [
    { rank: 1, name: 'Andrea Villanueva', score: 980 },
    { rank: 2, name: 'Miguel Santos', score: 945 },
    { rank: 3, name: 'You', score: 910, isYou: true },
    { rank: 4, name: 'Bea Dela Cruz', score: 880 },
    { rank: 5, name: 'Paolo Reyes', score: 855 },
];

const focusRing =
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--dl-yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dl-paper)]';

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
          ? { href: register(), label: 'Create your account' }
          : { href: login(), label: 'Log in' };

    const showLoginLink = !isSignedIn && canRegister;

    return (
        <>
            <Head title="Dulatuon, play and study">
                <meta
                    name="description"
                    content="Dulatuon turns each lesson in your class into a game: quizzes, crosswords, word scrambles and more, with a live class leaderboard and certificates."
                />
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=shantell-sans:400,600,700|atkinson-hyperlegible:400,700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="dl-page min-h-dvh overflow-x-hidden">
                <a
                    href="#main"
                    className={`sr-only z-50 rounded-lg bg-[var(--dl-ink)] px-4 py-2 font-bold text-[var(--dl-paper)] focus:not-sr-only focus:fixed focus:top-4 focus:left-4 ${focusRing}`}
                >
                    Skip to content
                </a>

                <div className="dl-ruled">
                    <header className="dl-gutter mx-auto flex max-w-6xl items-center justify-between gap-4 pt-6 pb-4">
                        <Link
                            href="/"
                            className={`dl-hand flex items-center gap-2 rounded-lg text-2xl font-bold ${focusRing}`}
                        >
                            <StarMark className="h-6 w-6 text-[var(--dl-red)]" />
                            dulatuon
                        </Link>

                        <nav
                            aria-label="Account"
                            className="flex items-center gap-1 sm:gap-2"
                        >
                            {isSignedIn ? (
                                <Link
                                    href={dashboard()}
                                    className={`dl-btn dl-btn-sm ${focusRing}`}
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className={`dl-link inline-flex min-h-11 items-center rounded-lg px-3 font-bold ${focusRing}`}
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className={`dl-btn dl-btn-sm hidden sm:inline-flex ${focusRing}`}
                                        >
                                            Create account
                                        </Link>
                                    )}
                                </>
                            )}
                        </nav>
                    </header>

                    <main id="main">
                        {/* Hero: the name explains itself */}
                        <section className="dl-gutter relative mx-auto max-w-6xl pt-10 pb-24 sm:pt-16 lg:pb-32">
                            <h1 className="dl-hand flex flex-wrap items-start gap-x-5 gap-y-14 text-[clamp(4rem,13vw,9.5rem)] leading-[0.9] font-bold tracking-tight sm:gap-x-8">
                                <Gloss word="Dula" meaning="play" />
                                <span
                                    aria-hidden="true"
                                    className="text-[var(--dl-ink-soft)]"
                                >
                                    +
                                </span>
                                <Gloss word="tuon" meaning="study" />
                                <span className="sr-only">
                                    : play and study
                                </span>
                            </h1>

                            <p className="mt-16 max-w-[34rem] text-xl leading-8 text-[var(--dl-ink-soft)] sm:text-[1.375rem]">
                                Dulatuon turns every lesson in your class into a
                                game you can play. Your teacher adds the quiz,
                                the crossword or the word scramble. You play it,
                                earn your score and keep moving through the
                                course.
                            </p>

                            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                                <Link
                                    href={primaryAction.href}
                                    className={`dl-btn ${focusRing}`}
                                >
                                    {primaryAction.label}
                                </Link>
                                {showLoginLink && (
                                    <p className="text-[var(--dl-ink-soft)]">
                                        Already in a class?{' '}
                                        <Link
                                            href={login()}
                                            className={`dl-link rounded font-bold ${focusRing}`}
                                        >
                                            Log in
                                        </Link>
                                    </p>
                                )}
                            </div>

                            <TeacherStamp className="dl-stamp pointer-events-none absolute right-6 bottom-12 hidden w-52 lg:block xl:right-12 xl:w-60" />
                        </section>
                    </main>
                </div>

                {/* A lesson, as a checklist on a loose sheet */}
                <section
                    aria-labelledby="lesson-heading"
                    className="dl-gutter mx-auto grid max-w-6xl gap-12 py-24 lg:grid-cols-[1fr_1.15fr] lg:gap-20"
                >
                    <div>
                        <h2
                            id="lesson-heading"
                            className="dl-hand text-4xl leading-tight font-bold text-balance sm:text-5xl"
                        >
                            How a lesson goes
                        </h2>
                        <p className="mt-5 max-w-md text-lg leading-8 text-[var(--dl-ink-soft)]">
                            Each course is split into modules and sessions. Work
                            through them in order and your progress saves as you
                            go.
                        </p>
                    </div>

                    <ol className="dl-sheet relative rounded-sm px-6 py-4 sm:px-10">
                        {lessonSteps.map((step, index) => (
                            <li
                                key={step.text}
                                className="flex gap-4 border-b border-[var(--dl-rule)] py-4 text-lg leading-7 last:border-b-0"
                            >
                                <span className="dl-hand w-6 shrink-0 text-right font-bold text-[var(--dl-ink-soft)]">
                                    {index + 1}.
                                </span>
                                <span
                                    className={
                                        step.done
                                            ? 'text-[var(--dl-ink-soft)]'
                                            : ''
                                    }
                                >
                                    {step.text}
                                </span>
                                {step.done && (
                                    <Tick
                                        className="ml-auto h-7 w-7 shrink-0 text-[var(--dl-green)]"
                                        label="done"
                                    />
                                )}
                            </li>
                        ))}
                    </ol>
                </section>

                {/* The five games, as index cards */}
                <section
                    aria-labelledby="games-heading"
                    className="dl-gutter mx-auto max-w-6xl py-24"
                >
                    <h2
                        id="games-heading"
                        className="dl-hand max-w-2xl text-4xl leading-tight font-bold text-balance sm:text-5xl"
                    >
                        Five games your teacher can add to any session
                    </h2>

                    <ul className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                        <FlashCard
                            tilt="-1.5deg"
                            title="Quiz Quest"
                            description="Multiple choice, one question at a time."
                        >
                            <p className="font-bold">
                                Which planet is closest to the sun?
                            </p>
                            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[var(--dl-ink-soft)]">
                                <li>a. Venus</li>
                                <li>
                                    <span className="dl-circled">
                                        b. Mercury
                                    </span>
                                </li>
                                <li>c. Mars</li>
                                <li>d. Earth</li>
                            </ul>
                        </FlashCard>

                        <FlashCard
                            tilt="1deg"
                            title="Memory Match"
                            description="Flip the tiles and pair each term with its meaning."
                        >
                            <div className="grid grid-cols-4 gap-2">
                                <span className="dl-tile dl-tile-open">
                                    H₂O
                                </span>
                                <span className="dl-tile" />
                                <span className="dl-tile dl-tile-open">
                                    water
                                </span>
                                <span className="dl-tile" />
                                <span className="dl-tile" />
                                <span className="dl-tile" />
                                <span className="dl-tile" />
                                <span className="dl-tile" />
                            </div>
                        </FlashCard>

                        <FlashCard
                            tilt="-0.5deg"
                            title="Word Scramble"
                            description="Put the letters back in the right order."
                        >
                            <div className="flex flex-wrap gap-1.5">
                                {['T', 'E', 'N', 'A', 'L', 'P'].map(
                                    (letter, index) => (
                                        <span
                                            key={index}
                                            className="dl-tile dl-tile-open dl-hand text-lg font-bold"
                                        >
                                            {letter}
                                        </span>
                                    ),
                                )}
                            </div>
                        </FlashCard>

                        <FlashCard
                            tilt="1.75deg"
                            title="Crossword"
                            description="Answer the clues across and down."
                        >
                            <MiniCrossword />
                        </FlashCard>

                        <FlashCard
                            tilt="-1deg"
                            title="Hangman"
                            description="Guess the word before the drawing is finished."
                        >
                            <div className="flex items-end justify-between gap-4">
                                <p className="dl-hand text-2xl font-bold tracking-[0.3em]">
                                    V_LC_NO
                                </p>
                                <HangmanDoodle className="h-16 w-14 shrink-0 text-[var(--dl-ink-soft)]" />
                            </div>
                        </FlashCard>

                        <li className="flex items-center px-2">
                            <p className="dl-hand max-w-xs text-xl leading-8 text-[var(--dl-ink-soft)]">
                                Every game has three lives and posts your score
                                to the class leaderboard.
                            </p>
                        </li>
                    </ul>
                </section>

                {/* Leaderboard on the chalkboard */}
                <section
                    aria-labelledby="board-heading"
                    className="dl-gutter mx-auto grid max-w-6xl items-center gap-12 py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-20"
                >
                    <figure className="dl-board rounded-xl">
                        <figcaption className="dl-hand text-xl font-bold">
                            Grade 6 Sampaguita, Word Scramble
                        </figcaption>
                        <table className="mt-5 w-full text-left text-lg">
                            <caption className="sr-only">
                                Example class leaderboard
                            </caption>
                            <thead className="sr-only">
                                <tr>
                                    <th scope="col">Rank</th>
                                    <th scope="col">Student</th>
                                    <th scope="col">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((row) => (
                                    <tr
                                        key={row.rank}
                                        className={
                                            row.isYou ? 'dl-board-you' : ''
                                        }
                                    >
                                        <td className="dl-hand w-10 py-2 font-bold opacity-70">
                                            {row.rank}
                                        </td>
                                        <td className="py-2">{row.name}</td>
                                        <td className="py-2 text-right tabular-nums">
                                            {row.score}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </figure>

                    <div>
                        <h2
                            id="board-heading"
                            className="dl-hand text-4xl leading-tight font-bold text-balance sm:text-5xl"
                        >
                            See where you stand
                        </h2>
                        <p className="mt-5 max-w-md text-lg leading-8 text-[var(--dl-ink-soft)]">
                            Scores update while your classmates play. Chase the
                            top spot, or just beat your own best from last week.
                        </p>
                    </div>
                </section>

                {/* Close */}
                <section aria-labelledby="close-heading" className="dl-ruled">
                    <div className="dl-gutter mx-auto max-w-6xl py-24 sm:py-32">
                        <h2
                            id="close-heading"
                            className="dl-hand max-w-3xl text-5xl leading-[1.05] font-bold text-balance sm:text-6xl"
                        >
                            Ready when your class is.
                        </h2>
                        <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--dl-ink-soft)]">
                            Sign up with your school email, then join the
                            courses your teacher shares with you.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                            <Link
                                href={primaryAction.href}
                                className={`dl-btn ${focusRing}`}
                            >
                                {primaryAction.label}
                            </Link>
                            {showLoginLink && (
                                <Link
                                    href={login()}
                                    className={`dl-link rounded font-bold ${focusRing}`}
                                >
                                    Log in instead
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                <footer className="dl-gutter mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 py-10 text-[var(--dl-ink-soft)]">
                    <p className="dl-hand text-lg font-bold text-[var(--dl-ink)]">
                        Dula ug tuon.
                    </p>
                    <p>&copy; {new Date().getFullYear()} Dulatuon</p>
                </footer>

                <style>{styles}</style>
            </div>
        </>
    );
}

function Gloss({ word, meaning }: { word: string; meaning: string }) {
    return (
        <span className="relative inline-flex flex-col">
            <span>{word}</span>
            <span
                aria-hidden="true"
                className="dl-note absolute top-full left-2 mt-1 flex items-start gap-1 text-[clamp(1.1rem,2.2vw,1.6rem)] font-semibold tracking-normal"
            >
                <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-[1em] w-[1em]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                >
                    <path d="M6 20c1-6 4-11 10-15M16 5l-5 .5M16 5l-.5 5" />
                </svg>
                {meaning}
            </span>
        </span>
    );
}

function FlashCard({
    title,
    description,
    tilt,
    children,
}: {
    title: string;
    description: string;
    tilt: string;
    children: ReactNode;
}) {
    return (
        <li
            className="dl-card rounded-sm p-5 pt-8"
            style={{ '--dl-tilt': tilt } as CSSProperties}
        >
            <div className="min-h-24">{children}</div>
            <h3 className="dl-hand mt-6 text-2xl font-bold">{title}</h3>
            <p className="mt-1 text-[var(--dl-ink-soft)]">{description}</p>
        </li>
    );
}

function MiniCrossword() {
    const grid = ['ATOM ', 'R   E', 'EARTH', 'A   E', '  SUN'];

    return (
        <div className="inline-grid grid-cols-5 gap-px">
            {grid.flatMap((row, rowIndex) =>
                row.split('').map((cell, cellIndex) => (
                    <span
                        key={`${rowIndex}-${cellIndex}`}
                        className={`dl-hand flex h-7 w-7 items-center justify-center text-sm font-bold ${
                            cell === ' '
                                ? ''
                                : 'border-[1.5px] border-[var(--dl-ink-soft)] bg-[var(--dl-paper)]'
                        }`}
                    >
                        {cell !== ' ' && rowIndex === 2 ? cell : ''}
                    </span>
                )),
            )}
        </div>
    );
}

function Tick({ className, label }: { className?: string; label: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label={label}
        >
            <path d="M5 17c3 2 5 5 7 8 4-9 9-15 16-20" />
        </svg>
    );
}

function StarMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4l-5.8 3.4 1.6-6.4-5-4.3 6.6-.5z" />
        </svg>
    );
}

function HangmanDoodle({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 56 64"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M4 61h30M12 61V5h26v9" />
            <circle cx="38" cy="21" r="6" />
            <path d="M38 27v15" />
        </svg>
    );
}

function TeacherStamp({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
            <defs>
                <path
                    id="dl-stamp-ring"
                    d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"
                />
                <filter id="dl-stamp-rough">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.9"
                        numOctaves="2"
                        seed="4"
                        result="noise"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="3"
                    />
                </filter>
            </defs>
            <g filter="url(#dl-stamp-rough)" fill="none" stroke="var(--dl-red)">
                <circle cx="100" cy="100" r="94" strokeWidth="5" />
                <circle cx="100" cy="100" r="52" strokeWidth="2.5" />
                <text
                    fill="var(--dl-red)"
                    stroke="none"
                    fontSize="19"
                    fontWeight="700"
                    letterSpacing="3.5"
                    className="dl-hand"
                >
                    <textPath href="#dl-stamp-ring">
                        VERY GOOD ★ DULA UG TUON ★
                    </textPath>
                </text>
                <path
                    fill="var(--dl-red)"
                    stroke="none"
                    d="M100 66l9.4 21.9 23.7 1.8-18 15.5 5.7 23.2L100 116l-20.8 12.4 5.7-23.2-18-15.5 23.7-1.8z"
                />
            </g>
        </svg>
    );
}

const styles = `
.dl-page {
    --dl-paper: #fbfcf9;
    --dl-card: #ffffff;
    --dl-ink: #1c2b6b;
    --dl-ink-soft: #4a5687;
    --dl-rule: #d3e0f5;
    --dl-red: #d93a30;
    --dl-yellow: #ffd24a;
    --dl-green: #2f8f5b;
    --dl-board: #234038;
    --dl-chalk: #f1efe4;
    background: var(--dl-paper);
    color: var(--dl-ink);
    font-family: 'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif;
}
.dark .dl-page {
    --dl-paper: #1d342d;
    --dl-card: #26443b;
    --dl-ink: #f1efe4;
    --dl-ink-soft: #c3cbbf;
    --dl-rule: rgb(255 255 255 / 0.07);
    --dl-red: #ff8a7a;
    --dl-green: #8fd6a8;
    --dl-board: #12211c;
}
.dl-hand { font-family: 'Shantell Sans', 'Comic Sans MS', ui-rounded, sans-serif; }

.dl-gutter { padding-left: 2.75rem; padding-right: 1.25rem; }
@media (min-width: 640px) { .dl-gutter { padding-left: 6rem; padding-right: 2rem; } }

/* Ruled pad paper with the red margin line */
.dl-ruled {
    --dl-margin: 1.75rem;
    background-color: var(--dl-paper);
    background-image:
        linear-gradient(to right, transparent var(--dl-margin), var(--dl-red) var(--dl-margin), var(--dl-red) calc(var(--dl-margin) + 2px), transparent calc(var(--dl-margin) + 2px)),
        repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--dl-rule) 31px, var(--dl-rule) 32px);
}
@media (min-width: 640px) { .dl-ruled { --dl-margin: 4.5rem; } }

.dl-note { color: var(--dl-red); transform: rotate(-4deg); white-space: nowrap; }

.dl-btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 3.25rem; padding: 0 1.5rem; border-radius: 0.75rem;
    background: var(--dl-ink); color: var(--dl-paper);
    font-weight: 700; font-size: 1.125rem;
    box-shadow: 0 3px 0 0 color-mix(in srgb, var(--dl-ink) 55%, black);
    transition: transform 120ms ease-out, box-shadow 120ms ease-out;
}
.dl-btn:hover { box-shadow: 0 3px 0 0 color-mix(in srgb, var(--dl-ink) 55%, black), 0 0 0 4px var(--dl-yellow); }
.dl-btn:active { transform: translateY(3px); box-shadow: none; }
.dl-btn-sm { min-height: 2.75rem; padding: 0 1.1rem; font-size: 1rem; }

.dl-link {
    color: var(--dl-ink);
    text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 5px;
    text-decoration-color: var(--dl-yellow);
}
.dl-link:hover { text-decoration-color: var(--dl-red); }

/* A loose sheet from the pad */
.dl-sheet {
    background-color: var(--dl-card);
    box-shadow: 0 1px 2px rgb(28 43 107 / 0.08), 0 12px 28px -16px rgb(28 43 107 / 0.25);
    transform: rotate(0.6deg);
}

/* Index cards */
.dl-card {
    background-color: var(--dl-card);
    background-image: linear-gradient(to bottom, transparent 1.25rem, var(--dl-red) 1.25rem, var(--dl-red) calc(1.25rem + 1.5px), transparent calc(1.25rem + 1.5px));
    box-shadow: 0 1px 2px rgb(28 43 107 / 0.08), 0 10px 22px -14px rgb(28 43 107 / 0.3);
    transform: rotate(var(--dl-tilt, 0deg));
    transition: transform 180ms ease-out;
}
.dl-card:hover { transform: rotate(0deg) translateY(-2px); }

.dl-tile {
    display: flex; align-items: center; justify-content: center;
    height: 2.5rem; min-width: 2.25rem; padding: 0 0.4rem;
    border-radius: 0.375rem; font-size: 0.875rem;
    background: var(--dl-ink);
}
.dl-tile-open { background: var(--dl-paper); color: var(--dl-ink); border: 1.5px solid var(--dl-ink-soft); }

.dl-circled {
    padding: 0.1rem 0.45rem; margin-left: -0.45rem;
    border: 2px solid var(--dl-red); border-radius: 50% 45% 55% 48%;
    color: var(--dl-ink); font-weight: 700;
}

.dl-board {
    padding: 2.25rem;
    background: var(--dl-board); color: var(--dl-chalk);
    box-shadow: inset 0 0 0 10px #8a5a35, inset 0 0 0 12px #6f4528, 0 18px 30px -18px rgb(0 0 0 / 0.5);
}
.dl-board tr + tr td { border-top: 1px dashed rgb(241 239 228 / 0.18); }
.dl-board-you td { color: var(--dl-yellow); font-weight: 700; }

.dl-stamp { mix-blend-mode: multiply; opacity: 0.88; transform: rotate(-14deg); }
.dark .dl-stamp { mix-blend-mode: normal; }

@media (prefers-reduced-motion: no-preference) {
    .dl-stamp { animation: dl-stamp-in 420ms cubic-bezier(0.2, 0.9, 0.3, 1.2) 700ms both; }
    @keyframes dl-stamp-in {
        0% { opacity: 0; transform: rotate(-4deg) scale(1.6); }
        70% { opacity: 0.95; transform: rotate(-15deg) scale(0.96); }
        100% { opacity: 0.88; transform: rotate(-14deg) scale(1); }
    }
}
@media (prefers-reduced-motion: reduce) {
    .dl-card, .dl-btn { transition: none; }
    .dl-card:hover { transform: rotate(var(--dl-tilt, 0deg)); }
    .dl-btn:active { transform: none; }
}
`;
