<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Models\Employee;
use App\Services\OfficePayrollCalculator;
use App\Services\PayrollCutoffPeriod;

trait BuildsWizardPayroll
{
    /** A payroll wizard save payload: one row per employee, nothing typed unless $item overrides it. */
    protected function wizardPayload(array $employees, string $month = '2026-09', string $cutoff = 'first', array $item = [], array $changes = []): array
    {
        $suggested = PayrollCutoffPeriod::suggest($month, $cutoff);

        return array_replace([
            'month' => $month, 'cutoff' => $cutoff,
            'period_from' => $suggested['from']->toDateString(), 'period_to' => $suggested['to']->toDateString(),
            'finalize' => false,
            'items' => array_map(fn (Employee $employee): array => array_replace([
                'employee_id' => $employee->id, 'weekday_ot_hours' => 0, 'weekend_ot_hours' => 0, 'holiday_pay' => 0,
                'cutoff_transpo' => 0, 'cutoff_rep' => 0, 'cutoff_quarterly' => 0,
                'deductions' => array_fill_keys(OfficePayrollCalculator::DEDUCTIONS, 0), 'day_resolutions' => [],
            ], $item), $employees),
        ], $changes);
    }
}
