<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    protected static ?string $password;

    public function definition(): array
    {
        static $sequence = 1;

        return [
            'employee_id' => 'EMP-'.str_pad((string) $sequence++, 4, '0', STR_PAD_LEFT).'-'.Str::random(3),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password123'),
            'role' => 'employee',
            'is_staff' => true,
            'department' => 'Operations',
            'position' => 'Staff',
            'phone' => '09123456789',
            'address' => 'General Santos City',
            'date_hired' => now()->subYear()->toDateString(),
            'status' => 'active',
            'daily_rate' => 610.00,
            'transpo_allowance' => 0.00,
            'rep_allowance' => 0.00,
            'quarterly_allowance' => 0.00,
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
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }
}
