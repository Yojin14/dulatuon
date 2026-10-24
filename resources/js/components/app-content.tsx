import { SidebarInset } from '@/components/ui/sidebar';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'main'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({
    variant = 'header',
    children,
    ...props
}: AppContentProps) {
    if (variant === 'sidebar') {
        return (
            <SidebarInset
                // On desktop the inset frame has an 8px margin top and bottom, so it is 1rem shorter than the screen.
                className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]"
                {...props}
            >
                {children}
            </SidebarInset>
        );
    }

    return (
        <main
            className="mx-auto flex h-full w-full max-w-[1600px] flex-1 flex-col gap-4 rounded-xl"
            {...props}
        >
            {children}
        </main>
    );
}
