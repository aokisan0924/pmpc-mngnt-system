<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreThirteenthMonthRequest extends FormRequest
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
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'tranche' => ['required', 'in:mid_year,year_end'],
            'period_from' => ['required', 'date'],
            'period_to' => ['required', 'date', 'after_or_equal:period_from'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.employee_id' => ['required', 'distinct', 'exists:employees,id'],
            'items.*.days_present' => ['required', 'numeric', 'min:0'],
            'items.*.daily_rate' => ['required', 'numeric', 'min:0'],
            'items.*.total_basic_pay' => ['required', 'numeric', 'min:0'],
            'items.*.thirteenth_month_pay' => ['required', 'numeric', 'min:0'],
        ];
    }
}
