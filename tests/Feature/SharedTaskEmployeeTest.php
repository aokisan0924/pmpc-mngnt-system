<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SharedTaskEmployeeTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $maria;

    private Employee $juan;

    private Employee $ana;

    private Employee $pedro;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Employee::factory()->create(['role' => 'super_admin']);
        $this->maria = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->juan = Employee::factory()->create(['payroll_office' => 'main_office']);
        $this->ana = Employee::factory()->create(['payroll_office' => 'cubao']);
        $this->pedro = Employee::factory()->create(['payroll_office' => null]);

        $this->task = Task::create([
            'employee_id' => null, 'office' => null, 'assigned_by' => $this->admin->id,
            'title' => 'Shared job', 'due_date' => now('Asia/Manila')->addDays(2)->toDateString(),
            'priority' => 'medium', 'status' => 'pending',
        ]);
        $this->task->assignees()->attach([$this->maria->id, $this->juan->id]);
    }

    /** @return array<int, array<string, mixed>> */
    private function planner(Employee $employee): array
    {
        $tasks = [];
        $this->actingAs($employee)->get('/employee/planner')->assertOk()
            ->assertInertia(function (Assert $page) use (&$tasks) {
                $tasks = $page->toArray()['props']['tasks'];
            });

        return $tasks;
    }

    public function test_each_person_on_a_shared_task_sees_it_and_nobody_else_does(): void
    {
        $this->assertSame(['Shared job'], array_column($this->planner($this->maria), 'title'));
        $this->assertSame(['Shared job'], array_column($this->planner($this->juan), 'title'));
        $this->assertSame([], $this->planner($this->ana));
        $this->assertSame([], $this->planner($this->pedro));
    }

    public function test_planner_task_says_it_is_shared_with_the_names(): void
    {
        $this->actingAs($this->maria)->get('/employee/planner')
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.0.is_shared', true)
                ->has('tasks.0.assignees', 2));
    }

    public function test_a_person_on_it_can_move_it_and_toggle_it(): void
    {
        $this->actingAs($this->maria)
            ->patch("/employee/planner/{$this->task->id}/status", ['status' => 'doing'])
            ->assertRedirect();
        $this->assertSame('doing', $this->task->fresh()->status);

        $this->actingAs($this->juan)
            ->patch("/employee/planner/{$this->task->id}/toggle")
            ->assertRedirect();
        $this->assertSame('done', $this->task->fresh()->status);
    }

    public function test_someone_not_on_it_cannot_move_it(): void
    {
        $this->actingAs($this->ana)
            ->patch("/employee/planner/{$this->task->id}/status", ['status' => 'doing'])
            ->assertForbidden();
        $this->assertSame('pending', $this->task->fresh()->status);
    }

    public function test_a_person_on_it_cannot_edit_or_delete_it(): void
    {
        $this->actingAs($this->maria)
            ->patch("/employee/planner/{$this->task->id}", [
                'title' => 'Hijacked', 'due_date' => now('Asia/Manila')->toDateString(), 'priority' => 'low',
            ])->assertForbidden();
        $this->actingAs($this->maria)->delete("/employee/planner/{$this->task->id}")->assertForbidden();

        $this->assertSame('Shared job', $this->task->fresh()->title);
    }

    public function test_employee_dashboard_lists_the_shared_task_for_people_on_it_only(): void
    {
        $titles = fn (Employee $e) => collect(
            $this->actingAs($e)->get('/employee/dashboard')->assertOk()->viewData('page')['props']['recentTasks']
        )->pluck('title')->all();

        $this->assertContains('Shared job', $titles($this->maria));
        $this->assertNotContains('Shared job', $titles($this->ana));
    }
}
