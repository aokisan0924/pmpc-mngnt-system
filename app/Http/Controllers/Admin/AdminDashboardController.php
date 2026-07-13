<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DtrLog;
use App\Models\DtrEditRequest;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $today         = today();
        $startOfMonth  = now()->startOfMonth();
        $endOfMonth    = now()->endOfMonth();

        // ── KPI cards ──────────────────────────────────────
        $totalEmployees  = Employee::where('role', 'employee')->count();
        $activeEmployees = Employee::where('role', 'employee')->where('status', 'active')->count();
        $pendingEdits    = DtrEditRequest::where('status', 'pending')->count();

        // Today's attendance
        $presentToday = DtrLog::where('date', $today)
            ->whereNotIn('status', ['absent'])
            ->whereHas('employee', fn($q) => $q->where('role', 'employee')->where('status', 'active'))
            ->count();

        $lateToday = DtrLog::where('date', $today)
            ->where('status', 'late')
            ->whereHas('employee', fn($q) => $q->where('role', 'employee')->where('status', 'active'))
            ->count();

        $absentToday = $activeEmployees - $presentToday;

        // Latest payroll
        $latestPayroll = Payroll::where('status', 'finalized')
            ->orderByDesc('period_from')
            ->first();

        // ── Chart 1: Today's attendance snapshot ───────────
        $todaySnapshot = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->get()
            ->map(function ($emp) use ($today) {
                $log = DtrLog::where('employee_id', $emp->id)
                    ->where('date', $today)
                    ->first();

                return [
                    'id'          => $emp->id,
                    'full_name'   => $emp->full_name,
                    'initials'    => $emp->initials,
                    'department'  => $emp->department ?? 'Unassigned',
                    'am_time_in'  => $log?->am_time_in,
                    'am_time_out' => $log?->am_time_out,
                    'pm_time_in'  => $log?->pm_time_in,
                    'pm_time_out' => $log?->pm_time_out,
                    'status'      => $log?->status ?? 'absent',
                    'hours'       => $log?->hours_rendered ?? 0,
                ];
            })
            ->sortBy(fn($e) => match($e['status']) {
                'on_time'   => 0,
                'late'      => 1,
                'undertime' => 2,
                'half_day'  => 3,
                'absent'    => 4,
                default     => 5,
            })
            ->values();

        // ── Chart 2: Monthly attendance rate trend (last 6 months) ──
        $monthlyAttendance = collect(range(5, 0))->map(function ($i) use ($activeEmployees) {
            $month     = now()->subMonths($i);
            $from      = $month->copy()->startOfMonth();
            $to        = $month->copy()->endOfMonth();
            $workDays  = $this->countWeekdays($from, $to);
            $totalPossible = $activeEmployees * $workDays;

            $daysPresent = DtrLog::whereBetween('date', [$from, $to])
                ->whereNotIn('status', ['absent'])
                ->whereHas('employee', fn($q) => $q->where('role', 'employee'))
                ->count();

            $daysLate = DtrLog::whereBetween('date', [$from, $to])
                ->where('status', 'late')
                ->whereHas('employee', fn($q) => $q->where('role', 'employee'))
                ->count();

            $rate = $totalPossible > 0
                ? round($daysPresent / $totalPossible * 100, 1)
                : 0;

            return [
                'month'       => $month->format('M Y'),
                'month_short' => $month->format('M'),
                'rate'        => $rate,
                'present'     => $daysPresent,
                'late'        => $daysLate,
                'absent'      => max(0, $totalPossible - $daysPresent),
                'work_days'   => $workDays,
            ];
        })->values();

        // ── Chart 3: Department attendance comparison (this month) ──
        $departmentAttendance = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->select(DB::raw("COALESCE(department, 'Unassigned') as department"), DB::raw('COUNT(*) as headcount'))
            ->groupBy('department')
            ->get()
            ->map(function ($dept) use ($startOfMonth, $endOfMonth) {
                $empIds = Employee::where('role', 'employee')
                    ->where('status', 'active')
                    ->where(DB::raw("COALESCE(department, 'Unassigned')"), $dept->department)
                    ->pluck('id');

                $present = DtrLog::whereIn('employee_id', $empIds)
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->whereNotIn('status', ['absent'])
                    ->count();

                $late = DtrLog::whereIn('employee_id', $empIds)
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->where('status', 'late')
                    ->count();

                $absent = DtrLog::whereIn('employee_id', $empIds)
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->where('status', 'absent')
                    ->count();

                return [
                    'department' => $dept->department,
                    'headcount'  => $dept->headcount,
                    'present'    => $present,
                    'late'       => $late,
                    'absent'     => $absent,
                ];
            })
            ->sortByDesc('present')
            ->values();

        // ── Chart 4: Payroll trend (last 6 months) ─────────
        $payrollTrend = PayrollItem::query()
            ->join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
            ->where('payrolls.status', 'finalized')
            ->where('payrolls.period_from', '>=', now()->subMonths(5)->startOfMonth())
            ->select(
                DB::raw("DATE_FORMAT(payrolls.period_from, '%Y-%m') as month"),
                DB::raw("DATE_FORMAT(payrolls.period_from, '%b %Y') as month_label"),
                DB::raw('SUM(payroll_items.gross_pay) as total_gross'),
                DB::raw('SUM(payroll_items.total_deductions) as total_deductions'),
                DB::raw('SUM(payroll_items.net_pay) as total_net'),
                DB::raw('COUNT(DISTINCT payroll_items.employee_id) as headcount'),
            )
            ->groupBy('month', 'month_label')
            ->orderBy('month')
            ->get()
            ->map(fn($r) => [
                'month'            => $r->month_label,
                'total_gross'      => round($r->total_gross, 2),
                'total_deductions' => round($r->total_deductions, 2),
                'total_net'        => round($r->total_net, 2),
                'headcount'        => $r->headcount,
            ]);

        // ── Chart 5: Headcount status breakdown ────────────
        $headcountBreakdown = [
            ['label' => 'Active',   'value' => $activeEmployees,                      'color' => '#0F6E56'],
            ['label' => 'Inactive', 'value' => $totalEmployees - $activeEmployees,     'color' => '#E5E7EB'],
            ['label' => 'Present',  'value' => $presentToday,                          'color' => '#10B981'],
            ['label' => 'Late',     'value' => $lateToday,                             'color' => '#F59E0B'],
            ['label' => 'Absent',   'value' => max(0, $absentToday),                   'color' => '#EF4444'],
        ];

        // ── Recent activity ─────────────────────────────────
        $recentActivity = collect();

        DtrEditRequest::with(['employee', 'reviewer'])
            ->whereIn('status', ['approved', 'declined'])
            ->orderByDesc('reviewed_at')
            ->limit(5)
            ->get()
            ->each(function ($r) use (&$recentActivity) {
                $recentActivity->push([
                    'type'    => $r->status === 'approved' ? 'approved' : 'declined',
                    'message' => "DTR edit for {$r->employee->full_name} {$r->status}",
                    'time'    => $r->reviewed_at?->diffForHumans() ?? '—',
                    'color'   => $r->status === 'approved' ? 'emerald' : 'red',
                ]);
            });

        Employee::where('role', 'employee')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get()
            ->each(function ($e) use (&$recentActivity) {
                $recentActivity->push([
                    'type'    => 'new_employee',
                    'message' => "New employee {$e->full_name} ({$e->employee_id}) added",
                    'time'    => $e->created_at->diffForHumans(),
                    'color'   => 'blue',
                ]);
            });

        $recentActivity = $recentActivity->sortByDesc('time')->take(8)->values();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_employees'  => $totalEmployees,
                'active_employees' => $activeEmployees,
                'present_today'    => $presentToday,
                'late_today'       => $lateToday,
                'absent_today'     => max(0, $absentToday),
                'pending_edits'    => $pendingEdits,
                'latest_payroll'   => $latestPayroll ? [
                    'period_label' => $latestPayroll->period_label,
                    'total_net'    => PayrollItem::where('payroll_id', $latestPayroll->id)->sum('net_pay'),
                ] : null,
            ],
            'today_snapshot'       => $todaySnapshot,
            'monthly_attendance'   => $monthlyAttendance,
            'department_attendance'=> $departmentAttendance,
            'payroll_trend'        => $payrollTrend,
            'headcount_breakdown'  => $headcountBreakdown,
            'recent_activity'      => $recentActivity,
        ]);
    }

    private function countWeekdays(Carbon $from, Carbon $to): int
    {
        $count = 0;
        $current = $from->copy();
        while ($current->lte($to)) {
            if (! $current->isWeekend()) $count++;
            $current->addDay();
        }
        return $count;
    }
}