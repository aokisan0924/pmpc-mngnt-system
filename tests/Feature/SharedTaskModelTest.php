<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class SharedTaskModelTest extends TestCase
{
    use RefreshDatabase;

    private function task(array $overrides = []): Task
    {
        return Task::create([
            'employee_id' => null,
            'office' => null,
            'title' => 'Shared',
            'due_date' => now('Asia/Manila')->addDays(2)->toDateString(),
            'priority' => 'medium',
            'status' => 'pending',
            ...$overrides,
        ]);
    }

    public function test_a_task_with_no_person_and_no_office_is_shared_and_not_office_wide(): void
    {
        $shared = $this->task();
        $this->assertTrue($shared->isShared());
        $this->assertFalse($shared->isOfficeWide());

        $office = $this->task(['office' => 'cubao']);
        $this->assertTrue($office->isOfficeWide());
        $this->assertFalse($office->isShared());

        $person = $this->task(['employee_id' => Employee::factory()->create()->id]);
        $this->assertFalse($person->isShared());
        $this->assertFalse($person->isOfficeWide());
    }

    public function test_assignees_are_ordered_by_name_and_go_away_with_the_task(): void
    {
        $zed = Employee::factory()->create(['first_name' => 'Zed', 'last_name' => 'A']);
        $abe = Employee::factory()->create(['first_name' => 'Abe', 'last_name' => 'B']);
        $task = $this->task();
        $task->assignees()->attach([$zed->id, $abe->id]);

        $this->assertSame(['Abe', 'Zed'], $task->assignees()->get()->pluck('first_name')->all());

        $task->delete();
        $this->assertSame(0, DB::table('task_assignees')->count());
    }

    public function test_the_same_person_cannot_be_on_a_task_twice(): void
    {
        $person = Employee::factory()->create();
        $task = $this->task();
        $task->assignees()->attach($person->id);

        $this->expectException(QueryException::class);
        $task->assignees()->attach($person->id);
    }

    public function test_planner_array_lists_assignees_only_when_loaded(): void
    {
        $active = Employee::factory()->create(['first_name' => 'Ana', 'last_name' => 'Cruz', 'payroll_office' => 'cubao', 'status' => 'active']);
        $gone = Employee::factory()->create(['first_name' => 'Ben', 'last_name' => 'Lim', 'payroll_office' => null, 'status' => 'inactive']);
        $task = $this->task();
        $task->assignees()->attach([$active->id, $gone->id]);

        $task = Task::find($task->id);
        $this->assertTrue($task->toPlannerArray()['is_shared']);
        $this->assertSame([], $task->toPlannerArray()['assignees']);

        $task->load('assignees');
        $this->assertSame([
            ['id' => $active->id, 'name' => 'Ana Cruz', 'office' => 'cubao', 'active' => true],
            ['id' => $gone->id, 'name' => 'Ben Lim', 'office' => null, 'active' => false],
        ], $task->toPlannerArray()['assignees']);
    }

    public function test_rule_assignees_relation_works(): void
    {
        $admin = Employee::factory()->create();
        $rule = RecurringTask::create([
            'created_by' => $admin->id,
            'title' => 'Rule',
            'frequency' => 'daily',
            'starts_on' => now('Asia/Manila')->toDateString(),
        ]);
        $rule->assignees()->attach(Employee::factory()->count(2)->create()->pluck('id')->all());

        $this->assertCount(2, $rule->assignees);
    }

    public function test_rollback_refuses_while_shared_tasks_exist(): void
    {
        $task = $this->task();
        $task->assignees()->attach(Employee::factory()->create()->id);

        $migration = require base_path('database/migrations/2026_11_05_120000_create_task_assignees_tables.php');

        $this->expectException(RuntimeException::class);
        $migration->down();
    }
}
