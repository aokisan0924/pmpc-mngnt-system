<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\ValidatesPunchOrder;
use App\Models\EmployeeSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CorrectDtrRequest extends FormRequest
{
    use ValidatesPunchOrder;

    public const SLOTS = ['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'];

    public function authorize(): bool
    {
        return $this->user()?->canCorrectDtr() ?? false;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            ...array_fill_keys(self::SLOTS, ['nullable', 'date_format:H:i']),
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $employee = $this->route('employee');
            $shift = $employee ? EmployeeSchedule::shiftFor($employee->id, Carbon::parse($this->input('date'))) : null;
            $this->validatePunchOrder($validator, array_combine(self::SLOTS, self::SLOTS), $shift['two_punch'] ?? false);
        });
    }
}
