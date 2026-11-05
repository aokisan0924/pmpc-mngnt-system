<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TaskStatusRequest;
use App\Http\Requests\TeamTaskRequest;
use App\Models\Employee;
use App\Models\RecurringTask;
use App\Models\Task;
use App\Services\RecurringTaskGenerator;
use App\Services\TaskAssignmentNotifier;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
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
        app(RecurringTaskGenerator::class)->runOncePerDay();

        $employeeId = $request->integer('employee_id') ?: null;
        $priority = in_array($request->query('priority'), ['low', 'medium', 'high'], true)
            ? $request->query('priority')
            : null;
        $office = array_key_exists((string) $request->query('office'), Task::OFFICES) ? $request->query('office') : null;
        $whole = $request->boolean('whole') && $office && ! $employeeId;
        $overdueOnly = $request->boolean('overdue');
        $showOlder = $request->boolean('older');
        $today = now('Asia/Manila')->toDateString();

        $scoped = fn () => Task::assignedByAdmin()
            ->when($employeeId, fn ($q) => $q->forPerson($employeeId))
            ->when($priority, fn ($q) => $q->where('priority', $priority))
            ->when($office, fn ($q) => $q->inOffice($office))
            ->when($whole, fn ($q) => $q->whereNull('employee_id')->whereNotNull('office'));

        $tasks = $scoped()->with(['employee', 'assigner', 'recurringTask', 'assignees'])
            ->when(! $showOlder, fn ($q) => $q->where(fn ($w) => $w->where('status', '!=', 'done')->orWhere('updated_at', '>=', now()->subDays(30))))
            ->when($overdueOnly, fn ($q) => $q->where('due_date', '<', $today)->where('status', '!=', 'done'))
            ->orderByRaw('due_date IS NULL')
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
            'overview' => $this->overview(),
            'offices' => $this->offices(),
            'people' => $this->people($office),
            'status_counts' => $this->statusCounts($scoped, $showOlder, $today),
            'employees' => $employees,
            'filters' => [
                'employee_id' => $employeeId,
                'priority' => $priority,
                'office' => $office,
                'whole' => $whole,
                'overdue' => $overdueOnly,
                'older' => $showOlder,
            ],
        ]);
    }

    public function store(TeamTaskRequest $request): RedirectResponse
    {
        $data = $request->validated();

        // Recurring has no date field: the first copy is the next date on its schedule.
        if ($request->input('due_type') === 'recurring') {
            $data['due_date'] = $request->firstRepeatDate()->toDateString();
        }

        if ($request->boolean('shared')) {
            $ids = array_map('intval', $data['employee_ids']);
            $task = DB::transaction(fn () => $this->createTask(
                $request,
                [...Arr::except($data, ['employee_ids', 'employee_id', 'office', 'shared']), 'employee_id' => null, 'office' => null],
                $ids,
            ));
            app(TaskAssignmentNotifier::class)->notify($task, $request->user());

            return back()->with('success', 'Shared task added for '.count($ids).' people.');
        }

        // Several people means one separate task each; the array wins over employee_id and office.
        $owners = ! empty($data['employee_ids']) ? array_map(fn ($id) => ['employee_id' => (int) $id, 'office' => null], $data['employee_ids']) : [Arr::only($data, ['employee_id', 'office'])];

        $tasks = DB::transaction(fn () => array_map(function (array $owner) use ($request, $data): Task {
            $one = $this->withOffice([...Arr::except($data, ['employee_ids', 'employee_id', 'office']), ...$owner]);

            return $this->createTask($request, $one);
        }, $owners));

        foreach ($tasks as $task) {
            app(TaskAssignmentNotifier::class)->notify($task, $request->user());
        }

        return back()->with('success', count($tasks) > 1 ? 'Task added for '.count($tasks).' people.' : 'Task added.');
    }

    /** Creates one task, and its repeat rule when the admin chose to repeat it. */
    private function createTask(Request $request, array $data, array $assigneeIds = []): Task
    {
        $fields = Arr::only($data, ['employee_id', 'office', 'title', 'description', 'due_date', 'category', 'priority']);
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

        $task = Task::create([...$fields, 'assigned_by' => $request->user()->id, 'recurring_task_id' => $rule?->id]);

        if ($assigneeIds !== []) {
            $rule?->assignees()->attach($assigneeIds);
            $task->assignees()->attach($assigneeIds);
        }

        return $task;
    }

    public function update(TeamTaskRequest $request, Task $task): RedirectResponse
    {
        $this->ensureAssigned($task);

        if ($task->isShared()) {
            $changes = DB::transaction(function () use ($request, $task): array {
                $task->update(Arr::only($request->validated(), ['title', 'description', 'due_date', 'category', 'priority']));

                return $task->assignees()->sync(array_map('intval', $request->validated('employee_ids')));
            });

            if ($changes['attached'] !== []) {
                app(TaskAssignmentNotifier::class)->notify($task, $request->user(), $changes['attached']);
            }

            return back()->with('success', 'Task updated.');
        }

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

    /**
     * To do, Doing, Done and late counts for the current person, office and priority filters
     * (not the late filter). Done follows the board's 30-day rule unless older tasks are shown.
     *
     * @param  \Closure(): Builder<Task>  $scoped
     * @return array{todo: int, doing: int, done: int, late: int}
     */
    private function statusCounts(\Closure $scoped, bool $showOlder, string $today): array
    {
        return [
            'todo' => $scoped()->where('status', 'pending')->count(),
            'doing' => $scoped()->where('status', 'doing')->count(),
            'done' => $scoped()->where('status', 'done')->when(! $showOlder, fn ($q) => $q->where('updated_at', '>=', now()->subDays(30)))->count(),
            'late' => $scoped()->where('status', '!=', 'done')->whereDate('due_date', '<', $today)->count(),
        ];
    }

    /**
     * The three offices with their open and late task counts. Ignores every board filter.
     *
     * @return list<array{key: string, label: string, open: int, late: int}>
     */
    private function offices(): array
    {
        $tasks = Task::assignedByAdmin()->where('status', '!=', 'done')
            ->with('assignees:id,payroll_office')
            ->get(['id', 'employee_id', 'office', 'due_date', 'status']);

        return collect(Task::OFFICES)->map(function (string $label, string $key) use ($tasks): array {
            $mine = $tasks->filter(fn (Task $t) => $t->office === $key
                || ($t->isShared() && $t->assignees->contains('payroll_office', $key)));

            return [
                'key' => $key,
                'label' => $label,
                'open' => $mine->count(),
                'late' => $mine->filter(fn (Task $t) => $t->isOverdue())->count(),
            ];
        })->values()->all();
    }

    /**
     * One chip per active person with open tasks (in the chosen office, if any), then a "Whole office"
     * chip for tasks that name nobody when an office is chosen. Ignores the other board filters.
     *
     * @return list<array{type: string, key: string, label: string, open: int, late: int}>
     */
    private function people(?string $office): array
    {
        $chips = [];

        $bump = function (string $id, array $chip, Task $task) use (&$chips): void {
            $chips[$id] ??= $chip + ['open' => 0, 'late' => 0];
            $chips[$id]['open']++;
            $chips[$id]['late'] += $task->isOverdue() ? 1 : 0;
        };

        Task::assignedByAdmin()->where('status', '!=', 'done')
            ->when($office, fn ($q) => $q->inOffice($office))
            ->with(['employee:id,first_name,last_name,status', 'assignees:id,first_name,last_name,status,payroll_office'])
            ->get(['id', 'employee_id', 'office', 'due_date', 'status'])
            ->each(function (Task $task) use ($bump, $office): void {
                if ($task->isShared()) {
                    foreach ($task->assignees as $person) {
                        if ($person->status === 'active' && (! $office || $person->payroll_office === $office)) {
                            $bump('employee:'.$person->id, ['type' => 'employee', 'key' => (string) $person->id, 'label' => trim($person->first_name.' '.$person->last_name)], $task);
                        }
                    }
                } elseif ($task->employee_id === null) {
                    if ($office) {
                        $bump('whole', ['type' => 'whole', 'key' => $office, 'label' => 'Whole office'], $task);
                    }
                } elseif ($task->employee?->status === 'active') {
                    $bump('employee:'.$task->employee_id, ['type' => 'employee', 'key' => (string) $task->employee_id, 'label' => trim($task->employee->first_name.' '.$task->employee->last_name)], $task);
                }
            });

        return collect($chips)
            ->sortBy([['type', 'asc'], ['late', 'desc'], ['open', 'desc'], ['label', 'asc']])
            ->values()
            ->all();
    }

    /**
     * Team-wide figures for the strip on top of the page. They cover every admin-assigned task
     * and deliberately ignore the board's filters.
     *
     * @return array<string, mixed>
     */
    private function overview(): array
    {
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $open = fn () => Task::assignedByAdmin()->where('status', '!=', 'done');

        return [
            'overdue' => $open()->whereDate('due_date', '<', $today->toDateString())->count(),
            'open' => $open()->count(),
        ];
    }
}
