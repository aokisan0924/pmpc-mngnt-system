<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;

class OfficePayrollCalculator
{
    public const DEDUCTIONS = [
        'sss_deduction', 'philhealth_deduction', 'pagibig_deduction', 'tax_deduction',
        'loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction',
        'rental_deduction', 'electricity_deduction', 'savings_deduction', 'other_deductions',
    ];

    /** Computed step 3 numbers HR may type over (saved per payroll item, never on the employee). */
    public const OVERRIDES = [
        'days_present', 'basic_before_absence', 'nwnp_deduction', 'other_absence', 'tardiness_deduction',
        'weekday_ot_pay', 'weekend_ot_pay', 'worked_holiday_pay', 'gross_pay', 'net_pay',
    ];

    public const OFFICES = [
        'main_office' => ['label' => 'Main Office', 'days' => 11],
        'fort_magsaysay' => ['label' => 'Fort Magsaysay', 'days' => 11],
        'gen_mdse' => ['label' => 'General Merchandise', 'days' => 15],
        'cubao' => ['label' => 'Cubao Satelite Office', 'days' => 11],
    ];

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
        $fixedDays = $attendance['fixed_days'] ?? null;
        if ($fixedDays !== null) {
            // Fixed half month: unworked hours on counted days (absences, lates, NWNP holidays) come off it.
            $basicBefore = round($rate * (float) $fixedDays, 2);
            $missing = array_sum(array_map(fn (array $day): float => $day['shift_hours'] > 0 ? $rate * ($day['shift_hours'] - $day['worked_hours']) / $day['shift_hours'] : 0.0, $days));
            $basic = round(max(0.0, $basicBefore - $missing), 2);
        } else {
            $basicBefore = round($rate * (float) $attendance['days_of_work'], 2);
            $basic = round($earned, 2);
        }

        $amounts = [
            'basic_before_absence' => $basicBefore,
            'absence_deduction' => round($basicBefore - $basic, 2),
            // Unworked part of holidays (no work, no pay); already included in absence_deduction.
            // Capped at the whole absence (a short fixed basic can be smaller than the unworked holidays).
            'nwnp_deduction' => min(round($basicBefore - $basic, 2), round(array_sum(array_map(fn (array $day): float => ($day['holiday'] ?? false) && $day['shift_hours'] > 0 ? $rate * ($day['shift_hours'] - $day['worked_hours']) / $day['shift_hours'] : 0.0, $days)), 2)),
            'paid_days_basis' => (float) ($fixedDays ?? $attendance['days_of_work']),
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
            // Monthly withholding tax is split across both cutoffs, as in the October 2026 workbook.
            'tax_deduction' => round((float) $employee->tax_deduction / 2, 2),
            // October formula: daily rate / 8 / 60 x minutes late (also / 8 for 12-hour store shifts, as in October).
            'tardiness_minutes' => (float) ($attendance['tardiness_minutes'] ?? 0),
            'tardiness_deduction' => round($rate / 8 / 60 * (float) ($attendance['tardiness_minutes'] ?? 0), 2),
            'holiday_pay' => round((float) ($inputs['holiday_pay'] ?? 0), 2),
        ];
        // Rounded once, like the screen.
        $amounts['days_present'] = $rate > 0 ? round($amounts['paid_days_basis'] - ($basicBefore - $basic) / $rate, 2) : $amounts['paid_days_basis'];
        foreach (['loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction', 'rental_deduction', 'savings_deduction', 'other_deductions'] as $field) {
            $amounts[$field] = round((float) $employee->{$field} / 2, 2);
        }
        // The electricity bill changes every month: typed on step 3, never from the employee record.
        $amounts['electricity_deduction'] = 0.0;
        foreach ($inputs['deductions'] ?? [] as $field => $value) {
            if (in_array($field, self::DEDUCTIONS, true)) {
                $amounts[$field] = round((float) $value, 2);
            }
        }
        // SSS, PhilHealth and Pag-IBIG are suggested only on the 1st cutoff (above); an amount HR types on the 2nd is deducted.

        $amounts['worked_holiday_pay'] = $this->workedHolidayPay($attendance['holiday_work'] ?? [], $inputs['holiday_hours'] ?? [], $rate);

        $overrides = $inputs['overrides'] ?? [];
        $amounts = $this->totals($this->applyOverrides($amounts, $overrides, $rate));

        // A typed gross or net (agreed with the employee) never breaks the sums: the difference is a visible adjustment.
        $typedTotal = fn (string $key): ?float => isset($overrides[$key]) && $overrides[$key] !== '' ? round((float) $overrides[$key], 2) : null;
        if (($gross = $typedTotal('gross_pay')) !== null) {
            // The sheet's GROSS PAY is before Absent (Absent sits in the deductions table), so that is what HR types.
            $amounts['earnings_adjustment'] = round($gross - ($amounts['gross_pay'] + $amounts['absence_deduction'] - $amounts['nwnp_deduction']), 2);
            $amounts = $this->totals($amounts);
        }
        if (($net = $typedTotal('net_pay')) !== null) {
            $amounts['deductions_adjustment'] = round($amounts['gross_pay'] - $net - $amounts['total_deductions'], 2);
            $amounts = $this->totals($amounts);
        }

