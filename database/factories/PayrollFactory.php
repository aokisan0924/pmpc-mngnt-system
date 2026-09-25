<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Payroll;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payroll>
 */
class PayrollFactory extends Factory
{
    protected $model = Payroll::class;

    public function definition(): array
    {
        return [
            'period_label' => 'July 01 - July 15, 2026',
            'period_from' => '2026-07-01',
            'period_to' => '2026-07-15',
            'cutoff' => 'first',
            'status' => 'draft',
            'total_gross' => 15000.00,
            'total_deductions' => 1000.00,
            'total_net' => 14000.00,
            'created_by' => Employee::factory()->superAdmin(),
        ];
    }

    public function finalized(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'finalized',
        ]);
    }
}
