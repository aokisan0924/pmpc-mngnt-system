<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollItem extends Model
{
    protected $fillable = [
        'payroll_id',
        'employee_id',
        'cutoff',
        'days_present',
        'cutoff_basic',
        'cutoff_transpo',
        'cutoff_rep',
        'cutoff_quarterly',
        'cutoff_gross',
        'weekday_ot_hours',
        'weekday_ot_pay',
        'weekend_ot_hours',
        'weekend_ot_pay',
        'total_ot_pay',
        'gross_pay',
        'sss_deduction',
        'philhealth_deduction',
        'pagibig_deduction',
        'tax_deduction',
        'loan_deduction',
        'capital_contribution_deduction',
        'cash_advance_deduction',
        'savings_deduction',
        'other_deductions',
        'total_deductions',
        'net_pay',
    ];

    protected $casts = [
        'days_present'           => 'float',
        'cutoff_basic'           => 'float',
        'cutoff_transpo'         => 'float',
        'cutoff_rep'             => 'float',
        'cutoff_quarterly'       => 'float',
        'cutoff_gross'           => 'float',
        'weekday_ot_hours'       => 'float',
        'weekday_ot_pay'         => 'float',
        'weekend_ot_hours'       => 'float',
        'weekend_ot_pay'         => 'float',
        'total_ot_pay'           => 'float',
        'gross_pay'              => 'float',
        'sss_deduction'          => 'float',
        'philhealth_deduction'   => 'float',
        'pagibig_deduction'      => 'float',
        'tax_deduction'          => 'float',
        'loan_deduction'         => 'float',
        'capital_contribution_deduction'           => 'float',
        'cash_advance_deduction' => 'float',
        'rental_deduction'       => 'float',
        'savings_deduction'      => 'float',
        'other_deductions'       => 'float',
        'total_deductions'       => 'float',
        'net_pay'                => 'float',
    ];

    public function payroll() {
        return $this->belongsTo(Payroll::class);
    }

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Compute all totals based on cutoff type.
     * isFirst = true  → 1st cutoff (SSS/Phil/Pag-IBIG full, split deductions half)
     * isFirst = false → 2nd cutoff (govt deductions = 0, split deductions half)
     */
    public function computeTotals(bool $isFirst): void {
        $emp = $this->employee;

        // OT pay
        $hourlyRate          = $emp->daily_rate / 8;
        $this->weekday_ot_pay = round($hourlyRate * 1.25 * $this->weekday_ot_hours, 4);
        $this->weekend_ot_pay = round($hourlyRate * 1.30 * $this->weekend_ot_hours, 4);
        $this->total_ot_pay   = $this->weekday_ot_pay + $this->weekend_ot_pay;

        // Cutoff gross = monthly_gross / 2
        $workingDays        = (int) Setting::get('working_days_month', 22);
        $monthlyBasic       = $emp->daily_rate * $workingDays;
        $this->cutoff_basic     = round($monthlyBasic / 2, 4);
        $this->cutoff_transpo   = round($emp->transpo_allowance / 2, 4);
        $this->cutoff_rep       = round($emp->rep_allowance / 2, 4);
        $this->cutoff_quarterly = round($emp->quarterly_allowance / 2, 4);
        $this->cutoff_gross     = $this->cutoff_basic
            + $this->cutoff_transpo
            + $this->cutoff_rep
            + $this->cutoff_quarterly;

        // Total gross = cutoff_gross + OT
        $this->gross_pay = $this->cutoff_gross + $this->total_ot_pay;

        // Government deductions — full on 1st, zero on 2nd
        $this->sss_deduction        = $isFirst ? $emp->sss_deduction        : 0;
        $this->philhealth_deduction = $isFirst ? $emp->philhealth_deduction : 0;
        $this->pagibig_deduction    = $isFirst ? $emp->pagibig_deduction    : 0;
        $this->tax_deduction        = $isFirst ? $emp->tax_deduction        : 0;

        // Split deductions — half each cutoff
        $this->loan_deduction          = round($emp->loan_deduction          / 2, 4);
        $this->capital_contribution_deduction = round($emp->capital_contribution_deduction / 2, 4);
        $this->cash_advance_deduction  = round($emp->cash_advance_deduction  / 2, 4);
        $this->rental_deduction     = round($emp->rental_deduction / 2, 4);
        $this->savings_deduction       = round($emp->savings_deduction       / 2, 4);
        $this->other_deductions        = round($emp->other_deductions        / 2, 4);

        $this->total_deductions =
            $this->sss_deduction
            + $this->philhealth_deduction
            + $this->pagibig_deduction
            + $this->tax_deduction
            + $this->loan_deduction
            + $this->capital_contribution_deduction
            + $this->cash_advance_deduction
            + $this->rental_deduction
            + $this->savings_deduction
            + $this->other_deductions;

        $this->net_pay = $this->gross_pay - $this->total_deductions;
    }
}