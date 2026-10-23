import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/**
 * Standard page heading for app screens: display title, one line of context
 * and actions aligned to the right. Sits on the page background, no banner.
 */
export function PageHeader({
    title,
    description,
    actions,
    children,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cn('mx-auto w-full max-w-[1600px] px-5 sm:px-8 pt-8', className)}>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                    <h1 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em] text-balance text-foreground">
                        {title}
                    </h1>
                    {description && <p className="mt-1.5 max-w-[60ch] text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
        </header>
    );
}
