<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TaskDateSpanModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-12 10:00', 'Asia/Manila'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function task(array $attributes = []): Task
    {
        return Task::create([
            'employee_id' => Employee::factory()->create()->id,
            'title' => 'Inventory',
            'priority' => 'medium',
            'status' => 'pending',
            ...$attributes,
        ]);
    }

    public function test_start_equal_to_due_is_saved_as_null(): void
    {
        $task = $this->task(['start_date' => '2026-11-20', 'due_date' => '2026-11-20']);

        $this->assertNull($task->fresh()->start_date);
    }

    public function test_start_is_cleared_when_due_date_is_cleared(): void
    {
        $task = $this->task(['start_date' => '2026-11-10', 'due_date' => '2026-11-20']);
        $task->update(['due_date' => null]);

        $this->assertNull($task->fresh()->start_date);
    }

    public function test_span_fields_for_a_running_span(): void
    {
        $data = $this->task(['start_date' => '2026-11-10', 'due_date' => '2026-11-20'])->fresh()->toPlannerArray();

        $this->assertSame('2026-11-10', $data['start_date']);
        $this->assertSame('Nov 10 → Nov 20', $data['span_label']);
        $this->assertFalse($data['is_upcoming']);
        $this->assertSame(27, $data['span_progress']);
    }

    public function test_span_label_shows_years_when_they_differ(): void
    {
        $data = $this->task(['start_date' => '2026-12-28', 'due_date' => '2027-01-05'])->fresh()->toPlannerArray();

        $this->assertSame('Dec 28, 2026 → Jan 5, 2027', $data['span_label']);
    }

    public function test_upcoming_span(): void
    {
        $data = $this->task(['start_date' => '2026-11-18', 'due_date' => '2026-12-05'])->fresh()->toPlannerArray();

        $this->assertTrue($data['is_upcoming']);
        $this->assertSame(0, $data['span_progress']);
    }

    public function test_done_task_is_never_upcoming_and_has_no_progress(): void
    {
        $data = $this->task(['start_date' => '2026-11-18', 'due_date' => '2026-12-05', 'status' => 'done'])->fresh()->toPlannerArray();

        $this->assertFalse($data['is_upcoming']);
        $this->assertNull($data['span_progress']);
    }

    public function test_past_due_span_is_full(): void
    {
        $data = $this->task(['start_date' => '2026-11-01', 'due_date' => '2026-11-05'])->fresh()->toPlannerArray();

        $this->assertSame(100, $data['span_progress']);
    }

    public function test_task_without_start_has_null_span_fields(): void
    {
        $data = $this->task(['due_date' => '2026-11-20'])->fresh()->toPlannerArray();

        $this->assertNull($data['start_date']);
        $this->assertNull($data['span_label']);
        $this->assertNull($data['span_progress']);
        $this->assertFalse($data['is_upcoming']);
    }
}
