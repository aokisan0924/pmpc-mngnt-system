<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Holiday;
use App\Models\Setting;
use App\Services\DtrPayrollAttendanceCalculator;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DtrPayrollAttendanceCalculatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_calculates_present_half_absence_and_late_minutes_from_dtr(): void
    {
        Carbon::setTestNow('2026-10-20 12:00:00');
        Setting::set('shift_start', '08:00');
        Setting::set('late_grace_minutes', '5');
        $employee = Employee::factory()->create(['date_hired' => '2026-10-01']);

        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-05', 'status' => 'late', 'am_time_in' => '08:12:00']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-06', 'status' => 'half_day', 'am_time_in' => '08:00:00', 'am_time_out' => '12:00:00', 'pm_time_in' => null, 'pm_time_out' => null]);

        $result = app(DtrPayrollAttendanceCalculator::class)->calculateMany(collect([$employee]), Carbon::parse('2026-10-05'), Carbon::parse('2026-10-09'), [$employee->id => 5])->get($employee->id);

        $this->assertSame(1.5, $result['days_present']);
        $this->assertSame(3.5, $result['absence_days']);
        $this->assertSame(7.0, $result['tardiness_minutes']);
        $this->assertSame([], $result['unresolved_dates']);
        Carbon::setTestNow();
    }

    public function test_pm_only_half_day_does_not_count_as_morning_lateness(): void
    {
        Carbon::setTestNow('2026-10-20 12:00:00');
        $employee = Employee::factory()->create(['date_hired' => '2026-10-01']);
        Setting::set('shift_start', '08:00');
        $this->assertTrue(Employee::isWorkDay($employee->id, Carbon::parse('2026-10-05')));
        DtrLog::factory()->create([
            'employee_id' => $employee->id, 'date' => '2026-10-05', 'status' => 'half_day',
            'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => '13:05:00', 'pm_time_out' => '17:00:00',
        ]);

        $this->assertSame('half_day', DtrLog::firstOrFail()->displayStatus());
        $result = app(DtrPayrollAttendanceCalculator::class)->calculateMany(collect([$employee]), Carbon::parse('2026-10-05'), Carbon::parse('2026-10-05'), [$employee->id => 1])->get($employee->id);

        $this->assertSame(0.0, $result['tardiness_minutes']);
        $this->assertSame(0.5, $result['days_present'], json_encode($result));
        Carbon::setTestNow();
    }

    private function hoursFor(Employee $employee, string $from, string $to, array $resolutions = []): array
    {
        return app(DtrPayrollAttendanceCalculator::class)
            ->hoursFor(collect([$employee]), Carbon::parse($from), Carbon::parse($to), $resolutions)
            ->get($employee->id);
    }

    /** @param  array<string, float>  $hours */
    private function logs(Employee $employee, array $hours): void
    {
        foreach ($hours as $date => $rendered) {
            DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => $date, 'hours_rendered' => $rendered]);
        }
    }

    public function test_hours_are_capped_at_shift_and_holiday_is_nwnp(): void
    {
        Carbon::setTestNow('2026-11-14 08:00:00');
        Holiday::create(['date' => '2026-11-02', 'name' => "All Soul's Day", 'type' => 'special']);
        $employee = Employee::factory()->create(['date_hired' => '2026-01-01']);
        $days = ['2026-11-03' => 8, '2026-11-04' => 6, '2026-11-05' => 9, '2026-11-06' => 8, '2026-11-09' => 8, '2026-11-10' => 8, '2026-11-11' => 8, '2026-11-12' => 8, '2026-11-13' => 8];
        $this->logs($employee, $days);

        $result = $this->hoursFor($employee, '2026-10-31', '2026-11-13');
        $byDate = collect($result['days'])->keyBy('date');

        $this->assertSame(10.0, $result['days_of_work']);
        $this->assertTrue($byDate['2026-11-02']['holiday']);
        $this->assertSame(0.0, $byDate['2026-11-02']['worked_hours']);
        $this->assertSame(6.0, $byDate['2026-11-04']['worked_hours']);
        $this->assertSame(8.0, $byDate['2026-11-05']['worked_hours']);
        $this->assertSame([], $result['unresolved_dates']);
        Carbon::setTestNow();
    }

    public function test_gen_mdse_two_punch_counts_weekends_in_window(): void
    {
        Carbon::setTestNow('2026-11-14 08:00:00');
        Holiday::create(['date' => '2026-11-02', 'name' => "All Soul's Day", 'type' => 'special']);
        $employee = Employee::factory()->create(['date_hired' => '2026-01-01']);
        EmployeeSchedule::create(['employee_id' => $employee->id, 'effective_from' => '2026-01-01', 'type' => 'two_punch', 'shift_start' => '06:00', 'shift_end' => '18:00', 'work_days' => '0,1,2,3,4,5,6']);
        foreach (CarbonPeriod::create('2026-10-31', '2026-11-13') as $day) {
            if ($day->toDateString() !== '2026-11-02') {
                DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => $day->toDateString(), 'am_time_in' => '05:56:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => '18:07:00', 'hours_rendered' => 12.18]);
            }
        }

        $result = $this->hoursFor($employee, '2026-10-31', '2026-11-13');
        $byDate = collect($result['days'])->keyBy('date');

        $this->assertSame(14.0, $result['days_of_work']);
        $this->assertSame(12.0, $byDate['2026-10-31']['worked_hours']);
        $this->assertSame(12.0, $byDate['2026-11-13']['shift_hours']);
        $this->assertSame(0.0, $byDate['2026-11-02']['worked_hours']);
        Carbon::setTestNow();
    }

    public function test_missing_punch_is_unresolved_until_resolved(): void
    {
        Carbon::setTestNow('2026-11-14 08:00:00');
        $employee = Employee::factory()->create(['date_hired' => '2026-01-01']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-11-11', 'am_time_in' => '08:00:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null, 'hours_rendered' => 0, 'status' => 'absent']);

        $this->assertSame(['2026-11-11'], $this->hoursFor($employee, '2026-11-11', '2026-11-11')['unresolved_dates']);

        $typed = $this->hoursFor($employee, '2026-11-11', '2026-11-11', [$employee->id => ['2026-11-11' => ['type' => 'hours', 'hours' => 14, 'note' => 'Forgot to clock out']]]);
        $this->assertSame(8.0, $typed['days'][0]['worked_hours']);
        $this->assertSame('typed', $typed['days'][0]['source']);
        $this->assertSame([], $typed['unresolved_dates']);

        $zero = $this->hoursFor($employee, '2026-11-11', '2026-11-11', [$employee->id => ['2026-11-11' => ['type' => 'zero']]]);
        $this->assertSame(0.0, $zero['days'][0]['worked_hours']);
        $this->assertSame('zero', $zero['days'][0]['source']);
        $this->assertSame([], $zero['unresolved_dates']);
        Carbon::setTestNow();
    }

    public function test_days_before_hire_and_future_days_are_not_counted(): void
    {
        Carbon::setTestNow('2026-11-12 09:00:00');
        $employee = Employee::factory()->create(['date_hired' => '2026-11-09']);

        $result = $this->hoursFor($employee, '2026-11-02', '2026-11-13');

        // Nov 9, 10, 11 only: before hire and today/future are left out.
        $this->assertSame(3.0, $result['days_of_work']);
        $this->assertSame([], $result['unresolved_dates']);
        Carbon::setTestNow();
    }
}
