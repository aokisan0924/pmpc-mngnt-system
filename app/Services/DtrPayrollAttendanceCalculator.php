<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Setting;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class DtrPayrollAttendanceCalculator
{
    /**
     * @param  Collection<int, Employee>  $employees
     * @param  array<int, float>  $paidDaysBasisByEmployee
     * @return Collection<int, array{default_paid_days_basis: float, days_present: float, absence_days: float, tardiness_minutes: float, unresolved_dates: array<int, string>}>
     */
    public function calculateMany(Collection $employees, CarbonInterface $from, CarbonInterface $to, array $paidDaysBasisByEmployee): Collection
    {
        $logs = DtrLog::query()
            ->whereIn('employee_id', $employees->pluck('id'))
            ->where('date', '>=', $from->toDateString())
            ->where('date', '<', Carbon::parse($to->toDateString())->addDay()->toDateString())
            ->get()
            ->groupBy('employee_id')
            ->map(fn (Collection $items): Collection => $items->keyBy(fn (DtrLog $log): string => $log->date->toDateString()));

        return $employees->mapWithKeys(function (Employee $employee) use ($from, $to, $paidDaysBasisByEmployee, $logs): array {
            $employeeId = (int) $employee->id;
            $employeeLogs = $logs->get($employeeId, collect());
            $presentDays = 0.0;
            $absenceDays = 0.0;
            $tardinessMinutes = 0.0;
            $unresolvedDates = [];

            foreach (CarbonPeriod::create($from, $to) as $day) {
                if (! Employee::isWorkDay($employeeId, $day)) {
                    continue;
                }

                $log = $employeeLogs->get($day->toDateString());
                $status = $log?->displayStatus() ?? DtrLog::fallbackStatus($employeeId, $day);

                if ($day->isFuture() || $status === 'missing_out' || in_array($status, ['in_progress', 'upcoming'], true)) {
                    $unresolvedDates[] = $day->toDateString();
                }

                $presentDays += match ($status) {
                    'on_time', 'late', 'undertime' => 1.0,
                    'half_day' => 0.5,
                    default => 0.0,
                };

                $absenceDays += match ($status) {
                    'absent', 'missing_out' => 1.0,
                    'half_day' => 0.5,
                    default => 0.0,
                };

                if ($log && ! Employee::isAlwaysPresent($employeeId)) {
                    $tardinessMinutes += $this->lateMinutes($log);
                }
            }

            $paidDaysBasis = (float) ($paidDaysBasisByEmployee[$employeeId] ?? 0.0);

            return [$employeeId => [
                'default_paid_days_basis' => $paidDaysBasis,
                'days_present' => $presentDays,
                'absence_days' => min($paidDaysBasis, $absenceDays),
                'tardiness_minutes' => $tardinessMinutes,
                'unresolved_dates' => $unresolvedDates,
            ]];
        });
    }

    private function lateMinutes(DtrLog $log): float
    {
        $employeeId = (int) $log->employee_id;
        $shiftStart = EmployeeSchedule::shiftFor($employeeId, $log->date)['start']
            ?? Setting::get('shift_start', '08:00');
        $shiftStartMinute = ((int) substr((string) $shiftStart, 0, 2) * 60) + (int) substr((string) $shiftStart, 3, 2);
        $arrival = $log->am_time_in;

        // A PM-only punch is not morning tardiness for an afternoon half day.
        if (! $arrival && $shiftStartMinute >= 720) {
            $arrival = $log->pm_time_in;
        }

        if (! $arrival) {
            return 0.0;
        }

        $start = Carbon::parse($shiftStart);
        $clockIn = Carbon::parse($arrival);
        $arrivalMinute = ((int) $clockIn->format('H') * 60) + (int) $clockIn->format('i');
        $startMinute = ((int) $start->format('H') * 60) + (int) $start->format('i');

        // Overnight shifts may record a clock-in shortly after midnight.
        if ($arrivalMinute < $startMinute && $startMinute - $arrivalMinute > 720) {
            $arrivalMinute += 1440;
        }

        $graceMinutes = (int) Setting::get('late_grace_minutes', '0');

        return (float) max(0, $arrivalMinute - $startMinute - $graceMinutes);
    }
}
