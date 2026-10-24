import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    collapseSidebar = false,
}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
    collapseSidebar?: boolean;
}>) {
    return (
        <AppShell variant="sidebar" collapseSidebar={collapseSidebar}>
            <AppSidebar />
            <AppContent variant="sidebar">
                <OfflineBanner />
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/* Single scroll container — the one main scrollbar for every page */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
