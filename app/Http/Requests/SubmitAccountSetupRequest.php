<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Services\OfficePayrollCalculator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitAccountSetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() && $this->user()->is_staff;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'name_suffix' => ['nullable', 'string', 'max:20'],
            'email' => ['required', 'email', 'max:255', Rule::unique('employees')->ignore($this->user()->id)],
            'phone' => ['required', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'payroll_office' => ['required', Rule::in(array_keys(OfficePayrollCalculator::OFFICES))],
            'employment_confirmed' => ['accepted'],
            'employment_note' => ['nullable', 'string', 'max:1000'],
            ...collect(['sss_no', 'philhealth_no', 'tin_no', 'pagibig_no'])->mapWithKeys(fn (string $field): array => [$field => ['nullable', 'string', 'max:50']])->all(),
        ];
    }
}
