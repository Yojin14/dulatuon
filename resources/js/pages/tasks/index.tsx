import { EmptyState } from '@/components/game/empty-state';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Tasks', href: '/tasks' },
];

export default function TasksIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <PageHeader title="Tasks" description="Your to-dos across every class, in one list." />
            <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8">
                <EmptyState title="Nothing here yet" description="Tasks from your classes will collect here once they're assigned." />
            </div>
        </AppLayout>
    );
}
