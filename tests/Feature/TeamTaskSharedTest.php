<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TeamTaskSharedTest extends TestCase
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
        return ['title' => 'Count the cash', 'description' => 'Notes', 'due_date' => '2026-11-20', 'priority' => 'high', 'employee_ids' => $ids, 'shared' => true, ...$overrides];
    }

    private function create(array $payload)
    {
        return $this->actingAs($this->admin)->post('/admin/team-tasks', $payload);
    }

    private function sharedTask(array $people): Task
    {
        $task = Task::create(['assigned_by' => $this->admin->id, 'employee_id' => null, 'office' => null, 'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending']);
        $task->assignees()->attach(collect($people)->pluck('id')->all());

        return $task;
    }

    private function edit(Task $task, array $ids)
    {
        return $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'T2', 'due_date' => '2026-11-21', 'priority' => 'low', 'employee_ids' => $ids,
        ]);
    }

    private function told(Employee $e): int
    {
        return EmployeeNotification::where('employee_id', $e->id)->where('type', 'task_assigned')->count();
    }

    public function test_shared_makes_one_task_with_every_person_on_it(): void
    {
        $people = Employee::factory()->count(3)->create();

        $this->create($this->payload($people->pluck('id')->all()))->assertSessionHasNoErrors()->assertSessionHas('success', 'Shared task added for 3 people.');

        $this->assertSame(1, Task::count());
        $task = Task::first();
        $this->assertSame([null, null, $this->admin->id], [$task->employee_id, $task->office, $task->assigned_by]);
        $this->assertSame(3, DB::table('task_assignees')->count());
    }

    public function test_shared_needs_at_least_two_people(): void
    {
        $one = Employee::factory()->create();

        $this->create($this->payload([$one->id]))->assertSessionHasErrors(['employee_ids' => 'A shared task needs at least two people.']);

        $this->assertSame(0, Task::count());
    }

    public function test_shared_ignores_office_and_employee_id(): void
    {
        $a = Employee::factory()->create();
        $b = Employee::factory()->create();

        $this->create($this->payload([$a->id, $b->id], ['office' => 'cubao', 'employee_id' => $a->id]))->assertSessionHasNoErrors();

        $this->assertSame(1, Task::count());
        $this->assertSame([null, null], [Task::first()->employee_id, Task::first()->office]);
    }

    public function test_each_person_is_notified_once_and_the_admin_is_not(): void
    {
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();

        $this->create($this->payload([$maria->id, $juan->id]));

        $this->assertSame([1, 1, 0], [$this->told($maria), $this->told($juan), $this->told($this->admin)]);
    }

    public function test_an_invalid_person_creates_nothing(): void
    {
        $ok = Employee::factory()->create();
        $gone = Employee::factory()->inactive()->create();

        $this->create($this->payload([$ok->id, $gone->id]))->assertSessionHasErrors('employee_ids.1');

        $this->assertSame([0, 0, 0], [Task::count(), DB::table('task_assignees')->count(), EmployeeNotification::count()]);
    }

    public function test_a_repeating_shared_task_makes_one_rule_with_the_same_people(): void
    {
        $a = Employee::factory()->create();
        $b = Employee::factory()->create();

        $this->create($this->payload([$a->id, $b->id], ['repeat' => 'monthly', 'repeat_day_of_month' => 5]))->assertSessionHasNoErrors();

        $this->assertSame(1, RecurringTask::count());
        $rule = RecurringTask::first();
        $this->assertSame([null, null], [$rule->employee_id, $rule->office]);
        $ids = [$a->id, $b->id];
        $this->assertEqualsCanonicalizing($ids, $rule->assignees()->pluck('employees.id')->all());
        $this->assertSame(1, Task::count());
        $this->assertEqualsCanonicalizing($ids, Task::first()->assignees()->pluck('employees.id')->all());
    }

    public function test_without_shared_the_copies_path_is_unchanged(): void
    {
        $a = Employee::factory()->create();
        $b = Employee::factory()->create();

        $this->create($this->payload([$a->id, $b->id], ['shared' => false]))->assertSessionHasNoErrors();

        $this->assertSame([2, 0], [Task::count(), DB::table('task_assignees')->count()]);
    }

    public function test_admin_changes_who_is_on_a_shared_task_and_only_new_people_are_told(): void
    {
        [$a, $b, $c] = Employee::factory()->count(3)->create()->all();
        $task = $this->sharedTask([$a, $b]);

        $this->edit($task, [$b->id, $c->id])->assertSessionHasNoErrors();

        $this->assertEqualsCanonicalizing([$b->id, $c->id], $task->assignees()->pluck('employees.id')->all());
        $this->assertSame([0, 0, 1], [$this->told($a), $this->told($b), $this->told($c)]);
        $this->assertSame([null, null, 'T2'], [$task->fresh()->employee_id, $task->fresh()->office, $task->fresh()->title]);
    }

    public function test_editing_a_shared_task_needs_two_people_and_keeps_inactive_people_valid(): void
    {
        [$a, $b] = Employee::factory()->count(2)->create()->all();
        $task = $this->sharedTask([$a, $b]);

        $this->edit($task, [$a->id])->assertSessionHasErrors('employee_ids');

        $b->update(['status' => 'inactive']);
        $this->edit($task, [$a->id, $b->id])->assertSessionHasNoErrors();
    }

    public function test_an_edit_cannot_turn_an_office_task_into_an_empty_shared_task(): void
    {
        $maria = Employee::factory()->create();
        $task = Task::create(['assigned_by' => $this->admin->id, 'employee_id' => null, 'office' => 'cubao', 'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending']);

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'low', 'employee_id' => '', 'office' => '', 'employee_ids' => [$maria->id],
        ])->assertSessionHasErrors('office');

        $this->assertSame('cubao', $task->fresh()->office);
        $this->assertFalse($task->fresh()->isShared());
    }

    public function test_editing_a_normal_task_still_ignores_employee_ids(): void
    {
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();
        $task = Task::create(['assigned_by' => $this->admin->id, 'employee_id' => $maria->id, 'office' => $maria->payroll_office, 'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending']);

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'T2', 'due_date' => '2026-11-21', 'priority' => 'low', 'employee_id' => $maria->id, 'employee_ids' => [$juan->id],
        ])->assertSessionHasNoErrors();

        $this->assertSame(0, DB::table('task_assignees')->count());
        $this->assertSame([$maria->id, 'T2'], [$task->fresh()->employee_id, $task->fresh()->title]);
    }

    public function test_editing_people_does_not_change_the_repeat_rule(): void
    {
        [$a, $b, $c] = Employee::factory()->count(3)->create()->all();
        $this->create($this->payload([$a->id, $b->id], ['repeat' => 'monthly', 'repeat_day_of_month' => 5]));
        $task = Task::first();

        $this->edit($task, [$b->id, $c->id])->assertSessionHasNoErrors();

        $this->assertEqualsCanonicalizing([$a->id, $b->id], RecurringTask::first()->assignees()->pluck('employees.id')->all());
    }
}
