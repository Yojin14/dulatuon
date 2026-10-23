import { LowPolyBlockArt } from '@/components/game/low-poly-scene';
import type { Biome } from '@/lib/worlds';
import { forwardRef } from 'react';

export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 900;

export interface CoverPreset {
    id: string;
    label: string;
    biome: Biome;
    variant: 'town' | 'quake';
    sky: [string, string];
    hills: [string, string];
    /** Small floating islands either side of the main block. */
    islands: [Biome, Biome];
    sun?: string;
    stars?: boolean;
    rain?: boolean;
}

export const COVER_PRESETS: CoverPreset[] = [
    { id: 'quake-town', label: 'Quake town', biome: 'earth', variant: 'quake', sky: ['#6cc6f5', '#e0f2fe'], hills: ['#a7d8f3', '#c4e6f8'], islands: ['life', 'default'], sun: '#fde68a' },
    { id: 'golden-town', label: 'Golden hour', biome: 'earth', variant: 'town', sky: ['#f9b54c', '#fdeccb'], hills: ['#f2c27a', '#f7d9a3'], islands: ['life', 'earth'], sun: '#fff7d6' },
    { id: 'volcano', label: 'Volcano', biome: 'volcano', variant: 'town', sky: ['#f0703a', '#fbd38d'], hills: ['#d9622f', '#ec9157'], islands: ['earth', 'volcano'], sun: '#fde68a' },
    { id: 'storm', label: 'Storm front', biome: 'weather', variant: 'town', sky: ['#55657d', '#c3ccd8'], hills: ['#6b7a90', '#8e9bad'], islands: ['life', 'weather'], rain: true },
    { id: 'ocean', label: 'Open ocean', biome: 'ocean', variant: 'town', sky: ['#1fb5d6', '#e6fbff'], hills: ['#0e8fae', '#38bdd8'], islands: ['ocean', 'life'], sun: '#fff7d6' },
    { id: 'space', label: 'Deep space', biome: 'space', variant: 'town', sky: ['#17153b', '#3f3a9b'], hills: ['#2a2670', '#383392'], islands: ['space', 'space'], stars: true },
    { id: 'forest', label: 'Living forest', biome: 'life', variant: 'town', sky: ['#7fd69b', '#effcf2'], hills: ['#5cbf7a', '#8fd9a4'], islands: ['life', 'default'], sun: '#fef9c3' },
    { id: 'lab', label: 'Science lab', biome: 'default', variant: 'town', sky: ['#8b6cf0', '#ece7ff'], hills: ['#9b83f2', '#b9a8f7'], islands: ['life', 'ocean'], sun: '#fde68a' },
];

/** Jagged low-poly ridge across the bottom of the scene, deterministic per seed. */
function ridge(seed: number, base: number, amplitude: number): string {
    const points: string[] = [`0,${COVER_HEIGHT}`];
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
        const x = (COVER_WIDTH / steps) * i;
        const wobble = Math.sin(i * 1.9 + seed) * 0.6 + Math.cos(i * 0.7 + seed * 2) * 0.4;
        points.push(`${x.toFixed(0)},${(base - wobble * amplitude).toFixed(0)}`);
    }
    points.push(`${COVER_WIDTH},${COVER_HEIGHT}`);
    return points.join(' ');
}

function Cloud({ x, y, s, opacity }: { x: number; y: number; s: number; opacity: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={opacity}>
            <path d="M0 40 22 16 52 22 70 6 100 24 94 44Z" />
            <path d="M22 16 52 22 40 44 0 40Z" fill="#f1f5f9" />
        </g>
    );
}

function Island({ biome, x, y, s }: { biome: Biome; x: number; y: number; s: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <ellipse cx="120" cy="190" rx="80" ry="10" fill="#0f172a" opacity=".12" />
            <LowPolyBlockArt biome={biome} variant="empty" />
        </g>
    );
}

/**
 * A ready-made course cover in the Dulatuon low-poly style: sky, ridges, clouds and
 * the course's biome block, drawn as one SVG so it can be shown and exported as an image.
 */
export const CoverArt = forwardRef<SVGSVGElement, { preset: CoverPreset; className?: string }>(function CoverArt({ preset, className }, ref) {
    const gradientId = `cover-sky-${preset.id}`;
    const scale = 3.1;
    const blockX = COVER_WIDTH / 2 - (240 * scale) / 2;
    const blockY = 170;

    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${COVER_WIDTH} ${COVER_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            className={className}
            aria-hidden
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={preset.sky[0]} />
                    <stop offset="1" stopColor={preset.sky[1]} />
                </linearGradient>
            </defs>
            <rect width={COVER_WIDTH} height={COVER_HEIGHT} fill={`url(#${gradientId})`} />

            {preset.stars &&
                Array.from({ length: 70 }, (_, i) => (
                    <circle key={i} cx={(i * 389) % COVER_WIDTH} cy={(i * 211) % 620} r={i % 5 === 0 ? 3.2 : 1.8} fill="#fff" opacity={0.35 + ((i * 7) % 6) / 10} />
                ))}
            {preset.sun && <circle cx="1320" cy="170" r="88" fill={preset.sun} opacity=".9" />}
            {preset.stars && (
                <>
                    <circle cx="1310" cy="190" r="96" fill="#f59e0b" />
                    <path d="M1180 230c90 30 190 20 280-40" fill="none" stroke="#fde68a" strokeWidth="16" strokeLinecap="round" />
                </>
            )}

            <polygon points={ridge(preset.id.length, 700, 70)} fill={preset.hills[1]} />
            <polygon points={ridge(preset.id.length + 3, 790, 50)} fill={preset.hills[0]} />

            <Cloud x={120} y={110} s={1.6} opacity={preset.stars ? 0.12 : 0.85} />
            <Cloud x={1090} y={330} s={1.1} opacity={preset.stars ? 0.08 : 0.6} />
            <Cloud x={560} y={60} s={0.9} opacity={preset.stars ? 0.08 : 0.55} />

            {preset.rain &&
                Array.from({ length: 40 }, (_, i) => (
                    <path key={i} d={`M${(i * 97) % COVER_WIDTH} ${(i * 53) % 600} l-14 34`} stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" opacity=".55" />
                ))}

            <Island biome={preset.islands[0]} x={90} y={420} s={1.05} />
            <Island biome={preset.islands[1]} x={1250} y={470} s={0.95} />

            <ellipse cx={COVER_WIDTH / 2} cy={blockY + 175 * scale} rx={290} ry={34} fill="#0f172a" opacity=".16" />
            <g transform={`translate(${blockX} ${blockY}) scale(${scale})`}>
                <LowPolyBlockArt biome={preset.biome} variant={preset.variant} />
            </g>
        </svg>
    );
});

/** Draw a cover SVG onto a canvas and return it as a PNG file ready for upload. */
export async function coverToFile(svg: SVGSVGElement, name: string): Promise<File> {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(COVER_WIDTH));
    clone.setAttribute('height', String(COVER_HEIGHT));
    clone.removeAttribute('class');
    const markup = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));

    try {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = COVER_WIDTH;
        canvas.height = COVER_HEIGHT;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('This browser cannot draw the cover.');
        }
        context.drawImage(image, 0, 0, COVER_WIDTH, COVER_HEIGHT);

        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the cover image.'))), 'image/png'),
        );

        return new File([blob], `${name}.png`, { type: 'image/png' });
    } finally {
        URL.revokeObjectURL(url);
    }
}
