import { useEffect, useState } from 'react';

/** Brand palette used across dashboard charts. */
export const CHART_COLORS = ['#1e3a8a', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe'];
export const STATUS_COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#6b7280', '#7c3aed'];

/**
 * Returns false on the first paint, then true after mount — a one-shot flag for
 * CSS entry animations. Fires once per mount (i.e. on page load/reload), never
 * on re-render, so charts animate in without any running animation loop.
 */
export function useMountAnimation(): boolean {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setOn(true));
        return () => cancelAnimationFrame(id);
    }, []);
    return on;
}

interface Point {
    label: string;
    value: number;
}

/**
 * Lightweight area/line trend chart — pure SVG, no charting library.
 * The fill scales to its container with `preserveAspectRatio="none"` while the
 * stroke stays crisp via `vectorEffect="non-scaling-stroke"`, so there's no
 * ResizeObserver and no re-render on resize.
 */
export function TrendArea({
    data,
    color = '#2563eb',
    unit = '',
    gradientId,
}: {
    data: Point[];
    color?: string;
    unit?: string;
    gradientId: string;
}) {
    const animate = useMountAnimation();

    if (data.length === 0) {
        return <div className="flex h-full items-center justify-center text-xs text-gray-400">No data</div>;
    }

    const max = Math.max(1, ...data.map((d) => d.value)) * 1.15;
    const n = data.length;
    const W = 100;
    const H = 100;

    const coords = data.map((d, i) => {
        const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
        const y = H - (d.value / max) * H;
        return [x, y] as const;
    });

    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;

    const labelIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

    return (
        <div className="flex h-full w-full flex-col">
            <div className="relative min-h-0 flex-1">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {[25, 50, 75].map((g) => (
                        <line
                            key={g}
                            x1="0"
                            x2="100"
                            y1={g}
                            y2={g}
                            className="stroke-gray-100 dark:stroke-gray-800"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    <path
                        d={area}
                        fill={`url(#${gradientId})`}
                        style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.9s ease' }}
                    />
                    <path
                        d={line}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={animate ? 0 : 1}
                        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                    />
                </svg>

                {/* Hover dots + tooltips — pure CSS, no JS state. */}
                <div className="absolute inset-0 flex">
                    {data.map((d, i) => {
                        const pct = (d.value / max) * 100;
                        return (
                            <div key={i} className="group relative flex-1">
                                <span
                                    className="absolute left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full opacity-0 ring-2 ring-white transition group-hover:opacity-100 dark:ring-gray-900"
                                    style={{ bottom: `${pct}%`, background: color }}
                                />
                                <div
                                    className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900/95 px-2 py-1 text-center text-[10px] font-medium text-white opacity-0 shadow-sm transition group-hover:opacity-100"
                                    style={{ bottom: `calc(${pct}% + 10px)` }}
                                >
                                    {d.value}
                                    {unit}
                                    <span className="block text-[9px] font-normal text-gray-300">{d.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-2 flex justify-between px-0.5 text-[10px] text-gray-400">
                {labelIdx.map((i) => (
                    <span key={i}>{data[i].label}</span>
                ))}
            </div>
        </div>
    );
}

/** Horizontal bar list — pure HTML/CSS, ideal for category comparisons. */
export function BarList({
    items,
    unit = '',
    max,
    colors = CHART_COLORS,
    showValue = true,
}: {
    items: Point[];
    unit?: string;
    max?: number;
    colors?: string[];
    showValue?: boolean;
}) {
    const animate = useMountAnimation();

    if (items.length === 0) {
        return <div className="flex h-full items-center justify-center text-xs text-gray-400">No data</div>;
    }

    const scale = max ?? Math.max(1, ...items.map((i) => i.value));

    return (
        <div className="flex h-full flex-col justify-center gap-3">
            {items.map((it, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span
                        className="w-24 shrink-0 truncate text-xs text-gray-600 sm:w-36 dark:text-gray-300"
                        title={it.label}
                    >
                        {it.label}
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                        <div
                            className="h-full rounded-md transition-[width] duration-700 ease-out"
                            style={{
                                width: animate ? `${Math.min(100, (it.value / scale) * 100)}%` : '0%',
                                background: colors[i % colors.length],
                            }}
                        />
                    </div>
                    {showValue && (
                        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                            {it.value}
                            {unit}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

interface Segment {
    name: string;
    value: number;
}

/** Donut chart with legend — SVG arcs via stroke-dasharray, no library. */
export function DonutChart({
    data,
    colors = CHART_COLORS,
    size = 150,
    thickness = 22,
}: {
    data: Segment[];
    colors?: string[];
    size?: number;
    thickness?: number;
}) {
    const animate = useMountAnimation();
    const total = data.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return <div className="flex h-full items-center justify-center text-xs text-gray-400">No data</div>;
    }

    const r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    let acc = 0;

    return (
        <div className="flex h-full items-center justify-center gap-4 sm:gap-6">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={thickness} />
                {data.map((d, i) => {
                    const dash = (d.value / total) * circ;
                    const segment = (
                        <circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke={colors[i % colors.length]}
                            strokeWidth={thickness}
                            strokeDasharray={animate ? `${dash} ${circ - dash}` : `0 ${circ}`}
                            strokeDashoffset={-acc}
                            style={{ transition: 'stroke-dasharray 0.8s ease' }}
                        />
                    );
                    acc += dash;
                    return segment;
                })}
            </svg>

            <div className="flex flex-col gap-2">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
                        <span className="text-gray-600 dark:text-gray-300">{d.name}</span>
                        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {d.value}
                            <span className="ml-1 font-normal text-gray-400">({Math.round((d.value / total) * 100)}%)</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
