import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export function ProgressRing({
    value,
    size = 64,
    stroke = 7,
    className,
    children,
}: {
    value: number;
    size?: number;
    stroke?: number;
    className?: string;
    children?: ReactNode;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, value));

    return (
        <div
            className={cn(
                'relative inline-grid shrink-0 place-items-center',
                className,
            )}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={stroke}
                    className="fill-none stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - clamped / 100)}
                    className={cn(
                        'fill-none transition-[stroke-dashoffset] duration-700 ease-out',
                        clamped >= 100
                            ? 'stroke-emerald-500'
                            : 'stroke-primary',
                    )}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-xs font-extrabold text-foreground tabular-nums">
                {children ?? `${Math.round(clamped)}%`}
            </div>
        </div>
    );
}
