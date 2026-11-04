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
        $overdueOnly = $request->boolean('overdue');
        $today = now('Asia/Manila')->toDateString();

        $tasks = Task::with('employee')
            ->when($employeeId, fn ($q) => $q->where('employee_id', $employeeId))
            ->when($priority, fn ($q) => $q->where('priority', $priority))
            ->when($overdueOnly, fn ($q) => $q->where('due_date', '<', $today)->where('status', '!=', 'done'))
            ->orderBy('due_date')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->get()
            ->map(fn (Task $task) => $task->toPlannerArray());

        $employees = Employee::where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn (Employee $e) => ['id' => $e->id, 'name' => trim($e->first_name.' '.$e->last_name)]);

        return Inertia::render('Admin/TeamTasks', [
            'tasks' => $tasks,
            'employees' => $employees,
            'filters' => [
                'employee_id' => $employeeId,
                'priority' => $priority,
                'overdue' => $overdueOnly,
            ],
        ]);
    }

    public function store(TeamTaskRequest $request): RedirectResponse
    {
        Task::create($request->validated());

        return back()->with('success', 'Task added.');
    }

    public function update(TeamTaskRequest $request, Task $task): RedirectResponse
    {
        $task->update($request->validated());

        return back()->with('success', 'Task updated.');
    }

    public function updateStatus(TaskStatusRequest $request, Task $task): RedirectResponse
    {
        $task->update(['status' => $request->validated('status')]);

        return back();
    }

    public function destroy(Task $task): RedirectResponse
    {
        $task->delete();

        return back()->with('success', 'Task deleted.');
    }
}
