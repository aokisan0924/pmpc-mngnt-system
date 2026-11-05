<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskNoDueDateEmployeeEditTest extends TestCase
{
    use RefreshDatabase;

    private function task(Employee $employee, ?string $due): Task
    {
        $admin = Employee::factory()->superAdmin()->create();

        return Task::create([
            'assigned_by' => $admin->id, 'employee_id' => $employee->id, 'office' => $employee->payroll_office,
            'title' => 'Ongoing', 'due_date' => $due, 'priority' => 'low', 'status' => 'pending',
        ]);
    }

    private function edit(Employee $employee, Task $task, array $overrides = [])
    {
        return $this->actingAs($employee)->patch("/employee/planner/{$task->id}", ['title' => 'Edited', 'priority' => 'low', 'due_date' => '', ...$overrides]);
    }

    public function test_an_employee_can_edit_an_undated_task_and_it_stays_undated(): void
    {
        $employee = Employee::factory()->create();
        $task = $this->task($employee, null);

        $this->edit($employee, $task)->assertSessionHasNoErrors();

        $this->assertSame('Edited', $task->fresh()->title);
        $this->assertNull($task->fresh()->due_date);
    }

    public function test_an_employee_can_give_an_undated_task_a_date(): void
    {
        $employee = Employee::factory()->create();
        $task = $this->task($employee, null);

        $this->edit($employee, $task, ['due_date' => '2026-12-01'])->assertSessionHasNoErrors();

        $this->assertSame('2026-12-01', $task->fresh()->due_date->toDateString());
    }

    public function test_a_dated_task_still_needs_a_date_when_an_employee_edits_it(): void
    {
        $employee = Employee::factory()->create();
        $task = $this->task($employee, '2026-11-20');

        $this->edit($employee, $task)->assertSessionHasErrors('due_date');

        $this->assertSame('2026-11-20', $task->fresh()->due_date->toDateString());
    }

    public function test_an_employee_still_needs_a_date_for_a_new_task(): void
    {
        $employee = Employee::factory()->create();

        $this->actingAs($employee)->post('/employee/planner', ['title' => 'New', 'priority' => 'low', 'due_date' => ''])->assertSessionHasErrors('due_date');

        $this->assertSame(0, Task::count());
    }
}
