<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskAssignmentNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $overrides = []): Employee
    {
        return Employee::factory()->superAdmin()->create(['first_name' => 'Kurt', 'last_name' => 'Boss', ...$overrides]);
    }

    private function payload(array $overrides = []): array
    {
        return ['title' => 'Prepare payroll sheet', 'due_date' => '2026-11-06', 'priority' => 'high', ...$overrides];
    }

    private function inbox(Employee $employee)
    {
        return EmployeeNotification::where('employee_id', $employee->id)->where('type', 'task_assigned')->get();
    }

    public function test_assigning_a_task_notifies_that_employee(): void
    {
        $admin = $this->admin();
        $maria = Employee::factory()->create();

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['employee_id' => $maria->id]))->assertRedirect();

        $notes = $this->inbox($maria);
        $this->assertCount(1, $notes);
        $this->assertSame('New task assigned', $notes[0]->title);
        $this->assertSame('/employee/planner', $notes[0]->link);
        $this->assertStringContainsString('Prepare payroll sheet', $notes[0]->message);
        $this->assertStringContainsString('Nov 06, 2026', $notes[0]->message);
        $this->assertStringContainsString('Kurt Boss', $notes[0]->message);
    }

    public function test_a_whole_office_task_notifies_active_members_of_that_office_only(): void
    {
        $admin = $this->admin(['payroll_office' => 'cubao']);
        $member = Employee::factory()->create(['payroll_office' => 'cubao']);
        $other = Employee::factory()->create(['payroll_office' => 'cubao']);
        $inactive = Employee::factory()->inactive()->create(['payroll_office' => 'cubao']);
        $elsewhere = Employee::factory()->create(['payroll_office' => 'fort_magsaysay']);

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['employee_id' => '', 'office' => 'cubao']))->assertRedirect();

        $this->assertCount(1, $this->inbox($member));
        $this->assertCount(1, $this->inbox($other));
        $this->assertCount(0, $this->inbox($inactive));
        $this->assertCount(0, $this->inbox($elsewhere));
        $this->assertCount(0, $this->inbox($admin));
    }

    public function test_assigning_a_task_to_yourself_sends_nothing(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['employee_id' => $admin->id]))->assertRedirect();

        $this->assertSame(0, EmployeeNotification::count());
    }

    public function test_reassigning_notifies_only_the_new_owner_and_plain_edits_send_nothing(): void
    {
        $admin = $this->admin();
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();
        $task = Task::create([
            'assigned_by' => $admin->id, 'employee_id' => $maria->id, 'title' => 'Old', 'due_date' => '2026-11-20',
            'priority' => 'low', 'status' => 'pending',
        ]);

        // same owner, new title: nobody is told
        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", $this->payload(['title' => 'Renamed', 'employee_id' => $maria->id]))->assertRedirect();
        $this->assertSame(0, EmployeeNotification::count());

        // new owner: only Juan is told
        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", $this->payload(['title' => 'Renamed', 'employee_id' => $juan->id]))->assertRedirect();
        $this->assertCount(1, $this->inbox($juan));
        $this->assertCount(0, $this->inbox($maria));
    }

    public function test_moving_a_task_between_offices_notifies_the_new_office(): void
    {
        $admin = $this->admin();
        $cubao = Employee::factory()->create(['payroll_office' => 'cubao']);
        $fort = Employee::factory()->create(['payroll_office' => 'fort_magsaysay']);
        $task = Task::create([
            'assigned_by' => $admin->id, 'employee_id' => null, 'office' => 'cubao', 'title' => 'Wide',
            'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending',
        ]);

        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", $this->payload(['employee_id' => '', 'office' => 'fort_magsaysay']))->assertRedirect();

        $this->assertCount(1, $this->inbox($fort));
        $this->assertCount(0, $this->inbox($cubao));
    }

    public function test_employees_creating_their_own_tasks_notify_nobody(): void
    {
        $employee = Employee::factory()->create();

        $this->actingAs($employee)->post('/employee/planner', ['title' => 'Mine', 'due_date' => '2026-11-06', 'priority' => 'low'])->assertRedirect();

        $this->assertSame(0, EmployeeNotification::count());
    }
}
