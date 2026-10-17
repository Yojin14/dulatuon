import AdminDashboard, { type AdminDashboardProps } from '@/components/dashboards/AdminDashboard';
import StudentDashboard, { type StudentDashboardProps } from '@/components/dashboards/StudentDashboard';
import TeacherDashboard, { type TeacherDashboardProps } from '@/components/dashboards/TeacherDashboard';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

type DashboardData = AdminDashboardProps & TeacherDashboardProps & StudentDashboardProps;

export default function Dashboard() {
    const page = usePage<SharedData & DashboardData>();
    const user = page.props.auth.user;
    const props = page.props;

    const renderDashboard = () => {
        switch (user.role) {
            case 'admin':
                return <AdminDashboard {...(props as AdminDashboardProps)} />;
            case 'teacher':
                return <TeacherDashboard {...(props as TeacherDashboardProps)} />;
            case 'student':
                return <StudentDashboard {...(props as StudentDashboardProps)} />;
            default:
                return <StudentDashboard {...(props as StudentDashboardProps)} />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            {renderDashboard()}
        </AppLayout>
    );
}
