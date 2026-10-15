<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Tests\TestCase;

class PayslipPdfRenderingTest extends TestCase
{
    public function test_single_payslip_stays_on_one_page_for_either_or_both_cutoffs(): void
    {
        foreach (['first', 'second', 'both'] as $cutoffs) {
            $pdf = Pdf::loadView('payslip.single', [
                'data' => $this->payslip($cutoffs),
                'settings' => $this->settings(),
            ])->setPaper('a4', 'portrait');

            $this->assertStringStartsWith('%PDF-', $pdf->output());
            $this->assertSame(1, $pdf->getDomPDF()->getCanvas()->get_page_count(), $cutoffs);
        }
    }

    public function test_bulk_payslips_render_one_page_per_employee_without_function_redeclaration(): void
    {
        $pdf = Pdf::loadView('payslip.all', [
            'payslips' => collect(range(1, 10))->map(fn (int $index): array => $this->payslip('both', $index)),
            'settings' => $this->settings(),
            'month' => 'September 2026',
        ])->setPaper('a4', 'portrait');

        $this->assertStringStartsWith('%PDF-', $pdf->output());
        $this->assertSame(10, $pdf->getDomPDF()->getCanvas()->get_page_count());
    }

    private function settings(): array
    {
        return [
            'coop_name' => "People's Multi-Purpose Cooperative",
            'coop_address' => 'Gamu, Isabela',
            'signatory_1_name' => 'Payroll reviewer',
            'signatory_1_role' => 'Accounting',
            'signatory_1_signature' => null,
            'signatory_2_name' => 'Payroll approver',
            'signatory_2_role' => 'Management',
            'signatory_2_signature' => null,
        ];
    }

    private function payslip(string $cutoffs, int $index = 1): array
    {
        $data = [
            'employee' => Employee::factory()->make(['employee_id' => "PDF-{$index}", 'daily_rate' => 600]),
            'month' => 'September 2026',
            'daily_rate' => 600,
            'first_period' => $cutoffs === 'second' ? null : 'Sep 01 – Sep 15, 2026',
            'second_period' => $cutoffs === 'first' ? null : 'Sep 16 – Sep 30, 2026',
            'sss' => 500, 'philhealth' => 250, 'pagibig' => 200, 'tax' => 100,
            'loan' => 300, 'capital_contribution' => 100, 'cash_advance' => 50,
            'rental' => 200, 'savings' => 250, 'other' => 20, 'tardiness' => 10,
            'govt_subtotal' => 1050, 'other_subtotal' => 930, 'total_deductions' => 1980,
        ];

        foreach (['first', 'second'] as $cutoff) {
            $present = $data["{$cutoff}_period"] !== null;
            foreach (['basic' => 6000, 'transpo' => 500, 'rep' => 250, 'quarterly' => 100,
                'ot_weekday' => 50, 'ot_weekend' => 65, 'gross' => 6965, 'days_worked' => 10] as $field => $value) {
                $data["{$cutoff}_{$field}"] = $present ? $value : 0;
            }
        }

        $data['total_days_worked'] = $data['first_days_worked'] + $data['second_days_worked'];
        $data['total_gross'] = $data['first_gross'] + $data['second_gross'];
        $data['net_pay'] = $data['total_gross'] - $data['total_deductions'];

        return $data;
    }
}
