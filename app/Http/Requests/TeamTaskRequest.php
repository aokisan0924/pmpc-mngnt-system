<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\RecurringTask;
use App\Models\Task;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TeamTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $shared = $this->boolean('shared') || ($this->route('task')?->isShared() ?? false);

        return [
            'employee_ids.min' => $shared ? 'A shared task needs at least two people.' : 'Choose at least one person.',
            'employee_ids.required' => 'A shared task needs at least two people.',
            'employee_ids.max' => 'Choose up to 25 people.',
            'repeat.required' => 'Choose how often it repeats.',
        ];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        // On edit, the task's current owner stays valid even if deactivated since,
        // so an admin can fix a task without having to reassign it.
        $task = $this->route('task');
        $currentOwnerId = $task?->employee_id;
        $sharedEdit = $task?->isShared() ?? false;
        $shared = $this->boolean('shared') || $sharedEdit;
        // Editing a normal task never counts a people list as an owner, so it cannot end with no owner and no office.
        $listCounts = $task === null || $sharedEdit;
        // "When is it due?" is chosen only when creating; an edit just keeps or clears the date.
        $dueType = $task === null ? $this->input('due_type') : null;
        $currentAssigneeIds = $sharedEdit ? $task->assignees()->pluck('employees.id')->all() : [];

        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'due_type' => [Rule::excludeIf(fn () => $task !== null), 'nullable', Rule::in(['date', 'span', 'recurring', 'none'])],
            // Optional on edit, except for a copy made by a repeat rule.
            'due_date' => [Rule::excludeIf(in_array($dueType, ['recurring', 'none'], true)), Rule::requiredIf($task === null || $task->recurring_task_id !== null), 'nullable', 'date'],
            // A span: optional on edit, required with "Date span", never on a repeat schedule or its copies.
            'start_date' => [
                Rule::prohibitedIf(in_array($dueType, ['recurring', 'none'], true) || $task?->recurring_task_id !== null),
                Rule::requiredIf($dueType === 'span'),
                'nullable', 'date', 'before_or_equal:due_date',
            ],
            'category' => ['nullable', 'string', 'max:100'],
            'priority' => ['required', 'in:low,medium,high'],
            'employee_id' => [
                'nullable',
                $listCounts ? 'required_without_all:office,employee_ids' : 'required_without:office',
                'integer',
                Rule::exists('employees', 'id')->where(
                    fn ($query) => $query->where('status', 'active')
                        ->when($currentOwnerId, fn ($q) => $q->orWhere('id', $currentOwnerId))
                ),
            ],
            'office' => ['nullable', $listCounts ? 'required_without_all:employee_id,employee_ids' : 'required_without:employee_id', Rule::in(array_keys(Task::OFFICES))],

            // Several people at once: one separate task each. Read only when a task is created.
            // "shared" is chosen only when creating; an existing shared task edits its people instead.
            'shared' => [Rule::excludeIf(fn () => $task !== null), 'nullable', 'boolean'],
            'employee_ids' => [
                Rule::excludeIf(fn () => $task !== null && ! $sharedEdit),
                Rule::requiredIf($shared), 'nullable', 'array', $shared ? 'min:2' : 'min:1', 'max:25',
            ],
            'employee_ids.*' => [
                Rule::excludeIf(fn () => $task !== null && ! $sharedEdit),
                'integer', 'distinct',
                // People already on a shared task stay valid after being deactivated.
                Rule::exists('employees', 'id')->where(
                    fn ($query) => $query->where('status', 'active')
                        ->when($currentAssigneeIds, fn ($q) => $q->orWhereIn('id', $currentAssigneeIds))
                ),
            ],

            // Repeat settings are read only when a task is created.
            'repeat' => ['nullable', Rule::requiredIf($dueType === 'recurring'), Rule::prohibitedIf($dueType === 'none'), Rule::in(RecurringTask::FREQUENCIES)],
            'repeat_day_of_week' => ['nullable', 'integer', 'between:0,6', 'required_if:repeat,weekly'],
            'repeat_day_of_month' => [
                'nullable', 'integer', 'between:1,31',
                Rule::requiredIf(fn () => $this->input('repeat') === 'yearly'
                    || ($this->input('repeat') === 'monthly' && ! $this->boolean('repeat_last_day'))),
            ],
            'repeat_last_day' => ['nullable', 'boolean'],
            'repeat_month' => ['nullable', 'integer', 'between:1,12', 'required_if:repeat,yearly'],
            'repeat_lead_days' => ['nullable', 'integer', 'between:0,60'],
            'repeat_until' => ['nullable', 'date', ...($dueType !== 'recurring' && $this->filled('due_date') && $this->filled('repeat') ? ['after_or_equal:due_date'] : [])],
        ];
    }

    /** The first date on the chosen schedule on or after today (Manila), or null when "Stop after" comes first. */
    public function firstRepeatDate(): ?CarbonImmutable
    {
        $frequency = $this->input('repeat');

        return (new RecurringTask([
            'frequency' => $frequency,
            'day_of_week' => $this->input('repeat_day_of_week'),
            'day_of_month' => $this->input('repeat_day_of_month'),
            'last_day_of_month' => $frequency === 'monthly' && $this->boolean('repeat_last_day'),
            'month' => $this->input('repeat_month'),
            'ends_on' => $this->input('repeat_until'),
        ]))->nextDueAfter(CarbonImmutable::now('Asia/Manila')->subDay());
    }

    /** @return array<int, \Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->route('task') === null && $this->input('due_type') === 'recurring'
                && $validator->errors()->isEmpty() && $this->firstRepeatDate() === null) {
                $validator->errors()->add('repeat_until', 'The repeat would stop before its first date.');
            }
        }];
    }
}
