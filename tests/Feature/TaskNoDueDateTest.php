<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TaskNoDueDateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-05 10:00', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function undated(string $status = 'pending'): Task
    {
        $employee = Employee::factory()->create();

        return Task::create(['employee_id' => $employee->id, 'title' => 'Ongoing', 'priority' => 'low', 'status' => $status]);
    }

    public function test_a_task_can_be_saved_without_a_due_date(): void
    {
        $task = $this->undated();

        $this->assertNull($task->fresh()->due_date);
    }

    public function test_planner_array_of_an_undated_task_says_no_due_date(): void
    {
        $array = $this->undated()->toPlannerArray();

        $this->assertNull($array['due_date']);
        $this->assertSame('No due date', $array['due_label']);
        $this->assertNull($array['due_in_days']);
        $this->assertFalse($array['is_overdue']);
    }

    public function test_an_undated_open_task_is_never_overdue(): void
    {
        $this->assertFalse($this->undated('pending')->isOverdue());
        $this->assertFalse($this->undated('doing')->isOverdue());
    }

    public function test_a_dated_task_keeps_its_planner_fields(): void
    {
        $employee = Employee::factory()->create();
        $task = Task::create(['employee_id' => $employee->id, 'title' => 'Dated', 'priority' => 'low', 'status' => 'pending', 'due_date' => '2026-11-04']);

        $array = $task->fresh()->toPlannerArray();

        $this->assertSame('2026-11-04', $array['due_date']);
        $this->assertSame('Nov 04, 2026', $array['due_label']);
        $this->assertSame(-1, $array['due_in_days']);
        $this->assertTrue($array['is_overdue']);
    }

    public function test_rollback_refuses_while_undated_tasks_exist(): void
    {
        $this->undated();

        $this->expectException(\RuntimeException::class);
        (require base_path('database/migrations/2026_11_05_130000_make_task_due_date_nullable.php'))->down();
    }
}
