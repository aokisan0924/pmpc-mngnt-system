<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RecurringTaskAdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): Employee
    {
        return Employee::factory()->superAdmin()->create(['first_name' => 'Kurt', 'last_name' => 'Boss']);
    }

    private function payload(array $overrides = []): array
    {
        return ['title' => 'Electric bill', 'due_date' => '2026-11-20', 'priority' => 'high', 'office' => 'cubao', 'employee_id' => '', ...$overrides];
    }

    public function test_creating_a_monthly_repeat_makes_the_rule_and_the_first_copy_straight_away(): void
    {
        $admin = $this->admin();
        $member = Employee::factory()->create(['payroll_office' => 'cubao']);

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload([
            'repeat' => 'monthly', 'repeat_day_of_month' => 5, 'repeat_until' => '2027-06-30',
        ]))->assertRedirect()->assertSessionHasNoErrors();

        $rule = RecurringTask::firstOrFail();
        $this->assertSame(['monthly', 5, 7, 'cubao', $admin->id], [$rule->frequency, $rule->day_of_month, $rule->lead_days, $rule->office, $rule->created_by]);
        $this->assertSame('2026-11-20', $rule->starts_on->toDateString());
        $this->assertSame('2026-11-20', $rule->last_due_date->toDateString());
        $this->assertSame('2027-06-30', $rule->ends_on->toDateString());

        $task = Task::firstOrFail();
        $this->assertSame($rule->id, $task->recurring_task_id);
        $this->assertSame('2026-11-20', $task->due_date->toDateString());
        $this->assertSame(1, EmployeeNotification::where('employee_id', $member->id)->where('type', 'task_assigned')->count());
    }

    public function test_default_lead_days_depend_on_how_often_it_repeats_and_can_be_overridden(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'daily']))->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['title' => 'W', 'repeat' => 'weekly', 'repeat_day_of_week' => 5]))->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['title' => 'Y', 'repeat' => 'yearly', 'repeat_month' => 3, 'repeat_day_of_month' => 15]))->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['title' => 'M', 'repeat' => 'monthly', 'repeat_last_day' => true, 'repeat_lead_days' => 3]))->assertSessionHasNoErrors();

        $leads = RecurringTask::orderBy('id')->pluck('lead_days', 'frequency')->all();
        $this->assertSame(['daily' => 0, 'weekly' => 2, 'yearly' => 14, 'monthly' => 3], $leads);
        $this->assertTrue(RecurringTask::where('frequency', 'monthly')->firstOrFail()->last_day_of_month);
    }

    public function test_a_repeat_needs_the_details_for_its_frequency(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'weekly']))->assertSessionHasErrors('repeat_day_of_week');
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'monthly']))->assertSessionHasErrors('repeat_day_of_month');
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'yearly', 'repeat_day_of_month' => 3]))->assertSessionHasErrors('repeat_month');
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'hourly']))->assertSessionHasErrors('repeat');
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'daily', 'repeat_until' => '2026-01-01']))->assertSessionHasErrors('repeat_until');

        $this->assertSame(0, Task::count());
        $this->assertSame(0, RecurringTask::count());
    }

    public function test_a_one_off_task_creates_no_rule_and_editing_never_turns_it_into_a_series(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload())->assertSessionHasNoErrors();
        $task = Task::firstOrFail();
        $this->actingAs($admin)->patch("/admin/team-tasks/{$task->id}", $this->payload(['title' => 'Renamed', 'repeat' => 'daily']))->assertRedirect();

        $this->assertSame(0, RecurringTask::count());
        $this->assertNull($task->fresh()->recurring_task_id);
    }

    public function test_stop_repeating_pauses_the_series_and_keeps_existing_copies(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'monthly', 'repeat_day_of_month' => 5]));
        $task = Task::firstOrFail();

        $this->actingAs($admin)->post("/admin/team-tasks/{$task->id}/stop-repeat")->assertRedirect();

        $this->assertFalse(RecurringTask::firstOrFail()->active);
        $this->assertSame(1, Task::count());
    }

    public function test_stop_repeating_on_a_plain_task_or_by_a_regular_employee_is_refused(): void
    {
        $admin = $this->admin();
        $employee = Employee::factory()->create();
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload());
        $plain = Task::firstOrFail();

        $this->actingAs($admin)->post("/admin/team-tasks/{$plain->id}/stop-repeat")->assertNotFound();

        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['title' => 'Series', 'repeat' => 'daily']));
        $copy = Task::where('title', 'Series')->firstOrFail();
        $this->actingAs($employee)->post("/admin/team-tasks/{$copy->id}/stop-repeat")->assertRedirect(route('employee.dashboard'));
        $this->assertTrue(RecurringTask::firstOrFail()->active);
    }

    public function test_deleting_a_copy_can_also_stop_the_series(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'monthly', 'repeat_day_of_month' => 5]));
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['title' => 'Other', 'repeat' => 'daily']));
        [$monthly, $daily] = [Task::where('title', 'Electric bill')->firstOrFail(), Task::where('title', 'Other')->firstOrFail()];

        $this->actingAs($admin)->delete("/admin/team-tasks/{$monthly->id}")->assertRedirect();
        $this->assertTrue(RecurringTask::where('frequency', 'monthly')->firstOrFail()->active);

        $this->actingAs($admin)->delete("/admin/team-tasks/{$daily->id}", ['stop_repeat' => true])->assertRedirect();
        $this->assertFalse(RecurringTask::where('frequency', 'daily')->firstOrFail()->active);
    }

    public function test_the_board_and_the_employee_planner_show_what_a_repeat_is(): void
    {
        $admin = $this->admin();
        $member = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->actingAs($admin)->post('/admin/team-tasks', $this->payload(['repeat' => 'monthly', 'repeat_day_of_month' => 5]));

        $this->actingAs($admin)->get('/admin/team-tasks')->assertInertia(fn (Assert $page) => $page
            ->where('tasks.0.repeat_label', 'Repeats monthly on the 5th')->where('tasks.0.repeat_active', true));

        $this->actingAs($member)->get('/employee/planner')->assertInertia(fn (Assert $page) => $page
            ->where('tasks.0.repeat_label', 'Repeats monthly on the 5th'));
    }
}
