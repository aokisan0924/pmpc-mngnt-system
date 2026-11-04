<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

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
        });
    }

    public function isOfficeWide(): bool
    {
        return $this->employee_id === null;
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
        return $this->due_date->toDateString() < now('Asia/Manila')->toDateString()
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
            'due_date' => $this->due_date->format('Y-m-d'),
            'due_label' => $this->due_date->format('M d, Y'),
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'is_overdue' => $this->isOverdue(),
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
        ];
    }
}
