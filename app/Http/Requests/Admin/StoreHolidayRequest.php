<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Holiday;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHolidayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', function (string $attribute, mixed $value, \Closure $fail): void {
                if (Holiday::whereDate('date', (string) $value)->exists()) {
                    $fail('A holiday is already recorded for this date.');
                }
            }],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(array_keys(Holiday::TYPES))],
        ];
    }
}
