<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Once;

class EmployeeScheduleService
{
    /** Day after the latest finalized payroll that paid this employee; null if none. */
    public function earliestEditableDate(Employee $employee): ?CarbonImmutable
    {
        $end = DB::table('payrolls')
            ->join('payroll_items', 'payroll_items.payroll_id', '=', 'payrolls.id')
            ->where('payrolls.status', 'finalized')
            ->where('payroll_items.employee_id', $employee->id)
            ->max('payrolls.period_to');

        return $end ? CarbonImmutable::parse($end)->addDay()->startOfDay() : null;
    }

    /**
     * @param  array{effective_from: string, schedule_type: string, shift_start?: ?string, shift_end?: ?string, work_days: array<int|string>}  $data
     */
    public function save(Employee $employee, array $data, ?Employee $admin): EmployeeSchedule
    {
        return DB::transaction(function () use ($employee, $data, $admin): EmployeeSchedule {
            $standard = $data['schedule_type'] === 'standard';
            $days = collect($data['work_days'])->map(fn ($d): int => (int) $d)->unique()->sort()->values()->all();

            $schedule = EmployeeSchedule::updateOrCreate(
                ['employee_id' => $employee->id, 'effective_from' => $data['effective_from']],
                [
                    'type' => $data['schedule_type'],
                    'shift_start' => $standard ? null : $data['shift_start'],
                    'shift_end' => $standard ? null : $data['shift_end'],
                    'work_days' => implode(',', $days),
                    'created_by' => $admin?->id,
                ],
            );

            if ($data['effective_from'] <= today()->toDateString()) {
                $this->recompute($employee, $data['effective_from']);
            }

            return $schedule;
        });
    }

    /** Re-derive hours and status (never punches) up to the next schedule row or today. */
    private function recompute(Employee $employee, string $from): void
    {
        Once::flush();
        $next = EmployeeSchedule::where('employee_id', $employee->id)->where('effective_from', '>', $from)->min('effective_from');
        $to = min(today()->toDateString(), $next ? CarbonImmutable::parse($next)->subDay()->toDateString() : '9999-12-31');

        DtrLog::where('employee_id', $employee->id)->whereDate('date', '>=', $from)->whereDate('date', '<=', $to)->get()->each(function (DtrLog $log): void {
            $log->computeHoursAndStatus();
            $log->save();
        });
    }
}
