<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamTaskSharedBoardTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $maria;

    private Employee $juan;

    private Task $shared;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-04 10:00', 'Asia/Manila'));
        $this->admin = Employee::factory()->superAdmin()->create();
        $this->maria = Employee::factory()->create(['first_name' => 'Maria', 'last_name' => 'Santos', 'payroll_office' => 'cubao']);
        $this->juan = Employee::factory()->create(['first_name' => 'Juan', 'last_name' => 'Cruz', 'payroll_office' => 'main_office']);

        $this->shared = $this->sharedTask([$this->maria, $this->juan], ['title' => 'Shared one', 'due_date' => '2026-11-01']);
        Task::create([
            'assigned_by' => $this->admin->id, 'employee_id' => $this->maria->id, 'office' => 'cubao',
            'title' => 'Maria copy', 'due_date' => '2026-11-20', 'priority' => 'medium', 'status' => 'pending',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function sharedTask(array $people, array $overrides = []): Task
    {
        $task = Task::create([
            'assigned_by' => $this->admin->id, 'employee_id' => null, 'office' => null,
            'title' => 'Shared', 'due_date' => '2026-11-20', 'priority' => 'medium', 'status' => 'pending',
            ...$overrides,
        ]);
        $task->assignees()->attach(array_map(fn (Employee $e) => $e->id, $people));

        return $task;
    }

    private function props(string $query = ''): array
    {
        return $this->actingAs($this->admin)->get('/admin/team-tasks'.$query)->assertOk()->viewData('page')['props'];
    }

    private function chip(array $people, Employee $e): ?array
    {
        return collect($people)->firstWhere('key', (string) $e->id);
    }

    public function test_board_shows_the_shared_task_once_with_all_names(): void
    {
        $tasks = collect($this->props()['tasks'])->where('title', 'Shared one');

        $this->assertCount(1, $tasks);
        $this->assertSame(['Juan Cruz', 'Maria Santos'], array_column($tasks->first()['assignees'], 'name'));
    }

    public function test_status_cards_and_overview_count_it_once(): void
    {
        $props = $this->props();

        $this->assertSame(2, $props['status_counts']['todo']);
        $this->assertSame(1, $props['status_counts']['late']);
        $this->assertSame(2, $props['overview']['open']);
        $this->assertSame(1, $props['overview']['overdue']);
    }

    public function test_each_persons_pill_counts_it(): void
    {
        $people = $this->props()['people'];

        $this->assertSame(['open' => 2, 'late' => 1], array_intersect_key($this->chip($people, $this->maria), ['open' => 1, 'late' => 1]));
        $this->assertSame(['open' => 1, 'late' => 1], array_intersect_key($this->chip($people, $this->juan), ['open' => 1, 'late' => 1]));

        $this->assertSame([], array_filter($this->props('?office=cubao')['people'], fn ($c) => $c['type'] === 'whole'));
    }

    public function test_with_an_office_chosen_only_that_offices_people_get_the_pill(): void
    {
        $people = $this->props('?office=cubao')['people'];

        $this->assertNotNull($this->chip($people, $this->maria));
        $this->assertNull($this->chip($people, $this->juan));
        $this->assertSame(2, $this->chip($people, $this->maria)['open']);
    }

    public function test_office_tabs_count_it_for_each_office_of_its_people(): void
    {
        $props = $this->props();
        $offices = collect($props['offices'])->keyBy('key');

        $this->assertSame(2, $offices['cubao']['open']);
        $this->assertSame(1, $offices['main_office']['open']);
        $this->assertSame(0, $offices['fort_magsaysay']['open']);
        $this->assertGreaterThan($props['overview']['open'], $offices->sum('open'));
    }

    public function test_person_and_office_filters_include_it_and_whole_does_not(): void
    {
        $this->actingAs($this->admin)->get("/admin/team-tasks?employee_id={$this->juan->id}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 1)->where('tasks.0.title', 'Shared one'));

        $this->actingAs($this->admin)->get('/admin/team-tasks?office=main_office')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 1)->where('tasks.0.title', 'Shared one'));

        $this->actingAs($this->admin)->get('/admin/team-tasks?office=cubao&whole=1')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 0));
    }

    public function test_inactive_people_get_no_pill_but_the_task_still_counts(): void
    {
        $this->juan->update(['status' => 'inactive']);
        $props = $this->props();

        $this->assertNull($this->chip($props['people'], $this->juan));
        $this->assertSame(1, collect($props['offices'])->firstWhere('key', 'main_office')['open']);
    }

    public function test_the_board_loads_assignees_without_a_query_per_task(): void
    {
        $this->actingAs($this->admin)->get('/admin/team-tasks')->assertOk();
        foreach (range(1, 2) as $i) {
            $this->sharedTask([$this->maria, $this->juan]);
        }

        DB::enableQueryLog();
        $this->actingAs($this->admin)->get('/admin/team-tasks')->assertOk();
        $before = count(DB::getQueryLog());

        foreach (range(1, 4) as $i) {
            $this->sharedTask([$this->maria, $this->juan]);
        }
        DB::flushQueryLog();
        $this->actingAs($this->admin)->get('/admin/team-tasks')->assertOk();

        $this->assertSame($before, count(DB::getQueryLog()));
    }
}
