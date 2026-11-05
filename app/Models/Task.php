<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Task extends Model
{
    /** `pending` is shown as "To do" in the UI. */
    public const STATUSES = ['pending', 'doing', 'done'];

    /** Office keys match employees.payroll_office; payroll's own labels are unchanged. */
    public const OFFICES = [
        'cubao' => 'Cubao Office',
        'fort_magsaysay' => 'Fort Magsaysay Office',
        'main_office' => 'UPI Main Office',
    ];

    protected $fillable = [
        'employee_id',
        'office',
        'assigned_by',
        'recurring_task_id',
        'title',
        'description',
        'due_date',
        'category',
        'priority',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function recurringTask()
    {
        return $this->belongsTo(RecurringTask::class);
    }

    public function assigner()
    {
        return $this->belongsTo(Employee::class, 'assigned_by');
    }

    /** Tasks an admin created for an employee; an employee's personal tasks are excluded. */
    public function scopeAssignedByAdmin(Builder $query): Builder
    {
        return $query->whereNotNull('assigned_by');
    }

    /** Own tasks, plus office-wide tasks (no employee) of the employee's office. */
    public function scopeVisibleTo(Builder $query, Employee $employee): Builder
    {
        return $query->where(function (Builder $q) use ($employee) {
            $q->where('employee_id', $employee->id);

            if ($employee->payroll_office) {
                $q->orWhere(fn (Builder $office) => $office->whereNull('employee_id')->where('office', $employee->payroll_office));
            }

            $q->orWhereHas('assignees', fn (Builder $a) => $a->where('employees.id', $employee->id));
        });
    }

    /** The person's own tasks, plus shared tasks they are on. */
    public function scopeForPerson(Builder $query, int $employeeId): Builder
    {
        return $query->where(fn (Builder $q) => $q->where('employee_id', $employeeId)
            ->orWhereHas('assignees', fn (Builder $a) => $a->where('employees.id', $employeeId)));
    }

    /** Tasks filed under the office, plus shared tasks with anyone from that office on them. */
    public function scopeInOffice(Builder $query, string $office): Builder
    {
        return $query->where(fn (Builder $q) => $q->where('office', $office)
            ->orWhereHas('assignees', fn (Builder $a) => $a->where('payroll_office', $office)));
    }

    /** The people on a shared task (no person, no office). */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'task_assignees')->orderBy('first_name')->orderBy('last_name');
    }

    public function isShared(): bool
    {
        return $this->employee_id === null && $this->office === null;
    }

    public function isOfficeWide(): bool
    {
        return $this->employee_id === null && $this->office !== null;
    }

    public function officeLabel(): ?string
    {
        return self::OFFICES[$this->office] ?? null;
    }

    public function isDone(): bool
    {
        return $this->status === 'done';
    }

    public function isOverdue(): bool
    {
        return $this->due_date !== null
            && $this->due_date->toDateString() < now('Asia/Manila')->toDateString()
            && ! $this->isDone();
    }

    /**
     * Shape sent to the Planner and Team tasks pages. `employee_name` is only
     * filled when the `employee` relation is already loaded.
     *
     * @return array<string, mixed>
     */
    public function toPlannerArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'due_date' => $this->due_date?->format('Y-m-d'),
            'due_label' => $this->due_date?->format('M d, Y') ?? 'No due date',
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'is_overdue' => $this->isOverdue(),
            'due_in_days' => $this->due_date === null ? null : (int) now('Asia/Manila')->startOfDay()->diffInDays($this->due_date->copy()->startOfDay(), false),
            'employee_id' => $this->employee_id,
            'office' => $this->office,
            'office_label' => $this->officeLabel(),
            'repeat_label' => $this->relationLoaded('recurringTask') ? $this->recurringTask?->label() : null,
            'repeat_active' => $this->relationLoaded('recurringTask') ? $this->recurringTask?->active : null,
            'assigned_by_name' => $this->relationLoaded('assigner') && $this->assigner
                ? trim($this->assigner->first_name.' '.$this->assigner->last_name)
                : null,
            'created_label' => $this->created_at?->timezone('Asia/Manila')->format('M d, Y'),
            'employee_name' => $this->relationLoaded('employee') && $this->employee
                ? trim($this->employee->first_name.' '.$this->employee->last_name)
                : null,
            'is_shared' => $this->isShared(),
            'assignees' => $this->isShared() && $this->relationLoaded('assignees')
                ? $this->assignees->map(fn (Employee $e) => [
                    'id' => $e->id,
                    'name' => trim($e->first_name.' '.$e->last_name),
                    'office' => $e->payroll_office,
                    'active' => $e->status === 'active',
                ])->values()->all()
                : [],
        ];
    }
}
