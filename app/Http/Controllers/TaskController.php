<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response {
        $employee = $request->user();

        $tasks = Task::where('employee_id', $employee->id)
            ->orderBy('due_date')
            ->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")
            ->get()
            ->map(fn($task) => [
                'id'          => $task->id,
                'title'       => $task->title,
                'description' => $task->description,
                'due_date'    => $task->due_date->format('Y-m-d'),
                'due_label'   => $task->due_date->format('M d, Y'),
                'category'    => $task->category,
                'priority'    => $task->priority,
                'status'      => $task->status,
                'is_overdue'  => $task->due_date->isPast() && $task->status === 'pending',
            ]);

        return Inertia::render('Employee/Planner', [
            'tasks' => $tasks,
        ]);
    }

    public function store(Request $request): RedirectResponse {
        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'due_date'    => ['required', 'date'],
            'category'    => ['nullable', 'string', 'max:100'],
            'priority'    => ['required', 'in:low,medium,high'],
        ]);

        Task::create([
            ...$validated,
            'employee_id' => $request->user()->id,
        ]);

        return back()->with('success', 'Task added.');
    }

    public function update(Request $request, Task $task): RedirectResponse {
        $this->authorizeTask($task, $request);

        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'due_date'    => ['required', 'date'],
            'category'    => ['nullable', 'string', 'max:100'],
            'priority'    => ['required', 'in:low,medium,high'],
        ]);

        $task->update($validated);

        return back()->with('success', 'Task updated.');
    }

    public function toggleDone(Request $request, Task $task): RedirectResponse {
        $this->authorizeTask($task, $request);

        $task->update([
            'status' => $task->status === 'done' ? 'pending' : 'done',
        ]);

        return back();
    }

    public function destroy(Request $request, Task $task): RedirectResponse {
        $this->authorizeTask($task, $request);
        $task->delete();
        return back()->with('success', 'Task deleted.');
    }

    private function authorizeTask(Task $task, Request $request): void {
        if ($task->employee_id !== $request->user()->id) {
            abort(403);
        }
    }
}
