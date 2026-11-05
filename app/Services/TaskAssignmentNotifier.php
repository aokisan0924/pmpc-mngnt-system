<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeNotification;
use App\Models\Task;

class TaskAssignmentNotifier
{
    /**
     * Tell whoever now owns the task: the named employee, or the active members of the task's office.
     * The actor (the admin who made the change or owns the rule) is never notified, and a failed
     * notification never blocks the save.
     */
    public function notify(Task $task, Employee|int $actor, ?array $onlyEmployeeIds = null): void
    {
        $actor = $actor instanceof Employee ? $actor : Employee::findOrFail($actor);

        // Shared first: the office branch would turn a null office into IS NULL and reach everyone without one.
        $recipients = match (true) {
            $task->isShared() => $task->assignees()->where('employees.status', 'active')->get(),
            $task->employee_id !== null => Employee::whereKey($task->employee_id)->where('status', 'active')->get(),
            default => Employee::where('status', 'active')->where('payroll_office', $task->office)->get(),
        };

        if ($onlyEmployeeIds !== null) {
            $recipients = $recipients->whereIn('id', $onlyEmployeeIds);
        }

        $message = implode(' · ', array_filter([
            $task->title,
            $task->due_date ? 'due '.$task->due_date->format('M d, Y') : null,
            'Assigned by '.trim($actor->first_name.' '.$actor->last_name),
        ]));

        foreach ($recipients->reject(fn (Employee $recipient) => $recipient->id === $actor->id) as $recipient) {
            try {
                EmployeeNotification::send($recipient->id, 'task_assigned', 'New task assigned', $message, '/employee/planner');
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}
