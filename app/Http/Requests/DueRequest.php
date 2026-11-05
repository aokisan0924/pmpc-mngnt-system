<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DueRequest extends FormRequest
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
        return [
            'title' => ['required', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'office' => ['nullable', Rule::in(array_keys(Task::OFFICES))],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'frequency' => ['required', 'in:monthly,once'],
            'last_day_of_month' => ['nullable', 'boolean'],
            'day_of_month' => ['nullable', 'integer', 'between:1,31', Rule::requiredIf(fn () => $this->input('frequency') === 'monthly' && ! $this->boolean('last_day_of_month'))],
            'due_on' => ['nullable', 'date', Rule::requiredIf(fn () => $this->input('frequency') === 'once')],
        ];
    }
}
