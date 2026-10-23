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

class EmployeeScheduleHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function schedule(Employee $e, string $from, string $type, string $days, ?string $start = null, ?string $end = null): void
    {
        EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => $from, 'type' => $type, 'shift_start' => $start, 'shift_end' => $end, 'work_days' => $days]);
    }

    public function test_changing_workdays_keeps_past_absences_and_rest_days(): void
    {
        $this->travelTo(Carbon::parse('2026-10-23 10:00', 'Asia/Manila'));
        $e = Employee::factory()->create(['date_hired' => '2026-09-01']);
        $this->schedule($e, '2026-10-01', 'standard', '1,2,3,4,5');
        $this->schedule($e, '2026-10-20', 'standard', '0,6');

        $this->assertSame('absent', DtrLog::fallbackStatus($e->id, Carbon::parse('2026-10-13')));
        $this->assertSame('rest_day', DtrLog::fallbackStatus($e->id, Carbon::parse('2026-10-18')));
        $this->assertSame('rest_day', DtrLog::fallbackStatus($e->id, Carbon::parse('2026-10-21')));
    }

    public function test_old_two_punch_days_keep_their_rules_after_switching_to_standard(): void
    {
        $this->travelTo(Carbon::parse('2026-10-23 10:00', 'Asia/Manila'));
        $e = Employee::factory()->create();
        $this->schedule($e, '2026-10-01', 'two_punch', '1,2,3,4,5', '07:00', '19:00');
        $this->schedule($e, '2026-10-20', 'standard', '1,2,3,4,5');

        $old = DtrLog::factory()->create(['employee_id' => $e->id, 'date' => '2026-10-09', 'status' => 'absent',
            'am_time_in' => '07:00:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null]);
        $new = DtrLog::factory()->create(['employee_id' => $e->id, 'date' => '2026-10-21', 'status' => 'on_time',
            'am_time_in' => '08:00:00', 'am_time_out' => '12:00:00', 'pm_time_in' => '13:00:00', 'pm_time_out' => '17:00:00']);

        $this->assertTrue($old->isTwoPunch());
        $this->assertSame('missing_out', $old->displayStatus());
        $this->assertFalse($new->isTwoPunch());
        $this->assertTrue(DtrLog::twoPunchLayout($e->id, [$old]));
        $this->assertFalse(DtrLog::twoPunchLayout($e->id, [$new]));

        $admin = Employee::factory()->superAdmin()->create(['employee_id' => 'EMP-0002', 'is_staff' => false]);
        $this->actingAs($admin)->post(route('admin.dtr.corrections.store', $e), [
            'date' => '2026-10-09', 'am_time_in' => '07:00', 'am_time_out' => '12:00', 'pm_time_out' => '19:00', 'reason' => 'x',
        ])->assertSessionHasErrors('am_time_out');
    }

    public function test_punch_less_days_before_a_two_punch_shift_keep_the_two_column_layout(): void
    {
        $this->travelTo(Carbon::parse('2026-10-23 10:00', 'Asia/Manila'));
        $e = Employee::factory()->create(['date_hired' => '2026-10-10']);
        $this->schedule($e, '2026-10-10', 'standard', '0,6');
        $this->schedule($e, '2026-10-17', 'two_punch', '0,6', '08:00', '20:00');

        $absence = DtrLog::factory()->create(['employee_id' => $e->id, 'date' => '2026-10-15', 'status' => 'absent',
            'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null]);
        $worked = DtrLog::factory()->create(['employee_id' => $e->id, 'date' => '2026-10-17', 'status' => 'on_time',
            'am_time_in' => '07:42:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => '20:05:00']);

        $this->assertTrue(DtrLog::twoPunchLayout($e->id, [$absence, $worked]));
        // Only punch-less days: fall back to today's schedule.
        $this->assertTrue(DtrLog::twoPunchLayout($e->id, [$absence]));
    }

    public function test_payroll_paid_days_follow_the_schedule_in_the_cutoff(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $e = Employee::factory()->create();
        $e->forceFill(['payroll_office' => 'main_office', 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();
        $this->schedule($e, '2026-10-01', 'standard', '0,6');

        $this->assertTrue(Employee::hasCustomWorkDays($e->id, Carbon::parse('2026-10-01'), Carbon::parse('2026-10-15')));
        $this->assertFalse(Employee::hasCustomWorkDays($e->id, Carbon::parse('2026-09-01'), Carbon::parse('2026-09-15')));
        $this->actingAs($admin)->get(route('admin.payroll.create', ['period_from' => '2026-10-01', 'period_to' => '2026-10-15', 'cutoff' => 'first']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('employees.0.id', $e->id)
                ->where('employees.0.paid_days_basis', 4));
    }
}
