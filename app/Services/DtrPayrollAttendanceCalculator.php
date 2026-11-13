<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Holiday;
use App\Models\Setting;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class DtrPayrollAttendanceCalculator
{
    /**
     * Paid hours per counted day: scheduled work days from the hire date up to today, holidays included
     * (not worked = no work, no pay). Hours are capped at that day's shift length.
     *
     * @param  Collection<int, Employee>  $employees
     * @param  array<int, array<string, array{type: string, hours?: float|int|string, note?: string}>>  $resolutions
     * @return Collection<int, array{days: list<array{date: string, shift_hours: float, worked_hours: float, holiday: bool, source: string}>, days_of_work: float, unresolved_dates: list<string>}>
     */
    public function hoursFor(Collection $employees, CarbonInterface $from, CarbonInterface $to, array $resolutions = [], bool $assumePresent = false): Collection
    {
        $logs = DtrLog::query()
            ->whereIn('employee_id', $employees->pluck('id'))
            ->where('date', '>=', $from->toDateString())
            ->where('date', '<', Carbon::parse($to->toDateString())->addDay()->toDateString())
            ->get()
            ->groupBy('employee_id')
            ->map(fn (Collection $items): Collection => $items->keyBy(fn (DtrLog $log): string => $log->date->toDateString()));
        // whereDate: a holiday on the window's last day must count (dates may be stored with a time part).
        $holidays = Holiday::whereDate('date', '>=', $from->toDateString())->whereDate('date', '<=', $to->toDateString())->get()
            ->mapWithKeys(fn (Holiday $holiday): array => [$holiday->date->toDateString() => (string) $holiday->type]);
        $today = today()->toDateString();

        return $employees->mapWithKeys(function (Employee $employee) use ($from, $to, $resolutions, $logs, $holidays, $today, $assumePresent): array {
            $employeeId = (int) $employee->id;
            $start = Employee::startDateFor($employeeId);
            $employeeLogs = $logs->get($employeeId, collect());
            $days = [];
            $unresolved = [];

            foreach (CarbonPeriod::create($from, $to) as $day) {
                $date = $day->toDateString();
                if (! Employee::isWorkDay($employeeId, $day) || ($start !== null && $date < $start)) {
                    continue;
                }
                $shiftHours = EmployeeSchedule::shiftHoursFor($employeeId, $day);
                // Future days have not happened: skipped, or assumed present in a mockup (today too)
                // (holidays stay no work, no pay unless the shift is a two-punch store shift that works every day).
                if ($date > $today || ($assumePresent && $date === $today)) {
                    if ($assumePresent) {
                        $twoPunch = EmployeeSchedule::shiftFor($employeeId, $day)['two_punch'] ?? false;
                        $days[] = ['date' => $date, 'shift_hours' => $shiftHours, 'worked_hours' => $holidays->has($date) && ! $twoPunch ? 0.0 : $shiftHours, 'holiday' => $holidays->has($date), 'source' => 'assumed'];
                    }

                    continue;
                }

                $log = $employeeLogs->get($date);
                $resolution = $resolutions[$employeeId][$date] ?? null;
                $status = $log?->displayStatus();
                $source = 'dtr';
                $worked = (float) ($log?->hours_rendered ?? 0);

                // A complete day (on time, late or left early) pays the full shift: leaving early is never deducted,
                // and a late arrival is charged only as tardiness (October formula), not as missing hours.
                $lateMinutes = 0.0;
                // Payroll day rule: payroll is given today, so anyone who has timed in today is present the whole day
                // (only a late morning arrival is charged as tardiness). No time-in yet means absent today.
                $timedInToday = $date === $today && ($log?->am_time_in || $log?->pm_time_in);
                if ($timedInToday) {
                    $worked = $shiftHours;
                    $lateMinutes = $log->am_time_in ? $this->lateness($log)[1] : 0.0;
                } elseif ($log !== null && in_array($status, ['on_time', 'late', 'undertime'], true)) {
                    $worked = $shiftHours;
                    if ($status === 'late') {
                        $lateMinutes = $this->lateness($log)[1];
                    }
                }
                // Always-present staff skip punching, not holidays: a holiday is no work, no pay for them too.
                if ($log === null && Employee::isAlwaysPresent($employeeId) && ! $holidays->has($date)) {
                    $worked = $shiftHours;
                } elseif (! $timedInToday && in_array($status, ['missing_out', 'in_progress'], true)) {
                    $source = 'unresolved';
                    $worked = 0.0;
                }
                if ($resolution !== null && ($resolution['type'] ?? null) === 'hours') {
                    [$source, $worked] = ['typed', (float) ($resolution['hours'] ?? 0)];
                } elseif ($resolution !== null && ($resolution['type'] ?? null) === 'zero') {
                    [$source, $worked, $lateMinutes] = ['zero', 0.0, 0.0];
                }
                if ($source === 'typed') {
                    $lateMinutes = 0.0;
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
                    'late_minutes' => $lateMinutes,
                ];
            }

            // Monday-to-Friday staff earn a fixed half month (daily rate x 22 / 2). Someone hired after the window
            // starts is paid only for the weekdays from the hire date to its end (0 if they start after it).
            $fixedDays = null;
            if (! Employee::hasCustomWorkDays($employeeId, $from, $to)) {
                $fixedDays = $start === null || $start <= $from->toDateString()
                    ? 11.0
                    : (float) min(11, collect(CarbonPeriod::create($from, $to))
                        ->filter(fn ($day): bool => $day->isWeekday() && $day->toDateString() >= $start)->count());
            }

            // Holidays in the window, for DOLE pay on work done (OfficePayrollCalculator). Assumed mockup days are left out.
            $byDate = collect($days)->keyBy('date');
            $holidayWork = [];
            foreach ($holidays as $date => $type) {
                if (($start !== null && $date < $start) || $date > $today || ($assumePresent && $date >= $today)) {
                    continue;
                }
                $day = Carbon::parse($date);
                $log = $employeeLogs->get($date);
                $entry = $byDate->get($date);
                $dtrHours = $log !== null && ($log->am_time_in || $log->pm_time_in) ? (float) $log->hours_rendered : null;
                // A missing punch settled on step 2 (typed hours or 0) counts as the day's hours.
                if ($entry !== null && in_array($entry['source'], ['typed', 'zero'], true)) {
                    $dtrHours = (float) $entry['worked_hours'];
                }
                $holidayWork[] = [
                    'date' => $date,
                    'type' => $type,
                    'rest_day' => ! Employee::isWorkDay($employeeId, $day),
                    'shift_hours' => EmployeeSchedule::shiftHoursFor($employeeId, $day),
                    'dtr_hours' => $dtrHours,
                    'paid_hours' => (float) ($entry['worked_hours'] ?? 0.0),
                ];
            }

            return [$employeeId => ['holiday_work' => $holidayWork, 'days' => $days, 'days_of_work' => (float) count($days), 'fixed_days' => $fixedDays, 'tardiness_minutes' => (float) array_sum(array_column($days, 'late_minutes')), 'unresolved_dates' => $unresolved]];
        });
    }

    /**
     * Minutes between shift start and the first punch, and the late minutes after the grace period.
     *
     * @return array{0: float, 1: float}
     */
    private function lateness(DtrLog $log): array
    {
        $employeeId = (int) $log->employee_id;
        $shiftStart = (string) (EmployeeSchedule::shiftFor($employeeId, $log->date)['start'] ?? Setting::get('shift_start', '08:00'));
        $startMinute = (int) substr($shiftStart, 0, 2) * 60 + (int) substr($shiftStart, 3, 2);
        // A full "late" day whose first punch is after lunch arrived at its PM in (as the DTR status reads it).
        $arrival = $log->am_time_in ?: $log->pm_time_in;
        if (! $arrival) {
            return [0.0, 0.0];
        }
        $arrivalMinute = (int) substr((string) $arrival, 0, 2) * 60 + (int) substr((string) $arrival, 3, 2);
        // Overnight shifts may record a clock-in shortly after midnight.
        if ($arrivalMinute < $startMinute && $startMinute - $arrivalMinute > 720) {
            $arrivalMinute += 1440;
        }
        $lost = (float) max(0, $arrivalMinute - $startMinute);

        return [$lost, (float) max(0, $lost - (int) Setting::get('late_grace_minutes', '0'))];
    }
}
