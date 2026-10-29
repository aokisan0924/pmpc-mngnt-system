<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\PunchesAttendance;
use Tests\TestCase;

class AfternoonHalfDayTest extends TestCase
{
    use PunchesAttendance;
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function punchAt(Employee $employee, string $time): void
    {
        Carbon::setTestNow("2026-10-20 {$time}");
        $this->postAttendancePunch($employee)->assertSessionHasNoErrors();
    }

    public function test_afternoon_start_fills_pm_in_and_pm_out_and_completes_as_half_day(): void
    {
        $employee = Employee::factory()->create();
        $this->punchAt($employee, '13:00:00');

        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertNull($log->am_time_in);
        $this->assertSame('13:00:00', $log->pm_time_in);
        $this->assertSame('pm_time_out', $log->getNextPunchSlot());
        $this->assertSame('in_progress', $log->displayStatus());

        $this->punchAt($employee, '17:00:00');
        $log->refresh();
        $this->assertSame('17:00:00', $log->pm_time_out);
        $this->assertNull($log->getNextPunchSlot());
        $this->assertSame('half_day', $log->displayStatus());
        $this->assertSame(4.0, (float) $log->hours_rendered);

        Carbon::setTestNow('2026-10-20 17:05:00');
        $this->postAttendancePunch($employee)->assertSessionHasErrors('punch');
    }

    public function test_morning_start_keeps_the_four_punch_order(): void
    {
        $employee = Employee::factory()->create();
        $this->punchAt($employee, '07:55:00');
        $this->punchAt($employee, '12:00:00');
        $this->punchAt($employee, '13:00:00');
        $this->punchAt($employee, '17:00:00');

        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame(['07:55:00', '12:00:00', '13:00:00', '17:00:00'], [$log->am_time_in, $log->am_time_out, $log->pm_time_in, $log->pm_time_out]);
        $this->assertSame('on_time', $log->displayStatus());
    }

    public function test_a_personal_shift_starting_after_lunch_keeps_the_normal_order(): void
    {
        $employee = Employee::factory()->create();
        EmployeeSchedule::create(['employee_id' => $employee->id, 'effective_from' => '2026-10-01', 'type' => 'custom', 'shift_start' => '13:00', 'shift_end' => '22:00', 'work_days' => '1,2,3,4,5']);
        $this->punchAt($employee, '13:00:00');

        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('13:00:00', $log->am_time_in);
        $this->assertNull($log->pm_time_in);
    }
}
