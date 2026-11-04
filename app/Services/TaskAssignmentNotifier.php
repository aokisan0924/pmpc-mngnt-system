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
    public function notify(Task $task, Employee|int $actor): void
    {
        $actor = $actor instanceof Employee ? $actor : Employee::findOrFail($actor);

        $recipients = $task->employee_id !== null
            ? Employee::whereKey($task->employee_id)->where('status', 'active')->get()
            : Employee::where('status', 'active')->where('payroll_office', $task->office)->get();

        $message = sprintf(
            '%s · due %s · Assigned by %s',
            $task->title,
            $task->due_date->format('M d, Y'),
            trim($actor->first_name.' '.$actor->last_name)
        );

        foreach ($recipients->reject(fn (Employee $recipient) => $recipient->id === $actor->id) as $recipient) {
            try {
                EmployeeNotification::send($recipient->id, 'task_assigned', 'New task assigned', $message, '/employee/planner');
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}
