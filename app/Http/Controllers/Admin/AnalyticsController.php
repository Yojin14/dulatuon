<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $period = $request->get('period', '30d');

        $analytics = Cache::remember(
            "analytics:{$period}",
            now()->addMinutes(5),
            fn () => $this->buildAnalytics($period),
        );

        return Inertia::render('admin/analytics/index', [
            'analytics' => $analytics,
            'period' => $period,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAnalytics(string $period): array
    {
        [$startDate, $prevStartDate, $days] = $this->periodDates($period);

        // ── Overview ──────────────────────────────────────────────────────────
        $totalUsers = User::where('status', 'approved')->count();
        $currentNewUsers = User::where('status', 'approved')->where('created_at', '>=', $startDate)->count();
        $prevNewUsers = User::where('status', 'approved')->whereBetween('created_at', [$prevStartDate, $startDate])->count();
        $userGrowth = $this->growthRate($currentNewUsers, $prevNewUsers);

        $totalCourses = DB::table('courses')->count();
        $currentCourses = DB::table('courses')->where('created_at', '>=', $startDate)->count();
        $prevCourses = DB::table('courses')->whereBetween('created_at', [$prevStartDate, $startDate])->count();
        $courseGrowth = $this->growthRate($currentCourses, $prevCourses);

        $totalEnrollments = DB::table('enrollments')->count();
        $currentEnrollments = DB::table('enrollments')->where('created_at', '>=', $startDate)->count();
        $prevEnrollments = DB::table('enrollments')->whereBetween('created_at', [$prevStartDate, $startDate])->count();
        $enrollmentGrowth = $this->growthRate($currentEnrollments, $prevEnrollments);

        $totalAssignments = DB::table('assignments')->count();
        $currentAssignments = DB::table('assignments')->where('created_at', '>=', $startDate)->count();
        $prevAssignments = DB::table('assignments')->whereBetween('created_at', [$prevStartDate, $startDate])->count();
        $assignmentGrowth = $this->growthRate($currentAssignments, $prevAssignments);

        // ── User engagement ──────────────────────────────────────────────────
        $newUsersThisMonth = User::where('status', 'approved')->where('created_at', '>=', now()->startOfMonth())->count();
        $activeUsersToday = User::where('status', 'approved')->where('is_active', true)->whereDate('updated_at', today())->count();
        $activeUsersThisWeek = User::where('status', 'approved')->where('is_active', true)->where('updated_at', '>=', now()->startOfWeek())->count();
        $userEngagement = $totalUsers > 0 ? round($activeUsersThisWeek / $totalUsers * 100, 1) : 0;

        // ── Course performance ───────────────────────────────────────────────
        $publishedCourses = DB::table('courses')->where('status', 'published')->count();
        $draftCourses = DB::table('courses')->where('status', 'draft')->count();

        $completionRate = DB::table('enrollments')->where('status', 'active')->avg('progress_percentage');
        $completionRate = $completionRate !== null ? round((float) $completionRate, 1) : 0;

        $averageRating = DB::table('courses')->whereNotNull('rating')->avg('rating');
        $averageRating = $averageRating !== null ? round((float) $averageRating, 2) : 0;

        // ── Charts ───────────────────────────────────────────────────────────
        $userSignupsSeries = $this->dailySeries('users', 'created_at', $startDate, $days, ['status' => 'approved']);
        $enrollmentSeries = $this->dailySeries('enrollments', 'created_at', $startDate, $days);

        $usersByRole = DB::table('users')
            ->where('status', 'approved')
            ->select('role', DB::raw('count(*) as value'))
            ->groupBy('role')
            ->get()
            ->map(fn ($r) => ['name' => ucfirst($r->role ?? 'unknown'), 'value' => (int) $r->value])
            ->toArray();

        $coursesByStatus = DB::table('courses')
            ->select('status', DB::raw('count(*) as value'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => ['name' => ucfirst($r->status ?? 'unknown'), 'value' => (int) $r->value])
            ->toArray();

        $enrollmentsByStatus = DB::table('enrollments')
            ->select('status', DB::raw('count(*) as value'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => ['name' => ucfirst($r->status ?? 'unknown'), 'value' => (int) $r->value])
            ->toArray();

        // ── Top courses (by enrolment count) ─────────────────────────────────
        $topCourses = DB::table('courses')
            ->leftJoin('users', 'users.id', '=', 'courses.instructor_id')
            ->leftJoin('enrollments', 'enrollments.course_id', '=', 'courses.id')
            ->select(
                'courses.id',
                'courses.title',
                'courses.rating',
                'users.name as instructor',
                DB::raw('COUNT(DISTINCT enrollments.id) as enrolled_students'),
                DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percentage), 1), 0) as completion_rate'),
            )
            ->groupBy('courses.id', 'courses.title', 'courses.rating', 'users.name')
            ->orderByDesc('enrolled_students')
            ->limit(5)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title ?? 'Untitled',
                'instructor' => $c->instructor ?? 'Unassigned',
                'enrolledStudents' => (int) $c->enrolled_students,
                'completionRate' => (float) $c->completion_rate,
                'rating' => $c->rating !== null ? (float) $c->rating : 0,
            ])
            ->toArray();

        return [
            'overview' => [
                'totalUsers' => $totalUsers,
                'totalCourses' => $totalCourses,
                'totalEnrollments' => $totalEnrollments,
                'totalAssignments' => $totalAssignments,
                'userGrowth' => $userGrowth,
                'courseGrowth' => $courseGrowth,
                'enrollmentGrowth' => $enrollmentGrowth,
                'assignmentGrowth' => $assignmentGrowth,
            ],
            'userStats' => [
                'newUsersThisMonth' => $newUsersThisMonth,
                'activeUsersToday' => $activeUsersToday,
                'activeUsersThisWeek' => $activeUsersThisWeek,
                'userEngagement' => $userEngagement,
            ],
            'courseStats' => [
                'publishedCourses' => $publishedCourses,
                'draftCourses' => $draftCourses,
                'averageRating' => $averageRating,
                'completionRate' => $completionRate,
            ],
            'charts' => [
                'userSignups' => $userSignupsSeries,
                'enrollments' => $enrollmentSeries,
                'usersByRole' => $usersByRole,
                'coursesByStatus' => $coursesByStatus,
                'enrollmentsByStatus' => $enrollmentsByStatus,
            ],
            'topCourses' => $topCourses,
        ];
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * @return array{0: CarbonInterface, 1: CarbonInterface, 2: int}
     */
    private function periodDates(string $period): array
    {
        $days = match ($period) {
            '7d' => 7,
            '90d' => 90,
            '1y' => 365,
            default => 30,
        };

        return [now()->subDays($days), now()->subDays($days * 2), $days];
    }

    private function growthRate(int $current, int $previous): float
    {
        if ($previous === 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }

    /**
     * Build a daily time series [{date, value}] from a table grouped by DATE(column).
     *
     * @param  array<string, mixed>  $where
     * @return array<int, array{date: string, value: int}>
     */
    private function dailySeries(string $table, string $column, CarbonInterface $start, int $days, array $where = []): array
    {
        $query = DB::table($table)
            ->select(DB::raw("DATE({$column}) as d"), DB::raw('COUNT(*) as value'))
            ->where($column, '>=', $start);

        foreach ($where as $col => $val) {
            $query->where($col, $val);
        }

        $rows = $query->groupBy('d')->pluck('value', 'd');

        return $this->fillDailyGaps($rows->toArray(), $start, $days);
    }

    /**
     * @param  array<string, int>  $rows
     * @return array<int, array{date: string, value: int}>
     */
    private function fillDailyGaps(array $rows, CarbonInterface $start, int $days): array
    {
        $out = [];
        $cursor = CarbonImmutable::parse($start)->startOfDay();
        for ($i = 0; $i < $days; $i++) {
            $key = $cursor->toDateString();
            $out[] = [
                'date' => $cursor->format('M j'),
                'value' => (int) ($rows[$key] ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }
}
