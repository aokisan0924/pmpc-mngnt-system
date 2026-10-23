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

class TwoPunchShiftTest extends TestCase
{
    use RefreshDatabase;

    private function twoPunchEmployee(string $start, string $end): Employee
    {
        $employee = Employee::factory()->create();
        EmployeeSchedule::create(['employee_id' => $employee->id, 'effective_from' => '2026-10-01', 'type' => 'two_punch', 'shift_start' => $start, 'shift_end' => $end, 'work_days' => '1,2,3,4,5']);

        return $employee;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_day_shift_uses_two_punches_and_counts_twelve_hours(): void
    {
        $employee = $this->twoPunchEmployee('08:00', '20:00');
        Carbon::setTestNow('2026-10-20 08:00:00');
        $this->actingAs($employee)->post('/employee/dtr/punch')->assertSessionHasNoErrors();
        Carbon::setTestNow('2026-10-20 20:00:00');
        $this->actingAs($employee)->post('/employee/dtr/punch')->assertSessionHasNoErrors();
        $this->actingAs($employee)->post('/employee/dtr/punch')->assertSessionHasErrors('punch');

        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertNull($log->am_time_out);
        $this->assertSame(12.0, (float) $log->hours_rendered);
        $this->assertSame('on_time', $log->status);
    }

    public function test_overnight_clock_out_closes_the_log_opened_the_evening_before(): void
    {
        $employee = $this->twoPunchEmployee('20:00', '08:00');
        Carbon::setTestNow('2026-10-20 19:58:00');
        $this->actingAs($employee)->post('/employee/dtr/punch');
        Carbon::setTestNow('2026-10-21 08:02:00');
        $this->actingAs($employee)->post('/employee/dtr/punch')->assertSessionHasNoErrors();

        $this->assertSame(1, DtrLog::where('employee_id', $employee->id)->count());
        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('2026-10-20', $log->date->toDateString());
        $this->assertSame(12.07, (float) $log->hours_rendered);
        $this->assertSame('on_time', $log->status);
    }

    public function test_late_and_undertime_are_judged_against_the_shift(): void
    {
        $employee = $this->twoPunchEmployee('08:00', '20:00');
        $late = DtrLog::factory()->make(['employee_id' => $employee->id, 'date' => '2026-10-20',
            'am_time_in' => '08:10:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => '20:00:00']);
        $late->computeHoursAndStatus();
        $this->assertSame('late', $late->status);

        $short = DtrLog::factory()->make(['employee_id' => $employee->id, 'date' => '2026-10-20',
            'am_time_in' => '08:00:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => '19:00:00']);
        $short->computeHoursAndStatus();
        $this->assertSame('undertime', $short->status);
    }

    public function test_open_overnight_shift_shows_in_progress_the_next_morning_not_absent(): void
    {
        $employee = $this->twoPunchEmployee('20:00', '08:00');
        $log = DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-20', 'status' => 'absent',
            'am_time_in' => '20:00:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null]);

        Carbon::setTestNow('2026-10-21 06:00:00');
        $this->assertSame('in_progress', $log->fresh()->displayStatus());

        Carbon::setTestNow('2026-10-22 06:00:00');
        $this->assertSame('missing_out', $log->fresh()->displayStatus());
    }

    public function test_hr_can_correct_an_overnight_log_but_not_add_lunch_punches(): void
    {
        $employee = $this->twoPunchEmployee('20:00', '08:00');
        $hr = Employee::factory()->superAdmin()->create(['employee_id' => 'EMP-0002', 'is_staff' => false]);
        $url = route('admin.dtr.corrections.store', $employee);

        $this->actingAs($hr)->post($url, ['date' => '2026-10-20', 'am_time_in' => '20:00', 'pm_time_out' => '08:00', 'reason' => 'Forgot to punch out'])
            ->assertSessionHasNoErrors();
        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame(12.0, (float) $log->hours_rendered);
        $this->assertSame('on_time', $log->status);

        $this->actingAs($hr)->post($url, ['date' => '2026-10-20', 'am_time_in' => '20:00', 'am_time_out' => '23:00', 'pm_time_out' => '08:00', 'reason' => 'x'])
            ->assertSessionHasErrors('am_time_out');
    }

    public function test_two_punch_day_counts_as_one_payroll_day_and_prints_two_columns(): void
    {
        $employee = $this->twoPunchEmployee('08:00', '20:00');
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-20', 'status' => 'on_time',
            'am_time_in' => '08:00:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => '20:00:00']);

        $this->assertSame(1.0, DtrLog::weightedDaysByEmployee([$employee->id], '2026-10-16', '2026-10-31')->get($employee->id));

        $html = view('dtr.print', [
            'employee' => $employee, 'month' => 'October 2026', 'calendar' => [], 'twoPunch' => true,
            'summary' => ['days_present' => 1, 'days_late' => 0, 'days_absent' => 0, 'half_days' => 0, 'hours_rendered' => 12],
            'settings' => Setting::getMany(['coop_name', 'coop_address', 'signatory_1_name', 'signatory_1_role', 'signatory_2_name', 'signatory_2_role']),
        ])->render();
        $this->assertStringContainsString('Time In', $html);
        $this->assertStringNotContainsString('AM Out', $html);
    }

    public function test_a_never_closed_two_punch_day_is_flagged_missing_time_out_and_pays_nothing(): void
    {
        $employee = $this->twoPunchEmployee('08:00', '20:00');
        $log = DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-19', 'status' => 'absent',
            'am_time_in' => '08:00:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null]);
        Carbon::setTestNow('2026-10-21 09:00:00');

        $this->assertSame('missing_out', $log->fresh()->displayStatus());
        $this->assertSame(1, DtrLog::absentDaysBetween($employee->id, '2026-10-19', '2026-10-19'));
        $this->assertSame(0.0, DtrLog::weightedDaysByEmployee([$employee->id], '2026-10-19', '2026-10-19')->get($employee->id, 0.0));
    }

    public function test_lunch_columns_return_when_a_log_holds_lunch_punches(): void
    {
        $employee = $this->twoPunchEmployee('08:00', '20:00');
        $withLunch = DtrLog::factory()->make(['employee_id' => $employee->id, 'date' => '2026-10-10', 'am_time_out' => '12:00:00']);
        $plain = DtrLog::factory()->make(['employee_id' => $employee->id, 'date' => '2026-10-20', 'am_time_out' => null, 'pm_time_in' => null]);

        $this->assertTrue(DtrLog::twoPunchLayout($employee->id, [$plain]));
        $this->assertFalse(DtrLog::twoPunchLayout($employee->id, [$plain, $withLunch]));
    }

    public function test_edit_requests_flag_only_two_punch_employees(): void
    {
        Carbon::setTestNow('2026-10-22 09:00:00');
        $admin = Employee::factory()->create(['role' => 'super_admin']);
        $twoPunch = $this->twoPunchEmployee('08:00', '20:00');
        foreach ([$twoPunch, Employee::factory()->create()] as $employee) {
            $log = DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-22', 'am_time_in' => '08:02:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null]);
            DtrEditRequest::create(['dtr_log_id' => $log->id, 'employee_id' => $employee->id, 'original_am_time_in' => '08:02:00', 'requested_am_time_in' => '07:58:00', 'reason' => 'Clocked in late by mistake', 'status' => 'pending']);
        }

        $this->actingAs($admin)->get(route('admin.edit-requests'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('requests', fn ($requests) => collect($requests)
                    ->mapWithKeys(fn ($r) => [$r['employee_id'] => $r['two_punch']])
                    ->filter()->keys()->all() === [$twoPunch->employee_id]));
    }
}
