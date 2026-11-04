<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamTasksTest extends TestCase
{
    use RefreshDatabase;

    private ?int $assignerId = null;

    /** Defaults to an admin-assigned task; pass `'assigned_by' => null` for an employee's personal task. */
    private function makeTask(Employee $employee, array $overrides = []): Task
    {
        $this->assignerId ??= Employee::factory()->superAdmin()->create()->id;

        return Task::create([
            'assigned_by' => $this->assignerId,
            'employee_id' => $employee->id,
            'title' => 'Sample task',
            'due_date' => now('Asia/Manila')->addDays(3)->toDateString(),
            'priority' => 'medium',
            'status' => 'pending',
            ...$overrides,
        ]);
    }

    private function admin(): Employee
    {
        return Employee::factory()->superAdmin()->create();
    }

    /** @return array<int, array<string, mixed>> */
    private function boardTasks(Employee $admin, string $query = ''): array
    {
        $tasks = [];

        $this->actingAs($admin)->get('/admin/team-tasks'.$query)
            ->assertOk()
            ->assertInertia(function (Assert $page) use (&$tasks) {
                $page->component('Admin/TeamTasks');
                $tasks = $page->toArray()['props']['tasks'];
            });

        return $tasks;
    }

    public function test_super_admin_sees_every_employees_tasks_with_names(): void
    {
        $admin = $this->admin();
        $maria = Employee::factory()->create(['first_name' => 'Maria', 'last_name' => 'Santos']);
        $juan = Employee::factory()->create(['first_name' => 'Juan', 'last_name' => 'Dela Cruz']);
        $this->makeTask($maria, ['title' => 'Maria task']);
        $this->makeTask($juan, ['title' => 'Juan task']);

        $tasks = collect($this->boardTasks($admin))->keyBy('title');

        $this->assertCount(2, $tasks);
        $this->assertSame('Maria Santos', $tasks['Maria task']['employee_name']);
        $this->assertSame('Juan Dela Cruz', $tasks['Juan task']['employee_name']);
    }

    public function test_filters_by_employee_priority_and_overdue(): void
    {
        $admin = $this->admin();
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();
        $yesterday = now('Asia/Manila')->subDay()->toDateString();
        $this->makeTask($maria, ['title' => 'M high', 'priority' => 'high']);
        $this->makeTask($juan, ['title' => 'J low late', 'priority' => 'low', 'due_date' => $yesterday]);
        $this->makeTask($juan, ['title' => 'J done late', 'due_date' => $yesterday, 'status' => 'done']);

        $titles = fn (string $q) => collect($this->boardTasks($admin, $q))->pluck('title')->sort()->values()->all();

        $this->assertSame(['J done late', 'J low late'], $titles("?employee_id={$juan->id}"));
        $this->assertSame(['M high'], $titles('?priority=high'));
        $this->assertSame(['J low late'], $titles('?overdue=1'));
    }

    public function test_unknown_employee_filter_returns_empty_board(): void
    {
        $admin = $this->admin();
        $this->makeTask(Employee::factory()->create());

        $this->assertSame([], $this->boardTasks($admin, '?employee_id=999999'));
    }

    public function test_regular_employee_and_guest_cannot_use_team_tasks(): void
    {
        $employee = Employee::factory()->create();
        $target = $this->makeTask($employee);

        $this->actingAs($employee)->get('/admin/team-tasks')->assertRedirect(route('employee.dashboard'));
        $this->actingAs($employee)->post('/admin/team-tasks', [
            'title' => 'Sneaky', 'due_date' => '2026-12-01', 'priority' => 'low', 'employee_id' => $employee->id,
        ])->assertRedirect(route('employee.dashboard'));
        $this->actingAs($employee)->patch("/admin/team-tasks/{$target->id}/status", ['status' => 'done'])
            ->assertRedirect(route('employee.dashboard'));

        $this->assertSame(1, Task::count());
        $this->assertSame('pending', $target->fresh()->status);

        auth()->logout();
        $this->get('/admin/team-tasks')->assertRedirect(route('login'));
    }

    public function test_admin_creates_task_for_an_active_employee(): void
    {
        $admin = $this->admin();
        $employee = Employee::factory()->create();

        $this->actingAs($admin)->post('/admin/team-tasks', [
            'title' => 'Prepare payroll sheet',
            'description' => 'Second cutoff',
            'due_date' => '2026-11-15',
            'category' => 'Payroll',
            'priority' => 'high',
            'employee_id' => $employee->id,
        ])->assertRedirect();

        $task = Task::firstOrFail();
        $this->assertSame($employee->id, $task->employee_id);
        $this->assertSame('pending', $task->status);
    }

    public function test_admin_cannot_create_task_for_inactive_or_missing_employee(): void
    {
        $admin = $this->admin();
        $inactive = Employee::factory()->inactive()->create();
        $payload = ['title' => 'X', 'due_date' => '2026-11-15', 'priority' => 'low'];

        $this->actingAs($admin)->post('/admin/team-tasks', [...$payload, 'employee_id' => $inactive->id])
            ->assertSessionHasErrors('employee_id');
        $this->actingAs($admin)->post('/admin/team-tasks', [...$payload, 'employee_id' => 999999])
            ->assertSessionHasErrors('employee_id');

        $this->assertSame(0, Task::count());
    }

    public function test_admin_can_update_move_and_delete_another_employees_task(): void
    {
        $admin = $this->admin();
        $maria = Employee::factory()->create();
        $juan = Employee::factory()->create();
        $task = $this->makeTask($maria);

        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'Renamed', 'due_date' => '2026-11-20', 'priority' => 'low', 'employee_id' => $juan->id,
        ])->assertRedirect();
        $task->refresh();
        $this->assertSame('Renamed', $task->title);
        $this->assertSame($juan->id, $task->employee_id);

        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}/status", ['status' => 'doing'])->assertRedirect();
        $this->assertSame('doing', $task->fresh()->status);

        $this->actingAs($admin)->delete("/admin/team-tasks/{$task->id}")->assertRedirect();
        $this->assertSame(0, Task::count());
    }

    public function test_admin_can_edit_task_of_an_inactive_owner_without_reassigning(): void
    {
        $admin = $this->admin();
        $inactive = Employee::factory()->inactive()->create();
        $task = $this->makeTask($inactive);

        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'Typo fixed', 'due_date' => '2026-11-20', 'priority' => 'low', 'employee_id' => $inactive->id,
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame('Typo fixed', $task->fresh()->title);
    }

    public function test_admin_cannot_reassign_task_to_inactive_or_missing_employee(): void
    {
        $admin = $this->admin();
        $owner = Employee::factory()->create();
        $inactive = Employee::factory()->inactive()->create();
        $task = $this->makeTask($owner);
        $payload = ['title' => 'X', 'due_date' => '2026-11-20', 'priority' => 'low'];

        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", [...$payload, 'employee_id' => $inactive->id])
            ->assertSessionHasErrors('employee_id');
        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", [...$payload, 'employee_id' => 999999])
            ->assertSessionHasErrors('employee_id');

        $this->assertSame($owner->id, $task->fresh()->employee_id);
    }

    public function test_team_tasks_hides_personal_tasks_employees_made_for_themselves(): void
    {
        $admin = $this->admin();
        $maria = Employee::factory()->create();
        $this->makeTask($maria, ['title' => 'Assigned by admin']);
        $this->makeTask($maria, ['title' => 'My private errand', 'assigned_by' => null]);

        $titles = collect($this->boardTasks($admin))->pluck('title')->all();

        $this->assertSame(['Assigned by admin'], $titles);
    }

    public function test_task_created_by_admin_is_recorded_as_assigned_and_the_employee_still_sees_it(): void
    {
        $admin = $this->admin();
        $employee = Employee::factory()->create();

        $this->actingAs($admin)->post('/admin/team-tasks', [
            'title' => 'Assigned task', 'due_date' => '2026-11-20', 'priority' => 'low', 'employee_id' => $employee->id,
        ])->assertRedirect();

        $this->assertSame($admin->id, Task::firstOrFail()->assigned_by);
        $this->assertSame(['Assigned task'], collect($this->boardTasks($admin))->pluck('title')->all());

        $this->actingAs($employee)->get('/employee/planner')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 1)->where('tasks.0.title', 'Assigned task'));
    }

    public function test_admin_cannot_edit_move_or_delete_a_personal_task(): void
    {
        $admin = $this->admin();
        $personal = $this->makeTask(Employee::factory()->create(), ['assigned_by' => null, 'title' => 'Private']);

        $this->actingAs($admin)->patch("/admin/team-tasks/{$personal->id}", [
            'title' => 'Hijacked', 'due_date' => '2026-11-20', 'priority' => 'low', 'employee_id' => $personal->employee_id,
        ])->assertNotFound();
        $this->actingAs($admin)->patch("/admin/team-tasks/{$personal->id}/status", ['status' => 'done'])->assertNotFound();
        $this->actingAs($admin)->delete("/admin/team-tasks/{$personal->id}")->assertNotFound();

        $personal->refresh();
        $this->assertSame('Private', $personal->title);
        $this->assertSame('pending', $personal->status);
    }

    public function test_admin_creates_an_office_wide_task_without_an_employee(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/team-tasks', [
            'title' => 'Facebook Page Monitoring', 'due_date' => '2026-11-20', 'priority' => 'medium',
            'employee_id' => '', 'office' => 'fort_magsaysay',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $task = Task::firstOrFail();
        $this->assertNull($task->employee_id);
        $this->assertSame('fort_magsaysay', $task->office);
        $this->assertSame($admin->id, $task->assigned_by);
    }

    public function test_task_needs_an_employee_or_an_office_and_a_real_office_key(): void
    {
        $admin = $this->admin();
        $payload = ['title' => 'X', 'due_date' => '2026-11-20', 'priority' => 'low'];

        $this->actingAs($admin)->post('/admin/team-tasks', $payload)->assertSessionHasErrors(['employee_id', 'office']);
        $this->actingAs($admin)->post('/admin/team-tasks', [...$payload, 'office' => 'gen_mdse'])->assertSessionHasErrors('office');

        $this->assertSame(0, Task::count());
    }

    public function test_choosing_only_an_employee_fills_the_office_from_that_employee(): void
    {
        $admin = $this->admin();
        $employee = Employee::factory()->create(['payroll_office' => 'cubao']);

        $this->actingAs($admin)->post('/admin/team-tasks', [
            'title' => 'Personal ask', 'due_date' => '2026-11-20', 'priority' => 'low', 'employee_id' => $employee->id,
        ])->assertRedirect();

        $this->assertSame('cubao', Task::firstOrFail()->office);
    }

    public function test_office_filter_and_office_wide_cards_on_the_board(): void
    {
        $admin = $this->admin();
        $cubao = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->makeTask($cubao, ['title' => 'Kath task', 'office' => 'cubao']);
        $this->makeTask(Employee::factory()->create(), ['title' => 'Elsewhere', 'office' => 'main_office']);
        Task::create([
            'assigned_by' => $admin->id, 'employee_id' => null, 'office' => 'cubao', 'title' => 'Cubao wide',
            'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending',
        ]);

        $tasks = collect($this->boardTasks($admin, '?office=cubao'))->keyBy('title');

        $this->assertSame(['Cubao wide', 'Kath task'], $tasks->keys()->sort()->values()->all());
        $this->assertNull($tasks['Cubao wide']['employee_name']);
        $this->assertSame('Cubao Office', $tasks['Cubao wide']['office_label']);
        $this->assertCount(3, $this->boardTasks($admin, '?office=bogus'), 'an unknown office filter is ignored');
    }

    public function test_admin_can_move_and_edit_an_office_wide_task(): void
    {
        $admin = $this->admin();
        $task = Task::create([
            'assigned_by' => $admin->id, 'employee_id' => null, 'office' => 'cubao', 'title' => 'Wide',
            'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending',
        ]);

        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}/status", ['status' => 'doing'])->assertRedirect();
        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'Wide renamed', 'due_date' => '2026-11-21', 'priority' => 'high', 'office' => 'cubao',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $task->refresh();
        $this->assertSame('doing', $task->status);
        $this->assertSame('Wide renamed', $task->title);
        $this->assertNull($task->employee_id);
    }
}