        return $amounts;
    }

    /**
     * DOLE pay for work done on holidays: hourly = daily rate / shift hours; first 8 h x m, each hour after x m x 1.30
     * (special/announced m = 1.30, rest day 1.50; regular 2.00, rest day 2.60). Only what the day's basic pay
     * does not already cover is added. Hours: the DTR's, else what HR typed for that date.
     *
     * @param  list<array{date: string, type: string, rest_day: bool, shift_hours: float, dtr_hours: ?float, paid_hours: float}>  $holidays
     * @param  array<string, mixed>  $typedHours
     */
    private function workedHolidayPay(array $holidays, array $typedHours, float $rate): float
    {
        $total = 0.0;
        foreach ($holidays as $holiday) {
            $hours = $holiday['dtr_hours'] ?? (float) ($typedHours[$holiday['date']] ?? 0);
            if ($hours <= 0 || $holiday['shift_hours'] <= 0) {
                continue;
            }
            $hourly = $rate / $holiday['shift_hours'];
            $m = $holiday['type'] === 'regular' ? ($holiday['rest_day'] ? 2.60 : 2.00) : ($holiday['rest_day'] ? 1.50 : 1.30);
            $dole = $hourly * (min($hours, 8) * $m + max($hours - 8, 0) * $m * 1.30);
            $total += max(0.0, $dole - $hourly * $holiday['paid_hours']);
        }

        return round($total, 2);
    }

    /**
     * Numbers HR typed over the system's on step 3. Each stands alone; blank or null keeps the system number.
     * Absence = NPW-Holiday + Absent, capped at basic pay (Absent first) so the Excel row still balances.
     *
     * @param  array<string, float>  $amounts
     * @param  array<string, mixed>  $overrides
     * @return array<string, float>
     */
    private function applyOverrides(array $amounts, array $overrides, float $rate): array
    {
        $typed = fn (string $key): ?float => isset($overrides[$key]) && $overrides[$key] !== '' ? round((float) $overrides[$key], 2) : null;
        $basic = $typed('basic_before_absence') ?? $amounts['basic_before_absence'];
        $nwnp = $typed('nwnp_deduction') ?? $amounts['nwnp_deduction'];
        $other = $typed('other_absence') ?? round($amounts['absence_deduction'] - $amounts['nwnp_deduction'], 2);
        $nwnp = min($nwnp, $basic);
        $other = min($other, round($basic - $nwnp, 2));
        $absence = round($nwnp + $other, 2);

        $amounts['basic_before_absence'] = $basic;
        $amounts['nwnp_deduction'] = $nwnp;
        $amounts['absence_deduction'] = $absence;
        $amounts['cutoff_basic'] = round($basic - $absence, 2);
        $amounts['absence_days'] = $rate > 0 ? round($absence / $rate, 2) : 0.0;
        $amounts['tardiness_deduction'] = $typed('tardiness_deduction') ?? $amounts['tardiness_deduction'];
        $amounts['days_present'] = $typed('days_present') ?? ($rate > 0 ? round($amounts['paid_days_basis'] - $absence / $rate, 2) : $amounts['paid_days_basis']);
        foreach (['weekday_ot_pay', 'weekend_ot_pay', 'worked_holiday_pay'] as $pesos) {
            $amounts[$pesos] = $typed($pesos) ?? $amounts[$pesos];
        }
        $amounts['earnings_adjustment'] = 0.0;
        $amounts['deductions_adjustment'] = 0.0;

        return $amounts;
    }

    /** @param  array<string, float>  $amounts
     * @return array<string, float> */
    private function totals(array $amounts): array
    {
        $amounts['cutoff_gross'] = $amounts['cutoff_basic'] + $amounts['cutoff_transpo'] + $amounts['cutoff_rep'] + $amounts['cutoff_quarterly'];
        $amounts['total_ot_pay'] = $amounts['weekday_ot_pay'] + $amounts['weekend_ot_pay'];
        $amounts['gross_pay'] = round($amounts['cutoff_gross'] + $amounts['total_ot_pay'] + $amounts['holiday_pay'] + ($amounts['worked_holiday_pay'] ?? 0.0) + ($amounts['earnings_adjustment'] ?? 0.0), 2);
        $amounts['total_deductions'] = round(array_sum(array_intersect_key($amounts, array_flip([...self::DEDUCTIONS, 'tardiness_deduction', 'deductions_adjustment']))), 2);
        $amounts['net_pay'] = round($amounts['gross_pay'] - $amounts['total_deductions'], 2);

        return $amounts;
    }
}
