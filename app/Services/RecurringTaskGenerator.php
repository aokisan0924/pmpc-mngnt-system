<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RecurringTask;
use App\Models\Task;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RecurringTaskGenerator
{
    /** Most copies one rule can create in a single run. */
    private const MAX_PER_RULE = 31;

    /** Missed due dates older than this many days are skipped, not resurrected. */
    private const CATCH_UP_DAYS = 31;

    public function __construct(private readonly TaskAssignmentNotifier $notifier) {}

    /** Create every copy whose time has come. Safe to run repeatedly. Returns how many were created. */
    public function run(): int
    {
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $created = 0;

        RecurringTask::where('active', true)->with('assignees:id')->orderBy('id')->each(function (RecurringTask $rule) use ($today, &$created) {
            $created += $this->generateFor($rule, $today);
        });

        return $created;
    }

    /** The same, but at most once per calendar day (used when an admin opens a page, so it works without cron). */
    public function runOncePerDay(): void
    {
        $today = CarbonImmutable::now('Asia/Manila')->toDateString();

        $key = "recurring-tasks-generated:{$today}";

        if (Cache::add($key, true, now()->addDay())) {
            try {
                $this->run();
            } catch (\Throwable $e) {
                // A failure must not 500 the admin's page or use up the day: let the next visit retry.
                report($e);
                Cache::forget($key);
            }
        }
    }

    private function generateFor(RecurringTask $rule, CarbonImmutable $today): int
    {
        $created = 0;
        $ids = $rule->assignees->pluck('id')->all();
        $cursor = CarbonImmutable::parse(($rule->last_due_date ?? $rule->starts_on->copy()->subDay())->toDateString());

        while ($created < self::MAX_PER_RULE && ($next = $rule->nextDueAfter($cursor)) !== null) {
            if ($next->subDays((int) $rule->lead_days)->gt($today)) {
                break;
            }

            $cursor = $next;

            if ($next->lt($today->subDays(self::CATCH_UP_DAYS))) {
                continue;
            }

            // One transaction: a shared task never exists without its people.
            $task = DB::transaction(function () use ($rule, $next, $ids) {
                $task = Task::firstOrCreate(
                    ['recurring_task_id' => $rule->id, 'due_date' => $next->toDateString()],
                    [
                        'employee_id' => $rule->employee_id,
                        'office' => $rule->office,
                        'assigned_by' => $rule->created_by,
                        'title' => $rule->title,
                        'description' => $rule->description,
                        'category' => $rule->category,
                        'priority' => $rule->priority,
                        'status' => 'pending',
                    ]
                );

                if ($task->wasRecentlyCreated && $ids !== []) {
                    $task->assignees()->sync($ids);
                }

                return $task;
            });

            if ($task->wasRecentlyCreated) {
                $created++;
                $this->notifier->notify($task, (int) $rule->created_by);
            }
        }

        $rule->update(['last_due_date' => $cursor->toDateString()]);

        return $created;
    }
}
