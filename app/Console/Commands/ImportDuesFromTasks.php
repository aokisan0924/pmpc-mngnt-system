<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Due;
use App\Models\RecurringTask;
use App\Services\DueSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportDuesFromTasks extends Command
{
    protected $signature = 'dues:import-from-tasks {--apply : Save the changes (otherwise only list them)}';

    protected $description = 'Turn the active monthly whole-office repeating tasks (bills typed as tasks) into dues and stop those repeat rules';

    public function handle(DueSchedule $schedule): int
    {
        $rules = RecurringTask::where('active', true)->where('frequency', 'monthly')->whereNull('employee_id')->whereNotNull('office')->orderBy('id')->get();

        if ($rules->isEmpty()) {
            $this->info('No active monthly whole-office repeating tasks to move.');

            return self::SUCCESS;
        }

        $plan = $rules->map(function (RecurringTask $rule): array {
            // "Dumalag - Every 5th of the month" -> "Dumalag": the schedule is stored as a schedule now.
            $title = trim((string) preg_replace('/\s*[-–]\s*Every\b.*$/iu', '', $rule->title)) ?: $rule->title;
            // One "PHP 1,234.50" in the notes becomes the amount; zero or several are left for a person to fill in.
            preg_match_all('/PHP\s*([\d,]+(?:\.\d{1,2})?)/i', (string) $rule->description, $m);
            $amount = count($m[1]) === 1 ? (float) str_replace(',', '', $m[1][0]) : null;

            return ['rule' => $rule, 'title' => $title, 'amount' => $amount];
        });

        $this->table(
            ['Rule', 'Becomes the due', 'Office', 'Schedule', 'Amount found'],
            $plan->map(fn (array $p) => [$p['rule']->id, $p['title'], $p['rule']->office, $p['rule']->label(), $p['amount'] === null ? '(none: fill in later)' : number_format($p['amount'], 2)])->all(),
        );

        if (! $this->option('apply')) {
            $this->warn('Dry run: nothing saved. Run again with --apply to create the dues and stop the repeat rules. Existing task copies are left alone.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($plan): void {
            foreach ($plan as $p) {
                $rule = $p['rule'];
                Due::create([
                    'title' => $p['title'],
                    'notes' => $rule->description,
                    'office' => $rule->office,
                    'amount' => $p['amount'],
                    'frequency' => 'monthly',
                    'day_of_month' => $rule->last_day_of_month ? null : $rule->day_of_month,
                    'last_day_of_month' => (bool) $rule->last_day_of_month,
                    'active' => true,
                    'created_by' => $rule->created_by,
                ]);
                $rule->update(['active' => false]);
            }
        });

        $schedule->ensureMonth(CarbonImmutable::now('Asia/Manila'));
        $this->info($plan->count().' dues created and their repeat rules stopped. Existing task copies were not touched.');

        return self::SUCCESS;
    }
}
