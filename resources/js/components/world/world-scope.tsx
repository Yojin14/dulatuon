import { cn } from '@/lib/utils';
import { worldStyle, type WorldTheme } from '@/lib/worlds';
import { type ComponentProps, type CSSProperties } from 'react';

/** Exposes a world's colours as --world-accent / --world-soft / --world-ink. */
export function WorldScope({ world, className, style, ...props }: ComponentProps<'div'> & { world: WorldTheme }) {
    return <div className={className} style={{ ...(worldStyle(world) as CSSProperties), ...style }} {...props} />;
}

/** Icon + name pill in the world's colours. */
export function WorldChip({ world, className }: { world: WorldTheme; className?: string }) {
    const Icon = world.icon;

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap', className)}
            style={{ backgroundColor: world.accentSoft, color: world.accentInk }}
        >
            <Icon className="size-3.5" aria-hidden />
            {world.name}
        </span>
    );
}

const HEX = '[clip-path:polygon(50%_0,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]';

/** Hexagonal world emblem, used on game screens, course headers and progress. */
export function WorldEmblem({ world, size = 'md', className }: { world: WorldTheme; size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const Icon = world.icon;
    const dims = { sm: 'size-9', md: 'size-12', lg: 'size-20' }[size];
    const iconDims = { sm: 'size-4', md: 'size-5', lg: 'size-9' }[size];

    return (
        <span className={cn('grid shrink-0 place-items-center text-white', HEX, dims, className)} style={{ backgroundColor: world.accent }} aria-hidden>
            <Icon className={iconDims} strokeWidth={2.25} />
        </span>
    );
}
