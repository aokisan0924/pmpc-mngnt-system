<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DtrEditRequestSubmissionRequest extends FormRequest
{
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
}
