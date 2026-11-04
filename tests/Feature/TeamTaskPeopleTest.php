<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamTaskPeopleTest extends TestCase
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

    private function person(string $first, string $last = 'Test', string $office = 'cubao'): Employee
    {
        return Employee::factory()->create(['first_name' => $first, 'last_name' => $last, 'payroll_office' => $office]);
    }

    private function task(?Employee $owner, array $overrides = []): Task
    {
        return Task::create([
            'assigned_by' => $this->admin->id, 'employee_id' => $owner?->id, 'office' => $owner?->payroll_office ?? 'cubao',
            'title' => 'T', 'due_date' => '2026-11-20', 'priority' => 'medium', 'status' => 'pending',
            ...$overrides,
        ]);
    }

    private function people(string $query = ''): array
    {
        $response = $this->actingAs($this->admin)->get('/admin/team-tasks'.$query)->assertOk();

        return $response->viewData('page')['props']['people'];
    }

    public function test_people_lists_active_people_with_open_and_late_counts_sorted(): void
    {
        $maria = $this->person('Maria', 'Santos');
        $juan = $this->person('Juan');
        $ana = $this->person('Ana');
        $this->task($maria, ['due_date' => '2026-11-01']);
        $this->task($maria);
        foreach (range(1, 3) as $i) {
            $this->task($juan);
        }
        $this->task($ana, ['due_date' => '2026-11-02']);

        $people = $this->people();

        $this->assertSame(['Maria Santos', 'Ana Test', 'Juan Test'], array_column($people, 'label'));
        $this->assertSame(['type' => 'employee', 'key' => (string) $maria->id, 'label' => 'Maria Santos', 'open' => 2, 'late' => 1], $people[0]);
    }

    public function test_people_leaves_out_done_only_inactive_and_personal_tasks(): void
    {
        $doneOnly = $this->person('Done');
        $gone = Employee::factory()->inactive()->create(['first_name' => 'Gone']);
        $mine = $this->person('Mine');
        $this->task($doneOnly, ['status' => 'done']);
        $this->task($gone);
        Task::create(['employee_id' => $mine->id, 'title' => 'Private', 'due_date' => '2026-11-20', 'priority' => 'low', 'status' => 'pending']);

        $this->assertSame([], $this->people());
    }

    public function test_whole_office_tasks_get_an_office_chip_after_the_people(): void
    {
        $maria = $this->person('Maria');
        $this->task($maria);
        $this->task(null, ['office' => 'cubao']);
        $this->task(null, ['office' => 'cubao']);

        $people = $this->people();

        $this->assertCount(2, $people);
        $this->assertSame(['type' => 'office', 'key' => 'cubao', 'label' => 'Cubao Office', 'open' => 2, 'late' => 0], $people[1]);
    }

    public function test_people_ignore_the_board_filters(): void
    {
        $maria = $this->person('Maria');
        $juan = $this->person('Juan');
        $this->task($maria, ['due_date' => '2026-11-01']);
        $this->task($juan);

        $this->assertSame($this->people(), $this->people("?employee_id={$maria->id}&priority=low&overdue=1&office=main_office"));
    }

    public function test_group_filter_shows_only_whole_office_tasks(): void
    {
        $maria = $this->person('Maria');
        $this->task($maria, ['title' => 'Personal one']);
        $this->task(null, ['office' => 'cubao', 'title' => 'Wide one']);

        $this->actingAs($this->admin)->get('/admin/team-tasks?group=cubao')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.group', 'cubao')
                ->has('tasks', 1)
                ->where('tasks.0.title', 'Wide one'));
    }

    public function test_group_is_ignored_with_an_employee_or_an_unknown_key(): void
    {
        $maria = $this->person('Maria');
        $this->task($maria, ['title' => 'Personal one']);
        $this->task(null, ['office' => 'cubao', 'title' => 'Wide one']);

        $this->actingAs($this->admin)->get("/admin/team-tasks?group=cubao&employee_id={$maria->id}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('filters.group', null)->has('tasks', 1)->where('tasks.0.title', 'Personal one'));

        $this->actingAs($this->admin)->get('/admin/team-tasks?group=nope')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('filters.group', null)->has('tasks', 2));
    }

    public function test_an_office_group_replaces_the_office_dropdown_filter(): void
    {
        $this->task(null, ['office' => 'cubao', 'title' => 'Wide one']);

        $this->actingAs($this->admin)->get('/admin/team-tasks?group=cubao&office=main_office')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('filters.office', null)->has('tasks', 1));
    }

    public function test_an_inactive_employees_open_task_still_counts_in_everyone(): void
    {
        $this->task(Employee::factory()->inactive()->create());
        $this->task($this->person('Maria'));

        $this->actingAs($this->admin)->get('/admin/team-tasks')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('overview.open', 2)->has('people', 1));
    }

    public function test_people_is_empty_when_nothing_is_open(): void
    {
        $this->actingAs($this->admin)->get('/admin/team-tasks')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('people', [])->where('overview.open', 0));
    }
}
