import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    ClipboardText,
    GraduationCap,
    ShieldCheck,
    Users,
} from '@phosphor-icons/react';
import {
    ChartCard,
    DonutChart,
    PortalHeader,
    SectionHeader,
    StatCard,
    TrendArea,
} from './shared';

interface CategoryPoint {
    name: string;
    value: number;
}

interface DailyPoint {
    date: string;
    value: number;
}

export interface AdminDashboardProps {
    stats: {
        totalUsers: number;
        totalStudents: number;
        totalTeachers: number;
        activeCourses: number;
        totalCourses: number;
        totalEnrollments: number;
        pendingTotal: number;
        activeEnrollmentAvg: number;
    };
    enrollmentTrend: DailyPoint[];
    usersByRole: CategoryPoint[];
}

const QUICK_LINKS = [
    { href: '/admin/users', icon: Users, label: 'User Management', sub: 'Manage accounts & roles' },
    { href: '/class-management', icon: BookOpen, label: 'Class Management', sub: 'View and manage classes' },
    { href: '/admin/roles', icon: ShieldCheck, label: 'Role Management', sub: 'Assign permissions' },
    { href: '/admin/analytics', icon: ClipboardText, label: 'Analytics & Reports', sub: 'Platform insights' },
];

export default function AdminDashboard({
    stats,
    enrollmentTrend,
    usersByRole,
}: AdminDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const firstName = auth.user.firstname || auth.user.name.split(' ')[0];

    return (
        <div className="min-h-full bg-white dark:bg-gray-950">
            <PortalHeader
                portal="Admin Portal"
                title={`Welcome back, ${firstName}.`}
                subtitle={
                    stats.pendingTotal > 0
                        ? `${stats.pendingTotal} item${stats.pendingTotal !== 1 ? 's' : ''} pending your review.`
                        : 'System is running normally.'
                }
            />

            <div className="space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8 lg:px-8">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Total Users"
                        value={stats.totalUsers}
                        hint={`${stats.totalStudents} students · ${stats.totalTeachers} teachers`}
                        icon={Users}
                    />
                    <StatCard
                        label="Enrollments"
                        value={stats.totalEnrollments.toLocaleString()}
                        hint={`${stats.activeEnrollmentAvg}% avg progress`}
                        icon={GraduationCap}
                    />
                    <StatCard
                        label="Active Courses"
                        value={stats.activeCourses}
                        hint={`of ${stats.totalCourses} total`}
                        icon={BookOpen}
                    />
                    <StatCard
                        label="Pending"
                        value={stats.pendingTotal}
                        hint="approvals needed"
                        icon={ClipboardText}
                        accent={stats.pendingTotal > 0}
                    />
                </div>

                {/* Charts */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <ChartCard title="Enrollments" subtitle="New enrollments over the last 14 days">
                            <TrendArea
                                data={enrollmentTrend.map((p) => ({ label: p.date, value: p.value }))}
                                color="#2563eb"
                                gradientId="g-admin-enroll"
                            />
                        </ChartCard>
                    </div>

                    <ChartCard title="Users by Role" subtitle="Approved accounts">
                        <DonutChart data={usersByRole} />
                    </ChartCard>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <SectionHeader title="Quick Actions" />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {QUICK_LINKS.map(({ href, icon: Icon, label, sub }) => (
                            <Link key={href} href={href}>
                                <div className="group flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
                                    <Icon className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" weight="light" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                                        <p className="hidden text-xs text-gray-400 sm:block">{sub}</p>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-400" weight="bold" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
