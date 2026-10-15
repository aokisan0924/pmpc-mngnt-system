<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ComputeThirteenthMonthRequest;
use App\Http\Requests\Admin\FinalizeThirteenthMonthRequest;
use App\Http\Requests\Admin\StoreThirteenthMonthRequest;
use App\Models\Employee;
use App\Models\ThirteenthMonthPay;
use App\Services\ThirteenthMonthCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ThirteenthMonthController extends Controller
{
    public function index(): Response
    {
        $records = ThirteenthMonthPay::with(['employee', 'processor'])
            ->orderBy('year', 'desc')
            ->orderByRaw("CASE tranche WHEN 'year_end' THEN 1 WHEN 'mid_year' THEN 2 ELSE 3 END")
            ->get()
            ->groupBy(fn ($r) => $r->year.'_'.$r->tranche)
            ->map(fn ($group) => [
                'year' => $group->first()->year,
                'tranche' => $group->first()->tranche,
                'tranche_label' => $group->first()->trancheLabel(),
                'period_from' => $group->first()->period_from->format('M d, Y'),
                'period_to' => $group->first()->period_to->format('M d, Y'),
                'status' => $group->first()->status,
                'total_payout' => $group->sum('thirteenth_month_pay'),
                'employee_count' => $group->count(),
                'processed_by' => $group->first()->processor->full_name,
                'created_at' => $group->first()->created_at->format('M d, Y'),
                'batch_key' => $group->first()->year.'_'.$group->first()->tranche,
            ])
            ->values();

        return Inertia::render('Admin/ThirteenthMonth', [
            'records' => $records,
        ]);
    }

    public function compute(ComputeThirteenthMonthRequest $request, ThirteenthMonthCalculator $calculator): Response
    {
        $validated = $request->validated();
        $year = (int) ($validated['year'] ?? now()->year);
        $tranche = $validated['tranche'] ?? 'year_end';
        $period = $calculator->period($year, $tranche);
        $activeEmployees = Employee::where('is_staff', true)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get();
        $attendance = $calculator->attendanceDays($activeEmployees->modelKeys(), $period['from'], $period['to']);
        $existingRecords = ThirteenthMonthPay::where('year', $year)
            ->where('tranche', $tranche)
            ->get()
            ->keyBy('employee_id');

        $employees = $activeEmployees->map(function (Employee $emp) use ($attendance, $existingRecords, $calculator) {
            $amounts = $calculator->calculate($emp, (float) ($attendance[$emp->id] ?? 0));
            $existing = $existingRecords->get($emp->id);

            return [
                'id' => $emp->id,
                'employee_id' => $emp->employee_id,
                'full_name' => $emp->full_name,
                'initials' => $emp->initials,
                'department' => $emp->department,
                'position' => $emp->position,
                ...$amounts,
                'already_processed' => $existing !== null,
                'existing_status' => $existing?->status,
            ];
        });

        return Inertia::render('Admin/ThirteenthMonthCompute', [
            'employees' => $employees,
            'year' => $year,
            'tranche' => $tranche,
            'tranche_label' => $tranche === 'mid_year' ? 'Mid-year (Jan – Jun)' : 'Year-end (Jul – Dec)',
            'period_from' => $period['from']->format('M d, Y'),
            'period_to' => $period['to']->format('M d, Y'),
        ]);
    }

    public function store(StoreThirteenthMonthRequest $request, ThirteenthMonthCalculator $calculator): RedirectResponse
    {
        $validated = $request->validated();
        $period = $calculator->period((int) $validated['year'], $validated['tranche']);
        $employeeIds = collect($validated['items'])->pluck('employee_id')->all();

        DB::transaction(function () use ($validated, $request, $calculator, $period, $employeeIds): void {
            $finalized = ThirteenthMonthPay::where('year', $validated['year'])
                ->where('tranche', $validated['tranche'])
                ->where('status', 'finalized')
                ->lockForUpdate()
                ->first();

            if ($finalized) {
                throw ValidationException::withMessages(['error' => 'This 13th month pay batch has already been finalized and is immutable.']);
            }

            $employees = Employee::where('is_staff', true)
                ->where('status', 'active')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $expectedIds = $employees->keys()->map(fn ($id): int => (int) $id)->sort()->values()->all();
            $submittedIds = collect($employeeIds)->map(fn ($id): int => (int) $id)->sort()->values()->all();

            if ($expectedIds !== $submittedIds) {
                throw ValidationException::withMessages(['items' => 'The eligible employee list changed or is incomplete. Reload the 13th-month preview before saving.']);
            }

            $attendance = $calculator->attendanceDays($employeeIds, $period['from'], $period['to']);

            foreach ($employeeIds as $employeeId) {
                $employee = $employees->get($employeeId);
                $amounts = $calculator->calculate($employee, (float) ($attendance[$employeeId] ?? 0));

                ThirteenthMonthPay::updateOrCreate(
                    [
                        'employee_id' => $employeeId,
                        'year' => $validated['year'],
                        'tranche' => $validated['tranche'],
                    ],
                    [
                        'period_from' => $period['from']->toDateString(),
                        'period_to' => $period['to']->toDateString(),
                        ...$amounts,
                        'status' => 'draft',
                        'processed_by' => $request->user()->id,
                    ]
                );
            }
        });

        return redirect()->route('admin.thirteenth-month.show', [
            'year' => $validated['year'],
            'tranche' => $validated['tranche'],
        ])->with('success', '13th month pay computed and saved successfully.');
    }

    public function show(Request $request): Response
    {
        $year = (int) $request->query('year', now()->year);
        $tranche = $request->query('tranche', 'year_end');

        $records = ThirteenthMonthPay::with(['employee', 'finalizer'])
            ->where('year', $year)
            ->where('tranche', $tranche)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee_id' => $r->employee->employee_id,
                'full_name' => $r->employee->full_name,
                'initials' => $r->employee->initials,
                'department' => $r->employee->department,
                'position' => $r->employee->position,
                'daily_rate' => $r->daily_rate,
                'days_present' => $r->days_present,
                'total_basic_pay' => $r->total_basic_pay,
                'thirteenth_month_pay' => $r->thirteenth_month_pay,
                'status' => $r->status,
                'finalized_by' => $r->finalizer?->full_name,
                'finalized_at' => $r->finalized_at?->timezone(config('app.timezone'))->format('M d, Y h:i A'),
            ]);

        $first = ThirteenthMonthPay::with('finalizer')->where('year', $year)
            ->where('tranche', $tranche)
            ->first();

        return Inertia::render('Admin/ThirteenthMonthShow', [
            'records' => $records,
            'year' => $year,
            'tranche' => $tranche,
            'tranche_label' => $first?->trancheLabel() ?? '',
            'period_from' => $first?->period_from->format('M d, Y') ?? '',
            'period_to' => $first?->period_to->format('M d, Y') ?? '',
            'status' => $first?->status ?? 'draft',
            'finalized_by' => $first?->finalizer?->full_name,
            'finalized_at' => $first?->finalized_at?->timezone(config('app.timezone'))->format('M d, Y h:i A'),
            'total_payout' => $records->sum('thirteenth_month_pay'),
        ]);
    }

    public function finalize(FinalizeThirteenthMonthRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $updated = DB::transaction(function () use ($request, $validated): int {
            $drafts = ThirteenthMonthPay::where('year', $validated['year'])
                ->where('tranche', $validated['tranche'])
                ->where('status', 'draft')
                ->lockForUpdate()
                ->get(['id']);

            if ($drafts->isEmpty()) {
                return 0;
            }

            return ThirteenthMonthPay::whereIn('id', $drafts->modelKeys())->update([
                'status' => 'finalized',
                'finalized_at' => now(),
                'finalized_by' => $request->user()->id,
            ]);
        });

        if ($updated === 0) {
            return back()->withErrors(['error' => 'No draft records found to finalize.']);
        }

        return back()->with('success', '13th month pay finalized for '.$updated.' employees.');
    }
}
