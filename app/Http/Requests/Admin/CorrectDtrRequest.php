<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CorrectDtrRequest extends FormRequest
{
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
            // Filled punches must follow the day's order: AM in < AM out <= PM in < PM out.
            $previous = null;
            foreach (self::SLOTS as $slot) {
                $time = $this->input($slot);
                if ($time === null || $time === '') {
                    continue;
                }
                if ($previous !== null && ($time < $previous[1] || ($time === $previous[1] && $slot !== 'pm_time_in'))) {
                    $validator->errors()->add($slot, 'Times must be in order: AM in, AM out, PM in, PM out.');

                    return;
                }
                $previous = [$slot, $time];
            }
        });
    }
}
