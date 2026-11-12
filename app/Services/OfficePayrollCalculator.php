<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;

class OfficePayrollCalculator
{
    public function compensationSignature(Employee $employee): string
    {
        return hash('sha256', implode('|', array_map(fn (string $field): string => number_format((float) $employee->{$field}, 2, '.', ''), ['daily_rate'])));
    }

    public const DEDUCTIONS = [
        'sss_deduction', 'philhealth_deduction', 'pagibig_deduction', 'tax_deduction',
        'loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction',
        'rental_deduction', 'savings_deduction', 'other_deductions',
    ];

    public const OFFICES = [
        'main_office' => ['label' => 'Main Office', 'days' => 11],
        'fort_magsaysay' => ['label' => 'Fort Magsaysay', 'days' => 11],
        'gen_mdse' => ['label' => 'General Merchandise', 'days' => 15],
        'cubao' => ['label' => 'Cubao Satelite Office', 'days' => 11],
    ];

    /** Late deduction as in the workbook: daily rate / 8 hours / 60 minutes x minutes late. */
    public function tardinessFor(Employee $employee, float $minutes): float
    {
        return round((float) $employee->daily_rate / 8 / 60 * $minutes, 2);
    }

    /**
     * Pay from DTR hours: each counted day pays daily rate x worked / shift hours. Allowances are typed per cutoff.
     *
     * @param  array{days: list<array{shift_hours: float, worked_hours: float}>, days_of_work: float}  $attendance
     * @param  array{weekday_ot_hours?: float|int, weekend_ot_hours?: float|int, holiday_pay?: float|int, cutoff_transpo?: float|int, cutoff_rep?: float|int, cutoff_quarterly?: float|int, deductions?: array<string, float|int|string>}  $inputs
     * @return array<string, float>
     */
    public function calculateHours(Employee $employee, bool $isFirst, array $attendance, array $inputs): array
    {
        $rate = (float) $employee->daily_rate;
        $days = $attendance['days'];
        $earned = array_sum(array_map(fn (array $day): float => $day['shift_hours'] > 0 ? $rate * $day['worked_hours'] / $day['shift_hours'] : 0.0, $days));
        $hourly = $rate / ((float) (end($days)['shift_hours'] ?? 8) ?: 8.0);
        $basicBefore = round($rate * (float) $attendance['days_of_work'], 2);
        $basic = round($earned, 2);

        $amounts = [
            'basic_before_absence' => $basicBefore,
            'absence_deduction' => round($basicBefore - $basic, 2),
            'paid_days_basis' => (float) $attendance['days_of_work'],
            'absence_days' => $rate > 0 ? round(($basicBefore - $basic) / $rate, 2) : 0.0,
            'paid_hours' => round(array_sum(array_column($days, 'worked_hours')), 2),
            'scheduled_hours' => round(array_sum(array_column($days, 'shift_hours')), 2),
            'cutoff_basic' => $basic,
            'cutoff_transpo' => round((float) ($inputs['cutoff_transpo'] ?? 0), 2),
            'cutoff_rep' => round((float) ($inputs['cutoff_rep'] ?? 0), 2),
            'cutoff_quarterly' => round((float) ($inputs['cutoff_quarterly'] ?? 0), 2),
            'weekday_ot_pay' => round($hourly * 1.25 * (float) ($inputs['weekday_ot_hours'] ?? 0), 2),
            'weekend_ot_pay' => round($hourly * 1.30 * (float) ($inputs['weekend_ot_hours'] ?? 0), 2),
            'sss_deduction' => $isFirst ? (float) $employee->sss_deduction : 0.0,
            'philhealth_deduction' => $isFirst ? (float) $employee->philhealth_deduction : 0.0,
            'pagibig_deduction' => $isFirst ? (float) $employee->pagibig_deduction : 0.0,
            'tax_deduction' => $isFirst ? round((float) $employee->tax_deduction, 2) : 0.0,
            'tardiness_deduction' => 0.0,
            'holiday_pay' => round((float) ($inputs['holiday_pay'] ?? 0), 2),
        ];
        $amounts['days_present'] = round($amounts['paid_days_basis'] - $amounts['absence_days'], 2);
        foreach (['loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction', 'rental_deduction', 'savings_deduction', 'other_deductions'] as $field) {
            $amounts[$field] = round((float) $employee->{$field} / 2, 2);
        }
        foreach ($inputs['deductions'] ?? [] as $field => $value) {
            if (in_array($field, self::DEDUCTIONS, true)) {
                $amounts[$field] = round((float) $value, 2);
            }
        }

        return $this->totals($amounts);
    }

    /** @param  array<string, float>  $amounts
     * @return array<string, float> */
    private function totals(array $amounts): array
    {
        $amounts['cutoff_gross'] = $amounts['cutoff_basic'] + $amounts['cutoff_transpo'] + $amounts['cutoff_rep'] + $amounts['cutoff_quarterly'];
        $amounts['total_ot_pay'] = $amounts['weekday_ot_pay'] + $amounts['weekend_ot_pay'];
        $amounts['gross_pay'] = round($amounts['cutoff_gross'] + $amounts['total_ot_pay'] + $amounts['holiday_pay'], 2);
        $amounts['total_deductions'] = round(array_sum(array_intersect_key($amounts, array_flip([...self::DEDUCTIONS, 'tardiness_deduction']))), 2);
        $amounts['net_pay'] = round($amounts['gross_pay'] - $amounts['total_deductions'], 2);

        return $amounts;
    }

    /** @return array<string, float> */
    public function calculate(Employee $employee, bool $isFirst, float $paidDays, float $absenceDays, float $weekdayHours = 0, float $weekendHours = 0, float $tardiness = 0, array $deductions = [], float $holidayPay = 0): array
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
            // Not part of the workbook formula: entered by payroll staff as a verified peso amount.
            'holiday_pay' => round($holidayPay, 2),
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
        $amounts['gross_pay'] = $amounts['cutoff_gross'] + $amounts['total_ot_pay'] + $amounts['holiday_pay'];
        $amounts['total_deductions'] = array_sum(array_intersect_key($amounts, array_flip([...self::DEDUCTIONS, 'tardiness_deduction'])));
        $amounts['net_pay'] = $amounts['gross_pay'] - $amounts['total_deductions'];

        return $amounts;
    }
}
