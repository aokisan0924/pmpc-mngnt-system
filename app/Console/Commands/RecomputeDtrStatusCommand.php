<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\DtrLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecomputeDtrStatusCommand extends Command
{
    protected $signature = 'dtr:recompute-status
        {--from= : First date to check (Y-m-d)}
        {--to= : Last date to check (Y-m-d, defaults to yesterday)}
        {--apply : Save the new statuses; without it the changes are only listed}';

    protected $description = 'Re-run the attendance status rules on saved DTR logs. Only the status changes; punches and hours are kept.';

    public function handle(): int
    {
        $from = $this->option('from');
        if (! $from) {
            $this->error('Pass --from=Y-m-d.');

            return self::FAILURE;
        }
        $to = $this->option('to') ?? today()->subDay()->toDateString();

        $changes = [];
        DtrLog::with('employee')
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->get()
            ->each(function (DtrLog $log) use (&$changes): void {
                $before = $log->status;
                $hours = $log->hours_rendered;
                $log->computeHoursAndStatus();
                if ($log->status !== $before) {
                    $changes[] = [$log, $before, $log->status];
                }
                $log->hours_rendered = $hours;
            });

        $this->table(
            ['Date', 'Employee', 'Punches', 'Old status', 'New status'],
            array_map(fn (array $change): array => [
                $change[0]->date->toDateString(),
                $change[0]->employee?->full_name,
                collect([$change[0]->am_time_in, $change[0]->am_time_out, $change[0]->pm_time_in, $change[0]->pm_time_out])
                    ->map(fn (?string $time): string => $time ? substr($time, 0, 5) : '-')->implode(' '),
                $change[1],
                $change[2],
            ], $changes),
        );

        if (! $this->option('apply')) {
            $this->info(count($changes).' status change(s) found. Run again with --apply to save them.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($changes): void {
            foreach ($changes as [$log, , $status]) {
                DtrLog::whereKey($log->id)->update(['status' => $status]);
            }
        });
        $this->info(count($changes).' status change(s) saved.');

        return self::SUCCESS;
    }
}
