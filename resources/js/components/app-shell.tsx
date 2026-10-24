import { SidebarProvider } from '@/components/ui/sidebar';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
    /** Fold the sidebar to its icon strip on this page (the course player), without changing the user's saved choice. */
    collapseSidebar?: boolean;
}

/** Set while a page has folded the sidebar, so the next page can glide it back open. */
const AUTO_COLLAPSED_KEY = 'dulatuon:sidebar-auto-collapsed';

function readAutoCollapsed(): boolean {
    try {
        return window.sessionStorage.getItem(AUTO_COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

function writeAutoCollapsed(value: boolean): void {
    try {
        if (value) {
            window.sessionStorage.setItem(AUTO_COLLAPSED_KEY, '1');
        } else {
            window.sessionStorage.removeItem(AUTO_COLLAPSED_KEY);
        }
    } catch {
        /* storage unavailable: the sidebar simply snaps instead of gliding */
    }
}

export function AppShell({
    children,
    variant = 'header',
    collapseSidebar = false,
}: AppShellProps) {
    const savedOpen = usePage<SharedData>().props.sidebarOpen;

    // Each page mounts a fresh sidebar. Start it where the previous page left it, then glide to
    // this page's width on the next frame, so entering or leaving a course animates instead of snapping.
    const [open, setOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return collapseSidebar ? false : savedOpen;
        }
        return readAutoCollapsed() ? false : savedOpen;
    });

    useEffect(() => {
        const target = collapseSidebar ? false : savedOpen;
        writeAutoCollapsed(collapseSidebar && savedOpen);
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => setOpen(target));
        });
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
        // Once per page: later changes come from the user's own toggle.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return (
        <SidebarProvider
            open={open}
            onOpenChange={(value) => {
                setOpen(value);
                // The user chose for themselves; don't auto-expand on the next page.
                writeAutoCollapsed(false);
            }}
            className="h-svh overflow-hidden"
        >
            {children}
        </SidebarProvider>
    );
}
