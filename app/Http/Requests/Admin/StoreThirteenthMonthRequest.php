<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'items' => ['required', 'array', 'min:1'],
            'items.*.employee_id' => ['required', 'distinct', Rule::exists('employees', 'id')->where('is_staff', true)->where('status', 'active')],
        ];
    }
}
