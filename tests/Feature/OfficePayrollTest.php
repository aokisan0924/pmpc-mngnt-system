<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\PayslipController;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Services\OfficePayrollCalculator;
use Carbon\CarbonPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\BuildsWizardPayroll;
use Tests\TestCase;

class OfficePayrollTest extends TestCase
{
    use BuildsWizardPayroll;
    use RefreshDatabase;

    /** A verified staff member with a full 8-hour DTR for every weekday of Sep 1–15, 2026 (11 days). */
    private function worker(string $office = 'fort_magsaysay', array $attributes = []): Employee
    {
        $employee = Employee::factory()->create(array_replace(['date_hired' => '2026-01-01', 'daily_rate' => 600, 'transpo_allowance' => 0, 'rep_allowance' => 0, 'quarterly_allowance' => 0], $attributes));
        $employee->forceFill(['payroll_office' => $office, 'setup_completed_at' => now(), 'office_verified_at' => now()])->save();
        foreach (CarbonPeriod::create('2026-09-01', '2026-09-15') as $day) {
            if (! $day->isWeekend()) {
                DtrLog::factory()->create(['employee_id' => $employee->id, 'date' => $day->toDateString(), 'hours_rendered' => 8]);
            }
        }

        return $employee;
    }

    public function test_saved_office_pay_uses_dtr_hours_typed_allowances_and_ignores_client_totals(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = $this->worker('fort_magsaysay', ['daily_rate' => 720, 'transpo_allowance' => 1000, 'rep_allowance' => 500]);
        $deductions = array_replace(array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), ['sss_deduction' => 500, 'philhealth_deduction' => 250, 'pagibig_deduction' => 200]);

        $this->actingAs($admin)->post('/admin/payroll', $this->wizardPayload([$employee], item: ['deductions' => $deductions, 'cutoff_transpo' => 500, 'cutoff_rep' => 250, 'gross_pay' => 1, 'days_present' => 999]))
            ->assertSessionHasNoErrors()->assertRedirect();

        $item = PayrollItem::firstOrFail();
        $this->assertEquals(7920, $item->cutoff_basic);
        $this->assertEquals(8670, $item->gross_pay);
        $this->assertEquals(7720, $item->net_pay);
        $this->assertEquals(11, $item->days_present);
        $this->assertEquals(88, $item->paid_hours);
        $this->assertEquals('fort_magsaysay', $item->payroll_office);
        $this->get(route('admin.payroll.show', $item->payroll_id))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('payroll.month_key', '2026-09')
            ->where('items.0.payroll_office_label', 'Fort Magsaysay'));
    }

    public function test_reviewed_deductions_are_saved_exactly(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = $this->worker('main_office', ['cash_advance_deduction' => 1000]);
        $deductions = array_replace(array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), ['cash_advance_deduction' => 1000, 'loan_deduction' => 123.45]);

        $this->actingAs($admin)->post('/admin/payroll', $this->wizardPayload([$employee], item: ['deductions' => $deductions]))->assertSessionHasNoErrors();

        $item = PayrollItem::firstOrFail();
        $this->assertEquals(0, $item->tardiness_deduction);
        $this->assertEquals(1000, $item->cash_advance_deduction);
        $this->assertEquals(1123.45, $item->total_deductions);
        $this->assertEquals(5476.55, $item->net_pay);
        $this->assertEquals($item->net_pay, $item->payroll->total_net);
    }

    public function test_missing_deductions_and_negative_inputs_are_rejected(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = $this->worker();

        $this->actingAs($admin)->post('/admin/payroll', $this->wizardPayload([$employee], item: ['deductions' => [], 'cutoff_transpo' => -5]))
            ->assertSessionHasErrors(['items.0.deductions.sss_deduction', 'items.0.cutoff_transpo']);
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_preview_orders_by_office(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $cubao = $this->worker('cubao', ['last_name' => 'Aaron']);
        $main = $this->worker('main_office', ['last_name' => 'Zulu']);

        $this->actingAs($admin)->get(route('admin.payroll.create', ['month' => '2026-09', 'cutoff' => 'first']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('employees.0.id', $main->id)
                ->where('employees.1.id', $cubao->id));
    }

    public function test_employee_cannot_submit_office_payroll(): void
    {
        $employee = $this->worker();
        $this->actingAs($employee)->post('/admin/payroll', $this->wizardPayload([$employee]))->assertRedirect(route('employee.dashboard'));
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_payslip_data_uses_saved_amounts_without_recalculating_from_profile(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = $this->worker();
        $this->actingAs($admin)->post('/admin/payroll', $this->wizardPayload([$employee]))->assertSessionHasNoErrors();
        $employee->update(['daily_rate' => 999]);

        $method = new \ReflectionMethod(PayslipController::class, 'buildPayslipData');
        $data = $method->invoke(new PayslipController, $employee, '2026-09', []);

        $this->assertEquals(0, $data['tardiness']);
        $this->assertEquals(0, $data['total_deductions']);
        $this->assertEquals(6600, $data['net_pay']);
    }

    public function test_office_migration_can_be_rolled_back_and_reapplied_without_changing_payroll_figures(): void
    {
        $item = PayrollItem::factory()->create(['net_pay' => 1234.56]);
        $migration = require database_path('migrations/2026_10_01_000001_add_office_basis_to_payroll_items.php');
        $migration->down();
        $this->assertEquals(1234.56, $item->fresh()->net_pay);
        $migration->up();
        $this->assertNull($item->fresh()->payroll_office);
        $this->assertEquals(1234.56, $item->fresh()->net_pay);
    }

    public function test_multiple_employee_payslips_download_as_pdf(): void
    {
        $admin = Employee::factory()->superAdmin()->create(['is_staff' => false]);
        $employees = [$this->worker(), $this->worker('main_office', ['daily_rate' => 720])];
        $this->actingAs($admin)->post('/admin/payroll', $this->wizardPayload($employees))->assertSessionHasNoErrors();

        $response = $this->get('/admin/payslips/download-all?month=2026-09');
        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }
}
