<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TaskNoDueDateBoardTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $maria;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Manila'));
        $this->admin = Employee::factory()->superAdmin()->create();
        $this->maria = Employee::factory()->create(['payroll_office' => 'cubao']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function task(string $title, ?string $due): Task
    {
        $data = [
            'assigned_by' => $this->admin->id, 'employee_id' => $this->maria->id, 'office' => 'cubao',
            'title' => $title, 'priority' => 'medium', 'status' => 'pending',
        ];
        if ($due !== null) {
            $data['due_date'] = $due;
        }

        return Task::create($data);
    }

    private function props(string $url = '/admin/team-tasks'): array
    {
        return $this->actingAs($this->admin)->get($url)->assertOk()->viewData('page')['props'];
    }

    public function test_the_board_lists_undated_tasks_after_dated_ones(): void
    {
        $this->task('Later', '2026-11-20');
        $this->task('Ongoing', null);
        $this->task('Earlier', '2026-11-01');

        $tasks = collect($this->props()['tasks']);

        $this->assertSame(['Earlier', 'Later', 'Ongoing'], $tasks->pluck('title')->all());
        $ongoing = $tasks->firstWhere('title', 'Ongoing');
        $this->assertNull($ongoing['due_date']);
        $this->assertSame('No due date', $ongoing['due_label']);
        $this->assertFalse($ongoing['is_overdue']);
    }

    public function test_an_undated_task_is_never_counted_late(): void
    {
        $this->task('Late', '2026-11-01');
        $this->task('Ongoing', null);

        $props = $this->props();

        $this->assertSame(2, $props['status_counts']['todo']);
        $this->assertSame(1, $props['status_counts']['late']);
        $this->assertSame(2, $props['overview']['open']);
        $this->assertSame(1, $props['overview']['overdue']);
        $cubao = collect($props['offices'])->firstWhere('key', 'cubao');
        $this->assertSame([2, 1], [$cubao['open'], $cubao['late']]);
        $pill = collect($props['people'])->firstWhere('key', (string) $this->maria->id);
        $this->assertSame([2, 1], [$pill['open'], $pill['late']]);
    }

    public function test_late_only_leaves_out_undated_tasks(): void
    {
        $this->task('Late', '2026-11-01');
        $this->task('Ongoing', null);

        $titles = collect($this->props('/admin/team-tasks?overdue=1')['tasks'])->pluck('title')->all();

        $this->assertSame(['Late'], $titles);
    }

    public function test_the_planner_lists_undated_tasks_last(): void
    {
        $this->task('Ongoing', null);
        $this->task('Dated', '2026-11-10');

        $tasks = $this->actingAs($this->maria)->get('/employee/planner')->assertOk()->viewData('page')['props']['tasks'];

        $this->assertSame('Dated', $tasks[0]['title']);
        $this->assertSame('Ongoing', $tasks[1]['title']);
        $this->assertSame('No due date', $tasks[1]['due_label']);
    }

    public function test_the_dashboard_shows_no_due_date(): void
    {
        $this->task('Ongoing', null);
        $this->task('Dated', '2026-11-10');

        $recent = collect($this->actingAs($this->maria)->get('/employee/dashboard')->assertOk()->viewData('page')['props']['recentTasks']);

        $this->assertSame(['Dated', 'Ongoing'], $recent->pluck('title')->all());
        $ongoing = $recent->firstWhere('title', 'Ongoing');
        $this->assertNull($ongoing['due_date']);
        $this->assertSame('No due date', $ongoing['due_label']);
        $this->assertFalse($ongoing['is_overdue']);
    }
}
