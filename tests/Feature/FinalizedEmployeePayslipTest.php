<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Services\OfficePayrollCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class FinalizedEmployeePayslipTest extends TestCase
{
    use RefreshDatabase;

    private function item(Employee $employee, string $status, string $cutoff, float $net): PayrollItem
    {
        $batch = Payroll::factory()->create(['period_from' => $cutoff === 'first' ? '2026-09-01' : '2026-09-16', 'period_to' => $cutoff === 'first' ? '2026-09-15' : '2026-09-30', 'status' => $status, 'cutoff' => $cutoff]);

        return PayrollItem::factory()->create([...array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), 'tardiness_deduction' => 10, 'employee_id' => $employee->id, 'payroll_id' => $batch->id, 'cutoff' => $cutoff, 'net_pay' => $net, 'gross_pay' => $net + 10, 'total_deductions' => 10]);
    }

    public function test_draft_only_month_is_hidden_and_direct_pdf_returns_404(): void
    {
        $employee = Employee::factory()->create();
        $this->item($employee, 'draft', 'first', 1234);
        $this->actingAs($employee)->get('/employee/payslips')->assertInertia(fn (AssertableInertia $page) => $page->has('payslips', 0)->where('summary.total_earned', 0));
        $this->get('/employee/payslips/2026-09')->assertNotFound();
    }

    public function test_mixed_month_screen_and_pdf_include_only_finalized_cutoff(): void
    {
        $employee = Employee::factory()->create();
        $first = $this->item($employee, 'finalized', 'first', 1234);
        $second = $this->item($employee, 'draft', 'second', 9876);
        $this->actingAs($employee)->get('/employee/payslips')->assertInertia(fn (AssertableInertia $page) => $page
            ->has('payslips', 1)->where('payslips.0.has_first', true)->where('payslips.0.has_second', false)->where('payslips.0.total_net', 1234)->where('summary.total_earned', 1234));
        $pdf = \Mockery::mock(\Barryvdh\DomPDF\PDF::class);
        Pdf::shouldReceive('loadView')->once()->withArgs(fn ($view, $props) => $view === 'payslip.single' && (float) $props['data']['net_pay'] === 1234.0)->andReturn($pdf);
        $pdf->shouldReceive('setPaper')->with('a4', 'portrait')->andReturnSelf();
        $pdf->shouldReceive('download')->once()->andReturn(response('%PDF-test', 200, ['Content-Type' => 'application/pdf']));
        $this->get('/employee/payslips/2026-09')->assertOk();
        $second->payroll->update(['status' => 'finalized']);
        $this->get('/employee/payslips')->assertInertia(fn (AssertableInertia $page) => $page->where('payslips.0.has_second', true)->where('payslips.0.total_net', 11110));
    }

    public function test_admin_preview_retains_draft_access_and_employee_cannot_download_another_employee_payslip(): void
    {
        $employee = Employee::factory()->create();
        $other = Employee::factory()->create();
        $this->item($other, 'draft', 'first', 2345);
        $this->actingAs($employee)->get('/employee/payslips/2026-09')->assertNotFound();
        $this->get('/admin/payslips/'.$other->id.'/download?month=2026-09')->assertRedirect(route('employee.dashboard'));
        $this->actingAs(Employee::factory()->superAdmin()->create())->get('/admin/payslips/'.$other->id.'/download?month=2026-09')->assertOk()->assertHeader('content-type', 'application/pdf');
    }
}
