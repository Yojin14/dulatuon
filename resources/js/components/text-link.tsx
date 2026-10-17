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
                'text-blue-600 underline decoration-blue-300 underline-offset-4 transition-colors duration-300 ease-out hover:text-blue-800 hover:decoration-current! dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
