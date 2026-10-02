<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;

class OfficePayrollCalculator
{
    public function compensationSignature(Employee $employee): string
    {
        return hash('sha256', implode('|', array_map(fn (string $field): string => number_format((float) $employee->{$field}, 2, '.', ''), ['daily_rate', 'transpo_allowance', 'rep_allowance', 'quarterly_allowance'])));
    }

    public const DEDUCTIONS = [
        'sss_deduction', 'philhealth_deduction', 'pagibig_deduction', 'tax_deduction',
        'loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction',
        'rental_deduction', 'savings_deduction', 'other_deductions',
    ];

    public const OFFICES = [
        'fort_magsaysay' => ['label' => 'Fort Magsaysay', 'days' => 11],
        'gen_mdse' => ['label' => 'General Merchandise', 'days' => 15],
        'cubao' => ['label' => 'Cubao Satelite Office', 'days' => 11],
    ];

    /** @return array<string, float> */
    public function calculate(Employee $employee, bool $isFirst, float $paidDays, float $absenceDays, float $weekdayHours = 0, float $weekendHours = 0, float $tardiness = 0, array $deductions = []): array
    {
        $amounts = [
            'basic_before_absence' => round((float) $employee->daily_rate * $paidDays, 2),
            'absence_deduction' => round((float) $employee->daily_rate * $absenceDays, 2),
            'days_present' => $paidDays - $absenceDays,
            'cutoff_basic' => round((float) $employee->daily_rate * ($paidDays - $absenceDays), 2),
            'cutoff_transpo' => round((float) $employee->transpo_allowance / 2, 2),
            'cutoff_rep' => round((float) $employee->rep_allowance / 2, 2),
            'cutoff_quarterly' => round((float) $employee->quarterly_allowance / 2, 2),
            'weekday_ot_pay' => round((float) $employee->daily_rate / 8 * 1.25 * $weekdayHours, 2),
            'weekend_ot_pay' => round((float) $employee->daily_rate / 8 * 1.30 * $weekendHours, 2),
            'sss_deduction' => $isFirst ? (float) $employee->sss_deduction : 0,
            'philhealth_deduction' => $isFirst ? (float) $employee->philhealth_deduction : 0,
            'pagibig_deduction' => $isFirst ? (float) $employee->pagibig_deduction : 0,
            'tax_deduction' => round((float) $employee->tax_deduction / 2, 2),
            'tardiness_deduction' => round($tardiness, 2),
        ];
        foreach (['loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction', 'rental_deduction', 'savings_deduction', 'other_deductions'] as $field) {
            $amounts[$field] = round((float) $employee->{$field} / 2, 2);
        }
        foreach ($deductions as $field => $value) {
            if (array_key_exists($field, $amounts) && ($field === 'other_deductions' || str_ends_with($field, '_deduction')) && $field !== 'tardiness_deduction') {
                $amounts[$field] = round((float) $value, 2);
            }
        }
        $amounts['absence_deduction'] = round($amounts['basic_before_absence'] - $amounts['cutoff_basic'], 2);
        $amounts['cutoff_gross'] = $amounts['cutoff_basic'] + $amounts['cutoff_transpo'] + $amounts['cutoff_rep'] + $amounts['cutoff_quarterly'];
        $amounts['total_ot_pay'] = $amounts['weekday_ot_pay'] + $amounts['weekend_ot_pay'];
        $amounts['gross_pay'] = $amounts['cutoff_gross'] + $amounts['total_ot_pay'];
        $amounts['total_deductions'] = array_sum(array_intersect_key($amounts, array_flip([...self::DEDUCTIONS, 'tardiness_deduction'])));
        $amounts['net_pay'] = $amounts['gross_pay'] - $amounts['total_deductions'];

        return $amounts;
    }
}
