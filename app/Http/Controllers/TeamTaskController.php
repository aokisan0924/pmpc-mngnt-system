<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TaskStatusRequest;
use App\Http\Requests\TeamTaskRequest;
use App\Models\Employee;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $tasks = Task::with(['employee', 'assigner'])
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
        Task::create([...$this->withOffice($request->validated()), 'assigned_by' => $request->user()->id]);

        return back()->with('success', 'Task added.');
    }

    public function update(TeamTaskRequest $request, Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

        $task->update($this->withOffice($request->validated()));

        return back()->with('success', 'Task updated.');
    }

    public function updateStatus(TaskStatusRequest $request, Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

        $task->update(['status' => $request->validated('status')]);

        return back();
    }

    public function destroy(Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

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
