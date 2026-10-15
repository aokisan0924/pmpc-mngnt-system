<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Setting;
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

    public function test_weekend_worker_rests_on_weekdays_and_is_absent_on_unlogged_weekends(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-09-01', 'work_days' => '0,6']);

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
        $employee = Employee::factory()->create(['work_days' => '0,6']);
        $employee->forceFill(['payroll_office' => 'main_office', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();

        $this->actingAs($admin)->get(route('admin.payroll.create', ['period_from' => '2026-09-01', 'period_to' => '2026-09-15', 'cutoff' => 'first']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('employees.0.id', $employee->id)
                ->where('employees.0.paid_days_basis', 4));
    }

    public function test_compensation_stores_work_days_and_monday_to_friday_as_null(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();

        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation(['work_days' => [6, 0]]))
            ->assertSessionHasNoErrors();
        $this->assertSame('0,6', $employee->fresh()->work_days);

        $this->actingAs($admin)->patch(route('admin.employees.compensation', $employee), $this->compensation())
            ->assertSessionHasNoErrors();
        $this->assertNull($employee->fresh()->work_days);

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

        $this->assertSame(['start' => '07:00', 'end' => '19:00'], Setting::employeeShiftForDate($employee->id, Carbon::parse('2026-10-15')));
        $this->assertNull(Setting::employeeShiftForDate($employee->id, Carbon::parse('2026-10-14')));
    }
}
