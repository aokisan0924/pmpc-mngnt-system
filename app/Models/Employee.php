<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Employee extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'employee_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
        'department',
        'position',
        'phone',
        'address',
        'date_hired',
        'status',
        // Compensation
        'daily_rate',
        'transpo_allowance',
        'rep_allowance',
        'quarterly_allowance',
        // Government deductions
        'sss_deduction',
        'philhealth_deduction',
        'pagibig_deduction',
        'tax_deduction',
        // Other deductions
        'loan_deduction',
        'capital_contribution_deduction',
        'cash_advance_deduction',
        'rental_deduction',
        'savings_deduction',
        'other_deductions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'date_hired' => 'date',
        'password'   => 'hashed',
    ];

    public function getFullNameAttribute(): string {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getInitialsAttribute(): string {
        return strtoupper(substr($this->first_name, 0, 1) . substr($this->last_name, 0, 1));
    }

    public function isSuperAdmin(): bool {
        return $this->role === 'super_admin';
    }

    public function isEmployee(): bool {
        return $this->role === 'employee';
    }

    public function isActive(): bool {
        return $this->status === 'active';
    }

    public function governmentIds() {
        return $this->hasOne(EmployeeGovernmentId::class);
    }

    public function dtrLogs() {
        return $this->hasMany(DtrLog::class);
    }

    public function dtrEditRequests() {
        return $this->hasMany(DtrEditRequest::class);
    }

    public static function generateEmployeeId(): string {
        $latest = static::orderByDesc('id')->value('employee_id');

        if (! $latest) {
            return 'EMP-0001';
        }

        $number = (int) substr($latest, 4);

        return 'EMP-' . str_pad($number + 1, 4, '0', STR_PAD_LEFT);
    }

    public function getMonthlyBasicPayAttribute(): float {
        return $this->daily_rate * 22;
    }

    public function getTotalAllowancesAttribute(): float {
        return $this->transpo_allowance
            + $this->rep_allowance
            + $this->quarterly_allowance;
    }

    public function getTotalDeductionsAttribute(): float {
        return $this->sss_deduction
            + $this->philhealth_deduction
            + $this->pagibig_deduction
            + $this->tax_deduction
            + $this->loan_deduction
            + $this->capital_contribution_deduction
            + $this->cash_advance_deduction
            + $this->rental_deduction
            + $this->savings_deduction
            + $this->other_deductions;
    }
}
