<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\Payroll;
use App\Services\ManagementPayrollExport;
use App\Services\OfficePayrollCalculator;
use Carbon\Carbon;
use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;
use ZipArchive;

class PayrollWizardTest extends TestCase
{
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
                ->where('can_save', true)
                ->where('employees.0.days_of_work', 10)
                ->where('employees.0.cutoff_transpo', 0)
                ->where('employees.0.deductions.sss_deduction', 500));
    }

    public function test_save_is_refused_before_cutoff_ends(): void
    {
        Carbon::setTestNow('2026-11-13 18:00:00');
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload())
            ->assertSessionHasErrors(['period_to' => 'You can save after Fri, Nov 13.']);
        $this->assertSame(0, Payroll::count());

        Carbon::setTestNow('2026-11-14 00:00:00');
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload())->assertRedirect();
        $this->assertSame(1, Payroll::count());
    }

    public function test_store_recomputes_hours_and_ignores_client_money(): void
    {
        $this->actingAs($this->admin)->post('/admin/payroll', $this->payload(['cutoff_basic' => 999999, 'gross_pay' => 999999, 'cutoff_transpo' => 500]))
            ->assertRedirect();

        $item = Payroll::firstOrFail()->items()->firstOrFail();
        // 10 days x 600 = 6000; Nov 2 (NWNP), 5 and 6 unpaid = 1800 absent.
        $this->assertEquals(6000, $item->basic_before_absence);
        $this->assertEquals(1800, $item->absence_deduction);
        $this->assertEquals(4200, $item->cutoff_basic);
        $this->assertEquals(500, $item->cutoff_transpo);
        $this->assertEquals(4700, $item->gross_pay);
        $this->assertEquals(3750, $item->net_pay);
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
        $this->assertEquals(3975, $item->cutoff_basic);
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

        $zip = new ZipArchive;
        $zip->open($path);
        $doc = new DOMDocument;
        $doc->loadXML($zip->getFromName('xl/worksheets/sheet2.xml'));
        $zip->close();
        @unlink($path);
        $xpath = new DOMXPath($doc);
        $xpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $cell = fn (string $ref): ?string => $xpath->query('//s:c[@r="'.$ref.'"]')->item(0)?->textContent;

        $this->assertEquals(10, $cell('D11'));
        $this->assertEquals(6000, $cell('E11'));
        $this->assertEquals(1800, $cell('G11'));
        $this->assertEquals('NOVEMBER 2 - 13, 2026', $cell('B9'));
    }
}
