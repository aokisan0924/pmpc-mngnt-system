<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TaskDoneOnTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function task(string $status): Task
    {
        return Task::create([
            'employee_id' => Employee::factory()->create()->id, 'title' => 'T', 'due_date' => '2026-11-12', 'priority' => 'low', 'status' => $status,
        ]);
    }

    public function test_done_tasks_say_the_manila_date_they_were_finished(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-12 07:00', 'Asia/Manila')); // still Nov 11 in UTC

        $this->assertSame('2026-11-12', $this->task('done')->toPlannerArray()['done_on']);
    }

    public function test_open_tasks_have_no_done_date(): void
    {
        $this->assertNull($this->task('pending')->toPlannerArray()['done_on']);
    }
}
