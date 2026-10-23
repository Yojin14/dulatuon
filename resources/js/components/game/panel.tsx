import { cn } from '@/lib/utils';
import { type ComponentProps, type ReactNode } from 'react';

/** The simulation side-panel pattern: white rounded-3xl card with soft depth. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
    return <section className={cn('rounded-3xl border bg-card p-5 text-card-foreground shadow-panel sm:p-6', className)} {...props} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
    return <p className={cn('text-eyebrow text-primary', className)} {...props} />;
}

/** Eyebrow + title + description + optional actions, as used in game panels. */
export function PanelHeading({
    eyebrow,
    title,
    description,
    actions,
    className,
}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
            <div className="min-w-0">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                <h2 className="mt-1 text-xl leading-tight font-semibold text-foreground sm:text-2xl">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
