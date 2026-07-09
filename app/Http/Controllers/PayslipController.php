<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class PayslipController extends Controller
{
    // ── Employee views their own payslip history ───────────

    public function index(Request $request): \Inertia\Response {
        $employee = $request->user();

        $payslips = PayrollItem::where('employee_id', $employee->id)
            ->with('payroll')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(fn($item) => Carbon::parse($item->payroll->period_from)->format('Y-m'))
            ->map(function ($items, $month) use ($employee) {
                $first  = $items->firstWhere('cutoff', 'first');
                $second = $items->firstWhere('cutoff', 'second');

                $totalGross = $items->sum('gross_pay');
                $totalDed   = $items->sum('total_deductions');
                $totalNet   = $items->sum('net_pay');

                return [
                    'month'       => $month,
                    'month_label' => Carbon::parse($month . '-01')->format('F Y'),
                    'has_first'   => $first !== null,
                    'has_second'  => $second !== null,
                    'total_gross' => $totalGross,
                    'total_ded'   => $totalDed,
                    'total_net'   => $totalNet,
                    'status'      => ($first?->payroll->status === 'finalized' && $second?->payroll->status === 'finalized')
                        ? 'complete' : 'partial',
                ];
            })
            ->values();

        return Inertia::render('Employee/Payslips', [
            'payslips' => $payslips,
        ]);
    }

    // ── Employee downloads their own payslip ───────────────

    public function download(Request $request, string $month): Response {
        $employee = $request->user();
        return $this->generatePayslipPdf($employee, $month);
    }

    // ── Admin downloads payslip for any employee ───────────

    public function adminDownload(Request $request, Employee $employee): Response {
        $month = $request->get('month', now()->format('Y-m'));
        return $this->generatePayslipPdf($employee, $month);
    }

    // ── Admin downloads all payslips for a payroll batch ──

    public function downloadAll(Request $request): Response|RedirectResponse {
        $month = $request->get('month', now()->format('Y-m'));

        $employees = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->get();

        $settings = Setting::getMany([
            'coop_name', 'coop_address',
            'signatory_1_name', 'signatory_1_role', 'signatory_1_signature',
            'signatory_2_name', 'signatory_2_role', 'signatory_2_signature',
        ]);

        $allData = $employees->map(function ($emp) use ($month, $settings) {
            return $this->buildPayslipData($emp, $month, $settings);
        })->filter(fn($d) => $d !== null)->values();

        if ($allData->isEmpty()) {
            return back()->withErrors(['error' => 'No payroll data found for this month.']);
        }

        $pdf = Pdf::loadView('payslip.all', [
            'payslips' => $allData,
            'settings' => $settings,
            'month'    => Carbon::parse($month . '-01')->format('F Y'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("Payslips_{$month}.pdf");
    }

    // ── Core PDF generator ─────────────────────────────────

    private function generatePayslipPdf(Employee $employee, string $month): Response {
        $settings = Setting::getMany([
            'coop_name', 'coop_address',
            'signatory_1_name', 'signatory_1_role', 'signatory_1_signature',
            'signatory_2_name', 'signatory_2_role', 'signatory_2_signature',
        ]);

        $data = $this->buildPayslipData($employee, $month, $settings);

        if (! $data) {
            abort(404, 'No payroll records found for this employee and month.');
        }

        $pdf = Pdf::loadView('payslip.single', [
            'data'     => $data,
            'settings' => $settings,
        ])->setPaper('a4', 'portrait');

        $filename = "Payslip_{$employee->employee_id}_{$month}.pdf";
        return $pdf->download($filename);
    }

    private function buildPayslipData(Employee $employee, string $month, array $settings): ?array {
        $from = Carbon::parse($month . '-01')->startOfMonth();
        $to   = Carbon::parse($month . '-01')->endOfMonth();

        // Get all payroll items for this employee in this month
        $items = PayrollItem::where('employee_id', $employee->id)
            ->whereHas('payroll', fn($q) => $q
                ->whereBetween('period_from', [$from, $to])
                ->orWhereBetween('period_to', [$from, $to])
            )
            ->with('payroll')
            ->get();

        if ($items->isEmpty()) return null;

        $first  = $items->firstWhere('cutoff', 'first');
        $second = $items->firstWhere('cutoff', 'second');

        // Earnings
        $firstBasic      = $first?->cutoff_basic           ?? 0;
        $firstTranspo    = $first?->cutoff_transpo          ?? 0;
        $firstRep        = $first?->cutoff_rep              ?? 0;
        $firstQuarterly  = $first?->cutoff_quarterly        ?? 0;
        $firstOtWeekday  = $first?->weekday_ot_pay          ?? 0;
        $firstOtWeekend  = $first?->weekend_ot_pay          ?? 0;
        $firstGross      = $first?->gross_pay               ?? 0;

        $secondBasic     = $second?->cutoff_basic           ?? 0;
        $secondTranspo   = $second?->cutoff_transpo         ?? 0;
        $secondRep       = $second?->cutoff_rep             ?? 0;
        $secondQuarterly = $second?->cutoff_quarterly       ?? 0;
        $secondOtWeekday = $second?->weekday_ot_pay         ?? 0;
        $secondOtWeekend = $second?->weekend_ot_pay         ?? 0;
        $secondGross     = $second?->gross_pay              ?? 0;

        $totalGross = $firstGross + $secondGross;

        // Deductions — use whichever cutoff has the value (1st has govt, both have split)
        $sss        = ($first?->sss_deduction          ?? 0) + ($second?->sss_deduction          ?? 0);
        $philhealth = ($first?->philhealth_deduction   ?? 0) + ($second?->philhealth_deduction   ?? 0);
        $pagibig    = ($first?->pagibig_deduction      ?? 0) + ($second?->pagibig_deduction      ?? 0);
        $tax        = ($first?->tax_deduction          ?? 0) + ($second?->tax_deduction          ?? 0);
        $loan       = ($first?->loan_deduction         ?? 0) + ($second?->loan_deduction         ?? 0);
        $cashAdv    = ($first?->cash_advance_deduction ?? 0) + ($second?->cash_advance_deduction ?? 0);
        $capitalContrib = ($first?->capital_contribution_deduction ?? 0) + ($second?->capital_contribution_deduction ?? 0);
        $savings    = ($first?->savings_deduction      ?? 0) + ($second?->savings_deduction      ?? 0);
        $other      = ($first?->other_deductions       ?? 0) + ($second?->other_deductions       ?? 0);

        $govtSubtotal  = $sss + $philhealth + $pagibig + $tax;
        $otherSubtotal = $loan + $capitalContrib + $cashAdv + $savings + $other;
        $totalDed      = $govtSubtotal + $otherSubtotal;
        $netPay        = $totalGross - $totalDed;

        return [
            'employee'         => $employee,
            'month'            => $from->format('F Y'),
            'month_key'        => $month,
            // 1st cutoff
            'first_period'     => $first ? $first->payroll->period_from->format('M d') . ' – ' . $first->payroll->period_to->format('M d, Y') : null,
            'first_basic'      => $firstBasic,
            'first_transpo'    => $firstTranspo,
            'first_rep'        => $firstRep,
            'first_quarterly'  => $firstQuarterly,
            'first_ot_weekday' => $firstOtWeekday,
            'first_ot_weekend' => $firstOtWeekend,
            'first_gross'      => $firstGross,
            // 2nd cutoff
            'second_period'    => $second ? $second->payroll->period_from->format('M d') . ' – ' . $second->payroll->period_to->format('M d, Y') : null,
            'second_basic'     => $secondBasic,
            'second_transpo'   => $secondTranspo,
            'second_rep'       => $secondRep,
            'second_quarterly' => $secondQuarterly,
            'second_ot_weekday'=> $secondOtWeekday,
            'second_ot_weekend'=> $secondOtWeekend,
            'second_gross'     => $secondGross,
            // Totals
            'total_gross'      => $totalGross,
            // Deductions
            'sss'              => $sss,
            'philhealth'       => $philhealth,
            'pagibig'          => $pagibig,
            'tax'              => $tax,
            'govt_subtotal'    => $govtSubtotal,
            'loan'             => $loan,
            'cash_advance'     => $cashAdv,
            'savings'          => $savings,
            'capital_contribution' => $capitalContrib,
            'other'            => $other,
            'other_subtotal'   => $otherSubtotal,
            'total_deductions' => $totalDed,
            'net_pay'          => $netPay,
            // Meta
            'daily_rate'          => $employee->daily_rate,
            'first_days_worked'   => $first?->days_present ?? 0,
            'second_days_worked'  => $second?->days_present ?? 0,
            'total_days_worked'   => ($first?->days_present ?? 0) + ($second?->days_present ?? 0),
        ];
    }
}