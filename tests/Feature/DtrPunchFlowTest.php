<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DtrPunchFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_record_first_punch_am_in(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->actingAs($employee)->post(route('employee.dtr.punch'));

        $response->assertRedirect();
        $log = DtrLog::where('employee_id', $employee->id)->first();
        $this->assertNotNull($log);
        $this->assertEquals(today()->toDateString(), $log->date->toDateString());
        $this->assertNotNull($log->am_time_in);
        $this->assertNull($log->am_time_out);
    }

    public function test_employee_punch_cycles_through_four_punch_sequence(): void
    {
        $employee = Employee::factory()->create();

        // Punch 1: AM In
        $this->actingAs($employee)->post(route('employee.dtr.punch'));
        $log = DtrLog::where('employee_id', $employee->id)->where('date', today())->first();
        $this->assertNotNull($log->am_time_in);
        $this->assertNull($log->am_time_out);

        // Punch 2: AM Out
        $this->actingAs($employee)->post(route('employee.dtr.punch'));
        $log->refresh();
        $this->assertNotNull($log->am_time_out);
        $this->assertNull($log->pm_time_in);

        // Punch 3: PM In
        $this->actingAs($employee)->post(route('employee.dtr.punch'));
        $log->refresh();
        $this->assertNotNull($log->pm_time_in);
        $this->assertNull($log->pm_time_out);

        // Punch 4: PM Out
        $this->actingAs($employee)->post(route('employee.dtr.punch'));
        $log->refresh();
        $this->assertNotNull($log->pm_time_out);
        $this->assertNull($log->getNextPunchSlot());

        // Punch 5: Blocked
        $response = $this->actingAs($employee)->post(route('employee.dtr.punch'));
        $response->assertSessionHasErrors(['punch' => 'All punches for today are already recorded.']);
    }

    public function test_admin_can_record_dtr_punch_via_admin_route(): void
    {
        $admin = Employee::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.dtr.punch'));

        $response->assertRedirect();
        $log = DtrLog::where('employee_id', $admin->id)->first();
        $this->assertNotNull($log);
        $this->assertEquals(today()->toDateString(), $log->date->toDateString());
        $this->assertNotNull($log->am_time_in);
    }
}
