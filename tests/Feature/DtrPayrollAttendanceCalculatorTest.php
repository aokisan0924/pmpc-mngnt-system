<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Setting;
use App\Services\DtrPayrollAttendanceCalculator;
use Carbon\Carbon;
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
}
