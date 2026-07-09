<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = [
        'period_label',
        'period_from',
        'period_to',
        'cutoff',
        'status',
        'total_gross',
        'total_deductions',
        'total_net',
        'created_by',
    ];

    protected $casts = [
        'period_from' => 'date',
        'period_to'   => 'date',
    ];

    public function items() {
        return $this->hasMany(PayrollItem::class);
    }

    public function creator() {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function isFinalized(): bool {
        return $this->status === 'finalized';
    }

    public function recalculateTotals(): void {
        $this->total_gross      = $this->items()->sum('gross_pay');
        $this->total_deductions = $this->items()->sum('total_deductions');
        $this->total_net        = $this->items()->sum('net_pay');
        $this->save();
    }
}