<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeScheduleLookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_lookup_uses_the_row_in_effect_on_each_date(): void
    {
        $e = Employee::factory()->create();
        EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => '2026-10-01', 'type' => 'custom', 'shift_start' => '07:00', 'shift_end' => '16:00', 'work_days' => '1,2,3,4,5']);
        EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => '2026-10-17', 'type' => 'two_punch', 'shift_start' => '19:00', 'shift_end' => '07:00', 'work_days' => '0,6']);

        $this->assertNull(EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-09-30')));
        $this->assertSame([1, 2, 3, 4, 5], EmployeeSchedule::workDaysFor($e->id, Carbon::parse('2026-09-30')));
        $this->assertSame(['start' => '07:00', 'end' => '16:00', 'two_punch' => false], EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-10-16')));
        $this->assertSame(['start' => '19:00', 'end' => '07:00', 'two_punch' => true], EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-10-17')));
        $this->assertSame([0, 6], EmployeeSchedule::workDaysFor($e->id, Carbon::parse('2026-10-18')));
    }

    public function test_standard_row_keeps_global_hours_but_its_own_workdays(): void
    {
        $e = Employee::factory()->create();
        EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => '2026-10-01', 'type' => 'standard', 'work_days' => '0,6']);

        $this->assertNull(EmployeeSchedule::shiftFor($e->id, Carbon::parse('2026-10-05')));
        $this->assertSame([0, 6], EmployeeSchedule::workDaysFor($e->id, Carbon::parse('2026-10-05')));
    }

    public function test_lookup_sees_a_row_saved_after_an_earlier_lookup(): void
    {
        $e = Employee::factory()->create();
        $date = Carbon::parse('2026-10-05');
        $this->assertNull(EmployeeSchedule::shiftFor($e->id, $date));

        EmployeeSchedule::create(['employee_id' => $e->id, 'effective_from' => '2026-10-05', 'type' => 'custom', 'shift_start' => '07:00', 'shift_end' => '16:00', 'work_days' => '1,2,3,4,5']);

        $this->assertSame(['start' => '07:00', 'end' => '16:00', 'two_punch' => false], EmployeeSchedule::shiftFor($e->id, $date));
    }
}
