<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\RecurringTask;
use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TeamTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        // On edit, the task's current owner stays valid even if deactivated since,
        // so an admin can fix a task without having to reassign it.
        $currentOwnerId = $this->route('task')?->employee_id;

        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'due_date' => ['required', 'date'],
            'category' => ['nullable', 'string', 'max:100'],
            'priority' => ['required', 'in:low,medium,high'],
            'employee_id' => [
                'nullable',
                'required_without_all:office,employee_ids',
                'integer',
                Rule::exists('employees', 'id')->where(
                    fn ($query) => $query->where('status', 'active')
                        ->when($currentOwnerId, fn ($q) => $q->orWhere('id', $currentOwnerId))
                ),
            ],
            'office' => ['nullable', 'required_without_all:employee_id,employee_ids', Rule::in(array_keys(Task::OFFICES))],

            // Several people at once: one separate task each. Read only when a task is created.
            'employee_ids' => ['nullable', 'array', 'min:1', 'max:25'],
            'employee_ids.*' => [
                'integer', 'distinct',
                Rule::exists('employees', 'id')->where(fn ($query) => $query->where('status', 'active')),
            ],

            // Repeat settings are read only when a task is created.
            'repeat' => ['nullable', Rule::in(RecurringTask::FREQUENCIES)],
            'repeat_day_of_week' => ['nullable', 'integer', 'between:0,6', 'required_if:repeat,weekly'],
            'repeat_day_of_month' => [
                'nullable', 'integer', 'between:1,31',
                Rule::requiredIf(fn () => $this->input('repeat') === 'yearly'
                    || ($this->input('repeat') === 'monthly' && ! $this->boolean('repeat_last_day'))),
            ],
            'repeat_last_day' => ['nullable', 'boolean'],
            'repeat_month' => ['nullable', 'integer', 'between:1,12', 'required_if:repeat,yearly'],
            'repeat_lead_days' => ['nullable', 'integer', 'between:0,60'],
            'repeat_until' => ['nullable', 'date', 'after_or_equal:due_date'],
        ];
    }
}
