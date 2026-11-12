<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Employee;
use App\Services\OfficePayrollCalculator;
use App\Services\PayrollCutoffPeriod;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePayrollRequest extends FormRequest
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
        $money = ['nullable', 'numeric', 'min:0', 'max:99999999'];

        return [
            'month' => ['required', 'date_format:Y-m'],
            'cutoff' => ['required', 'in:first,second'],
            'period_from' => ['required', 'date'],
            'period_to' => ['required', 'date'],
            'finalize' => ['boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.employee_id' => ['required', 'distinct', Rule::exists('employees', 'id')->where('is_staff', true)->where('status', 'active')],
            'items.*.weekday_ot_hours' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'items.*.weekend_ot_hours' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'items.*.holiday_pay' => $money,
            'items.*.cutoff_transpo' => $money,
            'items.*.cutoff_rep' => $money,
            'items.*.cutoff_quarterly' => $money,
            'items.*.deductions' => ['required', 'array:'.implode(',', OfficePayrollCalculator::DEDUCTIONS)],
            ...collect(OfficePayrollCalculator::DEDUCTIONS)->mapWithKeys(fn (string $field): array => ["items.*.deductions.$field" => ['required', 'numeric', 'min:0', 'max:99999999']])->all(),
            'items.*.day_resolutions' => ['nullable', 'array'],
            'items.*.day_resolutions.*.type' => ['required', 'in:hours,zero'],
            'items.*.day_resolutions.*.hours' => ['required_if:items.*.day_resolutions.*.type,hours', 'nullable', 'numeric', 'min:0', 'max:24'],
            'items.*.day_resolutions.*.note' => ['required_if:items.*.day_resolutions.*.type,hours', 'nullable', 'string', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $from = Carbon::parse($this->period_from);
            $to = Carbon::parse($this->period_to);
            if (! PayrollCutoffPeriod::withinHalf($from, $to, $this->month, $this->cutoff)) {
                $validator->errors()->add('period_from', 'Dates must stay inside the chosen cutoff (1st–15th or 16th–month end), start date first.');

                return;
            }
            $employees = Employee::whereIn('id', collect($this->items)->pluck('employee_id'))->get()->keyBy('id');
            foreach ($this->items as $index => $row) {
                if (! $employees->get($row['employee_id'])?->hasVerifiedPayrollOffice()) {
                    $validator->errors()->add("items.$index.employee_id", 'Verify this employee’s payroll office before saving payroll.');
                }
                foreach (array_keys($row['day_resolutions'] ?? []) as $date) {
                    if (! is_string($date) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        $validator->errors()->add("items.$index.day_resolutions", 'Invalid DTR day.');
                    }
                }
            }
        }];
    }
}
