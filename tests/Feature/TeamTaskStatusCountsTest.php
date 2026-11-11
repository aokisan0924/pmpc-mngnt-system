<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TeamTaskStatusCountsTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Manila'));
        $this->admin = Employee::factory()->superAdmin()->create();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function task(?Employee $owner, array $overrides = []): Task
    {
        return Task::create([
            'assigned_by' => $this->admin->id, 'employee_id' => $owner?->id, 'office' => $owner?->payroll_office ?? 'cubao',
            'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'medium', 'status' => 'pending',
            ...$overrides,
        ]);
    }

    private function counts(string $query = ''): array
    {
        return $this->actingAs($this->admin)->get('/admin/team-tasks'.$query)->assertOk()->viewData('page')['props']['status_counts'];
    }

    public function test_counts_each_status_and_the_late_ones(): void
    {
        $maria = Employee::factory()->create();
        $this->task($maria, ['due_date' => '2026-11-01']);
        $this->task($maria);
        $this->task($maria, ['status' => 'doing', 'due_date' => '2026-11-02']);
        $this->task($maria, ['status' => 'done', 'due_date' => '2026-11-01']);
        $this->task($maria, ['due_date' => '2026-11-04']); // due today is not late yet

        $this->assertSame(['todo' => 3, 'doing' => 1, 'done' => 1, 'late' => 2, 'upcoming' => 0], $this->counts());
    }

    public function test_done_is_limited_to_30_days_unless_older_is_ticked(): void
    {
        $maria = Employee::factory()->create();
        $old = $this->task($maria, ['status' => 'done']);
        $old->forceFill(['updated_at' => now()->subDays(40)])->saveQuietly();
        $this->task($maria, ['status' => 'done']);

        $this->assertSame(1, $this->counts()['done']);
        $this->assertSame(2, $this->counts('?older=1')['done']);
    }

    public function test_counts_follow_person_whole_office_and_priority_filters(): void
    {
        $maria = Employee::factory()->create(['payroll_office' => 'cubao']);
        $juan = Employee::factory()->create(['payroll_office' => 'main_office']);
        $this->task($maria, ['priority' => 'high']);
        $this->task($juan);
        $this->task(null, ['office' => 'cubao']);

        $this->assertSame(3, $this->counts()['todo']);
        $this->assertSame(1, $this->counts("?employee_id={$maria->id}")['todo']);
        $this->assertSame(1, $this->counts('?office=cubao&whole=1')['todo']);
        $this->assertSame(2, $this->counts('?office=cubao')['todo']);
        $this->assertSame(1, $this->counts('?priority=high')['todo']);
    }

    public function test_counts_ignore_the_late_filter(): void
    {
        $maria = Employee::factory()->create();
        $this->task($maria, ['due_date' => '2026-11-01']);
        $this->task($maria);

        $this->assertSame($this->counts(), $this->counts('?overdue=1'));
    }

    public function test_personal_tasks_are_not_counted_and_zero_tasks_give_zeros(): void
    {
        $this->assertSame(['todo' => 0, 'doing' => 0, 'done' => 0, 'late' => 0, 'upcoming' => 0], $this->counts());

        Task::create(['employee_id' => Employee::factory()->create()->id, 'title' => 'Private', 'due_date' => '2026-11-01', 'priority' => 'low', 'status' => 'pending']);

        $this->assertSame(0, $this->counts()['todo']);
    }

    public function test_upcoming_filter_shows_only_not_started_tasks(): void
    {
        $this->task(null, ['title' => 'Later', 'start_date' => '2026-11-10']);
        $this->task(null, ['title' => 'Running', 'start_date' => '2026-11-01']);
        $this->task(null, ['title' => 'Plain']);
        $this->task(null, ['title' => 'Done later', 'start_date' => '2026-11-10', 'status' => 'done']);

        $props = $this->actingAs($this->admin)->get('/admin/team-tasks?upcoming=1')->assertOk()->viewData('page')['props'];

        $this->assertSame(['Later'], collect($props['tasks'])->pluck('title')->all());
        $this->assertTrue($props['filters']['upcoming']);
    }

    public function test_upcoming_count_and_upcoming_still_count_as_todo(): void
    {
        $this->task(null, ['start_date' => '2026-11-10']);

        $counts = $this->counts();
        $this->assertSame(1, $counts['todo']);
        $this->assertSame(1, $counts['upcoming']);
    }

    public function test_upcoming_wins_when_late_is_also_sent(): void
    {
        $this->task(null, ['title' => 'Later', 'start_date' => '2026-11-10']);
        $this->task(null, ['title' => 'Late', 'due_date' => '2026-11-01']);

        $props = $this->actingAs($this->admin)->get('/admin/team-tasks?upcoming=1&overdue=1')->assertOk()->viewData('page')['props'];

        $this->assertSame(['Later'], collect($props['tasks'])->pluck('title')->all());
    }
}
