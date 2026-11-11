<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TaskDateSpanEmployeeTest extends TestCase
{
    use RefreshDatabase;

    private Employee $maria;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-05 10:00', 'Asia/Manila'));
        $this->maria = Employee::factory()->create(['payroll_office' => 'cubao']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function adminTask(array $attributes = []): Task
    {
        return Task::create([
            'employee_id' => $this->maria->id, 'assigned_by' => Employee::factory()->superAdmin()->create()->id,
            'title' => 'Ledger', 'priority' => 'low', 'due_date' => '2026-11-20', ...$attributes,
        ]);
    }

    private function edit(Task $task, array $overrides = [])
    {
        return $this->actingAs($this->maria)->patch("/employee/planner/{$task->id}", [
            'title' => $task->title, 'priority' => $task->priority, 'due_date' => $task->due_date?->toDateString(), ...$overrides,
        ]);
    }

    public function test_employee_creates_task_with_span(): void
    {
        $this->actingAs($this->maria)->post('/employee/planner', [
            'title' => 'Study', 'priority' => 'medium', 'start_date' => '2026-11-06', 'due_date' => '2026-11-09',
        ])->assertSessionHasNoErrors();

        $this->assertSame('2026-11-06', Task::sole()->start_date->toDateString());
    }

    public function test_employee_start_after_due_is_rejected(): void
    {
        $this->actingAs($this->maria)->post('/employee/planner', [
            'title' => 'Study', 'priority' => 'medium', 'start_date' => '2026-11-10', 'due_date' => '2026-11-09',
        ])->assertSessionHasErrors('start_date');

        $this->assertSame(0, Task::count());
    }

    public function test_employee_can_change_and_clear_start_on_admin_assigned_task(): void
    {
        $task = $this->adminTask(['start_date' => '2026-11-10']);

        $this->edit($task, ['start_date' => '2026-11-12'])->assertSessionHasNoErrors();
        $this->assertSame('2026-11-12', $task->fresh()->start_date->toDateString());

        $this->edit($task, ['start_date' => ''])->assertSessionHasNoErrors();
        $this->assertNull($task->fresh()->start_date);
    }

    public function test_employee_edit_without_touching_start_keeps_it(): void
    {
        $task = $this->adminTask(['start_date' => '2026-11-10']);

        $this->edit($task, ['title' => 'Ledger v2', 'start_date' => '2026-11-10'])->assertSessionHasNoErrors();
        $this->assertSame('2026-11-10', $task->fresh()->start_date->toDateString());
    }

    public function test_employee_cannot_set_start_on_repeat_copy(): void
    {
        $rule = RecurringTask::create([
            'employee_id' => $this->maria->id, 'created_by' => $this->maria->id, 'title' => 'Weekly', 'priority' => 'low',
            'frequency' => 'weekly', 'day_of_week' => 1, 'lead_days' => 2, 'starts_on' => '2026-11-09', 'active' => true,
        ]);
        $task = $this->adminTask(['recurring_task_id' => $rule->id]);

        $this->edit($task, ['start_date' => '2026-11-12'])->assertSessionHasErrors('start_date');
    }
}
