import {
    type ContentType,
    type GameType,
} from '@/components/course-player/types';
import { FilePdf, YoutubeLogo } from '@phosphor-icons/react';
import {
    BookOpen,
    Brain,
    Building2,
    File,
    Grid3x3,
    Layers,
    LifeBuoy,
    Map as MapIcon,
    Mountain,
    ShieldCheck,
    Shuffle,
    Video,
    Waves,
    Zap,
    type LucideIcon,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Display-only: legacy default titles like "Session 2" read as "Lesson 2". */
export function lessonLabel(title: string): string {
    return title.replace(/^session(\s*\d+)$/i, 'Lesson$1');
}
export function uid() {
    return Math.random().toString(36).slice(2, 9);
}

export async function capi<T = unknown>(
    method: string,
    url: string,
    body?: unknown,
): Promise<T> {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            (err as { message?: string }).message ??
                `Request failed (${res.status})`,
        );
    }
    return res.json() as Promise<T>;
}

export function capiFormProgress<T = unknown>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        if (token) {
            xhr.setRequestHeader('X-XSRF-TOKEN', decodeURIComponent(token));
        }
        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText) as T);
                } catch {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                let msg = `Request failed (${xhr.status})`;
                try {
                    const err = JSON.parse(xhr.responseText) as {
                        message?: string;
                    };
                    if (err.message) {
                        msg = err.message;
                    }
                } catch {
                    /* keep default msg */
                }
                reject(new Error(msg));
            }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
}

export function extractYouTubeId(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
        return u.searchParams.get('v') || '';
    } catch {
        const match = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^&\n?#]+)/);
        return match ? match[1] : '';
    }
}

export const CONTENT_META: Record<
    ContentType,
    { label: string; icon: React.ReactNode; badge: string }
