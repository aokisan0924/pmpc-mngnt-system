<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DtrAbsenceService
{
    public function report(Employee $employee, string $date, string $reason): void
    {
        DB::transaction(function () use ($employee, $date, $reason): void {
            Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $log = DtrLog::firstOrCreate(['employee_id' => $employee->id, 'date' => Carbon::parse($date)], ['status' => 'absent']);
            if ($log->punchesCount() > 0 || $log->hasActiveAbsence()) {
                throw ValidationException::withMessages(['date' => 'This day already has punches or an active absence notice.']);
            }
            $log->update(['absence_reason' => $reason, 'absence_cancelled_at' => null]);
            $this->notify($employee, $date, "reported an absence: {$reason}");
        });
    }

    public function cancel(Employee $employee, DtrLog $dtrLog): void
    {
        abort_unless($dtrLog->employee_id === $employee->id, 403);
        DB::transaction(function () use ($dtrLog, $employee): void {
            Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $log = DtrLog::whereKey($dtrLog->id)->lockForUpdate()->firstOrFail();
            if ($log->date->lt(today()) || ! $log->hasActiveAbsence()) {
                throw ValidationException::withMessages(['absence' => 'Only current or future absence notices can be cancelled.']);
            }
            $log->update(['absence_cancelled_at' => now()]);
            $this->notify($employee, $log->date->toDateString(), 'cancelled their absence notice');
        });
    }

    private function notify(Employee $employee, string $date, string $action): void
    {
        foreach (Employee::where('role', 'super_admin')->get(['id']) as $admin) {
            EmployeeNotification::send(employeeId: $admin->id, type: 'absence_notice', title: 'Employee absence notice',
                message: "{$employee->full_name} {$action} ({$date}).",
                link: "/admin/dtr/{$employee->id}?month=".substr($date, 0, 7));
        }
    }
}
