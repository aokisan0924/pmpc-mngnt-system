<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamTaskMultiAssignTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Employee::factory()->superAdmin()->create();
    }

    private function payload(array $ids, array $overrides = []): array
    {
        return ['title' => 'Count the cash', 'description' => 'Notes', 'due_date' => '2026-11-20', 'priority' => 'high', 'employee_ids' => $ids, ...$overrides];
    }

    private function create(array $payload)
    {
        return $this->actingAs($this->admin)->post('/admin/team-tasks', $payload);
    }

    public function test_several_people_each_get_their_own_task_in_their_own_office(): void
    {
        $maria = Employee::factory()->create(['payroll_office' => 'cubao']);
        $juan = Employee::factory()->create(['payroll_office' => 'main_office']);

        $this->create($this->payload([$maria->id, $juan->id]))->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame(2, Task::count());
        $mine = Task::where('employee_id', $maria->id)->firstOrFail();
        $his = Task::where('employee_id', $juan->id)->firstOrFail();
        $this->assertSame(['cubao', 'main_office'], [$mine->office, $his->office]);
        foreach ([$mine, $his] as $task) {
            $this->assertSame(['Count the cash', 'high', 'pending', $this->admin->id], [$task->title, $task->priority, $task->status, $task->assigned_by]);
            $this->assertSame('2026-11-20', $task->due_date->toDateString());
        }
    }

    public function test_each_person_is_notified_once_and_the_admin_is_not(): void
    {
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();

        $this->create($this->payload([$maria->id, $juan->id]));

        $count = fn (Employee $e) => EmployeeNotification::where('employee_id', $e->id)->where('type', 'task_assigned')->count();
        $this->assertSame([1, 1, 0], [$count($maria), $count($juan), $count($this->admin)]);
    }

    public function test_a_repeat_makes_a_rule_and_first_copy_per_person(): void
    {
        $a = Employee::factory()->create();
        $b = Employee::factory()->create();

        $this->create($this->payload([$a->id, $b->id], ['repeat' => 'monthly', 'repeat_day_of_month' => 5]))->assertSessionHasNoErrors();

        $this->assertSame(2, RecurringTask::count());
        $this->assertSame(2, Task::count());
        $this->assertSame([$a->id, $b->id], RecurringTask::orderBy('id')->pluck('employee_id')->all());
        $this->assertSame(2, Task::whereNotNull('recurring_task_id')->distinct('recurring_task_id')->count());
    }

    public function test_nothing_is_created_when_one_person_is_invalid(): void
    {
        $ok = Employee::factory()->create();
        $gone = Employee::factory()->inactive()->create();

        $this->create($this->payload([$ok->id, $gone->id]))->assertSessionHasErrors('employee_ids.1');

        $this->assertSame([0, 0, 0], [Task::count(), RecurringTask::count(), EmployeeNotification::count()]);
    }

    public function test_the_list_must_be_distinct_non_empty_and_at_most_25(): void
    {
        $one = Employee::factory()->create();
        $many = Employee::factory()->count(26)->create()->pluck('id')->all();

        $this->create($this->payload([$one->id, $one->id]))->assertSessionHasErrors('employee_ids.1');
        $this->create($this->payload([]))->assertSessionHasErrors('employee_ids');
        $this->create($this->payload($many))->assertSessionHasErrors('employee_ids');
        $this->assertSame(0, Task::count());
    }

    public function test_the_array_wins_over_office_and_employee_id(): void
    {
        $maria = Employee::factory()->create(['payroll_office' => 'cubao']);

        $this->create($this->payload([$maria->id], ['office' => 'main_office', 'employee_id' => '']))->assertSessionHasNoErrors();

        $this->assertSame(1, Task::count());
        $this->assertSame([$maria->id, 'cubao'], [Task::first()->employee_id, Task::first()->office]);
    }

    public function test_the_success_message_names_the_count(): void
    {
        $a = Employee::factory()->create();
        $b = Employee::factory()->create();

        $this->create($this->payload([$a->id, $b->id]))->assertSessionHas('success', 'Task added for 2 people.');
        $this->create($this->payload([$a->id]))->assertSessionHas('success', 'Task added.');
    }

    public function test_editing_works_when_the_form_sends_an_empty_employee_ids_list(): void
    {
        $maria = Employee::factory()->create();
        $task = Task::create(['assigned_by' => $this->admin->id, 'employee_id' => $maria->id, 'office' => $maria->payroll_office, 'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending']);

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'T2', 'due_date' => '2026-11-21', 'priority' => 'low', 'employee_id' => $maria->id, 'employee_ids' => [],
        ])->assertSessionHasNoErrors();

        $this->assertSame('T2', $task->fresh()->title);
    }

    public function test_editing_ignores_employee_ids(): void
    {
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();
        $task = Task::create(['assigned_by' => $this->admin->id, 'employee_id' => $maria->id, 'office' => $maria->payroll_office, 'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending']);

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'T2', 'due_date' => '2026-11-21', 'priority' => 'low', 'employee_id' => $maria->id, 'employee_ids' => [$juan->id],
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Task::count());
        $this->assertSame([$maria->id, 'T2'], [$task->fresh()->employee_id, $task->fresh()->title]);
    }
}
