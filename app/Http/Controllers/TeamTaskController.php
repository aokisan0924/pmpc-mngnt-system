<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TaskStatusRequest;
use App\Http\Requests\TeamTaskRequest;
use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use App\Services\TaskAssignmentNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeamTaskController extends Controller
{
    public function index(Request $request): Response
    {
        $employeeId = $request->integer('employee_id') ?: null;
        $priority = in_array($request->query('priority'), ['low', 'medium', 'high'], true)
            ? $request->query('priority')
            : null;
        $office = array_key_exists((string) $request->query('office'), Task::OFFICES) ? $request->query('office') : null;
        $overdueOnly = $request->boolean('overdue');
        $showOlder = $request->boolean('older');
        $today = now('Asia/Manila')->toDateString();

        $tasks = Task::with(['employee', 'assigner', 'recurringTask'])
            ->assignedByAdmin()
            ->when($employeeId, fn ($q) => $q->where('employee_id', $employeeId))
            ->when($priority, fn ($q) => $q->where('priority', $priority))
            ->when($office, fn ($q) => $q->where('office', $office))
            ->when(! $showOlder, fn ($q) => $q->where(fn ($w) => $w->where('status', '!=', 'done')->orWhere('updated_at', '>=', now()->subDays(30))))
            ->when($overdueOnly, fn ($q) => $q->where('due_date', '<', $today)->where('status', '!=', 'done'))
            ->orderBy('due_date')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->get()
            ->map(fn (Task $task) => $task->toPlannerArray());

        $employees = Employee::where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'payroll_office'])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'name' => trim($e->first_name.' '.$e->last_name),
                'office' => $e->payroll_office,
            ]);

        return Inertia::render('Admin/TeamTasks', [
            'tasks' => $tasks,
            'employees' => $employees,
            'offices' => collect(Task::OFFICES)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values(),
            'filters' => [
                'employee_id' => $employeeId,
                'priority' => $priority,
                'office' => $office,
                'overdue' => $overdueOnly,
                'older' => $showOlder,
            ],
        ]);
    }

    public function store(TeamTaskRequest $request): RedirectResponse
    {
        $data = $this->withOffice($request->validated());
        $fields = Arr::only($data, ['employee_id', 'office', 'title', 'description', 'due_date', 'category', 'priority']);

        $task = DB::transaction(function () use ($request, $data, $fields): Task {
            $rule = null;

            if (! empty($data['repeat'])) {
                $frequency = $data['repeat'];
                $rule = RecurringTask::create([
                    ...Arr::except($fields, ['due_date']),
                    'created_by' => $request->user()->id,
                    'frequency' => $frequency,
                    'day_of_week' => $frequency === 'weekly' ? $data['repeat_day_of_week'] : null,
                    'day_of_month' => in_array($frequency, ['monthly', 'yearly'], true) ? ($data['repeat_day_of_month'] ?? null) : null,
                    'last_day_of_month' => $frequency === 'monthly' && $request->boolean('repeat_last_day'),
                    'month' => $frequency === 'yearly' ? $data['repeat_month'] : null,
                    'lead_days' => $data['repeat_lead_days'] ?? RecurringTask::DEFAULT_LEAD_DAYS[$frequency],
                    'starts_on' => $fields['due_date'],
                    'ends_on' => $data['repeat_until'] ?? null,
                    'active' => true,
                    'last_due_date' => $fields['due_date'],
                ]);
            }

            return Task::create([...$fields, 'assigned_by' => $request->user()->id, 'recurring_task_id' => $rule?->id]);
        });

        app(TaskAssignmentNotifier::class)->notify($task, $request->user());

        return back()->with('success', 'Task added.');
    }

    public function update(TeamTaskRequest $request, Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

        $previousEmployeeId = $task->employee_id;
        $previousOffice = $task->office;

        $task->update(Arr::only($this->withOffice($request->validated()), ['employee_id', 'office', 'title', 'description', 'due_date', 'category', 'priority']));

        // Only a change of who the task is for tells anyone; plain edits stay quiet.
        if ($task->employee_id !== $previousEmployeeId || ($task->employee_id === null && $task->office !== $previousOffice)) {
            app(TaskAssignmentNotifier::class)->notify($task, $request->user());
        }

        return back()->with('success', 'Task updated.');
    }

    public function updateStatus(TaskStatusRequest $request, Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

        $task->update(['status' => $request->validated('status')]);

        return back();
    }

    public function stopRepeat(Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);
        abort_if($task->recurring_task_id === null, 404);

        RecurringTask::whereKey($task->recurring_task_id)->update(['active' => false]);

        return back()->with('success', 'This task will no longer repeat.');
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

        if ($request->boolean('stop_repeat') && $task->recurring_task_id !== null) {
            RecurringTask::whereKey($task->recurring_task_id)->update(['active' => false]);
        }

        $task->delete();

        return back()->with('success', 'Task deleted.');
    }

    /** Employees' personal tasks are private: admins can only touch tasks admins created. */
    private function ensureAssigned(Task $task): void
    {
        abort_if($task->assigned_by === null, 404);
    }

    /**
     * Picking only an employee files the task under that employee's own office.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withOffice(array $data): array
    {
        if (empty($data['office']) && ! empty($data['employee_id'])) {
            $data['office'] = Employee::whereKey($data['employee_id'])->value('payroll_office');
        }

        return $data;
    }
}
