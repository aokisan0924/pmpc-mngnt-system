<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DtrEditRequest;
use App\Models\DtrLog;
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
        $today = today();
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();

        // ── KPI cards ──────────────────────────────────────
        $totalEmployees = Employee::where('is_staff', true)->count();
        $activeEmployees = Employee::where('is_staff', true)->where('status', 'active')->count();
        $pendingEdits = DtrEditRequest::where('status', 'pending')->count();

        // Today's attendance
        $presentToday = DtrLog::where('date', $today)
            ->whereNotIn('status', ['absent'])
            ->whereHas('employee', fn ($q) => $q->where('is_staff', true)->where('status', 'active'))
            ->count();

        $lateToday = DtrLog::where('date', $today)
            ->where('status', 'late')
            ->whereHas('employee', fn ($q) => $q->where('is_staff', true)->where('status', 'active'))
            ->count();

        $absentToday = $activeEmployees - $presentToday;

        // ── Active Semi-Monthly Cutoff Milestone ────────────
        $now = now();
        $isFirstCutoff = $now->day <= 15;
        if ($isFirstCutoff) {
            $cutoffKey = 'first';
            $cutoffName = '1st Cutoff';
            $cutoffStart = $now->copy()->startOfMonth();
            $cutoffEnd = $now->copy()->day(15)->endOfDay();
            $cutoffLabel = '1st Cutoff ('.$cutoffStart->format('M 1').'–15)';
        } else {
            $cutoffKey = 'second';
            $cutoffName = '2nd Cutoff';
            $cutoffStart = $now->copy()->day(16)->startOfDay();
            $cutoffEnd = $now->copy()->endOfMonth();
            $cutoffLabel = '2nd Cutoff ('.$cutoffStart->format('M 16').'–'.$cutoffEnd->format('d').')';
        }

        $daysRemaining = max(0, $now->copy()->startOfDay()->diffInDays($cutoffEnd->copy()->startOfDay(), false));

        // Check if payroll batch exists for this current cutoff
        $activePayrollBatch = Payroll::where('period_from', $cutoffStart->toDateString())
            ->where('cutoff', $cutoffKey)
            ->first();

        $cutoffStatus = $activePayrollBatch ? $activePayrollBatch->status : 'unprocessed';

        // Current Shift Phase in Manila
        $currentTime = $now->format('H:i');
        $shiftPhase = match (true) {
            $currentTime < '08:00' => 'Pre-Shift Window',
            $currentTime >= '08:00' && $currentTime < '12:00' => 'Morning Shift Active',
            $currentTime >= '12:00' && $currentTime < '13:00' => 'Lunch Break Interval',
            $currentTime >= '13:00' && $currentTime < '17:00' => 'Afternoon Shift Active',
            default => 'Evening / Post-Shift',
        };

        // Latest finalized payroll
        $latestPayroll = Payroll::where('status', 'finalized')
            ->orderByDesc('period_from')
            ->first();

        // ── Chart 1: Today's attendance snapshot ───────────
        $todaySnapshot = Employee::where('is_staff', true)
            ->where('status', 'active')
            ->get()
            ->map(function ($emp) use ($today) {
                $log = DtrLog::where('employee_id', $emp->id)
                    ->where('date', $today)
                    ->first();

                return [
                    'id' => $emp->id,
                    'full_name' => $emp->full_name,
                    'initials' => $emp->initials,
                    'department' => $emp->department ?? 'Unassigned',
                    'am_time_in' => $log?->am_time_in,
                    'am_time_out' => $log?->am_time_out,
                    'pm_time_in' => $log?->pm_time_in,
                    'pm_time_out' => $log?->pm_time_out,
                    'status' => $log?->status ?? 'absent',
                    'hours' => $log?->hours_rendered ?? 0,
                ];
            })
            ->sortBy(fn ($e) => match ($e['status']) {
                'on_time' => 0,
                'late' => 1,
                'undertime' => 2,
                'half_day' => 3,
                'absent' => 4,
                default => 5,
            })
            ->values();

        // ── Chart 2: Monthly attendance rate trend (last 6 months) ──
        $monthlyAttendance = collect(range(5, 0))->map(function ($i) use ($activeEmployees) {
            $month = now()->subMonths($i);
            $from = $month->copy()->startOfMonth();
            $to = $month->copy()->endOfMonth();
            $workDays = $this->countWeekdays($from, $to);
            $totalPossible = $activeEmployees * $workDays;

            $daysPresent = DtrLog::whereBetween('date', [$from, $to])
                ->whereNotIn('status', ['absent'])
                ->whereHas('employee', fn ($q) => $q->where('is_staff', true))
                ->count();

            $daysLate = DtrLog::whereBetween('date', [$from, $to])
                ->where('status', 'late')
                ->whereHas('employee', fn ($q) => $q->where('is_staff', true))
                ->count();

            $rate = $totalPossible > 0
                ? round($daysPresent / $totalPossible * 100, 1)
                : 0;

            return [
                'month' => $month->format('M Y'),
                'month_short' => $month->format('M'),
                'rate' => $rate,
                'present' => $daysPresent,
                'late' => $daysLate,
                'absent' => max(0, $totalPossible - $daysPresent),
                'work_days' => $workDays,
            ];
        })->values();

        // ── Chart 3: Department attendance comparison (this month + today) ──
        $departmentAttendance = Employee::where('is_staff', true)
            ->where('status', 'active')
            ->select(DB::raw("COALESCE(department, 'Unassigned') as department"), DB::raw('COUNT(*) as headcount'))
            ->groupBy('department')
            ->get()
            ->map(function ($dept) use ($startOfMonth, $endOfMonth, $today) {
                $empIds = Employee::where('is_staff', true)
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

                $todayPresent = DtrLog::whereIn('employee_id', $empIds)
                    ->where('date', $today)
                    ->whereNotIn('status', ['absent'])
                    ->count();

                $todayTurnout = $dept->headcount > 0
                    ? round(($todayPresent / $dept->headcount) * 100)
                    : 0;

                return [
                    'department' => $dept->department,
                    'headcount' => $dept->headcount,
                    'present' => $present,
                    'late' => $late,
                    'absent' => $absent,
                    'today_present' => $todayPresent,
                    'turnout_rate' => $todayTurnout,
                ];
            })
            ->sortByDesc('headcount')
            ->values();

        // ── Chart 4: Payroll trend (last 6 months) ─────────
        $payrollTrend = PayrollItem::query()
            ->join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
            ->where('payrolls.status', 'finalized')
            ->where('payrolls.period_from', '>=', now()->subMonths(5)->startOfMonth())
            ->select(
                DB::raw(DB::getDriverName() === 'sqlite'
                    ? "strftime('%Y-%m', payrolls.period_from) as month"
                    : "DATE_FORMAT(payrolls.period_from, '%Y-%m') as month"),
                DB::raw(DB::getDriverName() === 'sqlite'
                    ? "strftime('%m/%Y', payrolls.period_from) as month_label"
                    : "DATE_FORMAT(payrolls.period_from, '%b %Y') as month_label"),
                DB::raw('SUM(payroll_items.gross_pay) as total_gross'),
                DB::raw('SUM(payroll_items.total_deductions) as total_deductions'),
                DB::raw('SUM(payroll_items.net_pay) as total_net'),
                DB::raw('COUNT(DISTINCT payroll_items.employee_id) as headcount'),
            )
            ->groupBy('month', 'month_label')
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month' => $r->month_label,
                'total_gross' => round($r->total_gross, 2),
                'total_deductions' => round($r->total_deductions, 2),
                'total_net' => round($r->total_net, 2),
                'headcount' => $r->headcount,
            ]);

        // ── Statutory & Compensation Breakdown ─────────────
        $latestFinalizedPayroll = Payroll::where('status', 'finalized')->latest('period_to')->first();
        if ($latestFinalizedPayroll) {
            $payrollCostSummary = [
                'has_finalized' => true,
                'period_label' => $latestFinalizedPayroll->period_label,
                'total_gross' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('gross_pay'),
                'total_net' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('net_pay'),
                'total_deductions' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('total_deductions'),
                'sss' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('sss_deduction'),
                'philhealth' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('philhealth_deduction'),
                'pagibig' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('pagibig_deduction'),
                'tax' => (float) PayrollItem::where('payroll_id', $latestFinalizedPayroll->id)->sum('tax_deduction'),
                'avg_daily_rate' => (float) (Employee::where('is_staff', true)->where('status', 'active')->avg('daily_rate') ?? 0),
            ];
        } else {
            $activeStaffMembers = Employee::where('is_staff', true)->where('status', 'active')->get();
            $payrollCostSummary = [
                'has_finalized' => false,
                'period_label' => 'Active Roster Projections',
                'total_gross' => (float) ($activeStaffMembers->sum('daily_rate') * 22),
                'total_net' => 0.0,
                'total_deductions' => (float) ($activeStaffMembers->sum('sss_deduction') + $activeStaffMembers->sum('philhealth_deduction') + $activeStaffMembers->sum('pagibig_deduction') + $activeStaffMembers->sum('tax_deduction')),
                'sss' => (float) $activeStaffMembers->sum('sss_deduction'),
                'philhealth' => (float) $activeStaffMembers->sum('philhealth_deduction'),
                'pagibig' => (float) $activeStaffMembers->sum('pagibig_deduction'),
                'tax' => (float) $activeStaffMembers->sum('tax_deduction'),
                'avg_daily_rate' => (float) ($activeStaffMembers->avg('daily_rate') ?? 0),
            ];
        }

        // ── Chart 5: Headcount status breakdown ────────────
        $headcountBreakdown = [
            ['label' => 'Active',   'value' => $activeEmployees,                      'color' => '#0F6E56'],
            ['label' => 'Inactive', 'value' => $totalEmployees - $activeEmployees,     'color' => '#E5E7EB'],
            ['label' => 'Present',  'value' => $presentToday,                          'color' => '#10B981'],
            ['label' => 'Late',     'value' => $lateToday,                             'color' => '#F59E0B'],
            ['label' => 'Absent',   'value' => max(0, $absentToday),                   'color' => '#EF4444'],
        ];

        // ── Pending DTR Edit Requests Triage ───────────────
        $pendingEditRequests = DtrEditRequest::with(['employee', 'dtrLog'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee_name' => $r->employee->full_name,
                'employee_id' => $r->employee->employee_id,
                'initials' => $r->employee->initials,
                'department' => $r->employee->department ?? 'Unassigned',
                'date' => $r->dtrLog->date->format('M d, Y'),
                'original_am_time_in' => $r->original_am_time_in ? substr($r->original_am_time_in, 0, 5) : null,
                'original_am_time_out' => $r->original_am_time_out ? substr($r->original_am_time_out, 0, 5) : null,
                'original_pm_time_in' => $r->original_pm_time_in ? substr($r->original_pm_time_in, 0, 5) : null,
                'original_pm_time_out' => $r->original_pm_time_out ? substr($r->original_pm_time_out, 0, 5) : null,
                'requested_am_time_in' => $r->requested_am_time_in ? substr($r->requested_am_time_in, 0, 5) : null,
                'requested_am_time_out' => $r->requested_am_time_out ? substr($r->requested_am_time_out, 0, 5) : null,
                'requested_pm_time_in' => $r->requested_pm_time_in ? substr($r->requested_pm_time_in, 0, 5) : null,
                'requested_pm_time_out' => $r->requested_pm_time_out ? substr($r->requested_pm_time_out, 0, 5) : null,
                'reason' => $r->reason,
                'submitted_at' => $r->created_at->diffForHumans(),
            ]);

        // ── Recent activity ─────────────────────────────────
        $recentActivity = collect();

        DtrEditRequest::with(['employee', 'reviewer'])
            ->whereIn('status', ['approved', 'declined'])
            ->orderByDesc('reviewed_at')
            ->limit(5)
            ->get()
            ->each(function ($r) use (&$recentActivity) {
                $recentActivity->push([
                    'type' => $r->status === 'approved' ? 'approved' : 'declined',
                    'message' => "DTR edit for {$r->employee->full_name} {$r->status}",
                    'time' => $r->reviewed_at?->diffForHumans() ?? '—',
                    'color' => $r->status === 'approved' ? 'emerald' : 'red',
                ]);
            });

        Employee::where('is_staff', true)
            ->orderByDesc('created_at')
            ->limit(3)
            ->get()
            ->each(function ($e) use (&$recentActivity) {
                $recentActivity->push([
                    'type' => 'new_employee',
                    'message' => "New employee {$e->full_name} ({$e->employee_id}) added",
                    'time' => $e->created_at->diffForHumans(),
                    'color' => 'blue',
                ]);
            });

        $recentActivity = $recentActivity->sortByDesc('time')->take(8)->values();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_employees' => $totalEmployees,
                'active_employees' => $activeEmployees,
                'present_today' => $presentToday,
                'late_today' => $lateToday,
                'absent_today' => max(0, $absentToday),
                'pending_edits' => $pendingEdits,
                'latest_payroll' => $latestPayroll ? [
                    'period_label' => $latestPayroll->period_label,
                    'total_net' => PayrollItem::where('payroll_id', $latestPayroll->id)->sum('net_pay'),
                ] : null,
            ],
            'active_cutoff' => [
                'key' => $cutoffKey,
                'name' => $cutoffName,
                'label' => $cutoffLabel,
                'period_from' => $cutoffStart->toDateString(),
                'period_to' => $cutoffEnd->toDateString(),
                'days_remaining' => $daysRemaining,
                'status' => $cutoffStatus,
                'payroll_id' => $activePayrollBatch?->id,
            ],
            'shift_phase' => $shiftPhase,
            'today_snapshot' => $todaySnapshot,
            'monthly_attendance' => $monthlyAttendance,
            'department_attendance' => $departmentAttendance,
            'payroll_trend' => $payrollTrend,
            'payroll_cost_summary' => $payrollCostSummary,
            'headcount_breakdown' => $headcountBreakdown,
            'pending_edit_requests' => $pendingEditRequests,
            'recent_activity' => $recentActivity,
        ]);
    }

    private function countWeekdays(Carbon $from, Carbon $to): int
    {
        $count = 0;
        $current = $from->copy();
        while ($current->lte($to)) {
            if (! $current->isWeekend()) {
                $count++;
            }
            $current->addDay();
        }

        return $count;
    }
}
