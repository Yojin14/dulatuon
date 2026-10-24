import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { RANK_TIERS, computeLevel } from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { RankEmblem } from './xp-bar';

const SIZES = {
    sm: {
        avatar: 'size-8 text-xs',
        ring: 'p-[2px] rounded-[12px]',
        inner: 'rounded-[10px]',
        emblem: 'xs',
        pin: '-right-1 -bottom-1',
    },
    md: {
        avatar: 'size-9 text-sm',
        ring: 'p-[2.5px] rounded-[14px]',
        inner: 'rounded-[11px]',
        emblem: 'xs',
        pin: '-right-1.5 -bottom-1.5',
    },
    lg: {
        avatar: 'size-16 text-xl',
        ring: 'p-[3px] rounded-[22px]',
        inner: 'rounded-[19px]',
        emblem: 'sm',
        pin: '-right-2.5 -bottom-2.5',
    },
} as const;

/**
 * A student's avatar framed in their rank's metal (Bronze → Diamond), with the rank emblem
 * pinned to the corner. Diamond also glows. The same frame is used wherever students appear.
 */
export function RankAvatar({
    name,
    src,
    xp,
    size = 'md',
    className,
}: {
    name: string;
    src?: string | null;
    xp: number;
    size?: keyof typeof SIZES;
    className?: string;
}) {
    const getInitials = useInitials();
    const rank = computeLevel(xp);
    const tier = RANK_TIERS[rank.tier];
    const dims = SIZES[size];

    return (
        <span
            className={cn('relative inline-flex shrink-0', className)}
            title={`${rank.title} rank`}
        >
            <span
                className={cn(
                    'bg-linear-to-br',
                    tier.gradient,
                    dims.ring,
                    rank.tier === 'diamond' &&
                        'shadow-[0_0_14px_2px_rgb(139_92_246/0.45)]',
                )}
            >
                <Avatar
                    className={cn(
                        'overflow-hidden ring-2 ring-card',
                        dims.avatar,
                        dims.inner,
                    )}
                >
                    {src && <AvatarImage src={src} alt={name} />}
                    <AvatarFallback
                        className={cn(
                            'bg-linear-to-br from-violet-500 to-violet-700 font-display font-semibold text-white',
                            dims.inner,
                        )}
                    >
                        {getInitials(name)}
                    </AvatarFallback>
                </Avatar>
            </span>
            <RankEmblem
                tier={rank.tier}
                division={rank.division}
                size={dims.emblem}
                className={cn('absolute', dims.pin)}
            />
        </span>
    );
}
