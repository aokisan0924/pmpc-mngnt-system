<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportManagementPayrollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        $rules = ['signatories' => ['sometimes', 'array:first,second'], 'signatories.*' => ['array:prepared,certified,approved']];
        foreach (['first', 'second'] as $cutoff) {
            foreach (['prepared', 'certified', 'approved'] as $role) {
                $rules["signatories.$cutoff.$role"] = ['nullable', 'integer', Rule::exists('employees', 'id')->whereNotNull('signature_path')];
            }
        }

        return $rules;
    }
}
