<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Services\AttendancePunchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DtrPunchFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->startOfDay()->setTime(9, 0));
    }

    public function test_employee_can_record_first_punch_am_in(): void
    {
        $employee = Employee::factory()->create();

        $response = $this->punch($employee);

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
        $this->punch($employee);
        $log = DtrLog::where('employee_id', $employee->id)->where('date', today())->first();
        $this->assertNotNull($log->am_time_in);
        $this->assertNull($log->am_time_out);

        // Punch 2: AM Out
        $this->punch($employee);
        $log->refresh();
        $this->assertNotNull($log->am_time_out);
        $this->assertNull($log->pm_time_in);

        // Punch 3: PM In
        $this->punch($employee);
        $log->refresh();
        $this->assertNotNull($log->pm_time_in);
        $this->assertNull($log->pm_time_out);

        // Punch 4: PM Out
        $this->punch($employee);
        $log->refresh();
        $this->assertNotNull($log->pm_time_out);
        $this->assertNull($log->getNextPunchSlot());

        // Punch 5: Blocked
        $current = app(AttendancePunchService::class)->currentLog($employee);
        $response = $this->actingAs($employee)->post(route('employee.dtr.punch'), [
            'request_id' => (string) Str::uuid(),
            'expected_slot' => 'pm_time_out',
            'expected_version' => app(AttendancePunchService::class)->version($employee, $current),
        ]);
        $response->assertSessionHasErrors('punch');
    }

    public function test_admin_can_record_dtr_punch_via_admin_route(): void
    {
        $admin = Employee::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->punch($admin, route('admin.dtr.punch'));

        $response->assertRedirect();
        $log = DtrLog::where('employee_id', $admin->id)->first();
        $this->assertNotNull($log);
        $this->assertEquals(today()->toDateString(), $log->date->toDateString());
        $this->assertNotNull($log->am_time_in);
    }

    public function test_web_punch_requires_a_stable_request_and_expected_state(): void
    {
        $employee = Employee::factory()->create();

        $this->actingAs($employee)->post(route('employee.dtr.punch'), [])
            ->assertSessionHasErrors(['request_id', 'expected_slot', 'expected_version']);
        $this->assertDatabaseCount('dtr_logs', 0);
    }

    private function punch(Employee $employee, ?string $route = null): TestResponse
    {
        $service = app(AttendancePunchService::class);
        $log = $service->currentLog($employee);

        return $this->actingAs($employee)->post($route ?? route('employee.dtr.punch'), [
            'request_id' => (string) Str::uuid(),
            'expected_slot' => $log->getNextPunchSlot(),
            'expected_version' => $service->version($employee, $log),
        ]);
    }
}
