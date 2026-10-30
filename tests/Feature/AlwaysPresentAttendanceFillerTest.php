<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Services\AlwaysPresentAttendanceFiller;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlwaysPresentAttendanceFillerTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_fills_missing_workdays_after_the_latest_row_without_touching_existing_rows(): void
    {
        Carbon::setTestNow('2026-11-04 10:00:00'); // Wednesday morning
        $president = Employee::factory()->create(['auto_present_weekdays' => true, 'date_hired' => '2026-07-14']);
        DtrLog::factory()->create(['employee_id' => $president->id, 'date' => '2026-10-29', 'status' => 'on_time']);
        // A real row later in the gap must be kept exactly as it is.
        DtrLog::factory()->create(['employee_id' => $president->id, 'date' => '2026-11-03', 'am_time_in' => '09:30:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null]);

        $created = app(AlwaysPresentAttendanceFiller::class)->fill();

        // Only dates after the latest row (Nov 3) are considered, so the Oct 30 / Nov 2 gap stays as is,
        // and Nov 4 is not filled before 5pm.
        $this->assertSame(0, $created);
        $this->assertSame(['2026-10-29', '2026-11-03'], DtrLog::where('employee_id', $president->id)->orderBy('date')->get()->map(fn ($l) => $l->date->toDateString())->all());
        $this->assertSame('09:30:00', DtrLog::whereDate('date', '2026-11-03')->first()->am_time_in);
    }

    public function test_fills_workdays_since_the_latest_row_with_standard_punches(): void
    {
        Carbon::setTestNow('2026-11-04 10:00:00');
        $president = Employee::factory()->create(['auto_present_weekdays' => true, 'date_hired' => '2026-07-14']);
        DtrLog::factory()->create(['employee_id' => $president->id, 'date' => '2026-10-29', 'status' => 'on_time']);

        $created = app(AlwaysPresentAttendanceFiller::class)->fill();

        // Oct 30 (Fri), Nov 2 (Mon), Nov 3 (Tue); the weekend is skipped and Nov 4 is before 5pm.
        $this->assertSame(3, $created);
        $rows = DtrLog::where('employee_id', $president->id)->orderBy('date')->get()->keyBy(fn ($l) => $l->date->toDateString());
        $this->assertSame(['2026-10-29', '2026-10-30', '2026-11-02', '2026-11-03'], $rows->keys()->all());
        $this->assertSame('08:00:00', $rows['2026-10-30']->am_time_in);
        $this->assertSame('17:00:00', $rows['2026-10-30']->pm_time_out);
        $this->assertSame('on_time', $rows['2026-10-30']->status);
        $this->assertEquals(8, $rows['2026-10-30']->hours_rendered);
        $this->assertSame(0, app(AlwaysPresentAttendanceFiller::class)->fill());
    }

    public function test_today_is_filled_only_after_five_pm_and_other_employees_are_ignored(): void
    {
        Carbon::setTestNow('2026-11-04 17:30:00');
        $president = Employee::factory()->create(['auto_present_weekdays' => true]);
        $other = Employee::factory()->create(['auto_present_weekdays' => false]);
        DtrLog::factory()->create(['employee_id' => $president->id, 'date' => '2026-11-03']);
        DtrLog::factory()->create(['employee_id' => $other->id, 'date' => '2026-11-02']);

        $this->assertSame(1, app(AlwaysPresentAttendanceFiller::class)->fill());
        $this->assertSame(2, DtrLog::where('employee_id', $president->id)->count());
        $this->assertSame(1, DtrLog::where('employee_id', $other->id)->count());
    }

    public function test_newly_flagged_employee_without_rows_gets_no_backfilled_history(): void
    {
        Carbon::setTestNow('2026-11-04 10:00:00');
        $employee = Employee::factory()->create(['auto_present_weekdays' => true, 'date_hired' => '2026-07-14']);

        $this->assertSame(0, app(AlwaysPresentAttendanceFiller::class)->fill());
        $this->assertSame(0, DtrLog::where('employee_id', $employee->id)->count());
    }
}
