<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PunchAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'request_id' => ['required', 'uuid'],
            'expected_slot' => ['required', 'string', 'in:am_time_in,am_time_out,pm_time_in,pm_time_out'],
            'expected_version' => ['required', 'string', 'regex:/^v1:[a-f0-9]{64}$/'],
        ];
    }
}
