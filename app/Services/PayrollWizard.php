<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\Holiday;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Prepares and saves a cutoff from DTR hours; money is always recomputed here, never taken from the browser. */
class PayrollWizard
{
    public function __construct(
        private readonly DtrPayrollAttendanceCalculator $attendance,
        private readonly OfficePayrollCalculator $calculator,
        private readonly ManagementPayrollExport $export,
    ) {}

    /** @return array{from: CarbonImmutable, to: CarbonImmutable} */
    public function period(string $month, string $cutoff, ?string $from = null, ?string $to = null): array
    {
        $suggested = PayrollCutoffPeriod::suggest($month, $cutoff);

        return [
            'from' => $from ? CarbonImmutable::parse($from) : $suggested['from'],
            'to' => $to ? CarbonImmutable::parse($to) : $suggested['to'],
        ];
    }

    public function existing(string $month, string $cutoff): ?Payroll
    {
        return Payroll::with('items')->where('period_month', $month)->where('cutoff', $cutoff)->first();
    }

    /** @return array<string, mixed> Inertia props for Admin/PayrollWizard */
    public function preview(string $month, string $cutoff, CarbonInterface $from, CarbonInterface $to): array
    {
        $draft = $this->existing($month, $cutoff);
        $saved = $draft?->items->keyBy('employee_id') ?? collect();
        $employees = $this->employees();
        $resolutions = $saved->mapWithKeys(fn (PayrollItem $item): array => [$item->employee_id => $item->day_resolutions ?? []])->all();
        $window = PayrollCutoffPeriod::window($month, $cutoff, $to);
        $hours = $this->attendance->hoursFor($employees, $window['from'], $window['to'], $resolutions);
        $isFirst = $cutoff === 'first';

        return [
            'month' => $month,
            'cutoff' => $cutoff,
            'is_first' => $isFirst,
            'period_from' => $from->toDateString(),
            'period_to' => $to->toDateString(),
            'period_title' => strtoupper($from->format('F j').' - '.$to->format('j, Y')),
            'window_from' => $window['from']->toDateString(),
            'can_save' => PayrollCutoffPeriod::canSaveOn($to, today()),
            'save_after' => $to->format('D, M d'),
            'draft_id' => $draft?->id,
            'offices' => OfficePayrollCalculator::OFFICES,
            'signatories' => $this->signatories($isFirst),
            'holidays' => Holiday::whereBetween('date', [$from->toDateString(), $to->toDateString()])->orderBy('date')->get()
                ->map(fn (Holiday $holiday): array => ['date' => $holiday->date->toDateString(), 'label' => $holiday->date->format('D, M d'), 'name' => $holiday->name])->values(),
            'employees' => $employees->map(function (Employee $employee) use ($hours, $saved, $isFirst): array {
                $item = $saved->get($employee->id);
                $suggested = $this->calculator->calculateHours($employee, $isFirst, $hours->get((int) $employee->id), ['deductions' => []]);

                return [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'full_name' => $employee->full_name,
                    'sheet_name' => mb_strtoupper(trim($employee->last_name.', '.$employee->first_name)),
                    'position' => mb_strtoupper((string) $employee->position),
                    'payroll_office' => $this->office($employee),
                    'office_verified' => $employee->hasVerifiedPayrollOffice(),
                    'daily_rate' => (float) $employee->daily_rate,
                    ...$hours->get((int) $employee->id),
                    'weekday_ot_hours' => (float) ($item->weekday_ot_hours ?? 0),
                    'weekend_ot_hours' => (float) ($item->weekend_ot_hours ?? 0),
                    'holiday_pay' => (float) ($item->holiday_pay ?? 0),
                    'cutoff_transpo' => (float) ($item->cutoff_transpo ?? 0),
                    'cutoff_rep' => (float) ($item->cutoff_rep ?? 0),
                    'cutoff_quarterly' => (float) ($item->cutoff_quarterly ?? 0),
                    'deductions' => collect(OfficePayrollCalculator::DEDUCTIONS)->mapWithKeys(fn (string $field): array => [
                        $field => (float) ($item ? $item->{$field} : $suggested[$field]),
                    ])->all(),
                    'day_resolutions' => (object) ($item->day_resolutions ?? []),
                ];
            })->values(),
        ];
    }

