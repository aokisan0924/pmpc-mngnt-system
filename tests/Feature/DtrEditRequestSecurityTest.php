<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DtrEditRequestSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_submit_edit_request_for_their_own_log(): void
    {
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => today()->subDay()->toDateString(),
            'am_time_in' => '08:00:00',
            'am_time_out' => '12:00:00',
            'pm_time_in' => null,
            'pm_time_out' => null,
        ]);

        $response = $this->actingAs($employee)->post(route('employee.dtr.edit-request', $log), [
            'requested_am_time_in' => '08:00',
            'requested_am_time_out' => '12:00',
            'requested_pm_time_in' => '13:00',
            'requested_pm_time_out' => '17:00',
            'reason' => 'Forgot to punch in afternoon shift due to client meeting',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('dtr_edit_requests', [
            'dtr_log_id' => $log->id,
            'employee_id' => $employee->id,
            'status' => 'pending',
            'reason' => 'Forgot to punch in afternoon shift due to client meeting',
        ]);
    }

    public function test_employee_cannot_submit_edit_request_for_another_employees_log(): void
    {
        $alice = Employee::factory()->create();
        $bob = Employee::factory()->create();

        $bobsLog = DtrLog::factory()->create([
            'employee_id' => $bob->id,
            'date' => today()->subDay()->toDateString(),
        ]);

        // Alice tries to edit Bob's DTR log (IDOR attack)
        $response = $this->actingAs($alice)->post(route('employee.dtr.edit-request', $bobsLog), [
            'requested_am_time_in' => '08:00',
            'reason' => 'Malicious edit attempt on coworker record',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('dtr_edit_requests', [
            'dtr_log_id' => $bobsLog->id,
            'employee_id' => $alice->id,
        ]);
    }

    public function test_super_admin_can_approve_edit_request(): void
    {
        $admin = Employee::factory()->create([
            'role' => 'super_admin',
            'first_name' => 'Jeffrae',
            'last_name' => 'Sapla',
        ]);
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create(['employee_id' => $employee->id]);
        $editRequest = DtrEditRequest::factory()->create([
            'dtr_log_id' => $log->id,
            'employee_id' => $employee->id,
            'status' => 'pending',
            'requested_am_time_in' => '08:00',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.edit-requests.approve', $editRequest));

        $response->assertRedirect();
        $this->assertEquals('approved', $editRequest->fresh()->status);
    }

    public function test_reynold_valdez_cannot_view_visit_approve_or_decline_dtr_edit_requests(): void
    {
        $reynold = Employee::factory()->create([
            'role' => 'super_admin',
            'first_name' => 'Reynold',
            'last_name' => 'Valdez',
        ]);
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create(['employee_id' => $employee->id]);
        $editRequest = DtrEditRequest::factory()->create([
            'dtr_log_id' => $log->id,
            'employee_id' => $employee->id,
            'status' => 'pending',
        ]);

        // Cannot visit requests index (HTTP 403)
        $responseIndex = $this->actingAs($reynold)->get(route('admin.edit-requests'));
        $responseIndex->assertStatus(403);

        // Cannot approve
        $responseApprove = $this->actingAs($reynold)->post(route('admin.edit-requests.approve', $editRequest));
        $responseApprove->assertStatus(403);
        $this->assertEquals('pending', $editRequest->fresh()->status);

        // Cannot decline
        $responseDecline = $this->actingAs($reynold)->post(route('admin.edit-requests.decline', $editRequest));
        $responseDecline->assertStatus(403);
        $this->assertEquals('pending', $editRequest->fresh()->status);
    }

    public function test_reynold_valdez_can_submit_dtr_edit_request_for_own_log(): void
    {
        $reynold = Employee::factory()->create([
            'role' => 'employee',
            'first_name' => 'Reynold',
            'last_name' => 'Valdez',
        ]);
        $log = DtrLog::factory()->create([
            'employee_id' => $reynold->id,
            'date' => today()->subDay()->toDateString(),
        ]);

        $response = $this->actingAs($reynold)->post(route('employee.dtr.edit-request', $log), [
            'requested_am_time_in' => '08:00',
            'reason' => 'Submitting correction for own log',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('dtr_edit_requests', [
            'employee_id' => $reynold->id,
            'dtr_log_id' => $log->id,
            'status' => 'pending',
            'reason' => 'Submitting correction for own log',
        ]);
    }
}
