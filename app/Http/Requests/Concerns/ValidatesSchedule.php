<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

trait ValidatesSchedule
{
    /** @return array<string, array<mixed>> */
    protected function scheduleRules(): array
    {
        return [
            'schedule_type' => ['required', 'in:standard,two_punch,custom'],
            'shift_start' => ['required_unless:schedule_type,standard', 'nullable', 'date_format:H:i'],
            'shift_end' => ['required_unless:schedule_type,standard', 'nullable', 'date_format:H:i', 'different:shift_start',
                fn (string $attribute, mixed $value, \Closure $fail) => $this->input('schedule_type') === 'custom' && $value <= $this->input('shift_start')
                    ? $fail('The shift end must be after the shift start. Use 2 punches for a shift that ends after midnight.')
                    : null],
            'work_days' => ['required', 'array', 'min:1'],
            'work_days.*' => ['integer', 'between:0,6', 'distinct'],
        ];
    }
}
