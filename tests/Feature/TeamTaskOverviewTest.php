<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamTaskOverviewTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function task(Employee $admin, ?Employee $owner, array $overrides = []): Task
    {
        return Task::create([
            'assigned_by' => $admin->id, 'employee_id' => $owner?->id, 'office' => $owner?->payroll_office ?? 'cubao',
            'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'medium', 'status' => 'pending',
            ...$overrides,
        ]);
    }

    public function test_the_overview_counts_the_admin_assigned_tasks_and_ignores_the_board_filters(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Manila')); // a Wednesday
        $admin = Employee::factory()->superAdmin()->create();
        $maria = Employee::factory()->create(['first_name' => 'Maria', 'last_name' => 'Santos', 'payroll_office' => 'cubao']);
        $juan = Employee::factory()->create(['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'payroll_office' => 'main_office']);

        $this->task($admin, $maria, ['due_date' => '2026-11-02']);                       // overdue
        $this->task($admin, $maria, ['due_date' => '2026-11-04']);                       // due today
        $this->task($admin, $juan, ['due_date' => '2026-11-10']);                        // last day of the window
        $this->task($admin, $juan, ['due_date' => '2026-11-11']);                        // outside the window
        $this->task($admin, null, ['office' => 'cubao', 'title' => 'Wide', 'due_date' => '2026-11-30']); // whole office
        $this->task($admin, $maria, ['status' => 'done', 'due_date' => '2026-11-01']); // finished tasks are not open
        Task::create(['employee_id' => $maria->id, 'title' => 'Private', 'due_date' => '2026-11-01', 'priority' => 'low', 'status' => 'pending']);

        $this->actingAs($admin)->get('/admin/team-tasks?office=main_office&priority=low')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('overview.overdue', 1)
                ->where('overview.due_this_week', 2)
                ->where('overview.open', 5));
    }

    public function test_opening_team_tasks_or_the_dashboard_creates_due_repeat_copies_once_a_day(): void
    {
        Cache::flush();
        Carbon::setTestNow(Carbon::parse('2026-11-01 08:00', 'Asia/Manila'));
        $admin = Employee::factory()->superAdmin()->create();
        RecurringTask::create([
            'created_by' => $admin->id, 'office' => 'cubao', 'title' => 'Electric bill', 'priority' => 'medium',
            'frequency' => 'monthly', 'day_of_month' => 5, 'lead_days' => 7, 'starts_on' => '2026-10-05',
            'last_due_date' => '2026-10-05', 'active' => true,
        ]);

        $this->actingAs($admin)->get('/admin/team-tasks')->assertOk();
        $this->assertSame(1, Task::count());

        $this->actingAs($admin)->get('/admin/team-tasks')->assertOk();
        $this->assertSame(1, Task::count());
    }

    public function test_the_operations_dashboard_also_triggers_generation(): void
    {
        Cache::flush();
        Carbon::setTestNow(Carbon::parse('2026-11-01 08:00', 'Asia/Manila'));
        $admin = Employee::factory()->superAdmin()->create();
        RecurringTask::create([
            'created_by' => $admin->id, 'office' => 'cubao', 'title' => 'Remittance', 'priority' => 'medium',
            'frequency' => 'monthly', 'day_of_month' => 5, 'lead_days' => 7, 'starts_on' => '2026-10-05',
            'last_due_date' => '2026-10-05', 'active' => true,
        ]);

        $this->actingAs($admin)->get('/admin/dashboard')->assertOk();

        $this->assertSame(1, Task::count());
    }
}
