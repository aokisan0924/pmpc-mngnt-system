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

    public function test_planner_tasks_carry_who_assigned_them_and_when_they_were_added(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['first_name' => 'Kurt', 'last_name' => 'Boss']);
        $employee = Employee::factory()->create();
        $assigned = $this->makeTask($employee, ['title' => 'From admin', 'assigned_by' => $admin->id]);
        $personal = $this->makeTask($employee, ['title' => 'Mine']);

        $this->actingAs($employee)->get('/employee/planner')->assertOk()
            ->assertInertia(function (Assert $page) use ($assigned, $personal) {
                $byId = collect($page->toArray()['props']['tasks'])->keyBy('id');

                $this->assertSame('Kurt Boss', $byId[$assigned->id]['assigned_by_name']);
                $this->assertNull($byId[$personal->id]['assigned_by_name']);
                $this->assertSame(now('Asia/Manila')->format('M d, Y'), $byId[$personal->id]['created_label']);
            });

        $this->actingAs($admin)->get('/admin/team-tasks')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('tasks.0.assigned_by_name', 'Kurt Boss'));
    }

    public function test_employee_dashboard_flags_a_doing_task_past_due_as_overdue(): void
    {
        $employee = Employee::factory()->create();
        $this->makeTask($employee, ['title' => 'Late doing', 'status' => 'doing', 'due_date' => now('Asia/Manila')->subDays(2)->toDateString()]);

        $this->actingAs($employee)->get('/employee/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('recentTasks.0.title', 'Late doing')->where('recentTasks.0.is_overdue', true));
    }
}
