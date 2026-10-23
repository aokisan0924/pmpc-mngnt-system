<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\ValidatesSchedule;
use App\Models\Employee;
use App\Services\EmployeeScheduleService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveEmployeeScheduleRequest extends FormRequest
{
    use ValidatesSchedule;

    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Employee $employee */
        $employee = $this->route('employee');
        $earliest = app(EmployeeScheduleService::class)->earliestEditableDate($employee);

        return [
            'effective_from' => ['required', 'date_format:Y-m-d', ...($earliest ? ['after_or_equal:'.$earliest->toDateString()] : [])],
            ...$this->scheduleRules(),
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['effective_from.after_or_equal' => 'Payroll for earlier dates is already finalized. Choose :date or later.'];
    }
}
