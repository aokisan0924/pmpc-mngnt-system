<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TeamTaskDateSpanTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $maria;

    private Employee $juan;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-05 10:00', 'Asia/Manila'));
        $this->admin = Employee::factory()->superAdmin()->create();
        $this->maria = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->juan = Employee::factory()->create(['payroll_office' => 'cubao']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function span(array $overrides = []): array
    {
        return [
            'title' => 'Inventory', 'priority' => 'high', 'employee_ids' => [$this->maria->id, $this->juan->id],
            'due_type' => 'span', 'start_date' => '2026-11-10', 'due_date' => '2026-11-20', ...$overrides,
        ];
    }

    private function create(array $payload)
    {
        return $this->actingAs($this->admin)->post('/admin/team-tasks', $payload);
    }

    private function adminTask(array $attributes = []): Task
    {
        return Task::create([
            'employee_id' => $this->maria->id, 'assigned_by' => $this->admin->id, 'title' => 'Ledger',
            'priority' => 'low', 'due_date' => '2026-11-20', ...$attributes,
        ]);
    }

    private function edit(Task $task, array $overrides = [])
    {
        return $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => $task->title, 'priority' => $task->priority, 'employee_id' => $task->employee_id,
            'due_date' => $task->due_date?->toDateString(), ...$overrides,
        ]);
    }

    public function test_span_creates_copies_with_start_and_due(): void
    {
        $this->create($this->span())->assertSessionHasNoErrors();

        $this->assertSame(2, Task::whereDate('start_date', '2026-11-10')->whereDate('due_date', '2026-11-20')->count());
    }

    public function test_span_works_for_shared_and_whole_office(): void
    {
        $this->create($this->span(['shared' => true, 'title' => 'Shared']))->assertSessionHasNoErrors();
        $this->create(array_diff_key($this->span(['office' => 'cubao', 'title' => 'Office']), ['employee_ids' => 1]))->assertSessionHasNoErrors();

        $this->assertSame('2026-11-10', Task::where('title', 'Shared')->sole()->start_date->toDateString());
        $this->assertSame('2026-11-10', Task::where('title', 'Office')->sole()->start_date->toDateString());
    }

    public function test_span_needs_a_start_date(): void
    {
        $this->create($this->span(['start_date' => '']))->assertSessionHasErrors('start_date');
        $this->assertSame(0, Task::count());
    }

    public function test_start_after_due_is_rejected(): void
    {
        $this->create($this->span(['start_date' => '2026-11-21']))->assertSessionHasErrors('start_date');
        $this->assertSame(0, Task::count());
    }

    public function test_start_is_prohibited_with_recurring_and_none(): void
    {
        $this->create($this->span(['due_type' => 'none']))->assertSessionHasErrors('start_date');
        $this->create($this->span(['due_type' => 'recurring', 'repeat' => 'weekly', 'repeat_day_of_week' => 1]))->assertSessionHasErrors('start_date');
        $this->assertSame(0, Task::count());
    }

    public function test_edit_can_add_change_and_clear_start(): void
    {
        $task = $this->adminTask();

        $this->edit($task, ['start_date' => '2026-11-12'])->assertSessionHasNoErrors();
        $this->assertSame('2026-11-12', $task->fresh()->start_date->toDateString());

        $this->edit($task, ['start_date' => '2026-11-14'])->assertSessionHasNoErrors();
        $this->assertSame('2026-11-14', $task->fresh()->start_date->toDateString());

        $this->edit($task, ['start_date' => ''])->assertSessionHasNoErrors();
        $this->assertNull($task->fresh()->start_date);
    }

    public function test_edit_moving_due_before_start_is_rejected(): void
    {
        $task = $this->adminTask(['start_date' => '2026-11-12']);

        $this->edit($task, ['start_date' => '2026-11-12', 'due_date' => '2026-11-10'])->assertSessionHasErrors('start_date');
        $this->assertSame('2026-11-20', $task->fresh()->due_date->toDateString());
    }

    public function test_shared_edit_keeps_start_date(): void
    {
        $this->create($this->span(['shared' => true]))->assertSessionHasNoErrors();
        $task = Task::sole();

        $this->edit($task, ['employee_id' => null, 'employee_ids' => [$this->maria->id, $this->juan->id], 'start_date' => '2026-11-11'])
            ->assertSessionHasNoErrors();
        $this->assertSame('2026-11-11', $task->fresh()->start_date->toDateString());
    }

    public function test_repeat_copy_rejects_start_date(): void
    {
        $rule = RecurringTask::create([
            'employee_id' => $this->maria->id, 'created_by' => $this->admin->id, 'title' => 'Weekly', 'priority' => 'low',
            'frequency' => 'weekly', 'day_of_week' => 1, 'lead_days' => 2, 'starts_on' => '2026-11-09', 'active' => true,
        ]);
        $task = $this->adminTask(['recurring_task_id' => $rule->id]);

        $this->edit($task, ['start_date' => '2026-11-12'])->assertSessionHasErrors('start_date');
    }
}
