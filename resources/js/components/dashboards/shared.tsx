import { Link } from '@inertiajs/react';
import { type Icon } from '@phosphor-icons/react';
import { ArrowRight } from '@phosphor-icons/react';
import { useMountAnimation } from './charts';

export { BarList, CHART_COLORS, DonutChart, STATUS_COLORS, TrendArea } from './charts';

export function ChartCard({
    title,
    subtitle,
    action,
    children,
    height = 240,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    height?: number;
}) {
    return (
        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-foreground">{title}</h3>
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {action}
            </div>
            <div style={{ width: '100%', height }}>{children}</div>
        </div>
    );
}

/** Compact stat card with optional icon footnote. */
export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
}: {
    label: string;
    value: number | string;
    hint?: string;
    icon?: Icon;
    accent?: boolean;
}) {
    return (
        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className={`mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] tabular-nums sm:text-4xl ${accent ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
                {value}
            </p>
            {hint && (
                <div className="mt-1.5 flex items-center gap-1">
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" weight="bold" />}
                    <p className="truncate text-sm text-muted-foreground">{hint}</p>
                </div>
            )}
        </div>
    );
}

function greetingFor(hour: number): string {
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function PortalHeader({
    portal,
    title,
    subtitle,
}: {
    portal: string;
    title: string;
    subtitle: string;
}) {
    return (
        <div className="px-5 py-7 sm:px-8 lg:py-9" style={{ background: PORTAL_GRADIENT }}>
            <div className="mx-auto max-w-[1600px]">
                <p className="text-sm font-bold text-violet-300">{portal}</p>
                <h1 className="mt-1 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight font-extrabold tracking-[-0.03em] text-white">{title}</h1>
                <p className="mt-1.5 text-white/70">{subtitle}</p>
            </div>
        </div>
    );
}

export { greetingFor };

export function DonutProgress({
    value,
    size = 52,
    strokeWidth = 5,
    trackColor = '#e5e7eb',
    fillColor = '#7c3aed',
}: {
    value: number;
    size?: number;
    strokeWidth?: number;
    trackColor?: string;
    fillColor?: string;
}) {
    const animate = useMountAnimation();
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (value / 100) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={fillColor} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={animate ? offset : circ}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
        </svg>
    );
}

export function ProgressBar({ value }: { value: number }) {
    const animate = useMountAnimation();
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: animate ? `${value}%` : '0%' }}
            />
        </div>
    );
}

export function SectionHeader({
    title,
    href,
    linkLabel = 'View all',
}: {
    title: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-foreground">
                {title}
            </h2>
            {href && (
                <Link
                    href={href}
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                    {linkLabel}
                    <ArrowRight className="h-3 w-3" weight="bold" />
                </Link>
            )}
        </div>
    );
}

export function EmptyState({ icon: Icon, message }: { icon: Icon; message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed py-10 text-center">
            <Icon className="h-7 w-7 text-muted-foreground/60" weight="duotone" />
            <p className="text-sm font-semibold text-muted-foreground">{message}</p>
        </div>
    );
}

/** Game-night banner, matching the simulation pages' violet night. */
export const PORTAL_GRADIENT = 'linear-gradient(120deg, #0f172a 0%, #1e1b4b 45%, #2e1065 100%)';
