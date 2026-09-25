<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayrollItem>
 */
class PayrollItemFactory extends Factory
{
    protected $model = PayrollItem::class;

    public function definition(): array
    {
        return [
            'payroll_id' => Payroll::factory(),
            'employee_id' => Employee::factory(),
            'cutoff' => 'first',
            'days_present' => 11,
            'cutoff_basic' => 6710.00,
            'cutoff_transpo' => 0.00,
            'cutoff_rep' => 0.00,
            'cutoff_quarterly' => 0.00,
            'cutoff_gross' => 6710.00,
            'weekday_ot_hours' => 0.00,
            'weekday_ot_pay' => 0.00,
            'weekend_ot_hours' => 0.00,
            'weekend_ot_pay' => 0.00,
            'total_ot_pay' => 0.00,
            'gross_pay' => 6710.00,
            'sss_deduction' => 450.00,
            'philhealth_deduction' => 250.00,
            'pagibig_deduction' => 200.00,
            'tax_deduction' => 0.00,
            'loan_deduction' => 0.00,
            'capital_contribution_deduction' => 0.00,
            'cash_advance_deduction' => 0.00,
            'rental_deduction' => 0.00,
            'savings_deduction' => 0.00,
            'other_deductions' => 0.00,
            'total_deductions' => 900.00,
            'net_pay' => 5810.00,
        ];
    }
}
