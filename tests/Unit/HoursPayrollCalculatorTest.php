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

    public function test_tardiness_uses_the_october_formula(): void
    {
        // Kurt, 4 minutes late: 800 / 8 / 60 x 4 = 6.67 (October 2nd cutoff). Gen Mdse also uses / 8, as in October.
        $attendance = $this->attendance(8, [8, 8]);
        $attendance['fixed_days'] = 11.0;
        $attendance['tardiness_minutes'] = 4.0;
        $kurt = $this->calc($this->employee(['daily_rate' => 800]), $attendance);
        $this->assertSame(6.67, $kurt['tardiness_deduction']);
        $this->assertSame(4.0, $kurt['tardiness_minutes']);
        $this->assertSame(8800.0, $kurt['cutoff_basic']);
        $this->assertSame(6.67, $kurt['total_deductions']);

        $store = $this->attendance(12, [12]);
        $store['tardiness_minutes'] = 15.0;
        $this->assertSame(18.75, $this->calc($this->employee(), $store)['tardiness_deduction']);
    }

    public function test_holiday_part_never_exceeds_the_absence_and_days_present_round_once(): void
    {
        // One fixed day, two unworked holidays: only one day's pay can come off, all of it NWNP.
        $attendance = $this->attendance(8, [0, 0], [0, 1]);
        $attendance['fixed_days'] = 1.0;
        $result = $this->calc($this->employee(), $attendance);
        $this->assertSame(600.0, $result['absence_deduction']);
        $this->assertSame(600.0, $result['nwnp_deduction']);

        // 879.81 a day, 11 days, 1 hour missing (109.98 off): 11 - 109.98 / 879.81 = 10.874997 -> 10.87, rounded once as on screen.
        $attendance = $this->attendance(8, [7, ...array_fill(0, 10, 8.0)]);
        $attendance['fixed_days'] = 11.0;
        $this->assertSame(10.87, $this->calc($this->employee(['daily_rate' => 879.81]), $attendance)['days_present']);
    }

    public function test_second_cutoff_typed_sss_is_deducted(): void
    {
        // Kurt, 2026-11-13: the 2nd cutoff starts at 0, but an amount HR types is deducted.
        $employee = $this->employee(['sss_deduction' => 500]);
        $this->assertSame(0.0, $this->calc($employee, $this->attendance(8, [8]), [], false)['sss_deduction']);
        $result = $this->calc($employee, $this->attendance(8, [8]), ['deductions' => ['sss_deduction' => 450, 'philhealth_deduction' => 250, 'pagibig_deduction' => 200, 'loan_deduction' => 100]], false);

        $this->assertSame(450.0, $result['sss_deduction']);
        $this->assertSame(250.0, $result['philhealth_deduction']);
        $this->assertSame(200.0, $result['pagibig_deduction']);
        $this->assertSame(1000.0, $result['total_deductions']);
    }

    /** Rate 600, fixed 11 days, one 8 h absence: basic 6600, absence 600, cutoff basic 6000. */
    private function oneAbsence(array $overrides): array
    {
        $attendance = $this->attendance(8, [8, 0, 8, 8, 8, 8, 8, 8, 8, 8]);
        $attendance['fixed_days'] = 11.0;

        return $this->calc($this->employee(), $attendance, ['overrides' => $overrides, 'deductions' => ['tax_deduction' => 0]]);
    }

    public function test_typed_basic_pay_replaces_only_basic(): void
    {
        $result = $this->oneAbsence(['basic_before_absence' => 7000]);

        $this->assertSame(7000.0, $result['basic_before_absence']);
        $this->assertSame(600.0, $result['absence_deduction']);
        $this->assertSame(6400.0, $result['cutoff_basic']);
        $this->assertSame(6400.0, $result['gross_pay']);
    }

    public function test_typed_absent_and_npw_set_absence(): void
    {
        $result = $this->oneAbsence(['nwnp_deduction' => 0, 'other_absence' => 300]);

        $this->assertSame(300.0, $result['absence_deduction']);
        $this->assertSame(0.0, $result['nwnp_deduction']);
        $this->assertSame(6300.0, $result['cutoff_basic']);
        $this->assertSame(0.5, $result['absence_days']);
    }

    public function test_typed_late_replaces_tardiness_amount(): void
    {
        $attendance = $this->attendance(8, [8]);
        $attendance['tardiness_minutes'] = 30.0;
        $result = $this->calc($this->employee(), $attendance, ['overrides' => ['tardiness_deduction' => 50]]);

        $this->assertSame(50.0, $result['tardiness_deduction']);
        $this->assertSame(30.0, $result['tardiness_minutes']);
        $this->assertSame(50.0, $result['total_deductions']);
    }

    public function test_typed_days_present_is_shown_as_typed(): void
    {
        $this->assertSame(10.5, $this->oneAbsence(['days_present' => 10.5])['days_present']);
        $this->assertSame(10.0, $this->oneAbsence([])['days_present']);
    }

    public function test_typed_basic_below_absence_caps_the_absence(): void
    {
        $result = $this->oneAbsence(['basic_before_absence' => 500]);

        $this->assertSame(0.0, $result['cutoff_basic']);
        $this->assertSame(500.0, $result['absence_deduction']);
    }

    public function test_no_overrides_change_nothing(): void
    {
        $result = $this->oneAbsence([]);

        $this->assertSame([6600.0, 600.0, 6000.0, 0.0], [$result['basic_before_absence'], $result['absence_deduction'], $result['cutoff_basic'], $result['nwnp_deduction']]);
    }

    /** @param  list<array{0: string, 1: string, 2: bool, 3: float, 4: ?float, 5: float}>  $holidays  date, type, rest day, shift, DTR hours, paid hours */
    private function holidayWork(array $holidays, array $typed = [], float $rate = 600): array
    {
        $attendance = $this->attendance(8, [8]);
        $attendance['holiday_work'] = array_map(fn (array $h): array => ['date' => $h[0], 'type' => $h[1], 'rest_day' => $h[2], 'shift_hours' => $h[3], 'dtr_hours' => $h[4], 'paid_hours' => $h[5]], $holidays);

        return $this->calc($this->employee(['daily_rate' => $rate]), $attendance, ['holiday_hours' => $typed]);
    }

    public function test_merchandise_worker_on_special_day_gets_the_difference(): void
    {
        // 600 / 12 = 50 an hour; DOLE 50 x (8 x 1.30 + 4 x 1.30 x 1.30) = 858; already paid 12 x 50 = 600.
        $result = $this->holidayWork([['2026-11-02', 'special', false, 12.0, 12.0, 12.0]]);

        $this->assertSame(258.0, $result['worked_holiday_pay']);
        $this->assertSame(858.0, $result['gross_pay']);
    }

    public function test_office_worker_cut_as_nwnp_gets_full_dole_amount_for_typed_hours(): void
    {
        $result = $this->holidayWork([['2026-11-02', 'special', false, 8.0, null, 0.0]], ['2026-11-02' => 4]);

        $this->assertSame(390.0, $result['worked_holiday_pay']);
    }

    public function test_rest_day_holiday_work_pays_full_rest_day_rate(): void
    {
        $this->assertSame(900.0, $this->holidayWork([['2026-11-07', 'special', true, 8.0, null, 0.0]], ['2026-11-07' => 8])['worked_holiday_pay']);
    }

    public function test_two_holidays_use_their_own_rates(): void
    {
        $result = $this->holidayWork([['2026-11-30', 'regular', false, 8.0, null, 0.0], ['2026-11-02', 'special', false, 8.0, null, 0.0]], ['2026-11-30' => 8, '2026-11-02' => 8]);

        $this->assertSame(1980.0, $result['worked_holiday_pay']);
    }

    public function test_overtime_hours_on_a_holiday(): void
    {
        $this->assertSame(1033.5, $this->holidayWork([['2026-11-02', 'special', false, 8.0, null, 0.0]], ['2026-11-02' => 10])['worked_holiday_pay']);
    }

    public function test_dtr_hours_win_over_typed_hours_and_no_work_means_no_pay(): void
    {
        $this->assertSame(258.0, $this->holidayWork([['2026-11-02', 'special', false, 12.0, 12.0, 12.0]], ['2026-11-02' => 2])['worked_holiday_pay']);
        $this->assertSame(0.0, $this->holidayWork([['2026-11-02', 'special', false, 8.0, null, 0.0]])['worked_holiday_pay']);
    }

    /** One 8 h day at 600: gross 600, no deductions. */
    private function oneDay(array $overrides): array
    {
        return $this->calc($this->employee(), $this->attendance(8, [8]), ['overrides' => $overrides, 'weekday_ot_hours' => 2]);
    }

    public function test_typed_overtime_and_holiday_work_pay_replace_the_system_pesos(): void
    {
        $result = $this->oneDay(['weekday_ot_pay' => 1000, 'weekend_ot_pay' => 50, 'worked_holiday_pay' => 300]);

        $this->assertSame(1000.0, $result['weekday_ot_pay']);
        $this->assertSame(50.0, $result['weekend_ot_pay']);
        $this->assertSame(1050.0, $result['total_ot_pay']);
        $this->assertSame(300.0, $result['worked_holiday_pay']);
        $this->assertSame(1950.0, $result['gross_pay']);
        $this->assertSame(0.0, $result['earnings_adjustment']);
    }

    public function test_typed_gross_adds_an_earnings_adjustment(): void
    {
        // System gross: 600 basic + 2 h x 75 x 1.25 = 787.50.
        $result = $this->oneDay(['gross_pay' => 1000]);

        $this->assertSame(212.5, $result['earnings_adjustment']);
        $this->assertSame(1000.0, $result['gross_pay']);
        $this->assertSame(1000.0, $result['net_pay']);
    }

    public function test_typed_net_adds_a_deductions_adjustment_that_can_be_negative(): void
    {
        $lower = $this->oneDay(['net_pay' => 700]);
        $this->assertSame(87.5, $lower['deductions_adjustment']);
        $this->assertSame(87.5, $lower['total_deductions']);
        $this->assertSame(700.0, $lower['net_pay']);

        $higher = $this->oneDay(['net_pay' => 800]);
        $this->assertSame(-12.5, $higher['deductions_adjustment']);
        $this->assertSame(800.0, $higher['net_pay']);
        $this->assertSame(787.5, $higher['gross_pay']);
    }

    public function test_typed_gross_and_net_set_both_adjustments(): void
    {
        $result = $this->oneDay(['gross_pay' => 1000, 'net_pay' => 900]);

        $this->assertSame(212.5, $result['earnings_adjustment']);
        $this->assertSame(100.0, $result['deductions_adjustment']);
        $this->assertSame([1000.0, 100.0, 900.0], [$result['gross_pay'], $result['total_deductions'], $result['net_pay']]);
    }

    public function test_typed_gross_is_the_sheet_gross_before_absences(): void
    {
        // The step 3 sheet shows gross before Absent (Absent is in the deductions table): 6000 + 600 = 6600.
        $result = $this->oneAbsence(['gross_pay' => 7000]);

        $this->assertSame(400.0, $result['earnings_adjustment']);
        $this->assertSame(7000.0, $result['gross_pay'] + $result['absence_deduction'] - $result['nwnp_deduction']);
    }
}
