<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCompensationRequest extends FormRequest
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
            'daily_rate' => ['required', 'numeric', 'min:0'],
            'transpo_allowance' => ['nullable', 'numeric', 'min:0'],
            'rep_allowance' => ['nullable', 'numeric', 'min:0'],
            'quarterly_allowance' => ['nullable', 'numeric', 'min:0'],
            'sss_deduction' => ['nullable', 'numeric', 'min:0'],
            'philhealth_deduction' => ['nullable', 'numeric', 'min:0'],
            'pagibig_deduction' => ['nullable', 'numeric', 'min:0'],
            'tax_deduction' => ['nullable', 'numeric', 'min:0'],
            'loan_deduction' => ['nullable', 'numeric', 'min:0'],
            'capital_contribution_deduction' => ['nullable', 'numeric', 'min:0'],
            'cash_advance_deduction' => ['nullable', 'numeric', 'min:0'],
            'rental_deduction' => ['nullable', 'numeric', 'min:0'],
            'savings_deduction' => ['nullable', 'numeric', 'min:0'],
            'other_deductions' => ['nullable', 'numeric', 'min:0'],
            'auto_present_weekdays' => ['sometimes', 'boolean'],
            'work_days' => ['sometimes', 'array', 'min:1'],
            'work_days.*' => ['integer', 'between:0,6', 'distinct'],
            'shift_start' => ['nullable', 'date_format:H:i', 'required_with:shift_end'],
            'shift_end' => ['nullable', 'date_format:H:i', 'required_with:shift_start', 'different:shift_start',
                fn (string $attribute, mixed $value, \Closure $fail) => ! $this->boolean('two_punch') && $value < $this->input('shift_start')
                    ? $fail('The shift end must be after the shift start unless this is a two-punch (overnight) shift.')
                    : null],
            'two_punch' => ['sometimes', 'boolean'],
        ];
    }
}
