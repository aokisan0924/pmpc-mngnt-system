<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class EmployeeWorkDaysTest extends TestCase
{
    use RefreshDatabase;

    private function compensation(array $changes = []): array
    {
        return array_replace(['daily_rate' => 600, 'work_days' => [1, 2, 3, 4, 5]], $changes);
    }

    private function weekendSchedule(Employee $employee): void
    {
        EmployeeSchedule::create(['employee_id' => $employee->id, 'effective_from' => '2026-01-01', 'type' => 'standard', 'work_days' => '0,6']);
    }

    public function test_weekend_worker_rests_on_weekdays_and_is_absent_on_unlogged_weekends(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-09-01']);
        $this->weekendSchedule($employee);

        $this->assertSame('rest_day', DtrLog::fallbackStatus($employee->id, Carbon::parse('2026-09-02')));
        $this->assertSame('absent', DtrLog::fallbackStatus($employee->id, Carbon::parse('2026-09-05')));
        $this->assertSame('absent', DtrLog::fallbackStatus($employee->id, Carbon::parse('2026-09-06')));

        // Sep 1–15 weekends: 5, 6, 12, 13; one logged.
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-05']);
        $this->assertSame(3, DtrLog::absentDaysBetween($employee->id, '2026-09-01', '2026-09-15'));
    }

    public function test_payroll_preview_paid_days_equal_weekend_days_in_cutoff(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create();
        $this->weekendSchedule($employee);
        $employee->forceFill(['payroll_office' => 'main_office', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();

        $this->actingAs($admin)->get(route('admin.payroll.create', ['period_from' => '2026-09-01', 'period_to' => '2026-09-15', 'cutoff' => 'first']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('employees.0.id', $employee->id)
                ->where('employees.0.paid_days_basis', 4));
    }

    public function test_compensation_writes_a_schedule_row_for_today_and_only_on_change(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();

        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation(['work_days' => [6, 0]]))
            ->assertSessionHasNoErrors();
        $row = EmployeeSchedule::where('employee_id', $employee->id)->sole();
        $this->assertSame('0,6', $row->work_days);
        $this->assertSame('standard', $row->type);
        $this->assertSame($admin->id, $row->created_by);
        $this->assertSame(today()->toDateString(), $row->effective_from->toDateString());

        // Saving again with the same workdays changes nothing; going back to Mon-Fri rewrites today's row.
        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation(['work_days' => [0, 6]]));
        $this->assertSame(1, EmployeeSchedule::where('employee_id', $employee->id)->count());
        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation())
            ->assertSessionHasNoErrors();
        $this->assertSame('1,2,3,4,5', EmployeeSchedule::where('employee_id', $employee->id)->sole()->work_days);

        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation(['work_days' => []]))
            ->assertSessionHasErrors('work_days');
    }

    public function test_compensation_saves_shift_and_keeps_effective_date_when_unchanged(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();
        $shift = ['shift_start' => '07:00', 'shift_end' => '19:00'];

        $this->travelTo(Carbon::parse('2026-10-15 09:00'));
        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation($shift))
            ->assertSessionHasNoErrors();

        $this->travelTo(Carbon::parse('2026-10-20 09:00'));
        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation($shift))
            ->assertSessionHasNoErrors();

        $this->assertSame(['start' => '07:00', 'end' => '19:00', 'two_punch' => false], EmployeeSchedule::shiftFor($employee->id, Carbon::parse('2026-10-15')));
        $this->assertNull(EmployeeSchedule::shiftFor($employee->id, Carbon::parse('2026-10-14')));
        $this->assertSame(1, EmployeeSchedule::where('employee_id', $employee->id)->count());
    }
}
