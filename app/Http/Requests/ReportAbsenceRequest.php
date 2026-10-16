<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Employee;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReportAbsenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('reason'))) {
            $this->merge(['reason' => trim($this->input('reason'))]);
        }
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today', 'before_or_equal:'.today()->addDays(90)->toDateString()],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
            'confirmed' => ['accepted'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->has('date')) {
                return;
            }
            $date = Carbon::parse($this->input('date'));
            $start = Employee::startDateFor((int) $this->user()->id);
            if (! Employee::isWorkDay((int) $this->user()->id, $date) || Holiday::typeOn($date)
                || ($start !== null && $date->toDateString() < $start)) {
                $validator->errors()->add('date', 'Choose a scheduled workday on or after your start date.');
            }
        }];
    }
}
