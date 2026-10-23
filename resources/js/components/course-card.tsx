import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { WorldChip } from '@/components/world/world-scope';
import { worldFor, type WorldTheme } from '@/lib/worlds';
import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export interface AccentColors {
    accent: string;
    iconBg: string;
    iconColor: string;
    dotColor: string;
    outlineBtn: string;
    solidBtn: string;
}

export const ACCENT_POOL: AccentColors[] = [
    {
        accent: 'bg-violet-600',
        iconBg: 'bg-violet-50 dark:bg-violet-900/40',
        iconColor: 'text-violet-600 dark:text-violet-400',
        dotColor: 'bg-violet-600',
        outlineBtn:
            'border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-600 dark:hover:text-white',
        solidBtn:
            'bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700',
    },
    {
        accent: 'bg-teal-600',
        iconBg: 'bg-teal-50 dark:bg-teal-900/40',
        iconColor: 'text-teal-600 dark:text-teal-400',
        dotColor: 'bg-teal-600',
        outlineBtn:
            'border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white dark:border-teal-400 dark:text-teal-400 dark:hover:bg-teal-600 dark:hover:text-white',
        solidBtn:
            'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700',
    },
    {
        accent: 'bg-emerald-600',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/40',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-600',
        outlineBtn:
            'border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white',
        solidBtn:
            'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700',
    },
    {
        accent: 'bg-violet-600',
        iconBg: 'bg-violet-50 dark:bg-violet-900/40',
        iconColor: 'text-violet-600 dark:text-violet-400',
        dotColor: 'bg-violet-600',
        outlineBtn:
            'border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-600 dark:hover:text-white',
        solidBtn:
            'bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700',
    },
    {
        accent: 'bg-amber-500',
        iconBg: 'bg-amber-50 dark:bg-amber-900/40',
        iconColor: 'text-amber-600 dark:text-amber-400',
        dotColor: 'bg-amber-500',
        outlineBtn:
            'border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white',
        solidBtn:
            'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600',
    },
];

export interface StatItem {
    icon: LucideIcon;
    value: string | number;
    label: string;
}

export interface MetaItem {
    icon: LucideIcon;
    text: ReactNode;
}

interface CourseCardProps {
    title: string;
    description?: string | null;
    thumbnail?: string | null;
    thumbnailFocus?: string;
    thumbnailOverlay?: ReactNode;
    /** @deprecated The course world now drives the card colours. */
    colors?: AccentColors;
    badge: ReactNode;
    badgeAlign?: 'left' | 'right';
    stats: StatItem[];
    meta: MetaItem[];
    cta: ReactNode;
    titleExtra?: ReactNode;
    /** The course's world. Inferred from the title when omitted. */
    world?: WorldTheme;
}

export function CourseCard({
    title,
    description,
    thumbnail,
    thumbnailFocus = 'center',
    thumbnailOverlay,
    badge,
    badgeAlign = 'right',
    stats,
    meta,
    cta,
    titleExtra,
    world: worldProp,
}: CourseCardProps) {
    const world = worldProp ?? worldFor({ title });
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = Boolean(thumbnail) && failedSrc !== thumbnail;

    return (
        <article className="group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-panel transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-float">
            {/* Cover: the course photo, or a low-poly diorama on sky */}
            <div className="relative aspect-2/1 w-full overflow-hidden">
                {showImage ? (
                    <img
                        src={thumbnail ?? undefined}
                        alt=""
                        onError={() => setFailedSrc(thumbnail ?? null)}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        style={{ objectPosition: thumbnailFocus }}
                    />
                ) : (
                    <div
                        className="grid h-full w-full place-items-center"
                        style={{ backgroundImage: `linear-gradient(180deg, var(--color-sky) 0%, var(--color-sky-soft) 45%, ${world.accentSoft} 100%)` }}
                    >
                        <LowPolyBlock
                            biome={world.biome}
                            className="w-36 translate-y-3 drop-shadow-[0_12px_12px_rgba(30,20,10,0.22)] transition-transform duration-500 ease-out group-hover:-translate-y-0"
                        />
                    </div>
                )}
                <WorldChip world={world} className="absolute bottom-3 left-3 shadow-sm" />
                <div className={`absolute top-3 ${badgeAlign === 'left' ? 'left-3' : 'right-3'}`}>{badge}</div>
                {thumbnailOverlay}
            </div>

            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold tracking-[-0.02em] text-foreground">{title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description ?? 'No description provided.'}</p>
                    </div>
                    {titleExtra && <div className="shrink-0 pt-0.5">{titleExtra}</div>}
                </div>

                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    {stats.map(({ icon: Icon, value, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <Icon className="size-4" style={{ color: world.accentInk }} aria-hidden />
                            <dd className="font-bold text-foreground tabular-nums">{value}</dd>
                            <dt className="text-muted-foreground">{label}</dt>
                        </div>
                    ))}
                </dl>

                <div className="mt-2 flex flex-col gap-1">
                    {meta.map(({ icon: Icon, text }, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Icon className="size-4 shrink-0" aria-hidden />
                            <span className="truncate">{text}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-5">{cta}</div>
            </div>
        </article>
    );
}
