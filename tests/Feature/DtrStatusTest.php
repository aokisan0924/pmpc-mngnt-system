<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DtrStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_weighted_dtr_days_count_half_days_as_half(): void
    {
        $employee = Employee::factory()->create();
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-01', 'status' => 'on_time']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-02', 'status' => 'half_day']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-03', 'status' => 'absent']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-05', 'status' => 'absent']);

        $this->assertEquals(1.5, DtrLog::daysPresentBetween($employee->id, '2026-09-01', '2026-09-30'));
        $this->assertEquals(1.5, DtrLog::weightedDaysPresent(
            DtrLog::where('employee_id', $employee->id)->whereBetween('date', ['2026-09-01', '2026-09-30'])->get()
        ));
    }

    public function test_friday_1600_checkout_is_not_undertime_without_changing_hours(): void
    {
        $friday = DtrLog::factory()->make([
            'date' => '2026-09-18',
            'am_time_in' => '08:00:00',
            'am_time_out' => '12:00:00',
            'pm_time_in' => '12:45:00',
            'pm_time_out' => '16:00:00',
        ]);
        $friday->computeHoursAndStatus();

        $thursday = DtrLog::factory()->make([
            'date' => '2026-09-17',
            'am_time_in' => '08:00:00',
            'am_time_out' => '12:00:00',
            'pm_time_in' => '12:45:00',
            'pm_time_out' => '16:00:00',
        ]);
        $thursday->computeHoursAndStatus();

        $this->assertSame('on_time', $friday->status);
        $this->assertSame('undertime', $thursday->status);
        $this->assertEquals(7.25, $friday->hours_rendered);
        $this->assertEquals($thursday->hours_rendered, $friday->hours_rendered);
    }

    public function test_historical_friday_status_is_displayed_without_rewriting_stored_attendance(): void
    {
        $log = DtrLog::factory()->make([
            'date' => '2026-09-18',
            'pm_time_out' => '16:19:19',
            'hours_rendered' => 7.52,
            'status' => 'undertime',
        ]);

        $this->assertSame('on_time', $log->displayStatus());
        $this->assertSame('undertime', $log->status);
        $this->assertEquals(7.52, $log->hours_rendered);
    }

    public function test_saturday_absence_is_shown_as_rest_day_and_excluded_from_admin_absence_count(): void
    {
        $admin = Employee::factory()->create(['role' => 'super_admin']);
        $employee = Employee::factory()->create();
        DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-09-26',
            'am_time_in' => null,
            'am_time_out' => null,
            'pm_time_in' => null,
            'pm_time_out' => null,
            'hours_rendered' => 0,
            'status' => 'absent',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.dtr.show', ['employee' => $employee->id, 'month' => '2026-09']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/DtrShow')
                ->where('summary.days_absent', 0)
                ->where('logs', fn ($logs) => collect($logs)->firstWhere('date', '2026-09-26')['status'] === 'rest_day')
                ->etc());
    }
}
