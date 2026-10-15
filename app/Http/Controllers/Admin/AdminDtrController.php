<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DtrLog;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDtrController extends Controller
{
    public function index(Request $request): Response
    {
        $month = $request->get('month', now()->format('Y-m'));
        $employeeId = $request->get('employee_id');

        $from = Carbon::parse($month)->startOfMonth();
        $to = Carbon::parse($month)->endOfMonth();

        $activeStaff = Employee::where('is_staff', true)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get();

        $employees = $activeStaff->map(fn ($e) => [
            'id' => $e->id,
            'employee_id' => $e->employee_id,
            'full_name' => $e->full_name,
            'department' => $e->department,
            'initials' => $e->initials,
        ]);

        $targetStaff = $employeeId
            ? $activeStaff->where('id', (int) $employeeId)
            : $activeStaff;

        $allLogs = DtrLog::whereIn('employee_id', $targetStaff->pluck('id'))
            ->whereBetween('date', [$from, $to])
            ->get()
            ->groupBy('employee_id');

        // Same weighted count as payroll and 13th month (includes always-present employees).
        $present = DtrLog::weightedDaysByEmployee($targetStaff->modelKeys(), $from->toDateString(), $to->toDateString());

        // Build DTR summary for employees this month
        $dtrSummary = $targetStaff->map(function ($emp) use ($allLogs, $from, $to, $present) {
            $logs = $allLogs->get($emp->id, collect());

            return [
                'id' => $emp->id,
                'employee_id' => $emp->employee_id,
                'full_name' => $emp->full_name,
                'department' => $emp->department,
                'initials' => $emp->initials,
                'days_present' => (float) ($present[$emp->id] ?? 0),
                'days_late' => $logs->where('status', 'late')->count(),
                'days_absent' => DtrLog::absentDaysBetween($emp->id, $from->toDateString(), $to->toDateString(), $logs),
                'half_days' => $logs->where('status', 'half_day')->count(),
                'hours_rendered' => round($logs->sum('hours_rendered'), 2),
            ];
        })->values();

        return Inertia::render('Admin/Dtr', [
            'employees' => $employees,
            'dtrSummary' => $dtrSummary,
            'month' => $month,
            'employeeId' => $employeeId ? (int) $employeeId : null,
        ]);
    }

    public function show(Request $request, Employee $employee): Response
    {
        $month = $request->get('month', now()->format('Y-m'));
        $from = Carbon::parse($month)->startOfMonth();
        $to = Carbon::parse($month)->endOfMonth();

        $entries = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$from, $to])
            ->with('pendingEditRequest')
            ->get()
            ->keyBy(fn (DtrLog $log): string => $log->date->format('Y-m-d'));

        // Every day of the month in Sunday–Saturday weeks; missing past weekdays show as absent.
        $logs = collect();
        for ($day = $to->copy()->startOfDay(); $day->gte($from); $day->subDay()) {
            $log = $entries->get($day->format('Y-m-d'));
            $logs->push([
                'id' => $log?->id,
                'has_entry' => $log !== null,
                'date' => $day->format('Y-m-d'),
                'week' => $day->copy()->startOfWeek(Carbon::SUNDAY)->format('Y-m-d'),
                'is_future' => $day->isFuture(),
                'date_label' => $day->format('M d, D'),
                'is_weekend' => ! Employee::isWorkDay($employee->id, $day),
                'am_time_in' => $log?->am_time_in,
                'am_time_out' => $log?->am_time_out,
                'pm_time_in' => $log?->pm_time_in,
                'pm_time_out' => $log?->pm_time_out,
                'hours_rendered' => $log?->hours_rendered ?? 0,
                'status' => $log?->displayStatus() ?? DtrLog::fallbackStatus($employee->id, $day),
                'has_pending_edit' => $log?->pendingEditRequest !== null,
            ]);
        }

        $summary = [
            'days_present' => DtrLog::daysPresentBetween($employee->id, $from->toDateString(), $to->toDateString()),
            'days_late' => collect($logs)->where('status', 'late')->count(),
            'days_absent' => collect($logs)->where('status', 'absent')->count(),
            'half_days' => collect($logs)->where('status', 'half_day')->count(),
            'hours_rendered' => round(collect($logs)->sum('hours_rendered'), 2),
        ];

        return Inertia::render('Admin/DtrShow', [
            'employee' => [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'full_name' => $employee->full_name,
                'department' => $employee->department,
                'position' => $employee->position,
                'initials' => $employee->initials,
            ],
            'logs' => $logs,
            'summary' => $summary,
            'month' => $month,
        ]);
    }
}
