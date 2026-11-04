<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskBoardTest extends TestCase
{
    use RefreshDatabase;

    private function makeTask(Employee $employee, array $overrides = []): Task
    {
        return Task::create([
            'employee_id' => $employee->id,
            'title' => 'Sample task',
            'due_date' => now('Asia/Manila')->addDays(3)->toDateString(),
            'priority' => 'medium',
            'status' => 'pending',
            ...$overrides,
        ]);
    }

    public function test_employee_can_move_own_task_to_doing(): void
    {
        $employee = Employee::factory()->create();
        $task = $this->makeTask($employee);

        $this->actingAs($employee)
            ->patch("/employee/planner/{$task->id}/status", ['status' => 'doing'])
            ->assertRedirect();

        $this->assertSame('doing', $task->fresh()->status);
    }

    public function test_employee_cannot_move_another_employees_task(): void
    {
        $employee = Employee::factory()->create();
        $other = Employee::factory()->create();
        $task = $this->makeTask($other);

        $this->actingAs($employee)
            ->patch("/employee/planner/{$task->id}/status", ['status' => 'doing'])
            ->assertForbidden();

        $this->assertSame('pending', $task->fresh()->status);
    }

    public function test_invalid_status_is_rejected(): void
    {
        $employee = Employee::factory()->create();
        $task = $this->makeTask($employee);

        $this->actingAs($employee)
            ->patch("/employee/planner/{$task->id}/status", ['status' => 'archived'])
            ->assertSessionHasErrors('status');

        $this->assertSame('pending', $task->fresh()->status);
    }

    public function test_doing_task_past_due_is_overdue_and_done_task_is_not(): void
    {
        $employee = Employee::factory()->create();
        $yesterday = now('Asia/Manila')->subDay()->toDateString();
        $doing = $this->makeTask($employee, ['title' => 'Doing late', 'due_date' => $yesterday, 'status' => 'doing']);
        $done = $this->makeTask($employee, ['title' => 'Done late', 'due_date' => $yesterday, 'status' => 'done']);
        $today = $this->makeTask($employee, ['title' => 'Due today', 'due_date' => now('Asia/Manila')->toDateString()]);

        $this->actingAs($employee)->get('/employee/planner')
            ->assertOk()
            ->assertInertia(function (Assert $page) use ($doing, $done, $today) {
                $byId = collect($page->toArray()['props']['tasks'])->keyBy('id');

                $this->assertTrue($byId[$doing->id]['is_overdue']);
                $this->assertFalse($byId[$done->id]['is_overdue']);
                $this->assertFalse($byId[$today->id]['is_overdue']);
            });
    }

    public function test_toggle_moves_doing_to_done_and_done_to_pending(): void
    {
        $employee = Employee::factory()->create();
        $task = $this->makeTask($employee, ['status' => 'doing']);

        $this->actingAs($employee)->patch("/employee/planner/{$task->id}/toggle");
        $this->assertSame('done', $task->fresh()->status);

        $this->actingAs($employee)->patch("/employee/planner/{$task->id}/toggle");
        $this->assertSame('pending', $task->fresh()->status);
    }
}
