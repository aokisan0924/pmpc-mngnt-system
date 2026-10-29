<?php

declare(strict_types=1);

namespace App\Http\Controllers\Integrations;

use App\Exceptions\AttendanceConflict;
use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\AttendanceMonthRequest;
use App\Http\Requests\Integration\StoreAttendancePunchRequest;
use App\Models\Employee;
use App\Services\AttendancePunchService;
use Illuminate\Http\JsonResponse;

class AttendanceController extends Controller
{
    public function show(AttendanceMonthRequest $request, int $employee, AttendancePunchService $punches): JsonResponse
    {
        return response()->json($punches->attendance($this->employee($request), $request->validated('month')));
    }

    public function punch(StoreAttendancePunchRequest $request, int $employee, AttendancePunchService $punches): JsonResponse
    {
        try {
            return response()->json($punches->punch($this->employee($request), $request->validated(), $request->ip(), integration: true));
        } catch (AttendanceConflict $conflict) {
            return response()->json(['message' => $conflict->getMessage()], 409);
        }
    }

    private function employee(AttendanceMonthRequest|StoreAttendancePunchRequest $request): Employee
    {
        return $request->attributes->get('integration.employee');
    }
}
