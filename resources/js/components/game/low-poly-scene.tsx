import { cn } from '@/lib/utils';
import type { Biome } from '@/lib/worlds';

const SIDES: Record<'earth' | 'ocean' | 'space', { left: string[]; right: string[] }> = {
    earth: { left: ['#a0703f', '#7b4a2a', '#55301c'], right: ['#8a5d32', '#663c22', '#452616'] },
    ocean: { left: ['#e7cf9c', '#c9a46a', '#8a6a3c'], right: ['#d4b880', '#ab8752', '#6f532c'] },
    space: { left: ['#6d5bb0', '#4c3d8a', '#2e2466'], right: ['#5a4a9c', '#3d3078', '#241c55'] },
};

const TOPS: Record<Biome, [string, string, string]> = {
    earth: ['#38a352', '#46b562', '#2f8f46'],
    default: ['#38a352', '#46b562', '#2f8f46'],
    life: ['#2f9a4a', '#3fb05c', '#237a39'],
    weather: ['#4fa65e', '#5fb86d', '#3b8a4a'],
    volcano: ['#6b7a5a', '#7c8b69', '#56634a'],
    ocean: ['#0ea5b7', '#22c3d4', '#0b8796'],
    space: ['#9ca3af', '#b6bcc6', '#7b8392'],
};

function Block({ biome }: { biome: Biome }) {
    const sides = biome === 'ocean' ? SIDES.ocean : biome === 'space' ? SIDES.space : SIDES.earth;
    const [top, light, shade] = TOPS[biome];

    return (
        <>
            <path d="M20 78 120 128v40L20 118Z" fill={sides.left[0]} />
            <path d="M20 98 120 148v10L20 108Z" fill={sides.left[1]} />
            <path d="M20 108 120 158v10L20 118Z" fill={sides.left[2]} />
            <path d="M220 78 120 128v40l100-50Z" fill={sides.right[0]} />
            <path d="M220 98 120 148v10l100-50Z" fill={sides.right[1]} />
            <path d="M220 108 120 158v10l100-50Z" fill={sides.right[2]} />
            <path d="M120 28 220 78 120 128 20 78Z" fill={top} />
            <path d="M120 28 170 53 120 78 70 53Z" fill={light} />
            <path d="M70 53 120 78 120 128 20 78Z" fill={shade} opacity=".35" />
        </>
    );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M0 -26 10 0H-10Z" fill="#2f8f46" />
            <path d="M0 -34 8 -12H-8Z" fill="#46b562" />
            <rect x="-1.5" y="-2" width="3" height="7" fill="#7c4a21" />
        </g>
    );
}

function Town() {
    return (
        <>
            <path d="M132 62 150 71v16l-18-9Z" fill="#fff7ed" />
            <path d="M150 71 162 65v16l-12 6Z" fill="#fde7cf" />
            <path d="M129 61 144 50 153 72 132 62Z" fill="#ef4444" />
            <path d="M144 50 165 60 153 72Z" fill="#b91c1c" />
            <path d="M139 72 144 74.5v7l-5-2.5Z" fill="#7c4a21" />
            <path d="M170 40 180 45v30l-10-5Z" fill="#e2e8f0" />
            <path d="M180 45 188 41v30l-8 4Z" fill="#cbd5e1" />
            <path d="M170 40 178 36 188 41 180 45Z" fill="#f1f5f9" />
            <path d="M172 48h2v3h-2zM176 50h2v3h-2zM172 56h2v3h-2zM176 58h2v3h-2zM172 64h2v3h-2zM176 66h2v3h-2z" fill="#7dd3fc" />
            <Tree x={88} y={64} />
            <Tree x={62} y={76} s={0.8} />
            <circle cx="112" cy="48" r="8" fill="#38a352" />
            <circle cx="117" cy="44" r="6" fill="#46b562" />
            <rect x="111" y="54" width="3" height="8" fill="#7c4a21" />
        </>
    );
}

