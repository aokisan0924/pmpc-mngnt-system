<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Services\PayrollCutoffPeriod;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CreatePayrollRequest extends FormRequest
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
            'month' => ['required', 'date_format:Y-m'],
            'cutoff' => ['required', 'in:first,second'],
            'period_from' => ['nullable', 'date', 'required_with:period_to'],
            'period_to' => ['nullable', 'date', 'required_with:period_from'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('period_from')) {
                return;
            }
            if (! PayrollCutoffPeriod::withinHalf(Carbon::parse($this->period_from), Carbon::parse($this->period_to), $this->month, $this->cutoff)) {
                $validator->errors()->add('period_from', 'Dates must stay inside the chosen cutoff (1st–15th or 16th–month end), start date first.');
            }
        }];
    }
}
