<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\AttendanceConflict;
use App\Models\AttendanceIntegrationRequest;
use App\Models\DtrLog;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendancePunchService
{
    public function currentLog(Employee $employee, bool $lock = false): DtrLog
    {
        return DtrLog::forPunch((int) $employee->id, false, $lock) ?? new DtrLog([
            'employee_id' => $employee->id,
            'date' => today(),
            'status' => 'absent',
        ]);
    }

    public function version(Employee $employee, DtrLog $log): string
    {
        $state = [
            'date' => $log->date->toDateString(),
            'punches' => [$log->am_time_in, $log->am_time_out, $log->pm_time_in, $log->pm_time_out],
            'status' => $log->status,
            'absence' => [$log->absence_reason, $log->absence_cancelled_at?->toISOString()],
            'schedule' => EmployeeSchedule::shiftFor((int) $employee->id, $log->date),
            'settings' => [
                Setting::get('shift_start', '08:00'), Setting::get('shift_end', '17:00'),
                Setting::get('lunch_start', '12:00'), Setting::get('lunch_end', '13:00'),
                Setting::get('late_grace_minutes', '0'),
            ],
            'next_punch' => $log->getNextPunchSlot(),
        ];

        return 'v1:'.hash('sha256', json_encode($state, JSON_THROW_ON_ERROR));
    }

    /** @return array<string, mixed> */
    public function attendance(Employee $employee, string $month): array
    {
        $start = Carbon::createFromFormat('!Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $logs = DtrLog::query()->where('employee_id', $employee->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('date')->get();
        $today = $this->currentLog($employee);

        return [
            'employee' => ['id' => (int) $employee->id, 'name' => $employee->full_name],
            'today' => $this->serializeLog($today),
            'next_punch' => $today->getNextPunchSlot(),
            'version' => $this->version($employee, $today),
            'logs' => $logs->map(fn (DtrLog $log): array => $this->serializeLog($log))->values()->all(),
            'two_punch' => $today->isTwoPunch(),
            'fetched_at' => now()->toIso8601String(),
        ];
    }

    /** @param array{request_id: string, expected_slot: string, expected_version: string} $input
     * @return array{request_id: string, attendance: array<string, mixed>}
     */
    public function punch(Employee $employee, array $input, ?string $ipAddress, bool $integration = false): array
    {
        $payloadHash = hash('sha256', json_encode([
            'employee_id' => (int) $employee->id,
            'expected_slot' => $input['expected_slot'],
            'expected_version' => $input['expected_version'],
        ], JSON_THROW_ON_ERROR));

        try {
            return DB::transaction(function () use ($employee, $input, $ipAddress, $payloadHash, $integration): array {
                $lockedEmployee = Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
                abort_unless($lockedEmployee->isActive() && (! $integration || $lockedEmployee->is_staff), 403);

                $previous = AttendanceIntegrationRequest::query()->where('request_id', $input['request_id'])->lockForUpdate()->first();
                if ($previous) {
                    return $this->replay($previous, $employee, $payloadHash);
                }

                $log = $this->currentLog($lockedEmployee, true);
                if (! hash_equals($this->version($lockedEmployee, $log), $input['expected_version'])
                    || $log->getNextPunchSlot() !== $input['expected_slot']) {
                    throw new AttendanceConflict('Attendance changed. Refresh before trying again.');
                }
                if ($log->hasActiveAbsence()) {
                    throw ValidationException::withMessages(['punch' => 'Cancel your absence notice in My Attendance before clocking in.']);
                }

                $slot = $input['expected_slot'];
                $log->$slot = now()->format('H:i:s');
                $log->ip_address = $ipAddress;
                $log->computeHoursAndStatus();
                $log->save();

                $response = [
                    'request_id' => $input['request_id'],
                    'attendance' => $this->attendance($lockedEmployee, now()->format('Y-m')),
                ];
                AttendanceIntegrationRequest::query()->create([
                    'request_id' => $input['request_id'],
                    'employee_id' => $lockedEmployee->id,
                    'payload_hash' => $payloadHash,
                    'response' => $response,
                ]);

                return $response;
            });
        } catch (QueryException $exception) {
            $previous = AttendanceIntegrationRequest::query()->where('request_id', $input['request_id'])->first();
            if (! $previous) {
                throw $exception;
            }

            return $this->replay($previous, $employee, $payloadHash);
        }
    }

    /** @return array{request_id: string, attendance: array<string, mixed>} */
    private function replay(AttendanceIntegrationRequest $previous, Employee $employee, string $payloadHash): array
    {
        if ((int) $previous->employee_id !== (int) $employee->id || ! hash_equals($previous->payload_hash, $payloadHash)) {
            throw new AttendanceConflict('This request ID was already used with different attendance data.');
        }

        return $previous->response;
    }

    /** @return array{id: int|null, date: string, am_time_in: string|null, am_time_out: string|null, pm_time_in: string|null, pm_time_out: string|null, hours_rendered: float|null, status: string, two_punch: bool} */
    private function serializeLog(DtrLog $log): array
    {
        return [
            'id' => $log->id,
            'date' => $log->date->toDateString(),
            'am_time_in' => $log->am_time_in,
            'am_time_out' => $log->am_time_out,
            'pm_time_in' => $log->pm_time_in,
            'pm_time_out' => $log->pm_time_out,
            'hours_rendered' => $log->hours_rendered === null ? null : (float) $log->hours_rendered,
            'status' => $log->exists ? $log->displayStatus() : DtrLog::fallbackStatus((int) $log->employee_id, $log->date),
            'two_punch' => $log->isTwoPunch(),
        ];
    }
}
