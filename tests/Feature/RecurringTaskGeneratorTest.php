<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\RecurringTask;
use App\Models\Task;
use App\Services\RecurringTaskGenerator;
use App\Services\TaskAssignmentNotifier;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RecurringTaskGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function today(string $date): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse($date.' 08:00', 'Asia/Manila'));
        Carbon::setTestNow(Carbon::parse($date.' 08:00', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function rule(array $overrides = []): RecurringTask
    {
        $admin = $overrides['created_by'] ?? Employee::factory()->superAdmin()->create()->id;
        unset($overrides['created_by']);

        return RecurringTask::create([
            'created_by' => $admin,
            'employee_id' => null,
            'office' => 'cubao',
            'title' => 'Electric bill',
            'description' => 'Pay at the counter',
            'category' => 'Bills',
            'priority' => 'high',
            'frequency' => 'monthly',
            'day_of_month' => 5,
            'lead_days' => 7,
            'starts_on' => '2026-10-05',
            'last_due_date' => '2026-10-05',
            'active' => true,
            ...$overrides,
        ]);
    }

    private function next(RecurringTask $rule, string $after): ?string
    {
        return $rule->nextDueAfter(CarbonImmutable::parse($after))?->toDateString();
    }

    public function test_monthly_rule_finds_the_next_day_of_month(): void
    {
        $rule = $this->rule();

        $this->assertSame('2026-11-05', $this->next($rule, '2026-11-04'));
        $this->assertSame('2026-12-05', $this->next($rule, '2026-11-05'));
    }

    public function test_monthly_day_31_falls_on_the_last_day_of_short_months_and_last_day_flag_works(): void
    {
        $thirtyFirst = $this->rule(['day_of_month' => 31]);
        $this->assertSame('2026-02-28', $this->next($thirtyFirst, '2026-01-31'));
        $this->assertSame('2026-03-31', $this->next($thirtyFirst, '2026-02-28'));
        $this->assertSame('2028-02-29', $this->next($thirtyFirst, '2028-01-31'));

        $lastDay = $this->rule(['day_of_month' => null, 'last_day_of_month' => true]);
        $this->assertSame('2026-12-31', $this->next($lastDay, '2026-11-30'));
    }

    public function test_weekly_daily_and_yearly_rules(): void
    {
        $weekly = $this->rule(['frequency' => 'weekly', 'day_of_week' => 5, 'day_of_month' => null]);
        $this->assertSame('2026-11-06', $this->next($weekly, '2026-11-04'));
        $this->assertSame('2026-11-13', $this->next($weekly, '2026-11-06'));

        $daily = $this->rule(['frequency' => 'daily', 'day_of_month' => null]);
        $this->assertSame('2026-11-05', $this->next($daily, '2026-11-04'));

        $feb29 = $this->rule(['frequency' => 'yearly', 'month' => 2, 'day_of_month' => 29]);
        $this->assertSame('2027-02-28', $this->next($feb29, '2026-03-01'));
        $this->assertSame('2028-02-29', $this->next($feb29, '2027-02-28'));
    }

    public function test_a_copy_appears_once_its_lead_time_has_arrived_and_carries_the_rule_details(): void
    {
        $this->today('2026-11-01');
        $rule = $this->rule();

        $created = app(RecurringTaskGenerator::class)->run();

        $this->assertSame(1, $created);
        $task = Task::firstOrFail();
        $this->assertSame('2026-11-05', $task->due_date->toDateString());
        $this->assertSame($rule->id, $task->recurring_task_id);
        $this->assertSame($rule->created_by, $task->assigned_by);
        $this->assertSame(['Electric bill', 'Pay at the counter', 'Bills', 'high', 'cubao', 'pending'],
            [$task->title, $task->description, $task->category, $task->priority, $task->office, $task->status]);
        $this->assertSame('2026-11-05', $rule->fresh()->last_due_date->toDateString());
    }

    public function test_nothing_is_created_before_the_lead_time_and_running_twice_never_duplicates(): void
    {
        $this->today('2026-10-20');
        $this->rule();
        $this->assertSame(0, app(RecurringTaskGenerator::class)->run());

        $this->today('2026-11-01');
        app(RecurringTaskGenerator::class)->run();
        app(RecurringTaskGenerator::class)->run();

        $this->assertSame(1, Task::count());
    }

    public function test_catch_up_skips_dates_older_than_31_days_but_keeps_recent_missed_ones(): void
    {
        $this->today('2026-11-10');
        $rule = $this->rule(['last_due_date' => '2026-09-05']);

        app(RecurringTaskGenerator::class)->run();

        $this->assertSame(['2026-11-05'], Task::pluck('due_date')->map->toDateString()->all());
        $this->assertSame('2026-11-05', $rule->fresh()->last_due_date->toDateString());
    }

    public function test_a_daily_rule_after_a_long_gap_is_capped_at_31_copies_per_run(): void
    {
        $this->today('2026-11-04');
        $this->rule(['frequency' => 'daily', 'day_of_month' => null, 'lead_days' => 0, 'last_due_date' => '2026-09-01']);

        $this->assertSame(31, app(RecurringTaskGenerator::class)->run());
        $this->assertSame(1, app(RecurringTaskGenerator::class)->run());
        $this->assertSame(32, Task::count());
    }

    public function test_end_date_and_inactive_rules_stop_generation(): void
    {
        $this->today('2026-12-01');
        $this->rule(['ends_on' => '2026-11-20', 'last_due_date' => '2026-10-05']);
        $this->rule(['title' => 'Paused', 'active' => false, 'last_due_date' => '2026-10-05']);

        app(RecurringTaskGenerator::class)->run();

        $this->assertSame(['Electric bill'], Task::pluck('title')->all());
        $this->assertSame(['2026-11-05'], Task::pluck('due_date')->map->toDateString()->all());
    }

    public function test_each_copy_notifies_its_owner_but_never_the_admin_who_owns_the_rule(): void
    {
        $this->today('2026-11-01');
        $admin = Employee::factory()->superAdmin()->create();
        $maria = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->rule(['created_by' => $admin->id, 'employee_id' => $maria->id]);
        $this->rule(['created_by' => $admin->id, 'employee_id' => $admin->id, 'title' => 'Mine']);

        app(RecurringTaskGenerator::class)->run();

        $this->assertSame(1, EmployeeNotification::where('employee_id', $maria->id)->where('type', 'task_assigned')->count());
        $this->assertSame(0, EmployeeNotification::where('employee_id', $admin->id)->count());
    }

    public function test_the_once_per_day_guard_runs_the_generator_a_single_time_per_day(): void
    {
        Cache::flush();
        $this->today('2026-11-01');
        $this->rule();
        app(RecurringTaskGenerator::class)->runOncePerDay();
        $this->assertSame(1, Task::count());

        $this->rule(['title' => 'Second bill']);
        app(RecurringTaskGenerator::class)->runOncePerDay();
        $this->assertSame(1, Task::count());

        $this->today('2026-11-02');
        app(RecurringTaskGenerator::class)->runOncePerDay();
        $this->assertSame(2, Task::count());
    }

    public function test_a_failed_run_does_not_use_up_the_day(): void
    {
        Cache::flush();
        $this->today('2026-11-01');
        $this->rule();

        $broken = new class(app(TaskAssignmentNotifier::class)) extends RecurringTaskGenerator
        {
            public function run(): int
            {
                throw new \RuntimeException('boom');
            }
        };
        $broken->runOncePerDay();

        $this->assertSame(0, Task::count());
        app(RecurringTaskGenerator::class)->runOncePerDay();
        $this->assertSame(1, Task::count());
    }

    public function test_the_artisan_command_generates_copies(): void
    {
        $this->today('2026-11-01');
        $this->rule();

        $this->artisan('tasks:generate-recurring')->expectsOutputToContain('1')->assertSuccessful();

        $this->assertSame(1, Task::count());
    }

    private function sharedRule(Employee $admin, Employee ...$people): RecurringTask
    {
        $rule = $this->rule(['created_by' => $admin->id, 'office' => null]);
        $rule->assignees()->attach(array_map(fn (Employee $e) => $e->id, $people));

        return $rule;
    }

    public function test_a_shared_rule_makes_one_shared_task_per_date_with_the_same_people(): void
    {
        $this->today('2026-11-01');
        $admin = Employee::factory()->superAdmin()->create();
        [$a, $b] = [Employee::factory()->create(), Employee::factory()->create()];
        $this->sharedRule($admin, $a, $b);

        app(RecurringTaskGenerator::class)->run();

        $task = Task::with('assignees')->sole();
        $this->assertNull($task->employee_id);
        $this->assertNull($task->office);
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $task->assignees->pluck('id')->all());
    }

    public function test_running_a_shared_rule_twice_adds_no_task_and_no_pivot_row(): void
    {
        $this->today('2026-11-01');
        $admin = Employee::factory()->superAdmin()->create();
        $this->sharedRule($admin, Employee::factory()->create(), Employee::factory()->create());

        app(RecurringTaskGenerator::class)->run();
        app(RecurringTaskGenerator::class)->run();

        $this->assertSame(1, Task::count());
        $this->assertSame(2, DB::table('task_assignees')->count());
    }

    public function test_each_person_on_a_shared_copy_is_notified_once_and_the_admin_never(): void
    {
        $this->today('2026-11-01');
        $admin = Employee::factory()->superAdmin()->create();
        [$a, $b] = [Employee::factory()->create(), Employee::factory()->create()];
        $this->sharedRule($admin, $a, $b);

        app(RecurringTaskGenerator::class)->run();

        $count = fn (Employee $e) => EmployeeNotification::where('employee_id', $e->id)->where('type', 'task_assigned')->count();
        $this->assertSame([1, 1, 0], [$count($a), $count($b), $count($admin)]);
    }
}
