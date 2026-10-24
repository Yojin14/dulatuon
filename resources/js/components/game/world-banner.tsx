import { LowPolyBlock, LowPolyClouds } from '@/components/game/low-poly-scene';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/**
 * Page hero framed like the simulation stage: sky → sand gradient with a
 * small low-poly diorama on the right. Text stays dark slate for contrast.
 */
export function WorldBanner({
    eyebrow,
    title,
    description,
    actions,
    aside,
    variant = 'town',
    className,
}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    aside?: ReactNode;
    variant?: 'town' | 'quake';
    className?: string;
}) {
    return (
        <section
            className={cn(
                'relative isolate overflow-hidden rounded-3xl bg-world-sky ring-1 ring-sky-200/70 dark:ring-white/10',
                className,
            )}
        >
            <LowPolyClouds className="absolute inset-x-0 top-2 -z-10 opacity-90" />
            <div className="grid items-center gap-4 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 text-slate-900">
                    {eyebrow && (
                        <p className="text-eyebrow text-violet-700">
                            {eyebrow}
                        </p>
                    )}
                    <h1 className="mt-1 text-2xl leading-tight font-semibold text-balance sm:text-3xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1.5 max-w-xl text-sm font-medium text-slate-700 sm:text-base">
                            {description}
                        </p>
                    )}
                    {actions && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>
                {aside ?? (
                    <LowPolyBlock
                        variant={variant}
                        className="hidden w-48 drop-shadow-[0_18px_18px_rgba(85,48,28,0.25)] md:block lg:w-56"
                    />
                )}
            </div>
        </section>
    );
}
