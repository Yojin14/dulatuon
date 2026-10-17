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
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
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
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
            <p className={`mt-3 text-3xl font-bold sm:mt-4 sm:text-4xl ${accent ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                {value}
            </p>
            {hint && (
                <div className="mt-1.5 flex items-center gap-1">
                    {Icon && <Icon className="h-3 w-3 shrink-0 text-gray-300" weight="bold" />}
                    <p className="truncate text-xs text-gray-400">{hint}</p>
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
        <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/70">{portal}</p>
                    <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{title}</h1>
                    <p className="mt-1 text-sm text-blue-200/50">{subtitle}</p>
                </div>
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
    fillColor = '#1e3a8a',
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
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out"
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
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {title}
            </h2>
            {href && (
                <Link
                    href={href}
                    className="flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
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
        <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon className="h-6 w-6 text-gray-200 dark:text-gray-700" weight="light" />
            <p className="text-xs text-gray-400">{message}</p>
        </div>
    );
}

/** Gradient banner identical to the landing-page card style */
export const PORTAL_GRADIENT = 'linear-gradient(135deg, #1e3a8a 0%, #24335a 45%, #97aae9 75%, #312e81 100%)';