> = {
    pdf: {
        label: 'PDF',
        icon: <FilePdf weight="fill" className="h-3.5 w-3.5" />,
        badge: 'bg-red-100 text-red-700',
    },
    word: {
        label: 'Word',
        icon: <File className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
    video: {
        label: 'Video',
        icon: <Video className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
    youtube: {
        label: 'YouTube',
        icon: <YoutubeLogo weight="fill" className="h-3.5 w-3.5" />,
        badge: 'bg-rose-100 text-rose-700',
    },
    flipbook: {
        label: 'Flipbook',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
};

/**
 * iOS Safari (and the iOS webviews all iOS browsers are built on) cannot render
 * a PDF reliably inside an <iframe> — it shows a blank frame or only the first
 * page. Detect it so we can fall back to an "Open PDF" action instead.
 */
export function isIOSDevice(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    const ua = navigator.userAgent;
    // iPadOS 13+ reports as "MacIntel" but exposes touch points.
    return (
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
}

export const noopSubscribe = (): (() => void) => () => {};

// ─── Games ────────────────────────────────────────────────────────────────────
export const GAME_TYPE_META: Record<
    GameType,
    {
        label: string;
        tagline: string;
        icon: LucideIcon;
        chip: string;
        ring: string;
    }
> = {
    quiz_quest: {
        label: 'Quiz Quest',
        tagline: 'Timed multiple-choice with streak bonuses',
        icon: Zap,
        chip: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        ring: 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/40',
    },
    memory_match: {
        label: 'Memory Match',
        tagline: 'Flip & match prompt ↔ answer pairs',
        icon: Brain,
        chip: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300',
        ring: 'border-pink-400 bg-pink-50 dark:border-pink-600 dark:bg-pink-950/40',
    },
    word_scramble: {
        label: 'Word Scramble',
        tagline: 'Unscramble the answer to each clue',
        icon: Shuffle,
        chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
        ring: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/40',
    },
    crossword: {
        label: 'Crossword',
        tagline: 'Fill the grid using the clues',
        icon: Grid3x3,
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        ring: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
    },
    hangman: {
        label: 'Word Rescue',
        tagline: 'Guess the word before you run out of tries',
        icon: LifeBuoy,
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        ring: 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40',
    },
    fault_lab: {
        label: 'Fault Lab',
        tagline: '3D simulation: stress, faults and how earthquakes begin',
        icon: Layers,
        chip: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
        ring: 'border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/40',
    },
    shake_town: {
        label: 'Shake Town',
        tagline: '3D simulation: depth, magnitude and intensity',
        icon: Building2,
        chip: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
        ring: 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40',
    },
    wave_tank: {
        label: 'Wave Tank',
        tagline: '3D simulation: P, S and surface waves',
        icon: Waves,
        chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
        ring: 'border-cyan-400 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-950/40',
    },
    quake_tracker: {
        label: 'Quake Tracker',
        tagline: '3D simulation: earthquakes in the Philippines',
        icon: MapIcon,
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        ring: 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40',
    },
    ground_test: {
        label: 'Ground Test',
        tagline: '3D simulation: landslides, liquefaction, rupture',
        icon: Mountain,
        chip: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
        ring: 'border-lime-400 bg-lime-50 dark:border-lime-600 dark:bg-lime-950/40',
    },
    quake_ready: {
        label: 'Quake Ready',
        tagline: '3D simulation: before, during and after',
        icon: ShieldCheck,
        chip: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
        ring: 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40',
    },
};

// Simulation games ship with their own fixed checkpoints, so there is nothing for a teacher to type in.
export const SIMULATION_GAMES: GameType[] = [
    'fault_lab',
    'shake_town',
    'wave_tank',
    'quake_tracker',
    'ground_test',
    'quake_ready',
];

export const SIMULATION_NOTES: Partial<Record<GameType, string>> = {
    fault_lab:
        'Students run three experiments on a fault and answer 13 built-in checkpoints.',
    shake_town:
        'Students change the magnitude and depth of an earthquake, watch four towns shake, and answer 10 built-in checkpoints.',
    wave_tank:
        'Students send P, S, Love and Rayleigh waves through rock and read a seismogram, with 8 built-in checkpoints.',
    quake_tracker:
        'Students match five Philippine earthquakes to their faults and trenches on a 3D map, with 9 built-in checkpoints.',
    ground_test:
        'Students set the slope, soil and water of a piece of land and shake it to cause landslides, liquefaction and ground rupture, with 8 built-in checkpoints.',
    quake_ready:
        'Students prepare a classroom, drop, cover and hold on, then decide what to do afterwards, with 12 built-in checkpoints.',
};

export const SIMULATION_LABELS = {
    prompt: 'Checkpoint',
    answer: 'Answer',
    promptPlaceholder: '',
    answerPlaceholder: '',
};

export const GAME_ITEM_LABELS: Record<
    GameType,
    {
        prompt: string;
        answer: string;
        promptPlaceholder: string;
        answerPlaceholder: string;
    }
> = {
    quiz_quest: {
        prompt: 'Question',
        answer: 'Correct answer',
        promptPlaceholder: 'e.g. Which wave arrives first after an earthquake?',
        answerPlaceholder: 'e.g. The P wave',
    },
    memory_match: {
        prompt: 'Term / prompt',
        answer: 'Matching answer',
        promptPlaceholder: 'e.g. Epicenter',
        answerPlaceholder: 'e.g. The point on the surface above the focus',
    },
    word_scramble: {
        prompt: 'Clue / hint',
        answer: 'Answer to unscramble',
        promptPlaceholder: 'e.g. A crack where blocks of crust move',
        answerPlaceholder: 'e.g. Fault',
    },
    crossword: {
        prompt: 'Clue',
        answer: 'Answer (single word)',
        promptPlaceholder: 'e.g. Instrument that records ground shaking',
        answerPlaceholder: 'e.g. Seismograph',
    },
    hangman: {
        prompt: 'Clue / hint',
        answer: 'Word to guess (single word)',
        promptPlaceholder: 'e.g. Giant sea wave caused by an undersea quake',
        answerPlaceholder: 'e.g. Tsunami',
    },
    fault_lab: SIMULATION_LABELS,
    shake_town: SIMULATION_LABELS,
    wave_tank: SIMULATION_LABELS,
    quake_tracker: SIMULATION_LABELS,
    ground_test: SIMULATION_LABELS,
    quake_ready: SIMULATION_LABELS,
};
