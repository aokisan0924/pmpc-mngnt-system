<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PayrollAnalyticsController extends Controller
{
    public function index(): Response {
        // ── 1. Monthly net pay trend ───────────────────────
        $monthlyTrend = PayrollItem::query()
            ->join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
            ->where('payrolls.status', 'finalized')
            ->select(
                DB::raw("DATE_FORMAT(payrolls.period_from, '%Y-%m') as month"),
                DB::raw('SUM(payroll_items.gross_pay)      as total_gross'),
                DB::raw('SUM(payroll_items.total_deductions) as total_deductions'),
                DB::raw('SUM(payroll_items.net_pay)        as total_net'),
                DB::raw('COUNT(DISTINCT payroll_items.employee_id) as headcount'),
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($r) => [
                'month'            => Carbon::parse($r->month . '-01')->format('M Y'),
                'month_raw'        => $r->month,
                'total_gross'      => round($r->total_gross, 2),
                'total_deductions' => round($r->total_deductions, 2),
                'total_net'        => round($r->total_net, 2),
                'headcount'        => $r->headcount,
            ]);

        // ── 2. Department payroll cost breakdown ───────────
        $departmentBreakdown = PayrollItem::query()
            ->join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
            ->join('employees', 'payroll_items.employee_id', '=', 'employees.id')
            ->where('payrolls.status', 'finalized')
            ->select(
                DB::raw("COALESCE(employees.department, 'Unassigned') as department"),
                DB::raw('SUM(payroll_items.gross_pay)   as total_gross'),
                DB::raw('SUM(payroll_items.net_pay)     as total_net'),
                DB::raw('COUNT(DISTINCT payroll_items.employee_id) as headcount'),
            )
            ->groupBy('department')
            ->orderByDesc('total_gross')
            ->get()
            ->map(fn($r) => [
                'department'  => $r->department,
                'total_gross' => round($r->total_gross, 2),
                'total_net'   => round($r->total_net, 2),
                'headcount'   => $r->headcount,
            ]);

        // ── 3. Deductions breakdown (latest finalized payroll) ──
        $latestPayroll = Payroll::where('status', 'finalized')
            ->orderByDesc('period_from')
            ->first();

        $deductionsBreakdown = [];
        if ($latestPayroll) {
            $deductionsBreakdown = PayrollItem::where('payroll_id', $latestPayroll->id)
                ->join('employees', 'payroll_items.employee_id', '=', 'employees.id')
                ->select(
                    'employees.first_name',
                    'employees.last_name',
                    'employees.department',
                    DB::raw('SUM(payroll_items.sss_deduction)                  as sss'),
                    DB::raw('SUM(payroll_items.philhealth_deduction)            as philhealth'),
                    DB::raw('SUM(payroll_items.pagibig_deduction)               as pagibig'),
                    DB::raw('SUM(payroll_items.tax_deduction)                   as tax'),
                    DB::raw('SUM(payroll_items.loan_deduction)                  as loan'),
                    DB::raw('SUM(payroll_items.capital_contribution_deduction)  as capital_contribution'),
                    DB::raw('SUM(payroll_items.cash_advance_deduction)          as cash_advance'),
                    DB::raw('SUM(payroll_items.savings_deduction)               as savings'),
                    DB::raw('SUM(payroll_items.other_deductions)                as other'),
                    DB::raw('SUM(payroll_items.net_pay)                         as net_pay'),
                )
                ->groupBy('payroll_items.employee_id', 'employees.first_name', 'employees.last_name', 'employees.department')
                ->orderByDesc('net_pay')
                ->get()
                ->map(fn($r) => [
                    'name'                 => "{$r->first_name} {$r->last_name}",
                    'department'           => $r->department ?? 'Unassigned',
                    'sss'                  => round($r->sss, 2),
                    'philhealth'           => round($r->philhealth, 2),
                    'pagibig'              => round($r->pagibig, 2),
                    'tax'                  => round($r->tax, 2),
                    'loan'                 => round($r->loan, 2),
                    'capital_contribution' => round($r->capital_contribution, 2),
                    'cash_advance'         => round($r->cash_advance, 2),
                    'savings'              => round($r->savings, 2),
                    'other'                => round($r->other, 2),
                    'net_pay'              => round($r->net_pay, 2),
                ]);
        }

        // ── 4. KPI summary cards ───────────────────────────
        $kpis = [
            'total_payroll_cost'   => PayrollItem::join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
                ->where('payrolls.status', 'finalized')
                ->sum('payroll_items.gross_pay'),
            'total_net_paid'       => PayrollItem::join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
                ->where('payrolls.status', 'finalized')
                ->sum('payroll_items.net_pay'),
            'total_deductions'     => PayrollItem::join('payrolls', 'payroll_items.payroll_id', '=', 'payrolls.id')
                ->where('payrolls.status', 'finalized')
                ->sum('payroll_items.total_deductions'),
            'total_payrolls'       => Payroll::where('status', 'finalized')->count(),
            'active_employees'     => Employee::where('is_staff', true)->where('status', 'active')->count(),
            'avg_net_per_employee' => 0,
            'latest_period'        => $latestPayroll?->period_label ?? '—',
            'latest_net'           => $latestPayroll
                ? PayrollItem::where('payroll_id', $latestPayroll->id)->sum('net_pay')
                : 0,
        ];

        if ($kpis['active_employees'] > 0) {
            $kpis['avg_net_per_employee'] = $kpis['total_net_paid'] / $kpis['active_employees'];
        }

        // ── 5. Headcount vs payroll cost over time ─────────
        // Already in monthlyTrend — headcount field included

        return Inertia::render('Admin/PayrollAnalytics', [
            'kpis'                => $kpis,
            'monthlyTrend'        => $monthlyTrend,
            'departmentBreakdown' => $departmentBreakdown,
            'deductionsBreakdown' => $deductionsBreakdown,
            'latestPayroll'       => $latestPayroll ? [
                'period_label' => $latestPayroll->period_label,
                'cutoff_label' => $latestPayroll->cutoff === 'first' ? '1st cutoff' : '2nd cutoff',
            ] : null,
        ]);
    }
}