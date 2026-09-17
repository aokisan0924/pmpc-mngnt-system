<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Payroll;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePayrollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'period_label' => ['required', 'string', 'max:100'],
            'period_from' => ['required', 'date'],
            'period_to' => ['required', 'date', 'after_or_equal:period_from'],
            'cutoff' => ['required', 'in:first,second'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.employee_id' => ['required', 'distinct', 'exists:employees,id'],
            'items.*.weekday_ot_hours' => ['nullable', 'numeric', 'min:0'],
            'items.*.weekend_ot_hours' => ['nullable', 'numeric', 'min:0'],
            'items.*.days_present' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->filled(['period_from', 'period_to', 'cutoff'])) {
                $exists = Payroll::where('period_from', $this->period_from)
                    ->where('period_to', $this->period_to)
                    ->where('cutoff', $this->cutoff)
                    ->exists();

                if ($exists) {
                    $validator->errors()->add(
                        'cutoff',
                        'A payroll batch for this period and cutoff already exists.'
                    );
                }
            }
        });
    }
}
