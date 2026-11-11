<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use App\Services\RecurringTaskGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RecurringTaskDateSpanTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $maria;

    protected function setUp(): void
    {
        parent::setUp();
        $this->at('2026-11-05');
        $this->admin = Employee::factory()->superAdmin()->create();
        $this->maria = Employee::factory()->create(['payroll_office' => 'cubao']);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function at(string $date): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse($date.' 08:00', 'Asia/Manila'));
        Carbon::setTestNow(Carbon::parse($date.' 08:00', 'Asia/Manila'));
    }

    /** "Every month, 16 to 20": due on the 20th, shown 4 days before. */
    private function monthly(array $overrides = []): array
    {
        return [
            'title' => 'Monthly report', 'priority' => 'medium', 'employee_ids' => [$this->maria->id],
            'due_type' => 'recurring', 'repeat' => 'monthly', 'repeat_day_of_month' => 20, 'repeat_lead_days' => 4,
            'repeat_as_span' => true, ...$overrides,
        ];
    }

    private function create(array $payload)
    {
        return $this->actingAs($this->admin)->post('/admin/team-tasks', $payload);
    }

    public function test_first_copy_has_the_span(): void
    {
        $this->create($this->monthly())->assertSessionHasNoErrors();

        $task = Task::sole();
        $this->assertSame('2026-11-16', $task->start_date->toDateString());
        $this->assertSame('2026-11-20', $task->due_date->toDateString());
        $this->assertTrue($task->recurringTask->show_as_span);
    }

    public function test_later_copies_get_the_span_when_they_appear(): void
    {
        $this->create($this->monthly())->assertSessionHasNoErrors();

        $this->at('2026-12-15');
        app(RecurringTaskGenerator::class)->run();
        $this->assertSame(1, Task::count());

        $this->at('2026-12-16');
        app(RecurringTaskGenerator::class)->run();
        $copy = Task::whereDate('due_date', '2026-12-20')->sole();
        $this->assertSame('2026-12-16', $copy->start_date->toDateString());
    }

    public function test_repeat_without_the_tick_stays_a_single_date(): void
    {
        $this->create($this->monthly(['repeat_as_span' => false]))->assertSessionHasNoErrors();
        $this->at('2026-12-16');
        app(RecurringTaskGenerator::class)->run();

        $this->assertSame(2, Task::whereNull('start_date')->count());
        $this->assertFalse(RecurringTask::sole()->show_as_span);
    }

    public function test_tick_is_ignored_without_a_repeat(): void
    {
        $this->create($this->monthly(['due_type' => 'date', 'repeat' => '', 'due_date' => '2026-11-20']))->assertSessionHasNoErrors();

        $this->assertNull(Task::sole()->start_date);
        $this->assertSame(0, RecurringTask::count());
    }

    public function test_admin_can_edit_a_spanned_copy_and_keep_its_span(): void
    {
        $this->create($this->monthly())->assertSessionHasNoErrors();
        $task = Task::sole();

        $this->actingAs($this->admin)->patch("/admin/team-tasks/{$task->id}", [
            'title' => 'Renamed', 'priority' => 'high', 'employee_id' => $this->maria->id,
            'start_date' => '2026-11-16', 'due_date' => '2026-11-20',
        ])->assertSessionHasNoErrors();

        $this->assertSame('Renamed', $task->fresh()->title);
        $this->assertSame('2026-11-16', $task->fresh()->start_date->toDateString());
    }

    public function test_employee_can_edit_a_spanned_copy_and_keep_its_span(): void
    {
        $this->create($this->monthly())->assertSessionHasNoErrors();
        $task = Task::sole();

        $this->actingAs($this->maria)->patch("/employee/planner/{$task->id}", [
            'title' => 'Renamed', 'priority' => 'high', 'start_date' => '2026-11-16', 'due_date' => '2026-11-20',
        ])->assertSessionHasNoErrors();

        $this->assertSame('2026-11-16', $task->fresh()->start_date->toDateString());
    }
}
