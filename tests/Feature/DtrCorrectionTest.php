<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DtrCorrectionTest extends TestCase
{
    use RefreshDatabase;

    private function corrector(): Employee
    {
        return Employee::factory()->superAdmin()->create(['employee_id' => 'EMP-0002', 'is_staff' => false]);
    }

    private function url(Employee $employee): string
    {
        return route('admin.dtr.corrections.store', $employee);
    }

    public function test_corrector_fixes_an_existing_day_and_the_change_is_recorded_without_notifying(): void
    {
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-02', 'pm_time_in' => null, 'pm_time_out' => null, 'status' => 'half_day']);

        $this->actingAs($this->corrector())->post($this->url($employee), [
            'date' => '2026-09-02', 'am_time_in' => '08:00', 'am_time_out' => '12:00', 'pm_time_in' => '13:00', 'pm_time_out' => '17:00',
            'reason' => 'Final DTR check: forgot to punch in the afternoon',
        ])->assertSessionHasNoErrors();

        $log->refresh();
        $this->assertSame('on_time', $log->status);
        $this->assertSame('17:00', substr((string) $log->pm_time_out, 0, 5));
        $record = DtrEditRequest::firstOrFail();
        $this->assertSame('approved', $record->status);
        $this->assertNull($record->original_pm_time_out);
        $this->assertSame('17:00', substr((string) $record->requested_pm_time_out, 0, 5));
        $this->assertSame('Final DTR check: forgot to punch in the afternoon', $record->reason);
        $this->assertSame(0, EmployeeNotification::count());
    }

    public function test_corrector_adds_a_missing_day_and_can_mark_a_punched_day_absent(): void
    {
        $employee = Employee::factory()->create();
        $corrector = $this->corrector();

        $this->actingAs($corrector)->post($this->url($employee), [
            'date' => '2026-09-03', 'am_time_in' => '08:00', 'am_time_out' => '12:00', 'pm_time_in' => '13:00', 'pm_time_out' => '17:00', 'reason' => 'Worked but did not punch',
        ])->assertSessionHasNoErrors();
        $this->assertEquals(1, DtrLog::daysPresentBetween($employee->id, '2026-09-01', '2026-09-15'));

        $this->post($this->url($employee), ['date' => '2026-09-03', 'reason' => 'Punched in error; was absent'])->assertSessionHasNoErrors();
        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('absent', $log->status);
        $this->assertNull($log->am_time_in);
        $this->assertEquals(0, DtrLog::daysPresentBetween($employee->id, '2026-09-01', '2026-09-15'));
        $this->assertSame(2, DtrEditRequest::count());
    }

    public function test_only_the_configured_corrector_can_correct(): void
    {
        $employee = Employee::factory()->create();
        $payload = ['date' => '2026-09-02', 'am_time_in' => '08:00', 'reason' => 'test'];

        $this->actingAs(Employee::factory()->superAdmin()->create(['employee_id' => 'EMP-0099']))->post($this->url($employee), $payload)->assertForbidden();
        $this->actingAs(Employee::factory()->superAdmin()->create(['first_name' => 'Reynold', 'last_name' => 'Valdez', 'employee_id' => 'EMP-0001']))->post($this->url($employee), $payload)->assertForbidden();
        $this->actingAs($employee)->post($this->url($employee), $payload)->assertRedirect(route('employee.dashboard'));
        $this->assertSame(0, DtrLog::count());
    }

    public function test_missing_reason_future_date_and_out_of_order_times_are_rejected(): void
    {
        $employee = Employee::factory()->create();
        $this->actingAs($this->corrector());

        $this->post($this->url($employee), ['date' => '2026-09-02', 'am_time_in' => '08:00'])->assertSessionHasErrors('reason');
        $this->post($this->url($employee), ['date' => today()->addDay()->toDateString(), 'reason' => 'x'])->assertSessionHasErrors('date');
        $this->post($this->url($employee), ['date' => '2026-09-02', 'am_time_in' => '12:00', 'am_time_out' => '08:00', 'reason' => 'x'])->assertSessionHasErrors('am_time_out');
        $this->assertSame(0, DtrLog::count());
    }

    public function test_pending_employee_request_blocks_the_correction(): void
    {
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-02']);
        DtrEditRequest::create(['dtr_log_id' => $log->id, 'employee_id' => $employee->id, 'requested_am_time_in' => '08:00', 'reason' => 'Employee request', 'status' => 'pending']);

        $this->actingAs($this->corrector())->post($this->url($employee), ['date' => '2026-09-02', 'reason' => 'Mark absent'])
            ->assertSessionHasErrors('date');
        $this->assertSame('on_time', $log->fresh()->status);
    }

    public function test_dtr_page_lists_every_day_and_shares_the_correct_permission(): void
    {
        $employee = Employee::factory()->create();
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-09-02']);

        $this->actingAs($this->corrector())->get(route('admin.dtr.show', ['employee' => $employee, 'month' => '2026-09']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('logs', 30)
                ->where('auth.employee.can_correct_dtr', true)
                ->where('logs', fn ($logs) => collect($logs)->firstWhere('date', '2026-09-03')['has_entry'] === false
                    && collect($logs)->firstWhere('date', '2026-09-02')['has_entry'] === true));
    }
}
