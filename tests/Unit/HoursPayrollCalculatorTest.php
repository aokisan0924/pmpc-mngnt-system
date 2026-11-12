<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Employee;
use App\Services\OfficePayrollCalculator;
use Tests\TestCase;

class HoursPayrollCalculatorTest extends TestCase
{
    /** @param  list<float>  $worked */
    private function attendance(float $shift, array $worked, array $holidayIndexes = []): array
    {
        $days = [];
        foreach ($worked as $i => $hours) {
            $days[] = ['date' => sprintf('2026-11-%02d', $i + 2), 'shift_hours' => $shift, 'worked_hours' => $hours, 'holiday' => in_array($i, $holidayIndexes, true), 'source' => 'dtr'];
        }

        return ['days' => $days, 'days_of_work' => (float) count($days), 'unresolved_dates' => []];
    }

    private function inputs(array $changes = []): array
    {
        return array_replace([
            'weekday_ot_hours' => 0, 'weekend_ot_hours' => 0, 'holiday_pay' => 0,
            'cutoff_transpo' => 0, 'cutoff_rep' => 0, 'cutoff_quarterly' => 0, 'deductions' => [],
        ], $changes);
    }

    private function employee(array $attributes = []): Employee
    {
        return Employee::factory()->make(array_replace([
            'daily_rate' => 600, 'transpo_allowance' => 0, 'rep_allowance' => 0, 'quarterly_allowance' => 0,
            'sss_deduction' => 0, 'philhealth_deduction' => 0, 'pagibig_deduction' => 0, 'tax_deduction' => 0,
            'loan_deduction' => 0, 'capital_contribution_deduction' => 0, 'cash_advance_deduction' => 0,
            'rental_deduction' => 0, 'savings_deduction' => 0, 'other_deductions' => 0,
        ], $attributes));
    }

    private function calc(Employee $employee, array $attendance, array $inputs = [], bool $isFirst = true): array
    {
        return (new OfficePayrollCalculator)->calculateHours($employee, $isFirst, $attendance, $this->inputs($inputs));
    }

    public function test_holiday_not_worked_is_nwnp_in_absent(): void
    {
        $result = $this->calc($this->employee(), $this->attendance(8, [0, 8, 8, 8, 8, 8, 8, 8, 8, 8], [0]));

        $this->assertSame(6000.0, $result['basic_before_absence']);
        $this->assertSame(600.0, $result['absence_deduction']);
        // The unworked holiday is reported on its own (NPW-HOLIDAY column); it is part of absence_deduction.
        $this->assertSame(600.0, $result['nwnp_deduction']);
        $this->assertSame(5400.0, $result['cutoff_basic']);
        $this->assertSame(10.0, $result['paid_days_basis']);
    }

    public function test_mariel_example(): void
    {
        $result = $this->calc($this->employee(), $this->attendance(8, [8, 8, 0, 0, 8, 8, 8, 8, 8]));

        $this->assertSame(5400.0, $result['basic_before_absence']);
        $this->assertSame(1200.0, $result['absence_deduction']);
        $this->assertSame(0.0, $result['nwnp_deduction']);
        $this->assertSame(4200.0, $result['cutoff_basic']);
        $this->assertSame(9.0, $result['paid_days_basis']);
        $this->assertSame(2.0, $result['absence_days']);
        $this->assertSame(7.0, $result['days_present']);
        $this->assertSame(56.0, $result['paid_hours']);
        $this->assertSame(72.0, $result['scheduled_hours']);
    }

    public function test_violie_is_fifty_per_hour(): void
    {
        $full = $this->calc($this->employee(), $this->attendance(12, array_fill(0, 11, 12.0)));
        $this->assertSame(6600.0, $full['cutoff_basic']);

        $short = $this->calc($this->employee(), $this->attendance(12, [6, ...array_fill(0, 10, 12.0)]), ['weekday_ot_hours' => 2]);
        $this->assertSame(6300.0, $short['cutoff_basic']);
        $this->assertSame(125.0, $short['weekday_ot_pay']);
    }

    public function test_typed_allowances_are_used_and_profile_allowances_ignored(): void
    {
        $employee = $this->employee(['transpo_allowance' => 1000]);
        $attendance = $this->attendance(8, [8]);

        $this->assertSame(0.0, $this->calc($employee, $attendance)['cutoff_transpo']);
        $typed = $this->calc($employee, $attendance, ['cutoff_transpo' => 750]);
        $this->assertSame(750.0, $typed['cutoff_transpo']);
        $this->assertSame(1350.0, $typed['gross_pay']);
    }

    public function test_tax_is_split_and_statutory_only_on_first_cutoff(): void
    {
        $employee = $this->employee(['tax_deduction' => 850, 'sss_deduction' => 500]);
        $attendance = $this->attendance(8, [8]);

        $first = $this->calc($employee, $attendance);
        $second = $this->calc($employee, $attendance, [], false);
        // As in the October 2026 workbook: tax is split across both cutoffs, SSS & co. only on the 1st.
        $this->assertSame(425.0, $first['tax_deduction']);
        $this->assertSame(500.0, $first['sss_deduction']);
        $this->assertSame(425.0, $second['tax_deduction']);
        $this->assertSame(0.0, $second['sss_deduction']);
    }

    public function test_holiday_pay_added_to_gross_and_no_tardiness(): void
    {
        $result = $this->calc($this->employee(['rental_deduction' => 2500]), $this->attendance(8, [8, 4]), ['holiday_pay' => 390]);

        $this->assertSame(900.0, $result['cutoff_basic']);
        $this->assertSame(1290.0, $result['gross_pay']);
        $this->assertSame(0.0, $result['tardiness_deduction']);
        $this->assertSame(1250.0, $result['rental_deduction']);
        $this->assertSame(40.0, $result['net_pay']);
    }

    public function test_office_staff_get_a_fixed_half_month_minus_missing_hours(): void
    {
        // Kurt: 800 x 22 = 17,600 a month, 8,800 a cutoff. Nov 2-13 has 10 counted days: Nov 2 holiday (NWNP), one day 4 h late.
        $attendance = $this->attendance(8, [0, 8, 8, 8, 4, 8, 8, 8, 8, 8], [0]);
        $attendance['fixed_days'] = 11.0;
        $result = $this->calc($this->employee(['daily_rate' => 800]), $attendance);

        $this->assertSame(8800.0, $result['basic_before_absence']);
        $this->assertSame(1200.0, $result['absence_deduction']);
        $this->assertSame(800.0, $result['nwnp_deduction']);
        $this->assertSame(7600.0, $result['cutoff_basic']);
        $this->assertSame(11.0, $result['paid_days_basis']);
        $this->assertSame(9.5, $result['days_present']);
    }

    public function test_fixed_half_month_never_goes_below_zero(): void
    {
        $attendance = $this->attendance(8, array_fill(0, 12, 0.0));
        $attendance['fixed_days'] = 11.0;
        $result = $this->calc($this->employee(), $attendance);

        $this->assertSame(6600.0, $result['absence_deduction']);
        $this->assertSame(0.0, $result['cutoff_basic']);
    }
}
