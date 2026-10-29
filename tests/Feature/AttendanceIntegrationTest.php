<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AttendanceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-workforce-genmdse-secret';

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->startOfDay()->setTime(9, 0));
        config()->set('integrations.genmdse.token', self::TOKEN);
        config()->set('integrations.genmdse.employee_ids', []);
    }

    public function test_missing_integration_secret_fails_closed(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        config()->set('integrations.genmdse.token', '');

        $this->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertUnauthorized();

        config()->set('integrations.genmdse.token', 'rotated-secret');
        $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertUnauthorized();
    }

    public function test_employee_allowlist_and_active_status_are_enforced(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', []);

        $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertForbidden();

        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $employee->update(['status' => 'inactive']);

        $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertForbidden();
    }

    public function test_attendance_read_returns_narrow_state_without_creating_a_log(): void
    {
        $employee = Employee::factory()->create(['daily_rate' => 1200, 'email' => 'private@example.test']);
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);

        $response = $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertOk()
            ->assertJsonStructure(['employee' => ['id', 'name'], 'today', 'next_punch', 'version', 'logs', 'two_punch', 'fetched_at'])
            ->assertJsonMissingPath('employee.email')
            ->assertJsonMissingPath('employee.daily_rate');

        $response->assertExactJsonStructure([
            'employee' => ['id', 'name'],
            'today' => ['id', 'date', 'am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out', 'hours_rendered', 'status', 'two_punch'],
            'next_punch', 'version', 'logs', 'two_punch', 'fetched_at',
        ]);
        $attendanceFields = ['id', 'date', 'am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out', 'hours_rendered', 'status', 'two_punch'];
        $this->assertSame($attendanceFields, array_keys($response->json('today')));
        foreach ($response->json('logs') as $log) {
            $this->assertSame($attendanceFields, array_keys($log));
        }
        $this->assertDatabaseCount('dtr_logs', 0);
    }

    public function test_current_shift_layout_is_not_inferred_from_mixed_month_history(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        EmployeeSchedule::create([
            'employee_id' => $employee->id, 'effective_from' => today()->subDays(2)->toDateString(), 'type' => 'two_punch',
            'shift_start' => '08:00', 'shift_end' => '20:00', 'work_days' => '1,2,3,4,5,6,0',
        ]);
        EmployeeSchedule::create([
            'employee_id' => $employee->id, 'effective_from' => today()->subDay()->toDateString(), 'type' => 'standard',
            'shift_start' => '08:00', 'shift_end' => '17:00', 'work_days' => '1,2,3,4,5,6,0',
        ]);
        DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => today()->subDays(2),
            'status' => 'on_time',
            'am_time_in' => '08:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => '20:00',
        ]);
        DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => today()->subDay(),
            'status' => 'on_time',
            'am_time_in' => '08:00', 'am_time_out' => '12:00', 'pm_time_in' => '13:00', 'pm_time_out' => '17:00',
        ]);
        EmployeeSchedule::create([
            'employee_id' => $employee->id, 'effective_from' => today()->toDateString(), 'type' => 'two_punch',
            'shift_start' => '08:00', 'shift_end' => '20:00', 'work_days' => '1,2,3,4,5,6,0',
        ]);

        $state = $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertOk()->json();

        $this->assertTrue($state['two_punch']);
        $this->assertSame([true, false], collect($state['logs'])->pluck('two_punch')->all());
        $this->assertSame('am_time_in', $state['next_punch']);
    }

    public function test_stale_punch_after_hr_correction_does_not_overwrite_corrected_attendance(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $state = $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertOk()->json();

        $hr = Employee::factory()->superAdmin()->create(['employee_id' => 'EMP-0002', 'is_staff' => false]);
        $this->actingAs($hr)->post(route('admin.dtr.corrections.store', $employee), [
            'date' => today()->toDateString(), 'am_time_in' => '08:00', 'reason' => 'Corrected before punch submitted',
        ])->assertSessionHasNoErrors();

        $this->withToken(self::TOKEN)->postJson("/api/integrations/genmdse/v1/employees/{$employee->id}/punch", [
            'request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version'],
        ])->assertStatus(409);
        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('08:00', substr((string) $log->am_time_in, 0, 5));
        $this->assertNull($log->am_time_out);
    }

    public function test_stale_punch_after_approved_edit_does_not_overwrite_approved_attendance(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $log = DtrLog::factory()->create([
            'employee_id' => $employee->id, 'date' => today(), 'status' => 'half_day',
            'am_time_in' => '07:55:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null,
        ]);
        $editRequest = DtrEditRequest::factory()->create([
            'dtr_log_id' => $log->id, 'employee_id' => $employee->id, 'status' => 'pending',
            'requested_am_time_in' => '08:05:00', 'requested_am_time_out' => null,
            'requested_pm_time_in' => null, 'requested_pm_time_out' => null,
        ]);
        $state = $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertOk()->json();

        $admin = Employee::factory()->superAdmin()->create();
        $this->actingAs($admin)->post(route('admin.edit-requests.approve', $editRequest))->assertRedirect();

        $this->withToken(self::TOKEN)->postJson("/api/integrations/genmdse/v1/employees/{$employee->id}/punch", [
            'request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version'],
        ])->assertStatus(409);
        $this->assertSame('08:05', substr((string) $log->fresh()->am_time_in, 0, 5));
        $this->assertNull($log->fresh()->am_time_out);
    }

    public function test_attendance_read_requires_a_valid_month(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);

        $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=October")
            ->assertUnprocessable();
        $this->assertDatabaseCount('dtr_logs', 0);
    }

    public function test_punch_replay_returns_original_result_and_payload_reuse_conflicts(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $headers = ['Authorization' => 'Bearer '.self::TOKEN];
        $url = "/api/integrations/genmdse/v1/employees/{$employee->id}";
        $state = $this->withHeaders($headers)->getJson($url.'/attendance?month='.now()->format('Y-m'))->assertOk()->json();
        $request = ['request_id' => (string) Str::uuid(), 'expected_slot' => 'am_time_in', 'expected_version' => $state['version']];

        $first = $this->withHeaders($headers)->postJson($url.'/punch', $request)->assertOk()->json();
        $this->withHeaders($headers)->postJson($url.'/punch', $request)->assertOk()->assertExactJson($first);
        $this->withHeaders($headers)->postJson($url.'/punch', [...$request, 'expected_slot' => 'am_time_out'])
            ->assertStatus(409);

        $this->assertSame(1, DtrLog::where('employee_id', $employee->id)->firstOrFail()->punchesCount());
    }

    public function test_stale_expected_slot_and_version_cannot_advance_a_second_punch(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $headers = ['Authorization' => 'Bearer '.self::TOKEN];
        $url = "/api/integrations/genmdse/v1/employees/{$employee->id}";
        $state = $this->withHeaders($headers)->getJson($url.'/attendance?month='.now()->format('Y-m'))->assertOk()->json();
        $this->withHeaders($headers)->postJson($url.'/punch', [
            'request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version'],
        ])->assertOk();

        $this->withHeaders($headers)->postJson($url.'/punch', [
            'request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version'],
        ])->assertStatus(409);
        $this->assertSame(1, DtrLog::where('employee_id', $employee->id)->firstOrFail()->punchesCount());
    }

    public function test_invalid_api_punch_payload_is_rejected(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);

        $this->withToken(self::TOKEN)
            ->postJson("/api/integrations/genmdse/v1/employees/{$employee->id}/punch", [])
            ->assertUnprocessable();
        $this->assertDatabaseCount('dtr_logs', 0);
    }

    public function test_attendance_api_is_limited_to_sixty_requests_per_employee_per_minute(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $url = "/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m');

        for ($request = 0; $request < 60; $request++) {
            $this->withToken(self::TOKEN)->getJson($url)->assertOk();
        }

        $this->withToken(self::TOKEN)->getJson($url)->assertStatus(429);
        $this->assertDatabaseCount('dtr_logs', 0);
    }

    public function test_web_and_integration_punches_share_expected_state_and_reject_stale_cross_surface_state(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $headers = ['Authorization' => 'Bearer '.self::TOKEN];
        $url = "/api/integrations/genmdse/v1/employees/{$employee->id}";
        $state = $this->withHeaders($headers)->getJson($url.'/attendance?month='.now()->format('Y-m'))->assertOk()->json();
        $payload = ['request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version']];

        $this->withHeaders($headers)->postJson($url.'/punch', $payload)->assertOk();
        $this->actingAs($employee)->post(route('employee.dtr.punch'), [...$payload, 'request_id' => (string) Str::uuid()])->assertSessionHasErrors('punch');
        $this->assertSame(1, DtrLog::where('employee_id', $employee->id)->firstOrFail()->punchesCount());
    }

    public function test_active_absence_notice_blocks_api_punch_without_creating_a_punch(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => today(),
            'status' => 'absent',
            'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null,
            'absence_reason' => 'Scheduled absence',
        ]);
        $state = $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertOk()->json();

        $this->withToken(self::TOKEN)->postJson("/api/integrations/genmdse/v1/employees/{$employee->id}/punch", [
            'request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version'],
        ])->assertUnprocessable();
        $this->assertSame(0, DtrLog::where('employee_id', $employee->id)->firstOrFail()->punchesCount());
    }

    public function test_overnight_two_punch_clock_out_closes_the_previous_days_log(): void
    {
        $employee = Employee::factory()->create();
        config()->set('integrations.genmdse.employee_ids', [$employee->id]);
        $yesterday = today()->subDay();
        EmployeeSchedule::create([
            'employee_id' => $employee->id, 'effective_from' => $yesterday->toDateString(), 'type' => 'two_punch',
            'shift_start' => '19:00', 'shift_end' => '07:00', 'work_days' => '0,1,2,3,4,5,6',
        ]);
        $log = DtrLog::factory()->create([
            'employee_id' => $employee->id, 'date' => $yesterday->toDateString(),
            'status' => 'absent', 'am_time_in' => '19:04:00', 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null,
        ]);
        $this->travelTo(today()->setTime(7, 30));
        $state = $this->withToken(self::TOKEN)
            ->getJson("/api/integrations/genmdse/v1/employees/{$employee->id}/attendance?month=".now()->format('Y-m'))
            ->assertOk()->json();

        $this->assertSame('pm_time_out', $state['next_punch']);
        $this->assertSame($yesterday->toDateString(), $state['today']['date']);
        $this->withToken(self::TOKEN)->postJson("/api/integrations/genmdse/v1/employees/{$employee->id}/punch", [
            'request_id' => (string) Str::uuid(), 'expected_slot' => $state['next_punch'], 'expected_version' => $state['version'],
        ])->assertOk();
        $this->assertNotNull($log->fresh()->pm_time_out);
    }
}
