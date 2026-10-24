import { RankAvatar } from '@/components/game/rank-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    // Construct display name from firstname and lastname, fallback to name
    const displayName =
        user.firstname || user.lastname
            ? `${user.firstname || ''} ${user.lastname || ''}`.trim()
            : user.name;

    // Convert to title case (first letter uppercase, rest lowercase)
    const toTitleCase = (str: string) => {
        return str
            .toLowerCase()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formattedName = toTitleCase(displayName);

    return (
        <>
            {user.role === 'student' && typeof user.xp === 'number' ? (
                // Students wear their rank: the frame's metal and corner emblem show Bronze → Diamond.
                <RankAvatar name={displayName} src={user.avatar} xp={user.xp} />
            ) : (
                <Avatar className="size-9 overflow-hidden rounded-xl ring-2 ring-violet-200 dark:ring-violet-500/30">
                    <AvatarImage
                        src={user.avatar ?? undefined}
                        alt={displayName}
                    />
                    <AvatarFallback className="rounded-xl bg-linear-to-br from-violet-500 to-violet-700 font-display text-sm font-semibold text-white">
                        {getInitials(displayName)}
                    </AvatarFallback>
                </Avatar>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">{formattedName}</span>
                {!showEmail && user.role && (
                    <span className="truncate text-[11px] font-extrabold tracking-wider text-primary uppercase">
                        {user.role}
                    </span>
                )}
                {showEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
