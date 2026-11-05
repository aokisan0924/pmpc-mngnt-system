<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TeamTaskDueTypeTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $maria;

    private Employee $juan;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-05 10:00', 'Asia/Manila');
        $this->admin = Employee::factory()->superAdmin()->create(['first_name' => 'Kurt', 'last_name' => 'Boss']);
        $this->maria = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->juan = Employee::factory()->create(['payroll_office' => 'cubao']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function payload(array $overrides = []): array
    {
        return ['title' => 'Count the cash', 'priority' => 'high', 'employee_ids' => [$this->maria->id, $this->juan->id], ...$overrides];
    }

    private function create(array $payload)
    {
        return $this->actingAs($this->admin)->post('/admin/team-tasks', $payload);
    }

    private function dateOf(string $title): ?string
    {
        return Task::where('title', $title)->firstOrFail()->due_date?->toDateString();
    }

    public function test_no_due_date_works_for_copies_shared_and_whole_office(): void
    {
        $this->create($this->payload(['due_type' => 'none']))->assertSessionHasNoErrors();
        $this->assertSame(2, Task::count());
        $this->assertSame(2, Task::whereNull('due_date')->count());

        $this->create($this->payload(['due_type' => 'none', 'shared' => true]))->assertSessionHasNoErrors();
        $this->assertSame(3, Task::count());

        $this->create(['title' => 'Office', 'priority' => 'low', 'due_type' => 'none', 'office' => 'cubao', 'employee_id' => ''])->assertSessionHasNoErrors();
        $this->assertSame(4, Task::count());
        $this->assertSame(4, Task::whereNull('due_date')->count());
        $this->assertSame(0, RecurringTask::count());
    }

    public function test_no_due_date_ignores_a_posted_date(): void
    {
        $this->create($this->payload(['due_type' => 'none', 'due_date' => '2026-11-20']))->assertSessionHasNoErrors();

        $this->assertSame(2, Task::whereNull('due_date')->count());
    }

    public function test_no_due_date_cannot_repeat(): void
    {
        $this->create($this->payload(['due_type' => 'none', 'repeat' => 'monthly', 'repeat_day_of_month' => 5]))->assertSessionHasErrors('repeat');

        $this->assertSame(0, Task::count());
    }

    public function test_recurring_sets_the_first_date_from_today(): void
    {
        $this->create($this->payload(['employee_ids' => [$this->maria->id], 'due_type' => 'recurring', 'due_date' => '2026-12-25', 'repeat' => 'weekly', 'repeat_day_of_week' => 5]))->assertSessionHasNoErrors();

        $task = Task::firstOrFail();
        $rule = RecurringTask::firstOrFail();
        $this->assertSame('2026-11-06', $task->due_date->toDateString());
        $this->assertSame('2026-11-06', $rule->starts_on->toDateString());
        $this->assertSame('2026-11-06', $rule->last_due_date->toDateString());
        $this->assertSame($rule->id, $task->recurring_task_id);
    }

    public function test_recurring_starts_today_when_today_is_on_the_schedule(): void
    {
        $one = ['employee_ids' => [$this->maria->id], 'due_type' => 'recurring'];
        $this->create($this->payload([...$one, 'title' => 'Daily', 'repeat' => 'daily']))->assertSessionHasNoErrors();
        $this->create($this->payload([...$one, 'title' => 'Weekly', 'repeat' => 'weekly', 'repeat_day_of_week' => 4]))->assertSessionHasNoErrors();
        $this->create($this->payload([...$one, 'title' => 'Monthly', 'repeat' => 'monthly', 'repeat_day_of_month' => 5]))->assertSessionHasNoErrors();

        $this->assertSame(['2026-11-05', '2026-11-05', '2026-11-05'], [$this->dateOf('Daily'), $this->dateOf('Weekly'), $this->dateOf('Monthly')]);
    }

    public function test_recurring_monthly_last_day_and_later_day(): void
    {
        $one = ['employee_ids' => [$this->maria->id], 'due_type' => 'recurring', 'repeat' => 'monthly'];
        $this->create($this->payload([...$one, 'title' => 'Last', 'repeat_last_day' => true]))->assertSessionHasNoErrors();
        $this->create($this->payload([...$one, 'title' => 'Tenth', 'repeat_day_of_month' => 10]))->assertSessionHasNoErrors();

        $this->assertSame(['2026-11-30', '2026-11-10'], [$this->dateOf('Last'), $this->dateOf('Tenth')]);
    }

    public function test_a_far_first_date_is_still_created_now_and_notified(): void
    {
        $this->create($this->payload(['employee_ids' => [$this->maria->id], 'due_type' => 'recurring', 'repeat' => 'yearly', 'repeat_month' => 3, 'repeat_day_of_month' => 15]))->assertSessionHasNoErrors();

        $this->assertSame('2027-03-15', $this->dateOf('Count the cash'));
        $this->assertSame(1, EmployeeNotification::where('employee_id', $this->maria->id)->where('type', 'task_assigned')->count());
    }

    public function test_recurring_needs_a_frequency(): void
    {
        $this->create($this->payload(['due_type' => 'recurring', 'repeat' => '']))->assertSessionHasErrors('repeat');

        $this->assertSame([0, 0], [Task::count(), RecurringTask::count()]);
    }

    public function test_recurring_that_stops_before_its_first_date_is_refused(): void
    {
        $this->create($this->payload(['due_type' => 'recurring', 'repeat' => 'monthly', 'repeat_day_of_month' => 10, 'repeat_until' => '2026-11-08']))->assertSessionHasErrors('repeat_until');

        $this->assertSame([0, 0], [Task::count(), RecurringTask::count()]);
    }

    public function test_recurring_shared_task_keeps_its_people(): void
    {
        $this->create($this->payload(['due_type' => 'recurring', 'shared' => true, 'repeat' => 'weekly', 'repeat_day_of_week' => 5]))->assertSessionHasNoErrors();

        $this->assertSame(1, RecurringTask::count());
        $this->assertSame(2, RecurringTask::firstOrFail()->assignees()->count());
        $this->assertSame(1, Task::count());
        $task = Task::firstOrFail();
        $this->assertSame('2026-11-06', $task->due_date->toDateString());
        $this->assertSame(2, $task->assignees()->count());
    }

    public function test_has_a_due_date_still_needs_one(): void
    {
        $this->create($this->payload(['due_type' => 'date']))->assertSessionHasErrors('due_date');
    }

    public function test_a_leftover_stop_after_date_is_ignored_when_the_task_does_not_repeat(): void
    {
        // The form can still hold a "Stop after" date typed under Recurring before switching to Has a due date.
        $this->create($this->payload(['due_type' => 'date', 'due_date' => '2026-12-01', 'repeat' => '', 'repeat_until' => '2026-11-20']))
            ->assertSessionHasNoErrors();

        $this->assertSame('2026-12-01', $this->dateOf('Count the cash'));
    }

    public function test_the_old_payload_without_due_type_still_needs_a_date(): void
    {
        $this->create($this->payload())->assertSessionHasErrors('due_date');

        $this->assertSame(0, Task::count());
    }

    public function test_an_admin_can_clear_and_set_a_due_date_by_editing(): void
    {
        $this->create($this->payload(['employee_ids' => [$this->maria->id], 'due_type' => 'date', 'due_date' => '2026-11-20']));
        $task = Task::firstOrFail();
        $edit = ['title' => 'Count the cash', 'priority' => 'high', 'employee_id' => $this->maria->id];

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [...$edit, 'due_date' => ''])->assertSessionHasNoErrors();
        $this->assertNull($task->fresh()->due_date);

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [...$edit, 'due_date' => '2026-11-30'])->assertSessionHasNoErrors();
        $this->assertSame('2026-11-30', $task->fresh()->due_date->toDateString());

        $this->create($this->payload(['title' => 'Together', 'shared' => true, 'due_type' => 'date', 'due_date' => '2026-11-20']));
        $shared = Task::where('title', 'Together')->firstOrFail();
        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$shared->id}", ['title' => 'Together', 'priority' => 'high', 'due_date' => '', 'employee_ids' => [$this->maria->id, $this->juan->id]])->assertSessionHasNoErrors();
        $this->assertNull($shared->fresh()->due_date);
    }

    public function test_a_repeat_copy_keeps_a_required_due_date(): void
    {
        $this->create($this->payload(['employee_ids' => [$this->maria->id], 'due_type' => 'recurring', 'repeat' => 'monthly', 'repeat_day_of_month' => 10]));
        $task = Task::firstOrFail();

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", ['title' => 'Count the cash', 'priority' => 'high', 'employee_id' => $this->maria->id, 'due_date' => ''])->assertSessionHasErrors('due_date');

        $this->assertSame('2026-11-10', $task->fresh()->due_date->toDateString());
    }

    public function test_editing_cannot_start_a_series(): void
    {
        $this->create($this->payload(['employee_ids' => [$this->maria->id], 'due_type' => 'none']));
        $task = Task::firstOrFail();

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", ['title' => 'Count the cash', 'priority' => 'high', 'employee_id' => $this->maria->id, 'due_type' => 'recurring', 'repeat' => 'daily', 'due_date' => ''])->assertSessionHasNoErrors();

        $this->assertSame(0, RecurringTask::count());
        $task->refresh();
        $this->assertNull($task->recurring_task_id);
        $this->assertNull($task->due_date);
    }

    public function test_the_employee_planner_form_still_needs_a_due_date(): void
    {
        $this->actingAs($this->maria)->post('/employee/planner', ['title' => 'Mine', 'priority' => 'low'])->assertSessionHasErrors('due_date');
    }
}
