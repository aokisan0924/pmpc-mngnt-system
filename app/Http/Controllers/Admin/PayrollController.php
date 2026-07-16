<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function index(): Response {
        $payrolls = Payroll::with('creator')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => [
                'id'               => $p->id,
                'period_label'     => $p->period_label,
                'cutoff'           => $p->cutoff,
                'period_from'      => $p->period_from->format('M d, Y'),
                'period_to'        => $p->period_to->format('M d, Y'),
                'status'           => $p->status,
                'total_gross'      => $p->total_gross,
                'total_deductions' => $p->total_deductions,
                'total_net'        => $p->total_net,
                'created_by'       => $p->creator->full_name,
                'created_at'       => $p->created_at->format('M d, Y'),
            ]);

        return Inertia::render('Admin/Payroll', [
            'payrolls' => $payrolls,
        ]);
    }

    public function create(Request $request): Response {
        $request->validate([
            'period_from' => ['required', 'date'],
            'period_to'   => ['required', 'date', 'after_or_equal:period_from'],
            'cutoff'      => ['required', 'in:first,second'],
        ]);

        $from   = Carbon::parse($request->period_from);
        $to     = Carbon::parse($request->period_to);
        $isFirst = $request->cutoff === 'first';

        $employees = Employee::where('is_staff', true)
            ->where('status', 'active')
            ->get()
            ->map(function ($emp) use ($from, $to, $isFirst) {

                $daysPresent = DtrLog::where('employee_id', $emp->id)
                    ->whereBetween('date', [$from, $to])
                    ->whereNotIn('status', ['absent'])
                    ->sum(DB::raw("CASE WHEN status = 'half_day' THEN 0.5 ELSE 1 END"));

                $workingDays = (int) Setting::get('working_days_month', 22);
                $monthlyBasic = $emp->daily_rate * $workingDays; // reference figure only (full-attendance monthly basic)
                $cutoffBasic    = round($emp->daily_rate * $daysPresent, 2); // prorated by actual attendance (half_day = 0.5 day)
                $cutoffTranspo  = round($emp->transpo_allowance / 2, 2);
                $cutoffRep      = round($emp->rep_allowance / 2, 2);
                $cutoffQuart    = round($emp->quarterly_allowance / 2, 2);
                $cutoffGross    = $cutoffBasic + $cutoffTranspo + $cutoffRep + $cutoffQuart;

                $hourlyRate     = $emp->daily_rate / 8;

                // Deductions
                $sss        = $isFirst ? $emp->sss_deduction        : 0;
                $philhealth = $isFirst ? $emp->philhealth_deduction : 0;
                $pagibig    = $isFirst ? $emp->pagibig_deduction    : 0;
                $tax        = $isFirst ? $emp->tax_deduction        : 0;

                $loan         = round($emp->loan_deduction          / 2, 2);
                $cc           = round($emp->capital_contribution_deduction / 2, 2);
                $cashAdv      = round($emp->cash_advance_deduction  / 2, 2);
                $rental       = round($emp->rental_deduction        / 2, 2);
                $savings      = round($emp->savings_deduction       / 2, 2);
                $other        = round($emp->other_deductions        / 2, 2);

                $totalDeductions = $sss + $philhealth + $pagibig + $tax
                                + $loan + $cc + $cashAdv + $rental + $savings + $other;

                return [
                    'id'                      => $emp->id,
                    'employee_id'             => $emp->employee_id,
                    'full_name'               => $emp->full_name,
                    'initials'                => $emp->initials,
                    'department'              => $emp->department,
                    'position'                => $emp->position,
                    'daily_rate'              => $emp->daily_rate,
                    'days_present'            => $daysPresent,
                    // Gross breakdown
                    'monthly_basic'           => $monthlyBasic,
                    'cutoff_basic'            => $cutoffBasic,
                    'cutoff_transpo'          => $cutoffTranspo,
                    'cutoff_rep'              => $cutoffRep,
                    'cutoff_quarterly'        => $cutoffQuart,
                    'cutoff_gross'            => $cutoffGross,
                    'hourly_rate'             => round($hourlyRate, 4),
                    // OT (admin will input)
                    'weekday_ot_hours'        => 0,
                    'weekend_ot_hours'        => 0,
                    // Deductions
                    'sss_deduction'           => $sss,
                    'philhealth_deduction'    => $philhealth,
                    'pagibig_deduction'       => $pagibig,
                    'tax_deduction'           => $tax,
                    'loan_deduction'          => $loan,
                    'capital_contribution_deduction' => $cc,
                    'cash_advance_deduction'  => $cashAdv,
                    'rental_deduction'        => $rental,
                    'savings_deduction'       => $savings,
                    'other_deductions'        => $other,
                    'total_deductions'        => $totalDeductions,
                    // Net preview
                    'gross_pay'               => $cutoffGross,
                    'net_pay'                 => $cutoffGross - $totalDeductions,
                ];
            });

        return Inertia::render('Admin/PayrollCreate', [
            'employees'    => $employees,
            'period_from'  => $request->period_from,
            'period_to'    => $request->period_to,
            'period_label' => $from->format('M d') . ' – ' . $to->format('M d, Y'),
            'cutoff'       => $request->cutoff,
            'is_first'     => $isFirst,
        ]);
    }

    public function store(Request $request): RedirectResponse {
        $request->validate([
            'period_label'                    => ['required', 'string'],
            'period_from'                     => ['required', 'date'],
            'period_to'                       => ['required', 'date'],
            'cutoff'                          => ['required', 'in:first,second'],
            'items'                           => ['required', 'array', 'min:1'],
            'items.*.employee_id'             => ['required', 'exists:employees,id'],
            'items.*.weekday_ot_hours'        => ['nullable', 'numeric', 'min:0'],
            'items.*.weekend_ot_hours'        => ['nullable', 'numeric', 'min:0'],
            'items.*.days_present'            => ['nullable', 'numeric', 'min:0'],
        ]);

        $isFirst = $request->cutoff === 'first';

        $payroll = Payroll::create([
            'period_label' => $request->period_label,
            'period_from'  => $request->period_from,
            'period_to'    => $request->period_to,
            'cutoff'       => $request->cutoff,
            'status'       => 'draft',
            'created_by'   => $request->user()->id,
        ]);

        foreach ($request->items as $itemData) {
            $emp = Employee::find($itemData['employee_id']);

            $item = new PayrollItem();
            $item->payroll_id       = $payroll->id;
            $item->employee_id      = $emp->id;
            $item->cutoff           = $request->cutoff;
            $item->days_present     = $itemData['days_present'] ?? 0;
            $item->weekday_ot_hours = floatval($itemData['weekday_ot_hours'] ?? 0);
            $item->weekend_ot_hours = floatval($itemData['weekend_ot_hours'] ?? 0);

            // Eager load employee for computeTotals
            $item->setRelation('employee', $emp);
            $item->computeTotals($isFirst);
            $item->save();
        }

        $payroll->recalculateTotals();

        return redirect()->route('admin.payroll.show', $payroll->id)
            ->with('success', 'Payroll saved successfully.');
    }

    public function show(Payroll $payroll): Response {
        $items = $payroll->items()
            ->with('employee')
            ->get()
            ->map(fn($item) => [
                'id'                     => $item->id,
                'employee_id'            => $item->employee->employee_id,
                'full_name'              => $item->employee->full_name,
                'initials'               => $item->employee->initials,
                'department'             => $item->employee->department,
                'position'               => $item->employee->position,
                'days_present'           => $item->days_present,
                'cutoff_basic'           => $item->cutoff_basic,
                'cutoff_transpo'         => $item->cutoff_transpo,
                'cutoff_rep'             => $item->cutoff_rep,
                'cutoff_quarterly'       => $item->cutoff_quarterly,
                'cutoff_gross'           => $item->cutoff_gross,
                'weekday_ot_hours'       => $item->weekday_ot_hours,
                'weekday_ot_pay'         => $item->weekday_ot_pay,
                'weekend_ot_hours'       => $item->weekend_ot_hours,
                'weekend_ot_pay'         => $item->weekend_ot_pay,
                'total_ot_pay'           => $item->total_ot_pay,
                'gross_pay'              => $item->gross_pay,
                'sss_deduction'          => $item->sss_deduction,
                'philhealth_deduction'   => $item->philhealth_deduction,
                'pagibig_deduction'      => $item->pagibig_deduction,
                'tax_deduction'          => $item->tax_deduction,
                'loan_deduction'         => $item->loan_deduction,
                'cash_advance_deduction' => $item->cash_advance_deduction,
                'rental_deduction'       => $item->rental_deduction,
                'savings_deduction'      => $item->savings_deduction,
                'capital_contribution_deduction'=> $item->capital_contribution_deduction,
                'other_deductions'       => $item->other_deductions,
                'total_deductions'       => $item->total_deductions,
                'net_pay'                => $item->net_pay,
            ]);

        return Inertia::render('Admin/PayrollShow', [
            'payroll' => [
                'id'               => $payroll->id,
                'period_label'     => $payroll->period_label,
                'cutoff'           => $payroll->cutoff,
                'cutoff_label'     => $payroll->cutoff === 'first' ? '1st Cutoff (1–15)' : '2nd Cutoff (16–30)',
                'period_from'      => $payroll->period_from->format('M d, Y'),
                'period_to'        => $payroll->period_to->format('M d, Y'),
                'status'           => $payroll->status,
                'total_gross'      => $payroll->total_gross,
                'total_deductions' => $payroll->total_deductions,
                'total_net'        => $payroll->total_net,
            ],
            'items' => $items,
        ]);
    }

    public function finalize(Payroll $payroll): RedirectResponse {
        if ($payroll->isFinalized()) {
            return back()->withErrors(['error' => 'Payroll is already finalized.']);
        }

        $payroll->update(['status' => 'finalized']);

        return back()->with('success', 'Payroll finalized.');
    }
}