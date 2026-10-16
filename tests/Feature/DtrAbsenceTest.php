<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DtrAbsenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 16)->setTime(9, 0));
    }

    public function test_employee_calendar_includes_missing_workdays_full_week_and_today(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-10-01']);
        $this->actingAs($employee)->get('/employee/dtr?month=2026-10')->assertInertia(fn (Assert $page) => $page
            ->has('logs', 31)->has('weeklyStrip', 7)
            ->where('logs', fn ($logs) => collect($logs)->firstWhere('date', '2026-10-15')['status'] === 'absent'
                && collect($logs)->firstWhere('date', '2026-10-16')['status'] === 'in_progress'
                && collect($logs)->firstWhere('date', '2026-10-17')['status'] === 'rest_day'
                && collect($logs)->firstWhere('date', '2026-10-19')['status'] === 'upcoming')
            ->where('summary.days_absent', 11));
        $this->assertDatabaseMissing('dtr_logs', ['employee_id' => $employee->id, 'date' => '2026-10-15']);
    }

    public function test_confirmed_absence_can_be_cancelled_before_punching_and_keeps_reason(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create(['date_hired' => '2026-01-01']);
        $this->actingAs($employee)->post('/employee/dtr/absence', [
            'date' => '2026-10-16', 'reason' => 'Personal appointment', 'confirmed' => true,
        ])->assertSessionHasNoErrors();
        $log = DtrLog::where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('absent', $log->displayStatus());
        $this->post('/employee/dtr/punch')->assertSessionHasErrors('punch');
        $this->post("/employee/dtr/{$log->id}/absence/cancel")->assertSessionHasNoErrors();
        $this->assertSame('Personal appointment', $log->fresh()->absence_reason);
        $this->assertFalse($log->fresh()->hasActiveAbsence());
        $this->post('/employee/dtr/punch')->assertSessionHasNoErrors();
        $this->assertSame('in_progress', $log->fresh()->displayStatus());
        $this->assertSame(2, $admin->notifications()->where('type', 'absence_notice')->count());
    }

    public function test_future_notice_does_not_count_as_absent_and_ownership_is_enforced(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-01-01']);
        $this->actingAs($employee)->post('/employee/dtr/absence', [
            'date' => '2026-10-19', 'reason' => 'Family appointment', 'confirmed' => true,
        ])->assertSessionHasNoErrors();
        $log = DtrLog::firstOrFail();
        $this->assertSame('planned_absence', $log->displayStatus());
        $this->assertSame(0, DtrLog::absentDaysBetween($employee->id, '2026-10-19', '2026-10-19'));
        $this->actingAs(Employee::factory()->create())->post("/employee/dtr/{$log->id}/absence/cancel")->assertForbidden();
        $this->travelTo(now()->setDate(2026, 10, 20));
        $this->assertSame('absent', $log->fresh()->displayStatus());
        $this->assertSame(1, DtrLog::absentDaysBetween($employee->id, '2026-10-19', '2026-10-19'));
    }

    public function test_absence_rejects_unconfirmed_blank_reason_past_rest_day_and_existing_punches(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-01-01']);
        $this->actingAs($employee);
        $this->post('/employee/dtr/absence', ['date' => '2026-10-16', 'reason' => '   '])->assertSessionHasErrors(['reason', 'confirmed']);
        foreach (['2026-10-15', '2026-10-17'] as $date) {
            $this->post('/employee/dtr/absence', ['date' => $date, 'reason' => 'Personal appointment', 'confirmed' => true])->assertSessionHasErrors('date');
        }
        DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => '2026-10-16', 'am_time_in' => '08:00']);
        $this->post('/employee/dtr/absence', ['date' => '2026-10-16', 'reason' => 'Personal appointment', 'confirmed' => true])->assertSessionHasErrors('date');
    }

    public function test_current_partial_pairs_stay_in_progress_and_completed_punches_keep_final_status(): void
    {
        $employee = Employee::factory()->create();
        $log = DtrLog::factory()->make(['employee_id' => $employee->id, 'date' => today(), 'status' => 'half_day',
            'am_time_in' => '08:00', 'am_time_out' => '12:00', 'pm_time_in' => null, 'pm_time_out' => null]);
        $this->assertSame('in_progress', $log->displayStatus());
        $log->pm_time_in = '13:00';
        $log->pm_time_out = '16:00';
        $log->computeHoursAndStatus();
        $this->assertSame('on_time', $log->displayStatus());
    }

    public function test_report_present_count_excludes_upcoming_days_without_changing_payroll_weighting(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-10-01', 'auto_present_weekdays' => true]);
        $this->assertSame(11.0, DtrLog::displayDaysPresentBetween($employee->id, '2026-10-01', '2026-10-31'));
        $this->assertSame(22.0, DtrLog::daysPresentBetween($employee->id, '2026-10-01', '2026-10-31'));
    }

    public function test_full_month_pdf_has_a_readable_single_page_and_shared_statuses(): void
    {
        $employee = Employee::factory()->create(['date_hired' => '2026-10-01']);
        $calendar = collect(range(1, 31))->map(function ($day) use ($employee) {
            $date = Carbon::create(2026, 10, $day);

            return ['date' => $date, 'day_name' => $date->format('D'), 'is_weekend' => ! Employee::isWorkDay($employee->id, $date),
                'am_time_in' => null, 'am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null, 'hours' => 0,
                'status' => DtrLog::fallbackStatus($employee->id, $date), 'absence_reason' => null];
        });
        $data = ['employee' => $employee, 'month' => 'October 2026', 'calendar' => $calendar,
            'summary' => ['days_present' => 0, 'days_late' => 0, 'days_absent' => 11, 'half_days' => 0, 'hours_rendered' => 0],
            'settings' => Setting::getMany(['coop_name', 'coop_address', 'signatory_1_name', 'signatory_1_role', 'signatory_2_name', 'signatory_2_role'])];
        $html = view('dtr.print', $data)->render();
        $this->assertStringContainsString('In progress', $html);
        $this->assertStringContainsString('Rest day', $html);
        $this->assertStringContainsString('Upcoming', $html);
        $pdf = Pdf::loadView('dtr.print', $data)->setPaper('a4');
        $this->assertStringStartsWith('%PDF-', $pdf->output());
        $this->assertSame(1, $pdf->getDomPDF()->getCanvas()->get_page_count());
    }
}
