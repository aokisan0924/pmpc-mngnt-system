<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreatePayrollRequest;
use App\Http\Requests\Admin\StorePayrollRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Services\OfficePayrollCalculator;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function index(): Response
    {
        $payrolls = Payroll::with('creator')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'period_label' => $p->period_label,
                'cutoff' => $p->cutoff,
                'period_from' => $p->period_from->format('M d, Y'),
                'period_to' => $p->period_to->format('M d, Y'),
                'status' => $p->status,
                'total_gross' => $p->total_gross,
                'total_deductions' => $p->total_deductions,
                'total_net' => $p->total_net,
                'created_by' => $p->creator->full_name,
                'created_at' => $p->created_at->format('M d, Y'),
            ]);

        return Inertia::render('Admin/Payroll', [
            'payrolls' => $payrolls,
        ]);
    }

    public function create(CreatePayrollRequest $request): Response
    {
        $validated = $request->validated();
        $from = Carbon::parse($validated['period_from']);
        $to = Carbon::parse($validated['period_to']);
        $isFirst = $validated['cutoff'] === 'first';
        $attendance = DtrLog::whereBetween('date', [$from, $to])
            ->whereNotIn('status', ['absent'])
            ->selectRaw("employee_id, SUM(CASE WHEN status = 'half_day' THEN 0.5 ELSE 1 END) AS days")
            ->groupBy('employee_id')->pluck('days', 'employee_id');
        $employees = Employee::where('is_staff', true)->where('status', 'active')->get()
            ->map(function (Employee $emp) use ($attendance, $isFirst): array {
                $office = $emp->hasVerifiedPayrollOffice() ? $emp->payroll_office : '';
                $paidDays = OfficePayrollCalculator::OFFICES[$office]['days'] ?? 11;
                $suggestions = app(OfficePayrollCalculator::class)->calculate($emp, $isFirst, $paidDays, 0);

                return [
                    'id' => $emp->id,
                    'employee_id' => $emp->employee_id,
                    'full_name' => $emp->full_name,
                    'daily_rate' => $emp->daily_rate,
                    'transpo_allowance' => $emp->transpo_allowance,
                    'rep_allowance' => $emp->rep_allowance,
                    'quarterly_allowance' => $emp->quarterly_allowance,
                    'compensation_signature' => app(OfficePayrollCalculator::class)->compensationSignature($emp),
                    'dtr_days_present' => (float) ($attendance[$emp->id] ?? 0),
                    'payroll_office' => $office,
                    'office_verified' => $emp->hasVerifiedPayrollOffice(),
                    'paid_days_basis' => $paidDays,
                    'absence_days' => 0,
                    'weekday_ot_hours' => 0,
                    'weekend_ot_hours' => 0,
                    'tardiness_deduction' => 0,
                    'deductions_reviewed' => false,
                    'deductions' => collect($suggestions)->only(OfficePayrollCalculator::DEDUCTIONS)->all(),
                ];
            });

        return Inertia::render('Admin/PayrollCreate', [
            'employees' => $employees,
            'period_from' => $validated['period_from'],
            'period_to' => $validated['period_to'],
            'period_label' => $from->format('M d').' – '.$to->format('M d, Y'),
            'cutoff' => $validated['cutoff'],
            'is_first' => $isFirst,
            'offices' => OfficePayrollCalculator::OFFICES,
        ]);
    }

    public function store(StorePayrollRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $isFirst = $validated['cutoff'] === 'first';

        // Preload all submitted employees to prevent N+1 queries during item creation
        $employeeIds = collect($validated['items'])->pluck('employee_id')->all();
        $payroll = DB::transaction(function () use ($validated, $employeeIds, $isFirst, $request) {
            $employees = Employee::whereIn('id', $employeeIds)->where('is_staff', true)->where('status', 'active')->lockForUpdate()->get()->keyBy('id');
            $payroll = Payroll::create([
                'period_label' => $validated['period_label'],
                'period_from' => $validated['period_from'],
                'period_to' => $validated['period_to'],
                'cutoff' => $validated['cutoff'],
                'status' => 'draft',
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['items'] as $itemData) {
                $emp = $employees->get($itemData['employee_id']);
                if (! $emp) {
                    throw ValidationException::withMessages(['items' => 'An employee is no longer available. Reload the payroll preview.']);
                }
                if (! $emp->hasVerifiedPayrollOffice() || $itemData['payroll_office'] !== $emp->payroll_office) {
                    throw ValidationException::withMessages(['items' => 'An employee office is unverified or changed. Complete HR verification and reload payroll.']);
                }
                if (! hash_equals(app(OfficePayrollCalculator::class)->compensationSignature($emp), $itemData['compensation_signature'])) {
                    throw ValidationException::withMessages(['items' => 'An employee’s rate or allowances changed. Reload and review the payroll preview.']);
                }

                $item = new PayrollItem;
                $item->payroll_id = $payroll->id;
                $item->employee_id = $emp->id;
                $item->cutoff = $validated['cutoff'];
                $item->days_present = $itemData['days_present'] ?? 0;
                $item->payroll_office = $itemData['payroll_office'];
                $item->paid_days_basis = $itemData['paid_days_basis'];
                $item->absence_days = $itemData['absence_days'];
                $item->tardiness_deduction = $itemData['tardiness_deduction'];
                $item->weekday_ot_hours = floatval($itemData['weekday_ot_hours'] ?? 0);
                $item->weekend_ot_hours = floatval($itemData['weekend_ot_hours'] ?? 0);

                // Eager load employee for computeTotals
                $item->setRelation('employee', $emp);
                $item->fill(app(OfficePayrollCalculator::class)->calculate(
                    $emp, $isFirst, (float) $item->paid_days_basis, (float) $item->absence_days,
                    (float) $item->weekday_ot_hours, (float) $item->weekend_ot_hours,
                    (float) $item->tardiness_deduction, $itemData['deductions'],
                ));
                $item->save();
            }

            $payroll->recalculateTotals();

            return $payroll;
        });

        return redirect()->route('admin.payroll.show', $payroll->id)
            ->with('success', 'Payroll saved successfully.');
    }

    public function show(Payroll $payroll): Response
    {
        $items = $payroll->items()
            ->with('employee')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'employee_id' => $item->employee->employee_id,
                'full_name' => $item->employee->full_name,
                'initials' => $item->employee->initials,
                'department' => $item->employee->department,
                'position' => $item->employee->position,
                'days_present' => $item->days_present,
                'payroll_office' => $item->payroll_office,
                'payroll_office_label' => OfficePayrollCalculator::OFFICES[$item->payroll_office]['label'] ?? ($item->payroll_office === 'main_office' ? 'Main Office (historical)' : null),
                'paid_days_basis' => $item->paid_days_basis,
                'absence_days' => $item->absence_days,
                'tardiness_deduction' => $item->tardiness_deduction,
                'cutoff_basic' => $item->cutoff_basic,
                'cutoff_transpo' => $item->cutoff_transpo,
                'cutoff_rep' => $item->cutoff_rep,
                'cutoff_quarterly' => $item->cutoff_quarterly,
                'cutoff_gross' => $item->cutoff_gross,
                'weekday_ot_hours' => $item->weekday_ot_hours,
                'weekday_ot_pay' => $item->weekday_ot_pay,
                'weekend_ot_hours' => $item->weekend_ot_hours,
                'weekend_ot_pay' => $item->weekend_ot_pay,
                'total_ot_pay' => $item->total_ot_pay,
                'gross_pay' => $item->gross_pay,
                'sss_deduction' => $item->sss_deduction,
                'philhealth_deduction' => $item->philhealth_deduction,
                'pagibig_deduction' => $item->pagibig_deduction,
                'tax_deduction' => $item->tax_deduction,
                'loan_deduction' => $item->loan_deduction,
                'cash_advance_deduction' => $item->cash_advance_deduction,
                'rental_deduction' => $item->rental_deduction,
                'savings_deduction' => $item->savings_deduction,
                'capital_contribution_deduction' => $item->capital_contribution_deduction,
                'other_deductions' => $item->other_deductions,
                'total_deductions' => $item->total_deductions,
                'net_pay' => $item->net_pay,
            ]);

        return Inertia::render('Admin/PayrollShow', [
            'signatureEmployees' => Employee::whereNotNull('signature_path')->orderBy('first_name')->get(['id', 'employee_id', 'first_name', 'last_name'])->map(fn (Employee $employee) => ['id' => $employee->id, 'name' => $employee->full_name, 'employee_id' => $employee->employee_id]),
            'payroll' => [
                'id' => $payroll->id,
                'period_label' => $payroll->period_label,
                'cutoff' => $payroll->cutoff,
                'cutoff_label' => $payroll->cutoff === 'first' ? '1st Cutoff (1–15)' : '2nd Cutoff (16–30)',
                'period_from' => $payroll->period_from->format('M d, Y'),
                'month_key' => $payroll->period_from->format('Y-m'),
                'period_to' => $payroll->period_to->format('M d, Y'),
                'status' => $payroll->status,
                'total_gross' => $payroll->total_gross,
                'total_deductions' => $payroll->total_deductions,
                'total_net' => $payroll->total_net,
            ],
            'items' => $items,
        ]);
    }

    public function finalize(Payroll $payroll): RedirectResponse
    {
        if ($payroll->isFinalized()) {
            return back()->withErrors(['error' => 'Payroll is already finalized.']);
        }

        $payroll->update(['status' => 'finalized']);

        return back()->with('success', 'Payroll finalized.');
    }

    public function destroy(Payroll $payroll): RedirectResponse
    {
        if ($payroll->isFinalized()) {
            return back()->withErrors(['error' => 'Finalized payroll batches cannot be discarded or deleted.']);
        }

        DB::transaction(function () use ($payroll) {
            $payroll->items()->delete();
            $payroll->delete();
        });

        return redirect()->route('admin.payroll')->with('success', 'Draft payroll discarded.');
    }
}
