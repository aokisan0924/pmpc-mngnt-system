<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Holiday;
use App\Models\Payroll;
use App\Services\ManagementPayrollExport;
use App\Services\OfficePayrollCalculator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\ReadsPayrollExport;
use Tests\TestCase;

class PayrollWizardTest extends TestCase
{
    use ReadsPayrollExport;
    use RefreshDatabase;

    private Employee $admin;

    private Employee $staff;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-14 08:00:00');
        Holiday::create(['date' => '2026-11-02', 'name' => "All Soul's Day", 'type' => 'special']);
        $this->admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $this->staff = Employee::factory()->create([
            'is_staff' => true, 'status' => 'active', 'first_name' => 'Mariel', 'last_name' => 'Lucero', 'position' => 'Bookkeeper',
            'date_hired' => '2026-01-01', 'daily_rate' => 600, 'payroll_office' => 'fort_magsaysay',
            'setup_completed_at' => now(), 'office_verified_at' => now(),
            'transpo_allowance' => 1000, 'sss_deduction' => 500, 'philhealth_deduction' => 250, 'pagibig_deduction' => 200,
            'tax_deduction' => 0, 'loan_deduction' => 0, 'capital_contribution_deduction' => 0, 'cash_advance_deduction' => 0,
            'rental_deduction' => 0, 'savings_deduction' => 0, 'other_deductions' => 0,
        ]);
        // Nov 3–13 worked except Nov 5 and 6 (absent); Nov 2 holiday not worked.
        foreach (['2026-11-03', '2026-11-04', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'] as $date) {
            DtrLog::factory()->create(['employee_id' => $this->staff->id, 'date' => $date, 'hours_rendered' => 8]);
        }
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function payload(array $item = [], array $changes = []): array
    {
        return array_replace([
            'month' => '2026-11', 'cutoff' => 'first', 'period_from' => '2026-11-02', 'period_to' => '2026-11-13', 'finalize' => false,
            'items' => [array_replace([
                'employee_id' => $this->staff->id, 'weekday_ot_hours' => 0, 'weekend_ot_hours' => 0, 'holiday_pay' => 0,
                'cutoff_transpo' => 0, 'cutoff_rep' => 0, 'cutoff_quarterly' => 0,
                'deductions' => array_replace(array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), ['sss_deduction' => 500, 'philhealth_deduction' => 250, 'pagibig_deduction' => 200]),
                'day_resolutions' => [],
            ], $item)],
        ], $changes);
    }

