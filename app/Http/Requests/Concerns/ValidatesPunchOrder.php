<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Validator;

trait ValidatesPunchOrder
{
    /**
     * Filled punches must follow the day's order: AM in < AM out <= PM in < PM out.
     * Two-punch shifts only use time in / time out, and an overnight one ends the next morning.
     *
     * @param  array<string, string>  $fields  slot => input field name
     */
    protected function validatePunchOrder(Validator $validator, array $fields, bool $twoPunch): void
    {
        if ($twoPunch) {
            foreach (['am_time_out', 'pm_time_in'] as $slot) {
                if (filled($this->input($fields[$slot]))) {
                    $validator->errors()->add($fields[$slot], 'This employee is on a two-punch shift: use time in and time out only.');
                }
            }

            return;
        }

        $previous = null;
        foreach ($fields as $slot => $field) {
            $time = $this->input($field);
            if ($time === null || $time === '') {
                continue;
            }
            if ($previous !== null && ($time < $previous || ($time === $previous && $slot !== 'pm_time_in'))) {
                $validator->errors()->add($field, 'Times must be in order: AM in, AM out, PM in, PM out.');

                return;
            }
            $previous = $time;
        }
    }
}
