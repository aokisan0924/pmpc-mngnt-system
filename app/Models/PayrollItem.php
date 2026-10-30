<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'basic_before_absence',
        'absence_deduction',
        'payroll_id',
        'employee_id',
        'cutoff',
        'days_present',
        'payroll_office',
        'paid_days_basis',
        'absence_days',
        'default_paid_days_basis',
        'dtr_days_present',
        'dtr_absence_days',
        'dtr_tardiness_minutes',
        'dtr_unresolved_dates',
        'attendance_override_reason',
        'dtr_reconciliation_note',
        'tardiness_deduction',
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
        'holiday_pay',
        'tardiness_minutes',
        'gross_pay',
        'sss_deduction',
        'philhealth_deduction',
        'pagibig_deduction',
        'tax_deduction',
        'loan_deduction',
        'capital_contribution_deduction',
        'cash_advance_deduction',
        'rental_deduction',
        'savings_deduction',
        'other_deductions',
        'total_deductions',
        'net_pay',
    ];

    protected $casts = [
        'basic_before_absence' => 'float',
        'absence_deduction' => 'float',
        'dtr_days_present' => 'float',
        'default_paid_days_basis' => 'float',
        'dtr_absence_days' => 'float',
        'dtr_tardiness_minutes' => 'float',
        'dtr_unresolved_dates' => 'array',
        'cutoff_basic' => 'float',
        'cutoff_transpo' => 'float',
        'cutoff_rep' => 'float',
        'cutoff_quarterly' => 'float',
        'cutoff_gross' => 'float',
        'weekday_ot_hours' => 'float',
        'weekday_ot_pay' => 'float',
        'weekend_ot_hours' => 'float',
        'weekend_ot_pay' => 'float',
        'total_ot_pay' => 'float',
        'holiday_pay' => 'float',
        'tardiness_minutes' => 'float',
        'gross_pay' => 'float',
        'sss_deduction' => 'float',
        'philhealth_deduction' => 'float',
        'pagibig_deduction' => 'float',
        'tax_deduction' => 'float',
        'loan_deduction' => 'float',
        'capital_contribution_deduction' => 'float',
        'cash_advance_deduction' => 'float',
        'rental_deduction' => 'float',
        'savings_deduction' => 'float',
        'other_deductions' => 'float',
        'total_deductions' => 'float',
        'net_pay' => 'float',
    ];

    public function payroll()
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
