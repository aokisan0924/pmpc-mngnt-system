<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Payroll;
use App\Services\OfficePayrollCalculator;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
            'items.*.employee_id' => ['required', 'distinct', Rule::exists('employees', 'id')->where('is_staff', true)->where('status', 'active')],
            'items.*.weekday_ot_hours' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'items.*.weekend_ot_hours' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'items.*.days_present' => ['nullable', 'numeric', 'min:0'],
            'items.*.payroll_office' => ['required', 'in:'.implode(',', array_keys(OfficePayrollCalculator::OFFICES))],
            'items.*.paid_days_basis' => ['required', 'numeric', 'min:0', 'max:15', 'multiple_of:0.5'],
            'items.*.absence_days' => ['required', 'numeric', 'min:0', 'lte:items.*.paid_days_basis', 'multiple_of:0.5'],
            'items.*.tardiness_deduction' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'items.*.deductions_reviewed' => ['accepted'],
            'items.*.compensation_signature' => ['required', 'string', 'size:64'],
            'items.*.deductions' => ['required', 'array:sss_deduction,philhealth_deduction,pagibig_deduction,tax_deduction,loan_deduction,capital_contribution_deduction,cash_advance_deduction,rental_deduction,savings_deduction,other_deductions'],
            ...collect(['sss_deduction', 'philhealth_deduction', 'pagibig_deduction', 'tax_deduction', 'loan_deduction', 'capital_contribution_deduction', 'cash_advance_deduction', 'rental_deduction', 'savings_deduction', 'other_deductions'])->mapWithKeys(fn (string $field): array => ["items.*.deductions.$field" => ['required', 'numeric', 'min:0', 'max:99999999']])->all(),
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
