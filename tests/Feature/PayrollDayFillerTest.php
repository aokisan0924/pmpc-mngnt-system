<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Setting;
use App\Services\AttendancePunchService;
use App\Services\PayrollDayFiller;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PayrollDayFillerTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function timedIn(Employee $employee, string $date, array $punches): DtrLog
    {
        return DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => $date, 'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null, 'hours_rendered' => 0, 'status' => 'absent', ...$punches]);
    }

    private function punchIn(Employee $employee): void
    {
        $service = app(AttendancePunchService::class);
        $log = $service->currentLog($employee);
        $this->actingAs($employee)->post(route('employee.dtr.punch'), [
            'request_id' => (string) Str::uuid(),
            'expected_slot' => $log->getNextPunchSlot(),
            'expected_version' => $service->version($employee, $log),
        ])->assertSessionHasNoErrors();
    }

    public function test_start_fills_office_staff_with_lunch_and_friday_end(): void
    {
        Carbon::setTestNow('2026-11-13 09:00:00');
        $log = $this->timedIn(Employee::factory()->create(), '2026-11-13', ['am_time_in' => '08:05:00']);

        $this->assertSame(1, app(PayrollDayFiller::class)->start());

        $log->refresh();
        $this->assertSame(['08:05:00', '12:00:00', '13:00:00', '16:00:00'], [$log->am_time_in, $log->am_time_out, $log->pm_time_in, $log->pm_time_out]);
        $this->assertNull($log->getNextPunchSlot());
        $this->assertSame('2026-11-13', Setting::get('payroll_day'));
    }

    public function test_monday_to_thursday_office_end_is_five(): void
    {
        Carbon::setTestNow('2026-11-12 09:00:00');
        $log = $this->timedIn(Employee::factory()->create(), '2026-11-12', ['am_time_in' => '08:00:00']);

        app(PayrollDayFiller::class)->start();

        $this->assertSame('17:00:00', $log->refresh()->pm_time_out);
    }

    public function test_store_staff_get_their_own_clock_out(): void
    {
        Carbon::setTestNow('2026-11-13 09:00:00');
        $store = Employee::factory()->create();
        EmployeeSchedule::create(['employee_id' => $store->id, 'effective_from' => '2026-01-01', 'type' => 'two_punch', 'shift_start' => '06:00', 'shift_end' => '18:00', 'work_days' => '0,1,2,3,4,5,6']);
        $log = $this->timedIn($store, '2026-11-13', ['am_time_in' => '05:58:00']);

        app(PayrollDayFiller::class)->start();

        $log->refresh();
        $this->assertSame('18:00:00', $log->pm_time_out);
        $this->assertNull($log->am_time_out);
        $this->assertNull($log->pm_time_in);
    }

    public function test_afternoon_only_day_gets_only_the_clock_out(): void
    {
        Carbon::setTestNow('2026-11-13 14:00:00');
        $log = $this->timedIn(Employee::factory()->create(), '2026-11-13', ['pm_time_in' => '13:10:00']);

        app(PayrollDayFiller::class)->start();

        $log->refresh();
        $this->assertSame('16:00:00', $log->pm_time_out);
        $this->assertNull($log->am_time_in);
        $this->assertNull($log->am_time_out);
    }

    public function test_never_overwrites_and_skips_people_not_timed_in(): void
    {
        Carbon::setTestNow('2026-11-13 09:00:00');
        $done = $this->timedIn(Employee::factory()->create(), '2026-11-13', ['am_time_in' => '08:00:00', 'am_time_out' => '12:00:00', 'pm_time_in' => '13:00:00', 'pm_time_out' => '15:00:00', 'status' => 'undertime']);
        $nobody = Employee::factory()->create();
        $notice = $this->timedIn(Employee::factory()->create(), '2026-11-13', ['absence_reason' => 'Sick']);

        $this->assertSame(0, app(PayrollDayFiller::class)->start());

        $this->assertSame('15:00:00', $done->refresh()->pm_time_out);
        $this->assertSame(0, DtrLog::where('employee_id', $nobody->id)->count());
        $this->assertSame(0, $notice->refresh()->punchesCount());
    }

    public function test_pressing_twice_changes_nothing(): void
    {
        Carbon::setTestNow('2026-11-13 09:00:00');
        $log = $this->timedIn(Employee::factory()->create(), '2026-11-13', ['am_time_in' => '08:00:00']);
        $filler = app(PayrollDayFiller::class);
        $filler->start();
        $before = $log->refresh()->only(['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']);

        $this->assertSame(0, $filler->start());
        $this->assertSame($before, $log->refresh()->only(['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out']));
    }

    public function test_time_in_after_start_fills_the_day(): void
    {
        Carbon::setTestNow('2026-11-13 09:00:00');
        app(PayrollDayFiller::class)->start();
        Carbon::setTestNow('2026-11-13 10:00:00');
        $late = Employee::factory()->create();

        $this->punchIn($late);

        $log = DtrLog::where('employee_id', $late->id)->firstOrFail();
        $this->assertSame(['10:00:00', '12:00:00', '13:00:00', '16:00:00'], [$log->am_time_in, $log->am_time_out, $log->pm_time_in, $log->pm_time_out]);
    }

    public function test_old_payroll_day_does_not_fill_today(): void
    {
        Setting::set('payroll_day', '2026-11-12');
        Carbon::setTestNow('2026-11-13 09:00:00');
        $employee = Employee::factory()->create();

        $this->punchIn($employee);

        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('09:00:00', $log->am_time_in);
        $this->assertNull($log->am_time_out);
        $this->assertNull($log->pm_time_out);
    }
}
