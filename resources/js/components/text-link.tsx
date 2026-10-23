import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ComponentProps } from 'react';

type LinkProps = ComponentProps<typeof Link>;

export default function TextLink({
    className = '',
    children,
    ...props
}: LinkProps) {
    return (
        <Link
            className={cn(
                'font-bold text-primary underline decoration-primary/30 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-current! dark:text-violet-300',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
