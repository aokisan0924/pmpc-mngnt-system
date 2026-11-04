<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportOfficeTaskListsTest extends TestCase
{
    use RefreshDatabase;

    /** employee code => [first name, payroll office, role] */
    private const STAFF = [
        '2022-00003' => ['Alexander A.', 'cubao', 'super_admin'],
        'EMP-0001' => ['Reynold', 'main_office', 'super_admin'],
        'EMP-0002' => ['Kurt Vincent', 'cubao', 'super_admin'],
        'EMP-0003' => ['Katherine', 'cubao', 'employee'],
        '2026-00025' => ['Yvonne N.', 'main_office', 'employee'],
        '2026-00026' => ['Jerome A.', 'main_office', 'employee'],
        '2026-00027' => ['Mariel S.', 'fort_magsaysay', 'employee'],
        '2026-00028' => ['Diana', 'fort_magsaysay', 'employee'],
    ];

    private function seedStaff(array $except = []): void
    {
        foreach (self::STAFF as $code => [$first, $office, $role]) {
            if (in_array($code, $except, true)) {
                continue;
            }

            Employee::factory()->create([
                'employee_id' => $code, 'first_name' => $first, 'payroll_office' => $office, 'role' => $role,
            ]);
        }
    }

    public function test_dry_run_reports_21_tasks_and_writes_nothing(): void
    {
        $this->seedStaff();

        $this->artisan('tasks:import-office-lists')
            ->expectsOutputToContain('21 task(s) planned')
            ->assertSuccessful();

        $this->assertSame(0, Task::count());
    }

    public function test_apply_creates_the_21_tasks_with_the_right_owners_and_offices(): void
    {
        $this->seedStaff();
        $kurt = Employee::where('employee_id', 'EMP-0002')->firstOrFail();

        $this->artisan('tasks:import-office-lists --apply')->assertSuccessful();

        $this->assertSame(21, Task::count());
        $this->assertSame(21, Task::where('assigned_by', $kurt->id)->count());

        // Whole-office tasks have no employee: 3 for UPI Main Office, 3 for Fort Magsaysay.
        $this->assertSame(3, Task::whereNull('employee_id')->where('office', 'main_office')->count());
        $this->assertSame(3, Task::whereNull('employee_id')->where('office', 'fort_magsaysay')->count());
        $this->assertSame(0, Task::whereNull('employee_id')->where('office', 'cubao')->count());

        // Named tasks: 5 Xander, 4 Reynold, 1 each for Kath, Kurt, Yvonne, Jerome, Diana, Mariel.
        $count = fn (string $code) => Task::where('employee_id', Employee::where('employee_id', $code)->value('id'))->count();
        $this->assertSame(5, $count('2022-00003'));
        $this->assertSame(4, $count('EMP-0001'));
        foreach (['EMP-0003', 'EMP-0002', '2026-00025', '2026-00026', '2026-00027', '2026-00028'] as $code) {
            $this->assertSame(1, $count($code), $code);
        }

        // Every task has a due date; undated ones land on 2026-11-04.
        $undated = Task::where('title', 'Generate GC for Updates on Capital Contribution and savings deposit')->firstOrFail();
        $this->assertSame('2026-11-04', $undated->due_date->toDateString());
        $this->assertSame('Reynold', $undated->category);

        $billing = Task::where('title', 'Billing Active')->firstOrFail();
        $this->assertSame('2026-11-05', $billing->due_date->toDateString());
        $this->assertSame('1. Erica Ibasco RL', $billing->description);
        $this->assertSame('pending', $billing->status);
    }

    public function test_named_pair_tasks_are_copied_once_per_person(): void
    {
        $this->seedStaff();

        $this->artisan('tasks:import-office-lists --apply')->assertSuccessful();

        $yvon = Task::where('title', 'Yvon and Jerome')->get();
        $this->assertCount(2, $yvon);
        $this->assertEqualsCanonicalizing(
            Employee::whereIn('employee_id', ['2026-00025', '2026-00026'])->pluck('id')->all(),
            $yvon->pluck('employee_id')->all()
        );
        $this->assertSame(['main_office'], $yvon->pluck('office')->unique()->values()->all());
        $this->assertCount(2, Task::where('title', 'Validating information on PIS')->get());
    }

    public function test_running_apply_twice_creates_nothing_the_second_time(): void
    {
        $this->seedStaff();

        $this->artisan('tasks:import-office-lists --apply')->assertSuccessful();
        $this->artisan('tasks:import-office-lists --apply')->expectsOutputToContain('0 created')->assertSuccessful();

        $this->assertSame(21, Task::count());
    }

    public function test_a_missing_employee_aborts_without_writing_anything(): void
    {
        $this->seedStaff(except: ['2026-00027']);

        $this->artisan('tasks:import-office-lists --apply')
            ->expectsOutputToContain('2026-00027')
            ->assertFailed();

        $this->assertSame(0, Task::count());
    }
}
