<?php

declare(strict_types=1);

namespace Tests\Feature\Concerns;

use App\Models\Employee;
use App\Services\AttendancePunchService;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

trait PunchesAttendance
{
    protected function postAttendancePunch(Employee $employee, string $url = '/employee/dtr/punch'): TestResponse
    {
        $service = app(AttendancePunchService::class);
        $log = $service->currentLog($employee);

        return $this->actingAs($employee)->post($url, [
            'request_id' => (string) Str::uuid(),
            'expected_slot' => $log->getNextPunchSlot() ?? 'pm_time_out',
            'expected_version' => $service->version($employee, $log),
        ]);
    }
}
