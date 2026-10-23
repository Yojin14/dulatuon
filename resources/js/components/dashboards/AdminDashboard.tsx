import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, BookOpen, ChevronRight, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { ChartCard, DonutChart, TrendArea } from './shared';

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

const DESTINATIONS: { href: string; icon: LucideIcon; label: string; sub: string }[] = [
    { href: '/admin/users', icon: Users, label: 'Users', sub: 'Accounts, approvals and access' },
    { href: '/courses', icon: BookOpen, label: 'Courses', sub: 'Create courses and assign teachers' },
    { href: '/admin/roles', icon: ShieldCheck, label: 'Roles', sub: 'Who can do what' },
    { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', sub: 'Engagement and performance' },
];

export default function AdminDashboard({ stats, enrollmentTrend, usersByRole }: AdminDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const firstName = auth.user.firstname || auth.user.name.split(' ')[0];

    const vitals = [
        { label: 'Users', value: stats.totalUsers.toLocaleString(), detail: `${stats.totalStudents} students · ${stats.totalTeachers} teachers` },
        { label: 'Enrollments', value: stats.totalEnrollments.toLocaleString(), detail: `${stats.activeEnrollmentAvg}% average progress` },
        { label: 'Active courses', value: stats.activeCourses.toLocaleString(), detail: `of ${stats.totalCourses} total` },
        { label: 'Pending', value: stats.pendingTotal.toLocaleString(), detail: stats.pendingTotal > 0 ? 'need your review' : 'all clear', alert: stats.pendingTotal > 0 },
    ];

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title={`Welcome back, ${firstName}.`}
                description={stats.pendingTotal > 0 ? `${stats.pendingTotal} ${stats.pendingTotal === 1 ? 'item needs' : 'items need'} your review.` : 'Everything is running normally.'}
                actions={
                    stats.pendingTotal > 0 && (
                        <Button asChild size="lg">
                            <Link href="/admin/users">Review pending</Link>
                        </Button>
                    )
                }
            />

            <div className="mx-auto max-w-[1600px] space-y-8 px-5 pt-8 sm:px-8">
                {/* Vitals: one dense strip rather than a row of hero cards */}
                <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border bg-card shadow-panel lg:grid-cols-4">
                    {vitals.map((v, i) => (
                        <div key={v.label} className={`p-5 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                            <dt className="text-sm font-bold text-muted-foreground">{v.label}</dt>
                            <dd className={`mt-1 font-display text-3xl font-extrabold tracking-[-0.03em] tabular-nums ${v.alert ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
                                {v.value}
                            </dd>
                            <dd className="mt-0.5 truncate text-sm text-muted-foreground">{v.detail}</dd>
                        </div>
                    ))}
                </dl>

                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <ChartCard title="Enrollments" subtitle="New enrollments over the last 14 days">
                            <TrendArea data={enrollmentTrend.map((p) => ({ label: p.date, value: p.value }))} color="#7c3aed" gradientId="g-admin-enroll" />
                        </ChartCard>
                    </div>
                    <ChartCard title="Users by role" subtitle="Approved accounts">
                        <DonutChart data={usersByRole} />
                    </ChartCard>
                </div>

                <section aria-labelledby="manage-title">
                    <h2 id="manage-title" className="text-xl font-bold tracking-[-0.02em]">
                        Manage
                    </h2>
                    <ul className="mt-4 grid divide-y rounded-3xl border bg-card shadow-panel sm:grid-cols-2 sm:divide-y-0">
                        {DESTINATIONS.map(({ href, icon: Icon, label, sub }, i) => (
                            <li key={href} className={`${i >= 2 ? 'sm:border-t' : ''} ${i % 2 === 1 ? 'sm:border-l' : ''}`}>
                                <Link href={href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/50">
                                    <Icon className="size-5 shrink-0 text-primary" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold">{label}</span>
                                        <span className="block truncate text-sm text-muted-foreground">{sub}</span>
                                    </span>
                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
