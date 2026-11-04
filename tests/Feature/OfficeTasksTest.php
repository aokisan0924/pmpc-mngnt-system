<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OfficeTasksTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $office, array $overrides = []): Employee
    {
        return Employee::factory()->create(['payroll_office' => $office, ...$overrides]);
    }

    private function officeTask(string $office, array $overrides = []): Task
    {
        return Task::create([
            'employee_id' => null,
            'office' => $office,
            'title' => 'Office task',
            'due_date' => now('Asia/Manila')->addDays(2)->toDateString(),
            'priority' => 'medium',
            'status' => 'pending',
            ...$overrides,
        ]);
    }

    /** @return array<int, string> */
    private function plannerTitles(Employee $employee): array
    {
        $titles = [];

        $this->actingAs($employee)->get('/employee/planner')->assertOk()
            ->assertInertia(function (Assert $page) use (&$titles) {
                $titles = collect($page->toArray()['props']['tasks'])->pluck('title')->sort()->values()->all();
            });

        return $titles;
    }

    public function test_office_task_is_seen_by_the_whole_office_and_nobody_else(): void
    {
        $maria = $this->staff('cubao');
        $juan = $this->staff('cubao');
        $ana = $this->staff('fort_magsaysay');
        $this->officeTask('cubao', ['title' => 'Cubao wide']);

        $this->assertSame(['Cubao wide'], $this->plannerTitles($maria));
        $this->assertSame(['Cubao wide'], $this->plannerTitles($juan));
        $this->assertSame([], $this->plannerTitles($ana));
    }

    public function test_a_task_naming_one_member_is_seen_only_by_that_member(): void
    {
        $maria = $this->staff('cubao');
        $juan = $this->staff('cubao');
        Task::create([
            'employee_id' => $maria->id, 'office' => 'cubao', 'title' => 'Just Maria',
            'due_date' => now('Asia/Manila')->toDateString(), 'priority' => 'low', 'status' => 'pending',
        ]);

        $this->assertSame(['Just Maria'], $this->plannerTitles($maria));
        $this->assertSame([], $this->plannerTitles($juan));
    }

    public function test_office_task_carries_its_office_label_and_no_employee_name(): void
    {
        $maria = $this->staff('main_office');
        $task = $this->officeTask('main_office');

        $array = $task->toPlannerArray();

        $this->assertSame('main_office', $array['office']);
        $this->assertSame('UPI Main Office', $array['office_label']);
        $this->assertNull($array['employee_id']);
        $this->assertNull($array['employee_name']);
        $this->assertSame(['Office task'], $this->plannerTitles($maria));
    }

    public function test_office_member_can_move_and_toggle_an_office_task(): void
    {
        $maria = $this->staff('cubao');
        $task = $this->officeTask('cubao');

        $this->actingAs($maria)->patch("/employee/planner/{$task->id}/status", ['status' => 'doing'])->assertRedirect();
        $this->assertSame('doing', $task->fresh()->status);

        $this->actingAs($maria)->patch("/employee/planner/{$task->id}/toggle")->assertRedirect();
        $this->assertSame('done', $task->fresh()->status);
    }

    public function test_other_office_cannot_move_an_office_task(): void
    {
        $outsider = $this->staff('fort_magsaysay');
        $task = $this->officeTask('cubao');

        $this->actingAs($outsider)->patch("/employee/planner/{$task->id}/status", ['status' => 'done'])->assertForbidden();
        $this->actingAs($outsider)->patch("/employee/planner/{$task->id}/toggle")->assertForbidden();

        $this->assertSame('pending', $task->fresh()->status);
    }

    public function test_office_member_cannot_edit_or_delete_an_office_task(): void
    {
        $maria = $this->staff('cubao');
        $task = $this->officeTask('cubao', ['title' => 'Keep me']);

        $this->actingAs($maria)->patch("/employee/planner/{$task->id}", [
            'title' => 'Changed', 'due_date' => '2026-12-01', 'priority' => 'low',
        ])->assertForbidden();
        $this->actingAs($maria)->delete("/employee/planner/{$task->id}")->assertForbidden();

        $this->assertSame('Keep me', $task->fresh()->title);
    }

    public function test_employee_dashboard_lists_office_tasks_for_that_office(): void
    {
        $maria = $this->staff('cubao');
        $this->officeTask('cubao', ['title' => 'On my dashboard']);
        $this->officeTask('fort_magsaysay', ['title' => 'Not mine']);

        $this->actingAs($maria)->get('/employee/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('recentTasks', 1)->where('recentTasks.0.title', 'On my dashboard'));
    }

    public function test_employee_without_an_office_sees_only_own_tasks(): void
    {
        $loner = Employee::factory()->create(['payroll_office' => null]);
        $this->officeTask('cubao');

        $this->assertSame([], $this->plannerTitles($loner));
    }
}