function BiomeProps({ biome }: { biome: Biome }) {
    switch (biome) {
        case 'volcano':
            return (
                <>
                    <path d="M80 92 120 20 160 92 120 112Z" fill="#57534e" />
                    <path d="M120 20 160 92 120 112Z" fill="#44403c" />
                    <path d="M108 42 120 20 132 42 124 50 120 44 116 50Z" fill="#f97316" />
                    <path d="M116 50 120 44 124 50 121 70 118 62Z" fill="#ef4444" />
                    <circle cx="112" cy="10" r="6" fill="#d6d3d1" opacity=".8" />
                    <circle cx="124" cy="4" r="8" fill="#e7e5e4" opacity=".7" />
                    <Tree x={62} y={84} s={0.8} />
                    <Tree x={178} y={84} s={0.8} />
                </>
            );
        case 'weather':
            return (
                <>
                    <path d="M70 34 84 18 104 22 116 10 140 20 150 8 172 22 166 38 76 42Z" fill="#64748b" />
                    <path d="M76 42 166 38 160 46 82 48Z" fill="#475569" />
                    <path d="M128 46 120 62 128 62 118 82" fill="none" stroke="#facc15" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M92 52 88 64M104 52 100 64M148 52 144 64M160 50 156 62" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
                    <Tree x={78} y={90} />
                    <Tree x={170} y={88} s={0.9} />
                </>
            );
        case 'ocean':
            return (
                <>
                    <path d="M60 70 80 64 100 72 120 64 140 72 160 64 180 72" fill="none" stroke="#a5f3fc" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M80 92 100 86 120 94 140 86 160 94" fill="none" stroke="#a5f3fc" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
                    <path d="M108 72 140 72 134 82 114 82Z" fill="#f8fafc" />
                    <path d="M122 72V48l14 18Z" fill="#fef3c7" />
                    <path d="M122 48v24" stroke="#78350f" strokeWidth="2" />
                </>
            );
        case 'space':
            return (
                <>
                    <circle cx="96" cy="80" r="7" fill="#7b8392" />
                    <circle cx="146" cy="88" r="5" fill="#7b8392" />
                    <circle cx="122" cy="70" r="4" fill="#7b8392" />
                    <circle cx="150" cy="30" r="20" fill="#f59e0b" />
                    <path d="M120 38c20 6 40 4 62-6" fill="none" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="70" cy="24" r="2" fill="#fff" />
                    <circle cx="96" cy="12" r="1.6" fill="#fff" />
                    <circle cx="190" cy="56" r="1.8" fill="#fff" />
                    <circle cx="60" cy="48" r="1.4" fill="#fff" />
                </>
            );
        case 'life':
            return (
                <>
                    <Tree x={70} y={80} />
                    <Tree x={92} y={70} s={1.15} />
                    <Tree x={150} y={70} s={1.1} />
                    <Tree x={172} y={82} />
                    <Tree x={120} y={96} s={0.9} />
                    <circle cx="122" cy="62" r="9" fill="#38a352" />
                    <circle cx="128" cy="56" r="7" fill="#4ade80" />
                    <rect x="120.5" y="68" width="3" height="9" fill="#7c4a21" />
                    <circle cx="100" cy="98" r="3" fill="#f472b6" />
                    <circle cx="146" cy="96" r="3" fill="#facc15" />
                </>
            );
        case 'default':
            return (
                <>
                    <Tree x={80} y={76} />
                    <path d="M126 70 150 82v18l-24-12Z" fill="#f1f5f9" />
                    <path d="M150 82 166 74v18l-16 8Z" fill="#e2e8f0" />
                    <path d="M126 70 142 62 166 74 150 82Z" fill="#a78bfa" />
                    <path d="M134 80h4v4h-4zM142 84h4v4h-4z" fill="#7dd3fc" />
                    <Tree x={176} y={88} s={0.8} />
                </>
            );
        default:
            return <Town />;
    }
}

/**
 * Lightweight SVG take on the simulation dioramas: an isometric terrain block
 * per world biome. Pure SVG, no WebGL. `variant="quake"` adds the earthquake
 * fault and ripples, `variant="empty"` shows the bare block.
 */
export function LowPolyBlock({
    className,
    variant = 'town',
    biome = 'earth',
}: {
    className?: string;
    variant?: 'town' | 'quake' | 'empty';
    biome?: Biome;
}) {
    return (
        <svg viewBox="0 0 240 180" className={cn('h-auto w-full', className)} aria-hidden>
            <LowPolyBlockArt variant={variant} biome={biome} />
        </svg>
    );
}

/** The block's shapes in its 240×180 coordinate space, for composing into larger SVG scenes. */
export function LowPolyBlockArt({ variant = 'town', biome = 'earth' }: { variant?: 'town' | 'quake' | 'empty'; biome?: Biome }) {
    return (
        <>
            <Block biome={biome} />
            {variant === 'quake' && biome === 'earth' && (
                <>
                    <path d="M58 97 82 108l-6 14 16 8-5 18" fill="none" stroke="#fde68a" strokeWidth="2.5" strokeLinejoin="round" />
                    <circle cx="96" cy="140" r="5" fill="#fde68a" />
                    <circle cx="96" cy="140" r="12" fill="none" stroke="#fde68a" strokeWidth="2" opacity=".6" />
                    <circle cx="96" cy="140" r="20" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity=".3" />
                </>
            )}
            {variant !== 'empty' && <BiomeProps biome={biome} />}
        </>
    );
}

/** Low-poly clouds for sky surfaces. */
export function LowPolyClouds({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 400 80" className={cn('pointer-events-none h-auto w-full', className)} aria-hidden>
            <g fill="#fff" opacity=".85">
                <path d="M30 50 46 34 66 38 78 28 98 40 92 54Z" />
                <path d="M300 30 318 18 338 22 352 12 372 24 366 38 310 40Z" />
            </g>
            <g fill="#fff" opacity=".55">
                <path d="M180 62 192 52 208 54 218 46 232 56 226 66Z" />
            </g>
        </svg>
    );
}
