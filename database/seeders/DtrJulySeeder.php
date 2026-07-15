<?php

namespace Database\Seeders;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeds DTR logs for July 1 – 14, 2026.
 *
 * Usage:
 *   php artisan db:seed --class=DtrJulySeeder
 *
 * By default this seeds the account you were testing with
 * (jeffraesapla24@gmail.com). To seed a different employee, or several,
 * edit $targetEmails below.
 *
 * Weekends (Sat/Sun) are skipped entirely — no DTR record is created for
 * them, matching how the app behaves for real employees who don't work
 * those days. If your cooperative works weekends, remove the weekend
 * check in the loop below.
 *
 * Safe to re-run: uses updateOrCreate keyed on (employee_id, date), so
 * running it twice won't create duplicates or violate the unique
 * constraint on dtr_logs.
 */
class DtrJulySeeder extends Seeder
{
    /**
     * Which employees to seed DTR logs for.
     */
    private array $targetEmails = [
        'jeffraesapla24@gmail.com',
    ];

    public function run(): void
    {
        $shiftStart = Setting::get('shift_start', '08:00');
        $shiftEnd   = Setting::get('shift_end', '17:00');
        $lunchStart = Setting::get('lunch_start', '12:00');
        $lunchEnd   = Setting::get('lunch_end', '13:00');

        $employees = Employee::whereIn('email', $this->targetEmails)->get();

        if ($employees->isEmpty()) {
            $this->command->warn(
                'No matching employees found for: ' . implode(', ', $this->targetEmails)
                . '. Update $targetEmails in DtrJulySeeder.php and re-run.'
            );
            return;
        }

        $start = Carbon::parse('2026-07-01');
        $end   = Carbon::parse('2026-07-14');

        foreach ($employees as $employee) {
            $seeded = 0;

            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                // Skip weekends — no DTR record for non-working days.
                if ($date->isWeekend()) {
                    continue;
                }

                $punches = $this->generatePunches(
                    $date, $shiftStart, $shiftEnd, $lunchStart, $lunchEnd
                );

                $log = DtrLog::updateOrCreate(
                    ['employee_id' => $employee->id, 'date' => $date->format('Y-m-d')],
                    array_merge($punches, ['ip_address' => '127.0.0.1'])
                );

                $log->computeHoursAndStatus();
                $log->save();

                $seeded++;
            }

            $this->command->info("Seeded {$seeded} DTR day(s) for {$employee->first_name} {$employee->last_name} ({$employee->email}).");
        }
    }

    /**
     * Build one day's punch times with a bit of realistic variety:
     * mostly on-time, a couple of late/undertime days, and one absence.
     */
    private function generatePunches(
        Carbon $date, string $shiftStart, string $shiftEnd,
        string $lunchStart, string $lunchEnd
    ): array {
        // Deterministic "randomness" based on the day number, so the
        // seeder produces the same pattern every time it's run.
        $pattern = $date->day % 5;

        // One guaranteed absence to make the summary numbers realistic.
        if ($date->format('Y-m-d') === '2026-07-08') {
            return [
                'am_time_in'  => null,
                'am_time_out' => null,
                'pm_time_in'  => null,
                'pm_time_out' => null,
            ];
        }

        [$startH, $startM] = explode(':', $shiftStart);
        [$endH, $endM]     = explode(':', $shiftEnd);

        $amIn  = Carbon::parse($shiftStart);
        $amOut = Carbon::parse($lunchStart);
        $pmIn  = Carbon::parse($lunchEnd);
        $pmOut = Carbon::parse($shiftEnd);

        switch ($pattern) {
            case 0: // late arrival
                $amIn = $amIn->copy()->addMinutes(18);
                break;
            case 1: // left early (undertime)
                $pmOut = $pmOut->copy()->subMinutes(25);
                break;
            case 2: // half day (AM only)
                return [
                    'am_time_in'  => $amIn->format('H:i:s'),
                    'am_time_out' => $amOut->format('H:i:s'),
                    'pm_time_in'  => null,
                    'pm_time_out' => null,
                ];
            default: // on time, with a few minutes of natural jitter
                $jitter = $date->day % 3;
                $amIn   = $amIn->copy()->addMinutes($jitter);
                $pmOut  = $pmOut->copy()->addMinutes($jitter);
                break;
        }

        return [
            'am_time_in'  => $amIn->format('H:i:s'),
            'am_time_out' => $amOut->format('H:i:s'),
            'pm_time_in'  => $pmIn->format('H:i:s'),
            'pm_time_out' => $pmOut->format('H:i:s'),
        ];
    }
}