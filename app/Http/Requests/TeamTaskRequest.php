<?php

declare(strict_types=1);

namespace App\Http\Requests;

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
                'required',
                'integer',
                Rule::exists('employees', 'id')->where(
                    fn ($query) => $query->where('status', 'active')
                        ->when($currentOwnerId, fn ($q) => $q->orWhere('id', $currentOwnerId))
                ),
            ],
        ];
    }
}
