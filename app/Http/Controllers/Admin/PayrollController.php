<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreatePayrollRequest;
use App\Http\Requests\Admin\StartPayrollDayRequest;
use App\Http\Requests\Admin\StorePayrollRequest;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\Payroll;
use App\Services\ManagementPayrollExport;
use App\Services\OfficePayrollCalculator;
use App\Services\PayrollDayFiller;
use App\Services\PayrollWizard;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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

    public function create(CreatePayrollRequest $request, PayrollWizard $wizard): Response|RedirectResponse
    {
        $month = (string) $request->validated('month');
        $cutoff = (string) $request->validated('cutoff');
        $mock = $request->boolean('mock');
        $existing = $wizard->existing($month, $cutoff);
        if ($existing?->isFinalized() && ! $mock) {
            return redirect()->route('admin.payroll.show', $existing->id)
                ->with('success', 'This cutoff is already finalized.');
        }
        $period = $existing && ! $request->filled('period_to')
            ? ['from' => $existing->period_from, 'to' => $existing->period_to]
            : $wizard->period($month, $cutoff, $request->validated('period_to'));

        return Inertia::render('Admin/PayrollWizard', [
            ...$wizard->preview($month, $cutoff, $period['from'], $period['to'], $mock),
            // Only admins may add a missing holiday from the payroll screen (payroll processors ask an admin).
            'can_mark_holiday' => $request->user()->isSuperAdmin(),
            'holiday_types' => collect(Holiday::TYPES)->map(fn (array $type): string => $type['label']),
        ]);
    }

    public function store(StorePayrollRequest $request, PayrollWizard $wizard): RedirectResponse
    {
        // A mockup is never saved, whatever the browser sends.
        $payroll = $wizard->save([...$request->validated(), 'mock' => false], $request->user());

        return redirect()->route('admin.payroll.show', $payroll->id)
            ->with('success', $payroll->isFinalized() ? 'Payroll saved and finalized.' : 'Payroll saved.');
    }

    public function startPayday(StartPayrollDayRequest $request, PayrollDayFiller $filler): RedirectResponse
    {
        $filled = $filler->start();

        return back()->with('success', 'Payroll day is on. '.$filled.' DTR '.str('day')->plural($filled).' filled in; anyone who times in later today is filled in automatically.');
    }

    public function mockupExport(StorePayrollRequest $request, PayrollWizard $wizard): BinaryFileResponse
    {
        $data = $request->validated();

        return response()->download(
            $wizard->mockupExport($data, $request->user()),
            'MOCKUP '.strtoupper(Carbon::parse($data['month'].'-01')->format('F Y')).' '.strtoupper($data['cutoff']).' CUTOFF PAYROLL.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'private, no-store'],
        )->deleteFileAfterSend(true);
    }

    public function show(Payroll $payroll, ManagementPayrollExport $managementPayrollExport): Response
    {
        $payroll->loadMissing('finalizer');
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
                'payroll_office_label' => OfficePayrollCalculator::OFFICES[$item->payroll_office]['label'] ?? null,
                'paid_days_basis' => $item->paid_days_basis,
                'absence_days' => $item->absence_days,
                'default_paid_days_basis' => $item->default_paid_days_basis,
                'dtr_days_present' => $item->dtr_days_present,
                'dtr_absence_days' => $item->dtr_absence_days,
                'dtr_tardiness_minutes' => $item->dtr_tardiness_minutes,
                'dtr_unresolved_dates' => $item->dtr_unresolved_dates ?? [],
                'attendance_override_reason' => $item->attendance_override_reason,
                'dtr_reconciliation_note' => $item->dtr_reconciliation_note,
                'tardiness_deduction' => $item->tardiness_deduction,
                'tardiness_minutes' => $item->tardiness_minutes,
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
                'holiday_pay' => $item->holiday_pay,
                'gross_pay' => $item->gross_pay,
                'sss_deduction' => $item->sss_deduction,
                'philhealth_deduction' => $item->philhealth_deduction,
                'pagibig_deduction' => $item->pagibig_deduction,
                'tax_deduction' => $item->tax_deduction,
                'loan_deduction' => $item->loan_deduction,
                'cash_advance_deduction' => $item->cash_advance_deduction,
                'rental_deduction' => $item->rental_deduction,
                'electricity_deduction' => $item->electricity_deduction,
                'savings_deduction' => $item->savings_deduction,
                'capital_contribution_deduction' => $item->capital_contribution_deduction,
                'other_deductions' => $item->other_deductions,
                'total_deductions' => $item->total_deductions,
                'net_pay' => $item->net_pay,
            ]);

        return Inertia::render('Admin/PayrollShow', [
            'signatureEmployees' => Employee::where('status', 'active')->orderBy('first_name')->get(['id', 'employee_id', 'first_name', 'last_name'])->map(fn (Employee $employee) => ['id' => $employee->id, 'name' => $employee->full_name, 'employee_id' => $employee->employee_id]),
            'defaultSignatories' => $managementPayrollExport->defaultSignatories(),
            'payroll' => [
                'id' => $payroll->id,
                'period_label' => $payroll->period_label,
                'cutoff' => $payroll->cutoff,
                'cutoff_label' => $payroll->cutoff === 'first' ? '1st Cutoff (1–15)' : '2nd Cutoff (16–30)',
                'period_from' => $payroll->period_from->format('M d, Y'),
                'month_key' => $payroll->period_from->format('Y-m'),
                'period_to' => $payroll->period_to->format('M d, Y'),
                'status' => $payroll->status,
                'finalized_by' => $payroll->finalizer?->full_name,
                'finalized_at' => $payroll->finalized_at?->timezone(config('app.timezone'))->format('M d, Y h:i A'),
                'total_gross' => $payroll->total_gross,
                'total_deductions' => $payroll->total_deductions,
                'total_net' => $payroll->total_net,
            ],
            'items' => $items,
        ]);
    }

    public function finalize(Request $request, Payroll $payroll): RedirectResponse
    {
        $finalized = DB::transaction(function () use ($request, $payroll): bool {
            $lockedPayroll = Payroll::query()->lockForUpdate()->findOrFail($payroll->id);

            if ($lockedPayroll->isFinalized()) {
                return false;
            }

            $lockedPayroll->forceFill([
                'status' => 'finalized',
                'finalized_by' => $request->user()->id,
                'finalized_at' => now(),
            ])->save();

            return true;
        });

        if (! $finalized) {
            $payroll->refresh();

            return back()->withErrors(['error' => $payroll->isFinalized()
                ? 'Payroll is already finalized.'
                : 'Payroll could not be finalized. Please reload and try again.']);
        }

        return back()->with('success', 'Payroll finalized.');
    }

    public function destroy(Payroll $payroll): RedirectResponse
    {
        $deleted = DB::transaction(function () use ($payroll): bool {
            $lockedPayroll = Payroll::query()->lockForUpdate()->findOrFail($payroll->id);

            if ($lockedPayroll->isFinalized()) {
                return false;
            }

            $lockedPayroll->items()->delete();
            $lockedPayroll->delete();

            return true;
        });

        if (! $deleted) {
            return back()->withErrors(['error' => 'Finalized payroll batches cannot be discarded or deleted.']);
        }

        return redirect()->route('admin.payroll')->with('success', 'Draft payroll discarded.');
    }
}
