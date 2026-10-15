<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Services\OfficePayrollCalculator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePayrollOfficeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return ['payroll_office' => ['required', Rule::in(array_keys(OfficePayrollCalculator::OFFICES))], 'review_note' => ['required', 'string', 'max:1000']];
    }
}