    public function test_create_prefills_november_dates_and_marks_holiday_nwnp(): void
    {
        $this->actingAs($this->admin)->get('/admin/payroll/create?month=2026-11&cutoff=first')
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/PayrollWizard')
                ->where('period_from', '2026-11-02')
                ->where('period_to', '2026-11-13')
                ->where('period_title', 'NOVEMBER 2 - 13, 2026')
                ->where('holidays.0.date', '2026-11-02')
                ->where('cutoff_open', false)
                ->where('employees.0.days_of_work', 10)
                // Allowances start from the employee record (monthly ÷ 2), as in the October payroll.
                ->where('employees.0.cutoff_transpo', 500)
                ->where('employees.0.deductions.sss_deduction', 500));
    }

    public function test_saving_before_cutoff_ends_counts_only_past_days(): void
    {
        Carbon::setTestNow('2026-11-13 18:00:00');
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload())->assertSessionHasNoErrors()->assertRedirect();

        // Fixed half month 600 x 11 = 6,600; Nov 13 (today) is not judged yet, so only Nov 2 (NWNP), 5 and 6 come off.
        $item = Payroll::firstOrFail()->items()->firstOrFail();
        $this->assertEquals(11, $item->paid_days_basis);
        $this->assertEquals(4800, $item->cutoff_basic);
    }

    public function test_store_recomputes_hours_and_ignores_client_money(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['cutoff_basic' => 999999, 'gross_pay' => 999999, 'cutoff_transpo' => 500]))
            ->assertRedirect();

        $item = Payroll::firstOrFail()->items()->firstOrFail();
        // Fixed half month 600 x 22 / 2 = 6,600; Nov 2 (NWNP), 5 and 6 unpaid = 1,800 off.
        $this->assertEquals(6600, $item->basic_before_absence);
        $this->assertEquals(1800, $item->absence_deduction);
        $this->assertEquals(600, $item->nwnp_deduction);
        $this->assertEquals(4800, $item->cutoff_basic);
        $this->assertEquals(500, $item->cutoff_transpo);
        $this->assertEquals(5300, $item->gross_pay);
        $this->assertEquals(4350, $item->net_pay);
        $this->assertEquals(56, $item->paid_hours);
        $this->assertSame('2026-11', Payroll::firstOrFail()->period_month);
    }

    public function test_unresolved_day_requires_a_choice(): void
    {
        DtrLog::where('employee_id', $this->staff->id)->whereDate('date', '2026-11-11')->update(['am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null, 'hours_rendered' => 0, 'status' => 'absent']);

        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload())
            ->assertSessionHasErrors(['items.0.day_resolutions' => 'Choose what to do with Nov 11 for '.$this->staff->full_name.'.']);

        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['day_resolutions' => ['2026-11-11' => ['type' => 'hours', 'hours' => 5, 'note' => 'Left early, confirmed by supervisor']]]))
            ->assertRedirect();
        $item = Payroll::firstOrFail()->items()->firstOrFail();
        // 5 of 8 hours typed for Nov 11: 3 h x 75 more off.
        $this->assertEquals(4575, $item->cutoff_basic);
        $this->assertStringContainsString('2026-11-11: Left early', (string) $item->dtr_reconciliation_note);
    }

    public function test_reopening_month_updates_the_draft_instead_of_creating_a_second(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['cutoff_transpo' => 300]));
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['cutoff_transpo' => 450]));

        $this->assertSame(1, Payroll::count());
        $this->assertSame(1, Payroll::firstOrFail()->items()->count());
        $this->actingAs($this->admin)->get('/admin/payroll/create?month=2026-11&cutoff=first')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('employees.0.cutoff_transpo', 450)->where('draft_id', Payroll::firstOrFail()->id));
    }

    public function test_save_and_finalize_locks_the_batch(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload([], ['finalize' => true]))
            ->assertSessionHas('success', 'Payroll saved and finalized.');
        $payroll = Payroll::firstOrFail();
        $this->assertTrue($payroll->isFinalized());
        $this->assertSame($this->admin->id, $payroll->finalized_by);

        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['cutoff_transpo' => 10]))
            ->assertSessionHasErrors('cutoff');
        $this->actingAs($this->admin)->get('/admin/payroll/create?month=2026-11&cutoff=first')
            ->assertRedirect(route('admin.payroll.show', $payroll->id));
    }

    public function test_employee_cannot_post_payroll(): void
    {
        $this->actingAs($this->staff)->post('/admin/payroll', $this->payload())->assertRedirect(route('employee.dashboard'));
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_dates_outside_the_cutoff_half_are_rejected(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload([], ['period_to' => '2026-11-16']))
            ->assertSessionHasErrors('period_from');
    }

    public function test_export_still_fills_template_for_hours_batch(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload());
        $path = app(ManagementPayrollExport::class)->export(Payroll::firstOrFail());

        $fort = $this->sheetCells($path, 2);
        @unlink($path);

        // October layout: days actually paid, full basic, and the absences (incl. the Nov 2 NWNP holiday,
        // as the 1st-cutoff grid has no NPW column) in that cutoff's deduction table.
        $this->assertEquals(8, $this->underHeader($fort, 0, 'DAYS OF WORK', 11));
        $this->assertEquals(6600, $this->underHeader($fort, 0, 'BASIC PAY', 11));
        $this->assertEquals(1800, $this->underHeader($fort, 3, 'ABSENT', 11));
        $this->assertEquals(3850, $this->underHeader($fort, 0, 'NET PAY', 11));
        $this->assertEquals('NOVEMBER 2 - 13, 2026', $fort['B9']);
    }

    public function test_next_cutoff_starts_after_the_saved_end_date_not_the_suggested_one(): void
    {
        Carbon::setTestNow('2026-12-01 08:00:00');
        // Saved with an edited end of Nov 12: Nov 13 must move into the 2nd cutoff, not be lost.
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload([], ['period_to' => '2026-11-12']))->assertRedirect();

        $this->get('/admin/payroll/create?month=2026-11&cutoff=second')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('window_from', '2026-11-13')->where('employees.0.days.0.date', '2026-11-13'));
    }

    public function test_extended_first_cutoff_is_not_paid_again_in_the_second(): void
    {
        Carbon::setTestNow('2026-12-01 08:00:00');
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload([], ['period_to' => '2026-11-15']))->assertRedirect();

        $this->get('/admin/payroll/create?month=2026-11&cutoff=second')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('window_from', '2026-11-16'));
    }

    public function test_start_date_always_follows_the_previous_cutoff(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload([], ['period_from' => '2026-11-05']))->assertRedirect();

        // The posted start date is ignored: Nov 2 (NWNP) to Nov 4 are still this cutoff's days, so the label must say so.
        $this->assertSame('2026-11-02', Payroll::firstOrFail()->period_from->toDateString());
    }

    public function test_mockup_excel_downloads_without_saving_anything(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['cutoff_transpo' => 100]))->assertRedirect();
        $draft = Payroll::firstOrFail();

        $response = $this->actingAs($this->admin)->postJson('/admin/payroll/mockup-export', $this->payload(['cutoff_transpo' => 999]));

        $response->assertOk();
        $this->assertStringContainsString('MOCKUP', (string) $response->headers->get('content-disposition'));
        $this->assertStringStartsWith('PK', file_get_contents($response->getFile()->getPathname()));
        // The existing draft is untouched and nothing new was saved.
        $this->assertSame(1, Payroll::count());
        $this->assertEquals(100, $draft->items()->firstOrFail()->cutoff_transpo);
    }

    public function test_mockup_excel_is_admin_only_and_validated(): void
    {
        $this->actingAs($this->staff)->postJson('/admin/payroll/mockup-export', $this->payload())->assertForbidden();
        $this->actingAs($this->admin)->postJson('/admin/payroll/mockup-export', $this->payload(['deductions' => []]))->assertStatus(422);
        $this->assertSame(0, Payroll::count());
    }

    public function test_general_merchandise_gets_calendar_days_of_the_half_month(): void
    {
        $store = Employee::factory()->create([
            'is_staff' => true, 'status' => 'active', 'department' => 'General Merchandise', 'date_hired' => '2026-01-01', 'daily_rate' => 600,
            'payroll_office' => 'main_office', 'setup_completed_at' => now(), 'office_verified_at' => now(),
        ]);
        EmployeeSchedule::create(['employee_id' => $store->id, 'effective_from' => '2026-01-01', 'type' => 'two_punch', 'shift_start' => '06:00', 'shift_end' => '18:00', 'work_days' => '0,1,2,3,4,5,6']);
        $row = fn (string $month, string $cutoff): array => collect($this->actingAs($this->admin)->get("/admin/payroll/create?month=$month&cutoff=$cutoff")->viewData('page')['props']['employees'])->firstWhere('id', $store->id);

        // 600 x 30/31: the 1st cutoff is always 15 days; the 2nd is the 16th to month end.
        $this->assertSame(15.0, $row('2026-11', 'first')['fixed_days']);
        Carbon::setTestNow('2026-12-01 08:00:00');
        $this->assertSame(15.0, $row('2026-11', 'second')['fixed_days']);
        $this->assertSame(16.0, $row('2026-10', 'second')['fixed_days']);
    }

    public function test_mockup_mode_assumes_the_rest_of_the_cutoff_present_and_never_saves(): void
    {
        Carbon::setTestNow('2026-11-10 09:00:00');
        $this->actingAs($this->admin)->get('/admin/payroll/create?month=2026-11&cutoff=first&mock=1')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('mock', true)
                ->where('employees.0.days', fn ($days) => collect($days)->where('source', 'assumed')->pluck('date')->all() === ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']));

        // A finalized batch does not block a mockup, and the mockup leaves it untouched.
        Carbon::setTestNow('2026-11-14 09:00:00');
        $this->post('/admin/payroll', $this->payload([], ['finalize' => true]))->assertRedirect();
        $this->get('/admin/payroll/create?month=2026-11&cutoff=first&mock=1')->assertOk();
        $this->postJson('/admin/payroll/mockup-export', $this->payload([], ['mock' => true]))->assertOk();
        $this->assertTrue(Payroll::firstOrFail()->isFinalized());
        $this->assertSame(1, Payroll::count());
    }

    public function test_a_real_save_ignores_the_mock_flag(): void
    {
        Carbon::setTestNow('2026-11-10 09:00:00');
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload([], ['mock' => true]))->assertRedirect();

        // Saved for real with real attendance only: Nov 3, 4, 9 and today (timed in) worked (32 h); no assumed days for Nov 11–13.
        $this->assertEquals(32, Payroll::firstOrFail()->items()->firstOrFail()->paid_hours);
    }

    public function test_typed_hours_without_a_note_get_a_plain_message(): void
    {
        DtrLog::where('employee_id', $this->staff->id)->whereDate('date', '2026-11-11')->update(['am_time_out' => null, 'pm_time_in' => null, 'pm_time_out' => null, 'hours_rendered' => 0, 'status' => 'absent']);

        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['day_resolutions' => ['2026-11-11' => ['type' => 'hours', 'hours' => 5, 'note' => '']]]))
            ->assertSessionHasErrors(['items.0.day_resolutions' => "Add a short note for {$this->staff->full_name}'s typed hours on Nov 11."]);
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['day_resolutions' => ['2026-11-11' => ['type' => 'hours', 'hours' => '', 'note' => 'Forgot to clock out']]]))
            ->assertSessionHasErrors(['items.0.day_resolutions' => "Type the hours {$this->staff->full_name} worked on Nov 11."]);
        $this->assertSame(0, Payroll::count());
    }
}
