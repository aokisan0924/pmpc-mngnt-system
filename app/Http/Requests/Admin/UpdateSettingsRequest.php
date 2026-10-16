<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateSettingsRequest extends FormRequest
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
            'coop_name' => ['required', 'string', 'max:200'],
            'coop_address' => ['nullable', 'string', 'max:500'],
            'coop_email' => ['nullable', 'email', 'max:100'],
            'coop_phone' => ['nullable', 'string', 'max:30'],
            'signatory_1_name' => ['required', 'string', 'max:100'],
            'signatory_1_role' => ['required', 'string', 'max:100'],
            'signatory_2_name' => ['required', 'string', 'max:100'],
            'signatory_2_role' => ['required', 'string', 'max:100'],
            'shift_start' => ['required', 'date_format:H:i'],
            'lunch_start' => ['required', 'date_format:H:i'],
            'lunch_end' => ['required', 'date_format:H:i'],
            'shift_end' => ['required', 'date_format:H:i'],
            'working_days_month' => ['required', 'integer', 'min:1', 'max:31'],
            'late_grace_minutes' => ['required', 'integer', 'min:0', 'max:60'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (! ($this->shift_start < $this->lunch_start
                && $this->lunch_start < $this->lunch_end
                && $this->lunch_end < $this->shift_end)) {
                $validator->errors()->add(
                    'shift_end',
                    'Use an increasing schedule: shift start, lunch start, lunch end, then shift end. Overnight shifts are not supported.'
                );
            }
        }];
    }
}
