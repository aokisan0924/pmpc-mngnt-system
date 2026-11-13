<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Services\PayrollCutoffPeriod;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StartPayrollDayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canProcessPayroll() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'month' => ['required', 'date_format:Y-m'],
            'cutoff' => ['required', 'in:first,second'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            // Payroll is always given on the cutoff's last weekday.
            if ($validator->errors()->isEmpty() && ! PayrollCutoffPeriod::isPayrollDay($this->month, $this->cutoff)) {
                $validator->errors()->add('payday', 'Payroll day can only be started on the last weekday of the cutoff.');
            }
        }];
    }
}
