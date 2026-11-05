<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TaskDueInDaysTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_planner_tasks_say_how_many_days_until_they_are_due_in_manila_time(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-05 07:00', 'Asia/Manila')); // still Nov 4 in UTC
        $employee = Employee::factory()->create();
        $days = fn (string $due) => Task::create([
            'employee_id' => $employee->id, 'title' => 'T', 'due_date' => $due, 'priority' => 'low', 'status' => 'pending',
        ])->toPlannerArray()['due_in_days'];

        $this->assertSame([-2, 0, 1, 15], [$days('2026-11-03'), $days('2026-11-05'), $days('2026-11-06'), $days('2026-11-20')]);
    }
}
