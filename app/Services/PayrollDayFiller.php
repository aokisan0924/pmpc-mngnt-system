<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

/**
 * Company rule: payroll is given on payroll day, so anyone who times in that day is present for the whole day.
 * Once HR turns payroll day on, today's open DTR days get their remaining punches at the normal times
 * (store staff: their own clock-out). Existing punches are never changed.
 */
class PayrollDayFiller
{
    private const KEY = 'payroll_day';

    public function isOn(): bool
    {
        return Setting::get(self::KEY) === today()->toDateString();
    }

    /** Turns payroll day on for today and fills everyone already timed in; returns how many days changed. */
    public function start(): int
    {
        return DB::transaction(function (): int {
            Setting::set(self::KEY, today()->toDateString());
            $staff = Employee::where('is_staff', true)->where('status', 'active')->pluck('id');
            $logs = DtrLog::whereIn('employee_id', $staff)->whereDate('date', today())
                ->where(fn ($query) => $query->whereNotNull('am_time_in')->orWhereNotNull('pm_time_in'))
                ->lockForUpdate()->get();

            return $logs->filter(fn (DtrLog $log): bool => $this->fillLog($log))->count();
        });
    }

    /** Fills the empty punches after the time-in and saves; true when the row changed. */
    public function fillLog(DtrLog $log): bool
    {
        $employeeId = (int) $log->employee_id;
        if ((! $log->am_time_in && ! $log->pm_time_in) || $log->hasActiveAbsence() || ! Employee::isWorkDay($employeeId, $log->date)) {
            return false;
        }

        $shift = EmployeeSchedule::shiftFor($employeeId, $log->date);
        // Overnight shift: its clock-out is tomorrow morning; a filled one would turn that punch into a stray time-in.
        if ($shift !== null && $shift['end'] < $shift['start']) {
            return false;
        }
        // Same end time the DTR status uses (DtrLog::computeHoursAndStatus): offices close at 4pm on Fridays.
        $end = substr((string) ($shift['end'] ?? ($log->date->isFriday() ? '16:00' : Setting::get('shift_end', '17:00'))), 0, 5).':00';
        $fill = $log->isTwoPunch()
            ? ['pm_time_out' => $end]
            : ($log->am_time_in
                ? ['am_time_out' => substr((string) Setting::get('lunch_start', '12:00'), 0, 5).':00', 'pm_time_in' => substr((string) Setting::get('lunch_end', '13:00'), 0, 5).':00', 'pm_time_out' => $end]
                : ['pm_time_out' => $end]);

        $changed = false;
        foreach ($fill as $slot => $time) {
            if (! $log->$slot) {
                $log->$slot = $time;
                $changed = true;
            }
        }
        if ($changed) {
            $log->computeHoursAndStatus();
            $log->save();
        }

        return $changed;
    }
}