    /** @param  array<string, mixed>  $data  validated StorePayrollRequest data */
    public function save(array $data, Employee $user): Payroll
    {
        return DB::transaction(function () use ($data, $user): Payroll {
            $month = (string) $data['month'];
            $cutoff = (string) $data['cutoff'];
            $from = CarbonImmutable::parse($data['period_from']);
            $to = CarbonImmutable::parse($data['period_to']);
            $payroll = Payroll::where('period_month', $month)->where('cutoff', $cutoff)->lockForUpdate()->first();
            if ($payroll?->isFinalized()) {
                throw ValidationException::withMessages(['cutoff' => 'This cutoff is already finalized and can no longer change.']);
            }

            $posted = collect($data['items'])->keyBy('employee_id');
            $employees = $this->employees()->whereIn('id', $posted->keys()->all())->values();
            if ($employees->count() !== $posted->count()) {
                throw ValidationException::withMessages(['items' => 'An employee is no longer available. Reload the payroll.']);
            }
            $resolutions = $posted->map(fn (array $row): array => $row['day_resolutions'] ?? [])->all();
            $window = PayrollCutoffPeriod::window($month, $cutoff, $to);
            $hours = $this->attendance->hoursFor($employees, $window['from'], $window['to'], $resolutions);
            $missing = $employees->first(fn (Employee $employee): bool => $hours->get((int) $employee->id)['unresolved_dates'] !== []);
            if ($missing !== null) {
                $index = $posted->keys()->search($missing->id);
                throw ValidationException::withMessages(["items.$index.day_resolutions" => 'Choose what to do with '.CarbonImmutable::parse($hours->get((int) $missing->id)['unresolved_dates'][0])->format('M d').' for '.$missing->full_name.'.']);
            }

            $attributes = [
                'period_label' => $from->format('M d').' – '.$to->format('M d, Y'),
                'period_from' => $from->toDateString(),
                'period_to' => $to->toDateString(),
                'cutoff' => $cutoff,
            ];
            if ($payroll === null) {
                $payroll = Payroll::create([...$attributes, 'status' => 'draft', 'created_by' => $user->id]);
            } else {
                $payroll->update($attributes);
                $payroll->items()->delete();
            }

            foreach ($employees as $employee) {
                $row = $posted->get($employee->id);
                $attendance = $hours->get((int) $employee->id);
                $amounts = $this->calculator->calculateHours($employee, $cutoff === 'first', $attendance, $row);
                $item = new PayrollItem;
                $item->forceFill([
                    'payroll_id' => $payroll->id,
                    'employee_id' => $employee->id,
                    'cutoff' => $cutoff,
                    'payroll_office' => $employee->payroll_office,
                    'weekday_ot_hours' => (float) ($row['weekday_ot_hours'] ?? 0),
                    'weekend_ot_hours' => (float) ($row['weekend_ot_hours'] ?? 0),
                    'tardiness_minutes' => 0,
                    'default_paid_days_basis' => $attendance['days_of_work'],
                    'dtr_days_present' => $amounts['days_present'],
                    'dtr_absence_days' => $amounts['absence_days'],
                    'dtr_tardiness_minutes' => 0,
                    'dtr_unresolved_dates' => [],
                    'day_resolutions' => $row['day_resolutions'] ?? [],
                    'dtr_reconciliation_note' => collect($row['day_resolutions'] ?? [])->filter(fn (array $r): bool => $r['type'] === 'hours')
                        ->map(fn (array $r, string $date): string => $date.': '.$r['note'])->implode('; ') ?: null,
                    ...$amounts,
                ])->save();
            }

            $payroll->recalculateTotals();
            if ($data['finalize'] ?? false) {
                $payroll->forceFill(['status' => 'finalized', 'finalized_by' => $user->id, 'finalized_at' => now()])->save();
            }

            return $payroll;
        });
    }

    /** @return Collection<int, Employee> */
    private function employees(): Collection
    {
        $order = array_flip(array_keys(OfficePayrollCalculator::OFFICES));

        return Employee::where('is_staff', true)->where('status', 'active')->get()
            ->sortBy(fn (Employee $employee): string => str_pad((string) ($order[$this->office($employee)] ?? 9), 2, '0', STR_PAD_LEFT).mb_strtolower($employee->last_name.' '.$employee->first_name))
            ->values();
    }

    private function office(Employee $employee): string
    {
        if (mb_strtolower(trim((string) $employee->department)) === 'general merchandise') {
            return 'gen_mdse';
        }

        return $employee->hasVerifiedPayrollOffice() ? (string) $employee->payroll_office : '';
    }

    /** @return array<string, array{name: string, position: string}|null> */
    private function signatories(bool $isFirst): array
    {
        $ids = $this->export->defaultSignatories()[$isFirst ? 'first' : 'second'];
        $people = Employee::whereIn('id', array_filter($ids))->get()->keyBy('id');

        return collect($ids)->map(fn (?int $id): ?array => $id && $people->has($id)
            ? ['name' => $people[$id]->full_name, 'position' => mb_strtoupper((string) $people[$id]->position)]
            : null)->all();
    }
}
