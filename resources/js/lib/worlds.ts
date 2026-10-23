import { Activity, CloudLightning, FlaskConical, Leaf, Mountain, Orbit, Waves, type LucideIcon } from 'lucide-react';

/**
 * Course worlds. Dulatuon is one science platform; each course is a "world"
 * with its own accent, icon and low-poly biome. Brand violet stays the colour
 * for actions everywhere, the world accent is identity only.
 */
export type WorldKey = 'earth' | 'volcano' | 'weather' | 'ocean' | 'space' | 'life' | 'default';
export type Biome = WorldKey;

export interface WorldTheme {
    key: WorldKey;
    name: string;
    tagline: string;
    icon: LucideIcon;
    /** Strong identity colour (fills, emblems, bars). */
    accent: string;
    /** Pale tint for surfaces behind identity elements. */
    accentSoft: string;
    /** Text colour that passes AA on white and on accentSoft. */
    accentInk: string;
    biome: Biome;
}

export const WORLDS: Record<WorldKey, WorldTheme> = {
    earth: {
        key: 'earth',
        name: 'Earthquakes',
        tagline: 'Faults, seismic waves and staying safe',
        icon: Activity,
        accent: '#c2410c',
        accentSoft: '#ffedd5',
        accentInk: '#9a3412',
        biome: 'earth',
    },
    volcano: {
        key: 'volcano',
        name: 'Volcanoes',
        tagline: 'Magma, eruptions and hazard zones',
        icon: Mountain,
        accent: '#dc2626',
        accentSoft: '#fee2e2',
        accentInk: '#991b1b',
        biome: 'volcano',
    },
    weather: {
        key: 'weather',
        name: 'Weather & Typhoons',
        tagline: 'Storms, climate and forecasting',
        icon: CloudLightning,
        accent: '#0284c7',
        accentSoft: '#e0f2fe',
        accentInk: '#075985',
        biome: 'weather',
    },
    ocean: {
        key: 'ocean',
        name: 'Oceans',
        tagline: 'Currents, tides and marine life',
        icon: Waves,
        accent: '#0d9488',
        accentSoft: '#ccfbf1',
        accentInk: '#115e59',
        biome: 'ocean',
    },
    space: {
        key: 'space',
        name: 'Space',
        tagline: 'Planets, stars and the solar system',
        icon: Orbit,
        accent: '#4f46e5',
        accentSoft: '#e0e7ff',
        accentInk: '#3730a3',
        biome: 'space',
    },
    life: {
        key: 'life',
        name: 'Life Science',
        tagline: 'Cells, ecosystems and living things',
        icon: Leaf,
        accent: '#16a34a',
        accentSoft: '#dcfce7',
        accentInk: '#166534',
        biome: 'life',
    },
    default: {
        key: 'default',
        name: 'Science',
        tagline: 'Lessons, labs and checkpoints',
        icon: FlaskConical,
        accent: '#7c3aed',
        accentSoft: '#ede9fe',
        accentInk: '#5b21b6',
        biome: 'default',
    },
};

const KEYWORDS: [WorldKey, RegExp][] = [
    ['earth', /earthquake|seism|fault|tecton|lindol/i],
    ['volcano', /volcan|magma|lava|eruption|bulkan/i],
    ['weather', /weather|typhoon|storm|climate|rain|bagyo|atmospher/i],
    ['ocean', /ocean|tsunami|marine|sea\b|coast|tide/i],
    ['space', /space|planet|solar|astronom|star|universe|galax/i],
    ['life', /biolog|cell|ecosystem|life|organism|plant|animal|genetic/i],
];

/**
 * Resolve a course's world: the backend `world` field when present, else a
 * keyword match on the title / code, else the default science world.
 */
export function worldFor(course: { world?: string | null; title?: string | null; course_code?: string | null; courseTitle?: string | null } | null | undefined): WorldTheme {
    if (!course) {
        return WORLDS.default;
    }
    if (course.world && course.world in WORLDS) {
        return WORLDS[course.world as WorldKey];
    }
    const haystack = `${course.title ?? course.courseTitle ?? ''} ${course.course_code ?? ''}`;
    for (const [key, pattern] of KEYWORDS) {
        if (pattern.test(haystack)) {
            return WORLDS[key];
        }
    }

    return WORLDS.default;
}

/** 3D labs belong to a world. Register new simulations here. */
export const SIMULATION_WORLD: Record<string, WorldKey> = {
    fault_lab: 'earth',
    shake_town: 'earth',
    wave_tank: 'earth',
    quake_tracker: 'earth',
    ground_test: 'earth',
    quake_ready: 'earth',
};

/** CSS variables consumed by WorldScope children. */
export function worldStyle(world: WorldTheme): Record<string, string> {
    return { '--world-accent': world.accent, '--world-soft': world.accentSoft, '--world-ink': world.accentInk };
}
