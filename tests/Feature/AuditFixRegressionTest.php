<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrEditRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\Payroll;
use App\Models\Task;
use App\Services\OfficePayrollCalculator;
use App\Services\PayrollCutoffPeriod;
use App\Services\ThirteenthMonthCalculator;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AuditFixRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_employee_sessions_cannot_open_shared_dtr_routes_and_can_still_log_out(): void
    {
        $employee = Employee::factory()->inactive()->create();

        $this->actingAs($employee)
            ->get(route('employee.dtr'))
            ->assertRedirect(route('login'));

        $this->assertDatabaseMissing('dtr_logs', ['employee_id' => $employee->id]);

        $this->actingAs($employee)
            ->post(route('employee.dtr.punch'))
            ->assertRedirect(route('login'));

        $this->assertDatabaseMissing('dtr_logs', ['employee_id' => $employee->id]);

        $this->actingAs($employee)->post(route('logout'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_dashboard_weights_half_days_as_half_for_attendance_and_estimated_basic_pay(): void
    {
        $this->travelTo(Carbon::parse('2026-10-15 10:00:00', 'Asia/Manila'));
        $employee = Employee::factory()->create(['daily_rate' => 600, 'date_hired' => '2026-01-01']);
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-13', 'status' => 'on_time']);
        DtrLog::factory()->partialMorning()->create(['employee_id' => $employee->id, 'date' => '2026-10-14']);

        $this->actingAs($employee)
            ->get(route('employee.dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('summary.days_present', 1.5)
                ->where('summary.accrued_basic', 900));
    }

    public function test_dashboard_identifies_an_active_absence_notice_for_the_cancel_action(): void
    {
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => today()->toDateString(),
            'status' => 'absent',
            'am_time_in' => null,
            'am_time_out' => null,
            'pm_time_in' => null,
            'pm_time_out' => null,
            'absence_reason' => 'Family emergency',
            'absence_cancelled_at' => null,
        ]);

        $this->actingAs($employee)
            ->get(route('employee.dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('today.id', $log->id)
                ->where('today.has_active_absence', true)
                ->where('today.absence_reason', 'Family emergency'));
    }

    public function test_task_due_today_is_not_overdue_but_yesterday_is(): void
    {
        $this->travelTo(Carbon::parse('2026-10-16 08:30:00', 'Asia/Manila'));
        $employee = Employee::factory()->create();
        $today = Task::create(['employee_id' => $employee->id, 'title' => 'Due today', 'due_date' => '2026-10-16', 'priority' => 'medium', 'status' => 'pending']);
        $yesterday = Task::create(['employee_id' => $employee->id, 'title' => 'Due yesterday', 'due_date' => '2026-10-15', 'priority' => 'medium', 'status' => 'pending']);

        $this->actingAs($employee)
            ->get(route('employee.planner'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('tasks.0.id', $yesterday->id)
                ->where('tasks.0.is_overdue', true)
                ->where('tasks.1.id', $today->id)
                ->where('tasks.1.is_overdue', false));
    }

    public function test_opening_notifications_does_not_mark_them_read_and_explicit_control_does(): void
    {
        $employee = Employee::factory()->create();
        $notification = EmployeeNotification::create([
            'employee_id' => $employee->id,
            'type' => 'test',
            'title' => 'Unread item',
            'message' => 'This should remain unread after a page view.',
        ]);

        $this->actingAs($employee)
            ->get(route('employee.notifications'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('notifications.0.is_read', false));

        $this->assertNull($notification->fresh()->read_at);

        $this->post(route('employee.notifications.read-all'))->assertRedirect();
        $this->assertNotNull($notification->fresh()->read_at);

        $this->get(route('employee.notifications'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('notifications.0.is_read', true));
    }

    public function test_invalid_global_shift_order_is_rejected_without_saving_any_setting(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);

        $this->actingAs($admin)
            ->post(route('admin.settings.update'), $this->settingsPayload([
                'shift_start' => '20:00',
                'lunch_start' => '13:00',
                'lunch_end' => '12:00',
                'shift_end' => '08:00',
            ]))
            ->assertSessionHasErrors('shift_end');

        $this->assertDatabaseMissing('settings', ['key' => 'coop_name']);
        $this->assertDatabaseMissing('settings', ['key' => 'shift_start']);
    }

    public function test_valid_global_shift_settings_are_saved_as_a_group(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);

        $this->actingAs($admin)
            ->post(route('admin.settings.update'), $this->settingsPayload())
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('settings', ['key' => 'shift_start', 'value' => '08:00']);
        $this->assertDatabaseHas('settings', ['key' => 'lunch_start', 'value' => '12:00']);
        $this->assertDatabaseHas('settings', ['key' => 'lunch_end', 'value' => '13:00']);
        $this->assertDatabaseHas('settings', ['key' => 'shift_end', 'value' => '17:00']);
    }

    public function test_cutoff_periods_are_exact_for_preview_and_payroll_save(): void
    {
        $this->travelTo(Carbon::parse('2026-11-01 12:00:00'));
        $this->assertTrue(PayrollCutoffPeriod::matches('2024-02-01', '2024-02-15', 'first'));
        $this->assertTrue(PayrollCutoffPeriod::matches('2024-02-16', '2024-02-29', 'second'));
        $this->assertFalse(PayrollCutoffPeriod::matches('2024-02-01', '2024-02-15', 'second'));

        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create();
        $employee->forceFill([
            'payroll_office' => 'fort_magsaysay',
            'setup_completed_at' => now(),
            'office_verified_at' => now(),
        ])->save();

        $this->actingAs($admin)
            ->get(route('admin.payroll.create', ['period_from' => '2026-10-01', 'period_to' => '2026-10-15', 'cutoff' => 'second']))
            ->assertSessionHasErrors('period_from');

        $payload = $this->payrollPayload($employee);
        $payload['cutoff'] = 'second';
        $this->post(route('admin.payroll.store'), $payload)->assertSessionHasErrors('period_from');
        $this->assertDatabaseCount('payrolls', 0);

        $payload['period_from'] = '2026-10-16';
        $payload['period_to'] = '2026-10-31';
        $payload['period_label'] = 'October second cutoff';
        $this->post(route('admin.payroll.store'), $payload)->assertSessionHasNoErrors();
        $payroll = Payroll::firstOrFail();
        $this->assertSame('2026-10-16', $payroll->period_from->toDateString());
        $this->assertSame('2026-10-31', $payroll->period_to->toDateString());
        $this->assertSame('second', $payroll->cutoff);
    }

    public function test_login_throttles_by_normalized_login_and_ip_and_success_clears_attempts(): void
    {
        $employee = Employee::factory()->create(['email' => 'audit.login@example.test']);
        $key = 'auth.login.'.hash('sha256', 'audit.login@example.test|127.0.0.1');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post(route('login.store'), [
                'login' => $attempt % 2 === 0 ? 'AUDIT.LOGIN@example.test' : 'audit.login@example.test',
                'password' => 'wrong-password',
            ])->assertSessionHasErrors('login');
        }

        $this->assertSame(5, RateLimiter::attempts($key));
        $limited = $this->post(route('login.store'), [
            'login' => 'audit.login@example.test',
            'password' => 'wrong-password',
        ])->assertSessionHasErrors('login');
        $message = $limited->getSession()->get('errors')->get('login')[0];
        $this->assertStringContainsString('try again in', strtolower($message));

        RateLimiter::clear($key);
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->post(route('login.store'), ['login' => $employee->email, 'password' => 'wrong-password'])
                ->assertSessionHasErrors('login');
        }

        $this->post(route('login.store'), ['login' => $employee->email, 'password' => 'password123'])
            ->assertRedirect();
        $this->assertSame(0, RateLimiter::attempts($key));
    }

    public function test_draft_delete_reloads_payroll_and_preserves_a_batch_finalized_after_binding(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $payroll = Payroll::create([
            'period_label' => 'October first cutoff',
            'period_from' => '2026-10-01',
            'period_to' => '2026-10-15',
            'cutoff' => 'first',
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);
        $staleDraft = $payroll;
        DB::table('payrolls')->where('id', $payroll->id)->update([
            'status' => 'finalized',
            'finalized_by' => $admin->id,
            'finalized_at' => now(),
        ]);
        Route::bind('payroll', fn () => $staleDraft);

        $this->actingAs($admin)
            ->delete(route('admin.payroll.destroy', $payroll->id))
            ->assertSessionHasErrors('error');

        $this->assertDatabaseHas('payrolls', ['id' => $payroll->id, 'status' => 'finalized']);
    }

    public function test_dtr_reviews_reject_stale_pending_models_after_another_review_resolves_them(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->create([
            'employee_id' => $employee->id,
            'date' => '2026-10-15',
            'am_time_in' => '08:00:00',
            'am_time_out' => '12:00:00',
            'pm_time_in' => null,
            'pm_time_out' => null,
            'status' => 'half_day',
        ]);

        $approveRequest = DtrEditRequest::factory()->create([
            'dtr_log_id' => $log->id,
            'employee_id' => $employee->id,
            'status' => 'pending',
            'requested_am_time_in' => '07:00:00',
        ]);
        $staleApprove = $approveRequest;
        DB::table('dtr_edit_requests')->where('id', $approveRequest->id)->update(['status' => 'declined']);
        Route::bind('editRequest', fn () => $staleApprove);

        $this->actingAs($admin)
            ->post(route('admin.edit-requests.approve', $approveRequest->id))
            ->assertSessionHasErrors('error');

        $this->assertSame('08:00:00', $log->fresh()->am_time_in);
        $this->assertSame(0, EmployeeNotification::count());

        $declineRequest = DtrEditRequest::factory()->create([
            'dtr_log_id' => $log->id,
            'employee_id' => $employee->id,
            'status' => 'pending',
        ]);
        $staleDecline = $declineRequest;
        DB::table('dtr_edit_requests')->where('id', $declineRequest->id)->update(['status' => 'approved']);
        Route::bind('editRequest', fn () => $staleDecline);

        $this->post(route('admin.edit-requests.decline', $declineRequest->id))
            ->assertSessionHasErrors('error');

        $this->assertSame('approved', $declineRequest->fresh()->status);
        $this->assertSame(0, EmployeeNotification::count());
    }

    public function test_13th_month_auto_present_days_are_clipped_to_hire_date_and_today(): void
    {
        $this->travelTo(Carbon::parse('2026-10-16 12:00:00', 'Asia/Manila'));
        $employee = Employee::factory()->create([
            'date_hired' => '2026-08-10',
            'auto_present_weekdays' => true,
        ]);

        $days = app(ThirteenthMonthCalculator::class)->attendanceDays(
            [$employee->id],
            Carbon::parse('2026-07-01'),
            Carbon::parse('2026-12-31'),
        );

        $expected = collect(CarbonPeriod::create('2026-08-10', '2026-10-16'))
            ->filter(fn (Carbon $day): bool => Employee::isWorkDay($employee->id, $day))
            ->count();

        $this->assertSame((float) $expected, (float) $days[$employee->id]);
    }

    private function settingsPayload(array $changes = []): array
    {
        return array_replace([
            'coop_name' => 'Audit Cooperative',
            'coop_address' => 'Test address',
            'coop_email' => 'audit@example.test',
            'coop_phone' => '09123456789',
            'signatory_1_name' => 'Signatory One',
            'signatory_1_role' => 'Accounting Clerk',
            'signatory_2_name' => 'Signatory Two',
            'signatory_2_role' => 'President',
            'shift_start' => '08:00',
            'lunch_start' => '12:00',
            'lunch_end' => '13:00',
            'shift_end' => '17:00',
            'working_days_month' => 22,
            'late_grace_minutes' => 0,
        ], $changes);
    }

    private function payrollPayload(Employee $employee): array
    {
        $employee->forceFill([
            'payroll_office' => 'fort_magsaysay',
            'setup_completed_at' => now(),
            'office_verified_at' => now(),
        ])->save();

        return [
            'period_from' => '2026-10-01',
            'period_to' => '2026-10-15',
            'period_label' => 'October first cutoff',
            'cutoff' => 'first',
            'batch_reviewed' => true,
            'items' => [[
                'employee_id' => $employee->id,
                'payroll_office' => 'fort_magsaysay',
                'paid_days_basis' => 11,
                'absence_days' => 0,
                'default_paid_days_basis' => 11,
                'dtr_days_present' => 0,
                'dtr_absence_days' => 11,
                'dtr_tardiness_minutes' => 0,
                'dtr_unresolved_dates' => [],
                'attendance_override_reason' => 'Reviewed the DTR and confirmed the payroll days for this test.',
                'dtr_reconciliation_note' => 'Reviewed for audit regression coverage.',
                'weekday_ot_hours' => 0,
                'weekend_ot_hours' => 0,
                'compensation_signature' => app(OfficePayrollCalculator::class)->compensationSignature($employee),
                'deductions' => array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0),
            ]],
        ];
    }
}
