<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Holiday;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

/**
 * Writes the standard punches (8-12, 1-5) for "always present" employees on workdays that have no DTR row yet.
 * It never overwrites an existing row and never goes back before an employee's latest row, so flagging
 * someone later does not invent history.
 */
class AlwaysPresentAttendanceFiller
{
    private const PUNCHES = ['am_time_in' => '08:00:00', 'am_time_out' => '12:00:00', 'pm_time_in' => '13:00:00', 'pm_time_out' => '17:00:00'];

    public function fill(): int
    {
        $created = 0;
        // Today counts only once the 5pm punch-out time has passed.
        $last = now()->format('H:i:s') >= self::PUNCHES['pm_time_out'] ? today() : today()->subDay();

        foreach (Employee::where('auto_present_weekdays', true)->where('status', 'active')->get() as $employee) {
            $latest = DtrLog::where('employee_id', $employee->id)->max('date');
            $first = $latest ? Carbon::parse($latest)->addDay() : today();

            if ($first->gt($last)) {
                continue;
            }

            foreach (CarbonPeriod::create($first, $last) as $day) {
                if (! Employee::isWorkDay((int) $employee->id, $day) || Holiday::typeOn($day)) {
                    continue;
                }

                $log = DtrLog::firstOrNew(['employee_id' => $employee->id, 'date' => $day->toDateString()]);
                if ($log->exists) {
                    continue;
                }

                $log->fill(self::PUNCHES);
                $log->computeHoursAndStatus();
                $log->save();
                $created++;
            }
        }

        return $created;
    }
}
