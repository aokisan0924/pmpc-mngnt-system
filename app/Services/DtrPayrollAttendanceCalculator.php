<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Holiday;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class DtrPayrollAttendanceCalculator
{
    /**
     * Paid hours per counted day: scheduled work days from the hire date up to yesterday, holidays included
     * (not worked = no work, no pay). Hours are capped at that day's shift length.
     *
     * @param  Collection<int, Employee>  $employees
     * @param  array<int, array<string, array{type: string, hours?: float|int|string, note?: string}>>  $resolutions
     * @return Collection<int, array{days: list<array{date: string, shift_hours: float, worked_hours: float, holiday: bool, source: string}>, days_of_work: float, unresolved_dates: list<string>}>
     */
    public function hoursFor(Collection $employees, CarbonInterface $from, CarbonInterface $to, array $resolutions = []): Collection
    {
        $logs = DtrLog::query()
            ->whereIn('employee_id', $employees->pluck('id'))
            ->where('date', '>=', $from->toDateString())
            ->where('date', '<', Carbon::parse($to->toDateString())->addDay()->toDateString())
            ->get()
            ->groupBy('employee_id')
            ->map(fn (Collection $items): Collection => $items->keyBy(fn (DtrLog $log): string => $log->date->toDateString()));
        $holidays = Holiday::whereBetween('date', [$from->toDateString(), $to->toDateString()])->get()
            ->map(fn (Holiday $holiday): string => $holiday->date->toDateString())->flip();
        $today = today()->toDateString();

        return $employees->mapWithKeys(function (Employee $employee) use ($from, $to, $resolutions, $logs, $holidays, $today): array {
            $employeeId = (int) $employee->id;
            $start = Employee::startDateFor($employeeId);
            $employeeLogs = $logs->get($employeeId, collect());
            $days = [];
            $unresolved = [];

            foreach (CarbonPeriod::create($from, $to) as $day) {
                $date = $day->toDateString();
                // Today is not finished yet; future days are not counted at all.
                if ($date >= $today || ! Employee::isWorkDay($employeeId, $day) || ($start !== null && $date < $start)) {
                    continue;
                }

                $shiftHours = EmployeeSchedule::shiftHoursFor($employeeId, $day);
                $log = $employeeLogs->get($date);
                $resolution = $resolutions[$employeeId][$date] ?? null;
                $status = $log?->displayStatus();
                $source = 'dtr';
                $worked = (float) ($log?->hours_rendered ?? 0);

                // A complete, on-time office day is a full shift; minutes are only counted on late/undertime/half days.
                if ($log !== null && $status === 'on_time' && ! (EmployeeSchedule::shiftFor($employeeId, $day)['two_punch'] ?? false)) {
                    $worked = $shiftHours;
                }
                // Always-present staff skip punching, not holidays: a holiday is no work, no pay for them too.
                if ($log === null && Employee::isAlwaysPresent($employeeId) && ! $holidays->has($date)) {
                    $worked = $shiftHours;
                } elseif (in_array($status, ['missing_out', 'in_progress'], true)) {
                    $source = 'unresolved';
                    $worked = 0.0;
                }
                if ($resolution !== null && ($resolution['type'] ?? null) === 'hours') {
                    [$source, $worked] = ['typed', (float) ($resolution['hours'] ?? 0)];
                } elseif ($resolution !== null && ($resolution['type'] ?? null) === 'zero') {
                    [$source, $worked] = ['zero', 0.0];
                }
                if ($source === 'unresolved') {
                    $unresolved[] = $date;
                }

                $days[] = [
                    'date' => $date,
                    'shift_hours' => $shiftHours,
                    'worked_hours' => round(min(max($worked, 0.0), $shiftHours), 2),
                    'holiday' => $holidays->has($date),
                    'source' => $source,
                ];
            }

            // Monday-to-Friday staff earn a fixed half month (daily rate x 22 / 2); weekdays before the hire date come off.
            $fixedDays = null;
            if (! Employee::hasCustomWorkDays($employeeId, $from, $to)) {
                $beforeStart = $start === null ? 0 : collect(CarbonPeriod::create($from, $to))
                    ->filter(fn ($day): bool => $day->isWeekday() && $day->toDateString() < $start)->count();
                $fixedDays = (float) max(0, 11 - $beforeStart);
            }

            return [$employeeId => ['days' => $days, 'days_of_work' => (float) count($days), 'fixed_days' => $fixedDays, 'unresolved_dates' => $unresolved]];
        });
    }
}
