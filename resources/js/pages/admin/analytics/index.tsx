import {
    BarList,
    ChartCard,
    DonutChart,
    ProgressBar,
    SectionHeader,
    STATUS_COLORS,
    TrendArea,
} from '@/components/dashboards/shared';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Star, TrendingDown, TrendingUp } from 'lucide-react';

interface TopCourse {
    id: number;
    title: string;
    instructor: string;
    enrolledStudents: number;
    completionRate: number;
    rating: number;
}

interface DailyPoint {
    date: string;
    value: number;
}

interface CategoryPoint {
    name: string;
    value: number;
}

interface Analytics {
    overview: {
        totalUsers: number;
        totalCourses: number;
        totalEnrollments: number;
        totalAssignments: number;
        userGrowth: number;
        courseGrowth: number;
        enrollmentGrowth: number;
        assignmentGrowth: number;
    };
    userStats: {
        newUsersThisMonth: number;
        activeUsersToday: number;
        activeUsersThisWeek: number;
        userEngagement: number;
    };
    courseStats: {
        publishedCourses: number;
        draftCourses: number;
        averageRating: number;
        completionRate: number;
    };
    charts: {
        userSignups: DailyPoint[];
        enrollments: DailyPoint[];
        usersByRole: CategoryPoint[];
        coursesByStatus: CategoryPoint[];
        enrollmentsByStatus: CategoryPoint[];
    };
    topCourses: TopCourse[];
}

interface Props {
    analytics: Analytics;
    period: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Analytics & Reports', href: '/admin/analytics' },
];

function StatCard({
    label, value, growth,
}: {
    label: string; value: number | string; growth?: number;
}) {
    const showGrowth = typeof growth === 'number';
    const up = (growth ?? 0) >= 0;
    return (
        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">{value}</p>
            {showGrowth && (
                <div className="mt-1.5 flex items-center gap-1">
                    {up
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                    <p className={`text-xs ${up ? 'text-green-600' : 'text-red-600'}`}>
                        {up ? '+' : ''}{growth}% from last period
                    </p>
                </div>
            )}
        </div>
    );
}

export default function AdminAnalytics({ analytics, period }: Props) {
    const changePeriod = (p: string) =>
        router.get('/admin/analytics', { period: p }, { preserveState: true, replace: true });

    const { overview, userStats, courseStats, charts, topCourses } = analytics;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Analytics & Reports" />
            <div className="min-h-full pb-10">

                {/* Header */}
                <PageHeader title="Analytics" description="Engagement, progress and performance across every course." />

                <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 space-y-8 py-8">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-bold text-muted-foreground">Overview</p>
                        <select
                            value={period}
                            onChange={(e) => changePeriod(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                            <option value="1y">Last year</option>
                        </select>
                    </div>

                    {/* Overview stat cards */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <StatCard label="Total Users"       value={overview.totalUsers.toLocaleString()}        growth={overview.userGrowth} />
                        <StatCard label="Total Courses"     value={overview.totalCourses}                       growth={overview.courseGrowth} />
                        <StatCard label="Enrollments"       value={overview.totalEnrollments.toLocaleString()}  growth={overview.enrollmentGrowth} />
                        <StatCard label="Assignments"       value={overview.totalAssignments}                   growth={overview.assignmentGrowth} />
                    </div>

                    {/* User signups trend */}
                    <ChartCard title="User Signups" subtitle="New approved users per day" height={240}>
                        <TrendArea
                            data={charts.userSignups.map((p) => ({ label: p.date, value: p.value }))}
                            color="#2563eb"
                            gradientId="g-signup"
                        />
                    </ChartCard>

                    {/* Distribution + enrollments */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        <ChartCard title="Users by Role" subtitle="Approved users">
                            <DonutChart data={charts.usersByRole} />
                        </ChartCard>

                        <ChartCard title="Courses by Status">
                            <BarList items={charts.coursesByStatus.map((p) => ({ label: p.name, value: p.value }))} colors={STATUS_COLORS} />
                        </ChartCard>

                        <ChartCard title="Enrollments by Status">
                            <BarList items={charts.enrollmentsByStatus.map((p) => ({ label: p.name, value: p.value }))} colors={STATUS_COLORS} />
                        </ChartCard>
                    </div>

                    {/* Enrollments trend (full width) */}
                    <ChartCard title="Enrollments Over Time" subtitle="New enrollments per day" height={240}>
                        <TrendArea
                            data={charts.enrollments.map((p) => ({ label: p.date, value: p.value }))}
                            color="#7c3aed"
                            gradientId="g-enroll"
                        />
                    </ChartCard>

                    {/* Detail metric sections */}
                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="space-y-4">
                            <SectionHeader title="User Engagement" />
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {([
                                    ['New Users This Month',   userStats.newUsersThisMonth],
                                    ['Active Users Today',     userStats.activeUsersToday],
                                    ['Active Users This Week', userStats.activeUsersThisWeek],
                                    ['Engagement Rate',        `${userStats.userEngagement}%`],
                                ] as [string, string | number][]).map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                        <p className="text-sm font-semibold text-foreground">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <SectionHeader title="Course Performance" />
                            <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                    <div className="sm:w-1/2">
                                        <DonutChart
                                            data={[
                                                { name: 'Published', value: courseStats.publishedCourses },
                                                { name: 'Draft', value: courseStats.draftCourses },
                                            ]}
                                            colors={['#16a34a', '#cbd5e1']}
                                            size={130}
                                        />
                                    </div>
                                    <div className="flex flex-1 flex-col justify-center gap-4">
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Avg Completion</span>
                                                <span className="text-xs font-semibold text-foreground">
                                                    {courseStats.completionRate}%
                                                </span>
                                            </div>
                                            <ProgressBar value={courseStats.completionRate} />
                                        </div>
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Average Rating</span>
                                                <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                                                    <Star className="h-3 w-3 text-amber-400" />
                                                    {courseStats.averageRating ? `${courseStats.averageRating} / 5` : 'N/A'}
                                                </span>
                                            </div>
                                            <ProgressBar value={(courseStats.averageRating / 5) * 100} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Top Performing Courses */}
                    {topCourses.length > 0 && (
                        <div className="space-y-4">
                            <SectionHeader title="Top Courses by Enrollment" />
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                                {topCourses.map((course, index) => (
                                    <div key={course.id} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
                                            <p className="text-xs text-gray-400">{course.instructor}</p>
                                        </div>
                                        <div className="hidden shrink-0 items-center gap-6 sm:flex">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-foreground">{course.enrolledStudents}</p>
                                                <p className="text-xs font-semibold text-muted-foreground">Students</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-foreground">{course.completionRate}%</p>
                                                <p className="text-xs font-semibold text-muted-foreground">Progress</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 text-amber-400" />
                                                <p className="text-sm font-semibold text-foreground">{course.rating || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </AppLayout>
    );
}
