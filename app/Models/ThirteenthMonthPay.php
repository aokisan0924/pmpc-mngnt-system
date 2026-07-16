<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThirteenthMonthPay extends Model
{
    protected $fillable = [
        'employee_id',
        'year',
        'tranche',
        'period_from',
        'period_to',
        'days_present',
        'daily_rate',
        'total_basic_pay',
        'thirteenth_month_pay',
        'status',
        'processed_by',
        'finalized_at',
    ];

    protected $casts = [
        'period_from'          => 'date',
        'period_to'            => 'date',
        'days_present'         => 'float',
        'total_basic_pay'      => 'float',
        'thirteenth_month_pay' => 'float',
        'daily_rate'           => 'float',
        'finalized_at'         => 'datetime',
    ];

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function processor() {
        return $this->belongsTo(Employee::class, 'processed_by');
    }

    public function isFinalized(): bool {
        return $this->status === 'finalized';
    }

    public function trancheLabel(): string {
        return $this->tranche === 'mid_year'
            ? 'Mid-year (Jan – Jun)'
            : 'Year-end (Jul – Dec)';
    }
}