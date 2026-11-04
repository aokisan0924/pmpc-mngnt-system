<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    /** `pending` is shown as "To do" in the UI. */
    public const STATUSES = ['pending', 'doing', 'done'];

    protected $fillable = [
        'employee_id',
        'assigned_by',
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

    /** Tasks an admin created for an employee; an employee's personal tasks are excluded. */
    public function scopeAssignedByAdmin(Builder $query): Builder
    {
        return $query->whereNotNull('assigned_by');
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
            'employee_name' => $this->relationLoaded('employee')
                ? trim(($this->employee?->first_name ?? '').' '.($this->employee?->last_name ?? ''))
                : null,
        ];
    }
}
