<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPunchOrder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class DtrEditRequestSubmissionRequest extends FormRequest
{
    use ValidatesPunchOrder;

    public function authorize(): bool
    {
        $dtrLog = $this->route('dtrLog');
        $user = $this->user();

        return $user !== null
            && $user->canRequestDtrEdits()
            && $dtrLog
            && $dtrLog->employee_id === $user->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'requested_am_time_in' => ['nullable', 'date_format:H:i'],
            'requested_am_time_out' => ['nullable', 'date_format:H:i'],
            'requested_pm_time_in' => ['nullable', 'date_format:H:i'],
            'requested_pm_time_out' => ['nullable', 'date_format:H:i'],
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $slots = ['am_time_in', 'am_time_out', 'pm_time_in', 'pm_time_out'];
            $fields = array_combine($slots, array_map(fn (string $slot): string => "requested_{$slot}", $slots));
            $this->validatePunchOrder($validator, $fields, $this->route('dtrLog')->isTwoPunch());
        });
    }
}
