<?php

namespace App\Models;

use App\Services\OfficePayrollCalculator;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Employee extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'employee_id',
        'first_name',
        'middle_name',
        'name_suffix',
        'last_name',
        'email',
        'password',
        'role',
        'is_staff',
        'auto_present_weekdays',
        'work_days',
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
        'signature_path',
        'password',
        'remember_token',
    ];

    protected $casts = [
        'signature_uploaded_at' => 'datetime',
        'setup_completed_at' => 'datetime',
        'office_verified_at' => 'datetime',
        'date_hired' => 'date',
        'password' => 'hashed',
        'is_staff' => 'boolean',
        'auto_present_weekdays' => 'boolean',
    ];

    public function getFullNameAttribute(): string
    {
        return implode(' ', array_filter([$this->first_name, $this->middle_name, $this->last_name, $this->name_suffix]));
    }

    public function getInitialsAttribute(): string
    {
        return strtoupper(substr($this->first_name, 0, 1).substr($this->last_name, 0, 1));
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

    /** Days of the week the employee works (0 = Sunday … 6 = Saturday), cached per request. */
    public static function workDaysFor(int $id): array
    {
        $custom = once(fn (): array => static::query()->whereNotNull('work_days')->pluck('work_days', 'id')
            ->map(fn (string $days): array => array_map('intval', array_filter(explode(',', $days), 'strlen')))
            ->all())[$id] ?? [];

        return $custom !== [] ? $custom : self::DEFAULT_WORK_DAYS;
    }

    public static function isWorkDay(int $id, CarbonInterface $date): bool
    {
        return in_array($date->dayOfWeek, self::workDaysFor($id), true);
    }

    public static function hasCustomWorkDays(int $id): bool
    {
        return self::workDaysFor($id) !== self::DEFAULT_WORK_DAYS;
    }

    /** First day an absence can count: hire date, else the account creation date (Y-m-d), cached per request. */
    public static function startDateFor(int $id): ?string
    {
        return once(fn (): array => static::query()->get(['id', 'date_hired', 'created_at'])
            ->mapWithKeys(fn (self $employee): array => [$employee->id => ($employee->date_hired ?? $employee->created_at)?->toDateString()])
            ->all())[$id] ?? null;
    }

    /** Cached per request so DTR status checks do not query once per log. */
    public static function isAlwaysPresent(int $id): bool
    {
        return in_array($id, once(fn (): array => static::where('auto_present_weekdays', true)->pluck('id')->all()), true);
    }

    public function accountSetupRequests(): HasMany
    {
        return $this->hasMany(AccountSetupRequest::class);
    }

    public function hasVerifiedPayrollOffice(): bool
    {
        // HR can verify an office before the employee finishes account setup.
        return $this->office_verified_at !== null
            && isset(OfficePayrollCalculator::OFFICES[$this->payroll_office]);
    }

    public function governmentIds()
    {
        return $this->hasOne(EmployeeGovernmentId::class);
    }

    public function dtrLogs()
    {
        return $this->hasMany(DtrLog::class);
    }

    public function dtrEditRequests()
    {
        return $this->hasMany(DtrEditRequest::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function payrollItems()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function thirteenthMonthPays()
    {
        return $this->hasMany(ThirteenthMonthPay::class);
    }

    public function notifications()
    {
        return $this->hasMany(EmployeeNotification::class);
    }

    public static function generateEmployeeId(): string
    {
        $latestEmpId = static::where('employee_id', 'LIKE', 'EMP-%')
            ->orderByDesc('employee_id')
            ->value('employee_id');

        if (! $latestEmpId) {
            return 'EMP-0001';
        }

        $number = (int) substr($latestEmpId, 4);

        return 'EMP-'.str_pad((string) ($number + 1), 4, '0', STR_PAD_LEFT);
    }

    public function getMonthlyBasicPayAttribute(): float
    {
        return $this->daily_rate * 22;
    }

    public function getTotalAllowancesAttribute(): float
    {
        return $this->transpo_allowance
            + $this->rep_allowance
            + $this->quarterly_allowance;
    }

    public function getTotalDeductionsAttribute(): float
    {
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

    public function isReynoldValdez(): bool
    {
        $fullName = strtolower(trim("{$this->first_name} {$this->last_name}"));

        return str_contains($fullName, 'reynold') && str_contains($fullName, 'valdez');
    }

    public function canCorrectDtr(): bool
    {
        return $this->isSuperAdmin() && in_array($this->employee_id, config('pmpc.dtr_correctors', []), true);
    }

    public function canManageDtrRequests(): bool
    {
        // Controls permission to approve or decline DTR edit requests.
        // Reynold Valdez is restricted from approving or declining.
        if ($this->isReynoldValdez()) {
            return false;
        }

        return $this->isSuperAdmin();
    }

    public function canViewDtrRequests(): bool
    {
        // Reynold Valdez is restricted from viewing or visiting DTR edit requests.
        if ($this->isReynoldValdez()) {
            return false;
        }

        return $this->isSuperAdmin();
    }

    public function canRequestDtrEdits(): bool
    {
        return true;
    }
}
