<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\PayslipController;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Services\OfficePayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class OfficePayrollTest extends TestCase
{
    use RefreshDatabase;

    private function payload(Employee $employee, array $changes = []): array
    {
        return [
            'period_from' => '2026-09-01', 'period_to' => '2026-09-15',
            'period_label' => 'September first cutoff', 'cutoff' => 'first',
            'items' => [array_replace([
                'employee_id' => $employee->id, 'payroll_office' => 'main_office',
                'paid_days_basis' => 11, 'absence_days' => 0, 'tardiness_deduction' => 0,
                'weekday_ot_hours' => 0, 'weekend_ot_hours' => 0,
                'deductions_reviewed' => true,
                'compensation_signature' => (new OfficePayrollCalculator)->compensationSignature($employee),
                'deductions' => array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0),
            ], $changes)],
        ];
    }

    public function test_main_office_pay_does_not_require_dtr_rows_and_ignores_client_totals(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create(['daily_rate' => 720, 'transpo_allowance' => 1000, 'rep_allowance' => 500]);
        $deductions = array_replace(array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), ['sss_deduction' => 500, 'philhealth_deduction' => 250, 'pagibig_deduction' => 200]);
        $this->actingAs($admin)->post('/admin/payroll', $this->payload($employee, ['deductions' => $deductions, 'gross_pay' => 1, 'days_present' => 999]))->assertSessionHasNoErrors()->assertRedirect();
        $item = PayrollItem::firstOrFail();
        $this->assertEquals(7920, $item->cutoff_basic);
        $this->assertEquals(8670, $item->gross_pay);
        $this->assertEquals(7720, $item->net_pay);
        $this->assertEquals(11, $item->days_present);
        $this->assertEquals('main_office', $item->payroll_office);
        $this->get(route('admin.payroll.show', $item->payroll_id))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('payroll.month_key', '2026-09')
            ->where('items.0.payroll_office_label', 'Main Office'));
    }

    public function test_fort_absences_and_general_merchandise_paid_days(): void
    {
        $employee = Employee::factory()->make(['daily_rate' => 600, 'transpo_allowance' => 1000]);
        $calculator = new OfficePayrollCalculator;
        $fort = $calculator->calculate($employee, false, 11, 2.5, tardiness: 5);
        $this->assertEquals(5100, $fort['cutoff_basic']);
        $this->assertEquals(5600, $fort['gross_pay']);
        $this->assertEquals(5595, $fort['net_pay']);
        $store = $calculator->calculate(Employee::factory()->make(['daily_rate' => 600]), true, 15, 0);
        $this->assertEquals(9000, $store['cutoff_basic']);
        $casual = $calculator->calculate(Employee::factory()->make(['daily_rate' => 300]), true, 2, 0);
        $this->assertEquals(600, $casual['cutoff_basic']);
    }

    public function test_cubao_september_example_matches_both_cutoffs(): void
    {
        $employee = Employee::factory()->make([
            'daily_rate' => 1236, 'transpo_allowance' => 10000, 'rep_allowance' => 4000, 'quarterly_allowance' => 3000,
            'tax_deduction' => 850, 'sss_deduction' => 700, 'philhealth_deduction' => 347.5, 'pagibig_deduction' => 200,
            'loan_deduction' => 12683.1, 'rental_deduction' => 2000,
        ]);
        $calculator = new OfficePayrollCalculator;
        $first = $calculator->calculate($employee, true, 11, 0);
        $second = $calculator->calculate($employee, false, 11, 0);
        $this->assertEquals(22096, $first['gross_pay']);
        $this->assertEquals(9014.05, $first['total_deductions']);
        $this->assertEquals(13081.95, $first['net_pay']);
        $this->assertEquals(7766.55, $second['total_deductions']);
        $this->assertEquals(14329.45, $second['net_pay']);
    }

    public function test_reviewed_office_deductions_are_saved_exactly_including_tardiness(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create(['daily_rate' => 600, 'cash_advance_deduction' => 1000]);
        $deductions = array_replace(array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), ['cash_advance_deduction' => 1000, 'loan_deduction' => 123.45]);
        $this->actingAs($admin)->post('/admin/payroll', $this->payload($employee, ['deductions' => $deductions, 'tardiness_deduction' => 5]))->assertSessionHasNoErrors();
        $item = PayrollItem::firstOrFail();
        $this->assertEquals(1000, $item->cash_advance_deduction);
        $this->assertEquals(1128.45, $item->total_deductions);
        $this->assertEquals(5471.55, $item->net_pay);
        $this->assertEquals($item->net_pay, $item->payroll->total_net);
    }

    public function test_unreviewed_unknown_office_excess_absences_and_missing_deductions_are_rejected(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();
        $this->actingAs($admin)->post('/admin/payroll', $this->payload($employee, [
            'deductions_reviewed' => false, 'payroll_office' => 'unknown', 'absence_days' => 12, 'deductions' => [],
        ]))->assertSessionHasErrors(['items.0.deductions_reviewed', 'items.0.payroll_office', 'items.0.absence_days', 'items.0.deductions.sss_deduction']);
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_employee_cannot_submit_office_payroll(): void
    {
        $employee = Employee::factory()->create();
        $this->actingAs($employee)->post('/admin/payroll', $this->payload($employee))->assertRedirect(route('employee.dashboard'));
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_cents_are_rounded_per_component_before_totals(): void
    {
        $employee = Employee::factory()->make(['daily_rate' => 879.81, 'transpo_allowance' => 0.01, 'loan_deduction' => 0.01, 'sss_deduction' => 0, 'philhealth_deduction' => 0, 'pagibig_deduction' => 0]);
        $result = (new OfficePayrollCalculator)->calculate($employee, true, 11, 0, 0.5);
        $this->assertEquals(9677.91, $result['cutoff_basic']);
        $this->assertEquals(68.74, $result['weekday_ot_pay']);
        $this->assertEquals(9746.66, $result['gross_pay']);
        $this->assertEquals(9746.65, $result['net_pay']);
    }

    public function test_stale_compensation_preview_rolls_back_entire_batch(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create();
        $payload = $this->payload($employee);
        $employee->update(['daily_rate' => 900]);
        $this->actingAs($admin)->post('/admin/payroll', $payload)->assertSessionHasErrors('items');
        $this->assertDatabaseCount('payrolls', 0);
        $this->assertDatabaseCount('payroll_items', 0);
    }

    public function test_payslip_data_includes_saved_tardiness_without_recalculating_from_profile(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        $this->actingAs($admin)->post('/admin/payroll', $this->payload($employee, ['tardiness_deduction' => 5]))->assertSessionHasNoErrors();
        $employee->update(['daily_rate' => 999]);
        $method = new \ReflectionMethod(PayslipController::class, 'buildPayslipData');
        $data = $method->invoke(new PayslipController, $employee, '2026-09', []);
        $this->assertEquals(5, $data['tardiness']);
        $this->assertEquals(5, $data['total_deductions']);
        $this->assertEquals(6595, $data['net_pay']);
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
        $employee = Employee::factory()->create(['daily_rate' => 600]);
        $second = Employee::factory()->create(['daily_rate' => 720]);
        $payload = $this->payload($employee);
        $payload['items'][] = $this->payload($second)['items'][0];
        $this->actingAs($admin)->post('/admin/payroll', $payload)->assertSessionHasNoErrors();
        $response = $this->get('/admin/payslips/download-all?month=2026-09');
        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }
}
