import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

export default function AppLogo({ inverted = false }: { inverted?: boolean }) {
    return (
        <>
            <div
                className={cn(
                    'flex aspect-square size-9 shrink-0 items-center justify-center rounded-xl',
                    inverted ? 'bg-white/10 ring-1 ring-white/15' : 'bg-sky-100 ring-1 ring-sky-200 dark:bg-white/10 dark:ring-white/10',
                )}
            >
                <AppLogoIcon className="size-7" />
            </div>
            <div className="ml-2 flex flex-col leading-none group-data-[collapsible=icon]:hidden">
                <span className={cn('font-display text-lg font-semibold tracking-tight', inverted ? 'text-white' : 'text-foreground')}>
                    Dulatuon
                </span>
                <span className={cn('text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase', inverted ? 'text-white/60' : 'text-primary')}>
                    Learn by playing
                </span>
            </div>
        </>
    );
}
