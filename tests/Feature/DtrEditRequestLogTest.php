<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DtrEditRequestLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_dtr_logs_show_the_edit_reason_with_original_and_requested_times(): void
    {
        $this->travelTo(Carbon::parse('2026-10-15 10:00:00', 'Asia/Manila'));
        $admin = Employee::factory()->create(['role' => 'super_admin']);
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-10-14',
            'am_time_in' => '08:00:00',
            'am_time_out' => '12:00:00',
            'pm_time_in' => null,
            'pm_time_out' => null,
        ]);

        $this->actingAs($employee)->post(route('employee.dtr.edit-request', $log), [
            'requested_am_time_in' => '08:00',
            'requested_am_time_out' => '12:00',
            'requested_pm_time_in' => '13:00',
            'requested_pm_time_out' => '17:00',
            'reason' => 'Forgot to punch in the afternoon',
        ])->assertRedirect();

        $expectEditRequest = fn (Assert $row) => $row
            ->where('edit_request.status', 'pending')
            ->where('edit_request.reason', 'Forgot to punch in the afternoon')
            ->where('edit_request.changes', [
                ['slot' => 'pm_time_in', 'label' => 'PM In', 'original' => null, 'requested' => '13:00'],
                ['slot' => 'pm_time_out', 'label' => 'PM Out', 'original' => null, 'requested' => '17:00'],
            ])
            ->etc();

        $this->actingAs($employee)->get(route('employee.dtr', ['month' => '2026-10']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employee/Dtr')
                ->where('logs', fn ($logs) => collect($logs)->firstWhere('date', '2026-10-14')['edit_request']['reason'] === 'Forgot to punch in the afternoon'));

        $this->actingAs($admin)->get(route('admin.dtr.show', ['employee' => $employee->id, 'month' => '2026-10']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/DtrShow')
                ->has('logs.13', $expectEditRequest));
    }
}
