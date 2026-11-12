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

    /**
     * The start is always the suggested one: the DTR window, not the label, decides which days are paid.
     *
     * @return array{from: CarbonImmutable, to: CarbonImmutable}
     */
    public function period(string $month, string $cutoff, ?string $to = null): array
    {
        $suggested = PayrollCutoffPeriod::suggest($month, $cutoff);

        return ['from' => $suggested['from'], 'to' => $to ? CarbonImmutable::parse($to) : $suggested['to']];
    }

    /**
     * DTR hours, plus the fixed days General Merchandise is paid for: daily rate x 30/31, i.e. the calendar
     * days of this half of the month (15, or the 16th to month end), less days before the hire date.
     *
     * @param  array{from: CarbonImmutable, to: CarbonImmutable}  $window
     */
    private function hours(Collection $employees, string $month, string $cutoff, array $window, array $resolutions, bool $mock = false): Collection
    {
        $hours = $this->attendance->hoursFor($employees, $window['from'], $window['to'], $resolutions, $mock);
        $first = CarbonImmutable::createFromFormat('!Y-m', $month);
        [$halfFrom, $halfTo] = $cutoff === 'first' ? [$first, $first->setDay(15)] : [$first->setDay(16), $first->endOfMonth()->startOfDay()];

        return $hours->map(function (array $attendance, int $id) use ($employees, $halfFrom, $halfTo): array {
            $employee = $employees->firstWhere('id', $id);
            if ($employee && $this->office($employee) === 'gen_mdse') {
                $start = Employee::startDateFor($id);
                $from = $start !== null && $start > $halfFrom->toDateString() ? CarbonImmutable::parse($start) : $halfFrom;
                $attendance['fixed_days'] = (float) max(0, $from->diffInDays($halfTo) + 1);
            }

            return $attendance;
        });
    }

    /** @return array{from: CarbonImmutable, to: CarbonImmutable} */
    private function window(string $month, string $cutoff, CarbonInterface $to): array
    {
        [$previousMonth, $previousCutoff] = PayrollCutoffPeriod::previous($month, $cutoff);
        $previous = Payroll::where('period_month', $previousMonth)->where('cutoff', $previousCutoff)->value('period_to');

        return PayrollCutoffPeriod::window($month, $cutoff, $to, $previous ? CarbonImmutable::parse($previous) : null);
    }

    public function existing(string $month, string $cutoff): ?Payroll
    {
        return Payroll::with('items')->where('period_month', $month)->where('cutoff', $cutoff)->first();
    }

    /** @return array<string, mixed> Inertia props for Admin/PayrollWizard */
    /** In a mockup, days not yet worked up to the end date are assumed present and nothing can be saved. */
    public function preview(string $month, string $cutoff, CarbonInterface $from, CarbonInterface $to, bool $mock = false): array
    {
        $draft = $this->existing($month, $cutoff);
        $saved = $draft?->items->keyBy('employee_id') ?? collect();
        $employees = $this->employees();
        $resolutions = $saved->mapWithKeys(fn (PayrollItem $item): array => [$item->employee_id => $item->day_resolutions ?? []])->all();
        $window = $this->window($month, $cutoff, $to);
        $hours = $this->hours($employees, $month, $cutoff, $window, $resolutions, $mock);
        $isFirst = $cutoff === 'first';

        return [
            'mock' => $mock,
            'month' => $month,
            'cutoff' => $cutoff,
            'is_first' => $isFirst,
            'period_from' => $from->toDateString(),
            'period_to' => $to->toDateString(),
            'period_title' => strtoupper($from->format('F j').' - '.$to->format('j, Y')),
            'window_from' => $window['from']->toDateString(),
            // Still running: only days before today are counted, so an early save is partial.
            'cutoff_open' => ! PayrollCutoffPeriod::isOver($to, today()),
            'counted_through' => today()->subDay()->format('D, M d'),
            'draft_id' => $draft?->id,
            'offices' => OfficePayrollCalculator::OFFICES,
            'signatories' => $this->signatories($isFirst),
            'holidays' => Holiday::whereDate('date', '>=', $from->toDateString())->whereDate('date', '<=', $to->toDateString())->orderBy('date')->get()
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
            $from = $this->period($month, $cutoff)['from'];
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
            $window = $this->window($month, $cutoff, $to);
            $hours = $this->hours($employees, $month, $cutoff, $window, $resolutions, (bool) ($data['mock'] ?? false));
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

    /**
     * The real save and export run inside a transaction that is always rolled back, so live data can be tried
     * without leaving a batch behind (auto-increment ids still advance).
     *
     * @param  array<string, mixed>  $data  validated StorePayrollRequest data
     */
    public function mockupExport(array $data, Employee $user): string
    {
        DB::beginTransaction();
        try {
            // Inside the rolled-back transaction a saved batch for this cutoff (even a finalized one) can make way
            // for the mockup; it is restored by the rollback.
            Payroll::where('period_month', $data['month'])->where('cutoff', $data['cutoff'])->get()
                ->each(function (Payroll $payroll): void {
                    $payroll->items()->delete();
                    $payroll->delete();
                });
            $payroll = $this->save([...$data, 'finalize' => false], $user);

            return $this->export->export($payroll->fresh());
        } finally {
            DB::rollBack();
        }
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
