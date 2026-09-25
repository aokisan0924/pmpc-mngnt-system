<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCalculationTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_cutoff_applies_full_statutory_and_half_split_deductions(): void
    {
        $employee = Employee::factory()->create([
            'daily_rate' => 600.00,
            'sss_deduction' => 500.00,
            'philhealth_deduction' => 300.00,
            'pagibig_deduction' => 200.00,
            'tax_deduction' => 100.00,
            'rental_deduction' => 400.00,
            'loan_deduction' => 600.00,
        ]);

        $item = new PayrollItem([
            'days_present' => 10,
            'weekday_ot_hours' => 0,
            'weekend_ot_hours' => 0,
        ]);
        $item->employee = $employee;

        $item->computeTotals(isFirst: true);

        // Basic pay: 600 * 10 = 6000
        $this->assertEquals(6000.00, $item->cutoff_basic);
        $this->assertEquals(6000.00, $item->gross_pay);

        // Statutory deductions (full)
        $this->assertEquals(500.00, $item->sss_deduction);
        $this->assertEquals(300.00, $item->philhealth_deduction);
        $this->assertEquals(200.00, $item->pagibig_deduction);
        $this->assertEquals(100.00, $item->tax_deduction);

        // Split deductions (half)
        $this->assertEquals(200.00, $item->rental_deduction);
        $this->assertEquals(300.00, $item->loan_deduction);

        // Total deductions: 500 + 300 + 200 + 100 + 200 + 300 = 1600
        $this->assertEquals(1600.00, $item->total_deductions);
        $this->assertEquals(4400.00, $item->net_pay);
    }

    public function test_second_cutoff_waives_statutory_deductions(): void
    {
        $employee = Employee::factory()->create([
            'daily_rate' => 600.00,
            'sss_deduction' => 500.00,
            'philhealth_deduction' => 300.00,
            'pagibig_deduction' => 200.00,
            'tax_deduction' => 100.00,
            'rental_deduction' => 400.00,
            'loan_deduction' => 600.00,
        ]);

        $item = new PayrollItem([
            'days_present' => 10,
            'weekday_ot_hours' => 0,
            'weekend_ot_hours' => 0,
        ]);
        $item->employee = $employee;

        $item->computeTotals(isFirst: false);

        // Basic pay: 600 * 10 = 6000
        $this->assertEquals(6000.00, $item->cutoff_basic);
        $this->assertEquals(6000.00, $item->gross_pay);

        // Statutory deductions waived on 2nd cutoff
        $this->assertEquals(0.00, $item->sss_deduction);
        $this->assertEquals(0.00, $item->philhealth_deduction);
        $this->assertEquals(0.00, $item->pagibig_deduction);
        $this->assertEquals(0.00, $item->tax_deduction);

        // Split deductions (half)
        $this->assertEquals(200.00, $item->rental_deduction);
        $this->assertEquals(300.00, $item->loan_deduction);

        // Total deductions: 200 + 300 = 500
        $this->assertEquals(500.00, $item->total_deductions);
        $this->assertEquals(5500.00, $item->net_pay);
    }

    public function test_admin_can_discard_draft_payroll_batch(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $payroll = Payroll::factory()->create([
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);
        PayrollItem::factory()->create(['payroll_id' => $payroll->id]);

        $response = $this->actingAs($admin)->delete(route('admin.payroll.destroy', $payroll));

        $response->assertRedirect(route('admin.payroll'));
        $this->assertDatabaseMissing('payrolls', ['id' => $payroll->id]);
        $this->assertDatabaseMissing('payroll_items', ['payroll_id' => $payroll->id]);
    }

    public function test_admin_cannot_discard_finalized_payroll_batch(): void
    {
        $admin = Employee::factory()->superAdmin()->create();
        $payroll = Payroll::factory()->finalized()->create([
            'created_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->delete(route('admin.payroll.destroy', $payroll));

        $response->assertSessionHasErrors(['error' => 'Finalized payroll batches cannot be discarded or deleted.']);
        $this->assertDatabaseHas('payrolls', ['id' => $payroll->id]);
    }
}
