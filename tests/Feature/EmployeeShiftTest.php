<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmployeeShiftTest extends TestCase
{
    use RefreshDatabase;

    private function employeeWithShift(array $attributes = []): Employee
    {
        $employee = Employee::factory()->create($attributes);
        EmployeeSchedule::create(['employee_id' => $employee->id, 'effective_from' => '2026-10-01', 'type' => 'custom', 'shift_start' => '11:00', 'shift_end' => '20:00', 'work_days' => '1,2,3,4,5']);

        return $employee;
    }

    private function fullDay(Employee $employee, string $date, string $in = '11:00:00', string $out = '20:00:00'): DtrLog
    {
        return DtrLog::factory()->make([
            'employee_id' => $employee->id, 'date' => $date,
            'am_time_in' => $in, 'am_time_out' => '12:00:00',
            'pm_time_in' => '13:00:00', 'pm_time_out' => $out,
        ]);
    }

    public function test_shift_starts_on_october_first_and_keeps_exact_boundaries_and_hours(): void
    {
        $employee = $this->employeeWithShift();
        foreach ([
            ['2026-09-30', '11:00:00', '20:00:00', 'late'],
            ['2026-10-01', '11:00:00', '20:00:00', 'on_time'],
            ['2026-10-01', '11:01:00', '20:00:00', 'late'],
            ['2026-10-01', '11:00:00', '19:59:00', 'undertime'],
            ['2026-10-02', '11:00:00', '20:00:00', 'on_time'],
            ['2026-10-02', '10:55:00', '19:10:40', 'undertime'],
        ] as [$date, $in, $out, $expected]) {
            $log = $this->fullDay($employee, $date, $in, $out);
            $punches = $log->only(['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']);
            $log->computeHoursAndStatus();
            $this->assertSame($expected, $log->status, $date.' '.$in.' '.$out);
            $this->assertSame($expected, $log->displayStatus());
            $this->assertSame($punches, $log->only(array_keys($punches)));
            if ($in === '11:00:00' && $out === '20:00:00') {
                $this->assertEquals(8, $log->hours_rendered);
            }
        }
    }

    public function test_existing_grace_period_still_applies_to_personal_shift(): void
    {
        $employee = $this->employeeWithShift();
        Setting::set('late_grace_minutes', '10');
        $onTime = $this->fullDay($employee, '2026-10-01', '11:10:00');
        $late = $this->fullDay($employee, '2026-10-01', '11:11:00');
        $onTime->computeHoursAndStatus();
        $late->computeHoursAndStatus();
        $this->assertSame('on_time', $onTime->status);
        $this->assertSame('late', $late->status);
    }

    public function test_other_employees_keep_global_shift_and_friday_display_rule(): void
    {
        $this->employeeWithShift();
        $other = Employee::factory()->create();
        $late = $this->fullDay($other, '2026-10-01');
        $late->computeHoursAndStatus();
        $this->assertSame('late', $late->status);

        $friday = $this->fullDay($other, '2026-10-02', '08:00:00', '16:00:00');
        $friday->computeHoursAndStatus();
        $this->assertSame('on_time', $friday->status);
        $friday->status = 'undertime';
        $this->assertSame('on_time', $friday->displayStatus());
    }

    public function test_missing_punches_and_absences_are_not_turned_into_on_time_days(): void
    {
        $employee = $this->employeeWithShift();
        $partial = $this->fullDay($employee, '2026-10-09');
        $partial->pm_time_out = null;
        $partial->computeHoursAndStatus();
        $this->assertSame('half_day', $partial->status);
        $this->assertNull($partial->pm_time_out);

        $absent = DtrLog::factory()->make([
            'employee_id' => $employee->id, 'date' => '2026-10-10',
            'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null,
        ]);
        $absent->computeHoursAndStatus();
        $this->assertSame('absent', $absent->status);
        $this->assertSame('rest_day', $absent->displayStatus());
    }

    public function test_a_schedule_row_starting_after_the_date_does_not_apply(): void
    {
        $employee = Employee::factory()->create();
        EmployeeSchedule::create(['employee_id' => $employee->id, 'effective_from' => '2026-10-15', 'type' => 'custom', 'shift_start' => '11:00', 'shift_end' => '20:00', 'work_days' => '1,2,3,4,5']);

        $this->assertNull(EmployeeSchedule::shiftFor($employee->id, Carbon::parse('2026-10-14')));
    }

    public function test_both_dashboards_show_the_personal_shift_without_changing_lunch_times(): void
    {
        $this->travelTo(Carbon::parse('2026-10-14 11:00:00', 'Asia/Manila'));
        foreach (['employee', 'super_admin'] as $role) {
            $employee = $this->employeeWithShift(['role' => $role]);
            $route = $role === 'super_admin' ? 'admin.dashboard' : 'employee.dashboard';
            $this->actingAs($employee)->get(route($route))->assertInertia(fn (Assert $page) => $page
                ->where('schedule.am_time_in', '11:00')
                ->where('schedule.am_time_out', '12:00')
                ->where('schedule.pm_time_in', '13:00')
                ->where('schedule.pm_time_out', '20:00')
                ->etc());
        }
    }

    public function test_new_punches_and_approved_corrections_use_the_same_shift(): void
    {
        $employee = $this->employeeWithShift();
        $this->travelTo(Carbon::parse('2026-10-01 11:00:00', 'Asia/Manila'));
        foreach (['11:00', '12:00', '13:00', '20:00'] as $time) {
            $this->travelTo(Carbon::parse('2026-10-01 '.$time, 'Asia/Manila'));
            $this->actingAs($employee)->post(route('employee.dtr.punch'))->assertSessionHasNoErrors();
        }
        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('on_time', $log->status);
        $this->assertEquals(8, $log->hours_rendered);

        $admin = Employee::factory()->create(['role' => 'super_admin']);
        $edit = DtrEditRequest::factory()->create([
            'employee_id' => $employee->id, 'dtr_log_id' => $log->id, 'status' => 'pending',
            'requested_am_time_in' => '11:00', 'requested_am_time_out' => '12:00',
            'requested_pm_time_in' => '13:00', 'requested_pm_time_out' => '19:00',
        ]);
        $this->actingAs($admin)->post(route('admin.edit-requests.approve', $edit))->assertSessionHasNoErrors();
        $this->assertSame('undertime', $log->fresh()->status);
    }
}
