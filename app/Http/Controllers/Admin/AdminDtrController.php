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
    public function index(Request $request): Response {
        $month      = $request->get('month', now()->format('Y-m'));
        $employeeId = $request->get('employee_id');

        $from = Carbon::parse($month)->startOfMonth();
        $to   = Carbon::parse($month)->endOfMonth();

        $employees = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get()
            ->map(fn($e) => [
                'id'          => $e->id,
                'employee_id' => $e->employee_id,
                'full_name'   => $e->full_name,
                'department'  => $e->department,
                'initials'    => $e->initials,
            ]);

        // Build DTR summary for all employees this month
        $dtrSummary = Employee::where('role', 'employee')
            ->where('status', 'active')
            ->when($employeeId, fn($q) => $q->where('id', $employeeId))
            ->get()
            ->map(function ($emp) use ($from, $to) {
                $logs = DtrLog::where('employee_id', $emp->id)
                    ->whereBetween('date', [$from, $to])
                    ->get();
                return [
                    'id'             => $emp->id,
                    'employee_id'    => $emp->employee_id,
                    'full_name'      => $emp->full_name,
                    'department'     => $emp->department,
                    'initials'       => $emp->initials,
                    'days_present'   => $logs->whereNotIn('status', ['absent'])->count(),
                    'days_late'      => $logs->where('status', 'late')->count(),
                    'days_absent'    => $logs->where('status', 'absent')->count(),
                    'half_days'      => $logs->where('status', 'half_day')->count(),
                    'hours_rendered' => round($logs->sum('hours_rendered'), 2),
                ];
            });

        return Inertia::render('Admin/Dtr', [
            'employees'   => $employees,
            'dtrSummary'  => $dtrSummary,
            'month'       => $month,
            'employeeId'  => $employeeId ? (int) $employeeId : null,
        ]);
    }

    public function show(Request $request, Employee $employee): Response {
        $month = $request->get('month', now()->format('Y-m'));
        $from  = Carbon::parse($month)->startOfMonth();
        $to    = Carbon::parse($month)->endOfMonth();

        $logs = DtrLog::where('employee_id', $employee->id)
            ->whereBetween('date', [$from, $to])
            ->with('pendingEditRequest')
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn($log) => [
                'id'               => $log->id,
                'date'             => $log->date->format('Y-m-d'),
                'date_label'       => $log->date->format('M d, D'),
                'is_weekend'       => $log->date->isWeekend(),
                'am_time_in'       => $log->am_time_in,
                'am_time_out'      => $log->am_time_out,
                'pm_time_in'       => $log->pm_time_in,
                'pm_time_out'      => $log->pm_time_out,
                'hours_rendered'   => $log->hours_rendered,
                'status'           => $log->status,
                'has_pending_edit' => $log->pendingEditRequest !== null,
            ]);

        $summary = [
            'days_present'   => collect($logs)->whereNotIn('status', ['absent'])->count(),
            'days_late'      => collect($logs)->where('status', 'late')->count(),
            'days_absent'    => collect($logs)->where('status', 'absent')->count(),
            'half_days'      => collect($logs)->where('status', 'half_day')->count(),
            'hours_rendered' => round(collect($logs)->sum('hours_rendered'), 2),
        ];

        return Inertia::render('Admin/DtrShow', [
            'employee' => [
                'id'          => $employee->id,
                'employee_id' => $employee->employee_id,
                'full_name'   => $employee->full_name,
                'department'  => $employee->department,
                'position'    => $employee->position,
                'initials'    => $employee->initials,
            ],
            'logs'    => $logs,
            'summary' => $summary,
            'month'   => $month,
        ]);
    }
}