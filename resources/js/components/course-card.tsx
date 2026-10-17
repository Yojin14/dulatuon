import type { LucideIcon } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AccentColors {
    accent: string;
    iconBg: string;
    iconColor: string;
    dotColor: string;
    outlineBtn: string;
    solidBtn: string;
}
// comment

export const ACCENT_POOL: AccentColors[] = [
    {
        accent: 'bg-blue-600',
        iconBg: 'bg-blue-50 dark:bg-blue-900/40',
        iconColor: 'text-blue-600 dark:text-blue-400',
        dotColor: 'bg-blue-600',
        outlineBtn:
            'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white',
        solidBtn:
            'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
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
        accent: 'bg-indigo-600',
        iconBg: 'bg-indigo-50 dark:bg-indigo-900/40',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        dotColor: 'bg-indigo-600',
        outlineBtn:
            'border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white',
        solidBtn:
            'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700',
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
    colors: AccentColors;
    badge: ReactNode;
    badgeAlign?: 'left' | 'right';
    stats: StatItem[];
    meta: MetaItem[];
    cta: ReactNode;
    titleExtra?: ReactNode;
}

export function CourseCard({
    title,
    description,
    thumbnail,
    thumbnailFocus = 'center',
    thumbnailOverlay,
    colors,
    badge,
    badgeAlign = 'right',
    stats,
    meta,
    cta,
    titleExtra,
}: CourseCardProps) {
    return (
        <div className="group flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-gray-900 dark:ring-gray-800">
            {/* Cover — photo or styled placeholder */}
            <div className="relative h-32 w-full overflow-hidden">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        style={{ objectPosition: thumbnailFocus }}
                    />
                ) : (
                    <div className="h-full w-full bg-gray-50 dark:bg-gray-900">
                        <div
                            className="absolute inset-0 opacity-60 dark:opacity-30"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)',
                                backgroundSize: '14px 14px',
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="h-14 w-14 text-gray-300 dark:text-gray-700" />
                        </div>
                    </div>
                )}
                {/* Badge overlay */}
                <div
                    className={`absolute top-3 ${badgeAlign === 'left' ? 'left-3' : 'right-3'}`}
                >
                    {badge}
                </div>
                {thumbnailOverlay}
            </div>

            <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
                {/* Header: title/desc + right slot */}
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-gray-400">
                            {description ?? 'No description provided.'}
                        </p>
                    </div>
                    {titleExtra && (
                        <div className="shrink-0 pt-0.5">{titleExtra}</div>
                    )}
                </div>

                {/* Stats — divided layout */}
                <div className="mt-4 flex items-stretch divide-x divide-gray-100 border-t border-gray-100 pt-4 dark:divide-gray-800 dark:border-gray-800">
                    {stats.map(({ icon: Icon, value, label }) => (
                        <div
                            key={label}
                            className="flex flex-1 flex-col items-center gap-0.5 px-2 first:pl-0 last:pr-0"
                        >
                            <span className="text-[15px] font-bold text-gray-800 tabular-nums dark:text-gray-100">
                                {value}
                            </span>
                            <div className="flex items-center gap-1">
                                <Icon
                                    className={`h-3 w-3 ${colors.iconColor}`}
                                />
                                <span className="text-[10px] tracking-wide text-gray-400 uppercase">
                                    {label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Meta */}
                <div className="mt-3 flex flex-col gap-1">
                    {meta.map(({ icon: Icon, text }, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-1.5 text-[11px] text-gray-400"
                        >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{text}</span>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-5">{cta}</div>
            </div>
        </div>
    );
}
